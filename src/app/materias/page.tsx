"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  [key: string]: any;
};

type MateriaConDatos = {
  materia: Registro;
  temas: Registro[];
  subtemas: Registro[];
  parciales: number;
  completados: number;
  porcentaje: number;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_PARCIALES = "parciales";

export default function MateriasPage() {
  const [materiasConDatos, setMateriasConDatos] = useState<MateriaConDatos[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMaterias();

    function actualizarAlVolver() {
      cargarMaterias();
    }

    window.addEventListener("focus", actualizarAlVolver);

    return () => {
      window.removeEventListener("focus", actualizarAlVolver);
    };
  }, []);

  function obtenerTitulo(item: Registro | undefined | null) {
    if (!item) return "";
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
  }

  function obtenerDescripcion(item: Registro | undefined | null) {
    if (!item) return "";
    return String(item.descripcion ?? item.description ?? "");
  }

  function ordenarLista(lista: Registro[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  async function consultarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    let primeraRespuestaValida: Registro[] = [];

    for (const filtro of filtros) {
      const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .eq(filtro.columna, filtro.valor);

      if (!error) {
        const lista = data ?? [];

        if (primeraRespuestaValida.length === 0) {
          primeraRespuestaValida = lista;
        }

        if (lista.length > 0) {
          return lista;
        }
      }
    }

    return primeraRespuestaValida;
  }

  async function contarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    for (const filtro of filtros) {
      const { count, error } = await supabase
        .from(tabla)
        .select("*", { count: "exact", head: true })
        .eq(filtro.columna, filtro.valor);

      if (!error) {
        return count ?? 0;
      }
    }

    return 0;
  }

  function cargarAvanceLocal(materiaId: string) {
    if (typeof window === "undefined") return {};

    try {
      const guardado = localStorage.getItem(`avance-materia-${materiaId}`);

      if (!guardado) return {};

      return JSON.parse(guardado) as Record<string, boolean>;
    } catch {
      return {};
    }
  }

  async function cargarMaterias() {
    setCargando(true);

    const { data: materiasData, error: materiasError } = await supabase
      .from(TABLA_MATERIAS)
      .select("*");

    if (materiasError) {
      console.error("Error cargando materias:", materiasError);
      setMateriasConDatos([]);
      setCargando(false);
      return;
    }

    const materiasOrdenadas = ordenarLista(materiasData ?? []);
    const resultado: MateriaConDatos[] = [];

    for (const materia of materiasOrdenadas) {
      const materiaId = String(materia.id);

      const temas = await consultarConFallback(TABLA_TEMAS, [
        { columna: "materia_id", valor: materiaId },
        { columna: "id_materia", valor: materiaId },
        { columna: "materia", valor: materiaId },
      ]);

      const temasOrdenados = ordenarLista(temas);
      let todosLosSubtemas: Registro[] = [];

      for (const tema of temasOrdenados) {
        const temaId = String(tema.id);

        const subtemas = await consultarConFallback(TABLA_SUBTEMAS, [
          { columna: "tema_id", valor: temaId },
          { columna: "unidad_id", valor: temaId },
          { columna: "id_tema", valor: temaId },
          { columna: "id_unidad", valor: temaId },
          { columna: "tema", valor: temaId },
          { columna: "unidad", valor: temaId },
        ]);

        todosLosSubtemas = [...todosLosSubtemas, ...subtemas];
      }

      const parciales = await contarConFallback(TABLA_PARCIALES, [
        { columna: "materia_id", valor: materiaId },
        { columna: "id_materia", valor: materiaId },
        { columna: "materia", valor: materiaId },
      ]);

      const avanceLocal = cargarAvanceLocal(materiaId);

      const completados = todosLosSubtemas.filter(
        (subtema) => avanceLocal[String(subtema.id)]
      ).length;

      const totalSubtemas = todosLosSubtemas.length;

      const porcentaje =
        totalSubtemas > 0 ? Math.round((completados / totalSubtemas) * 100) : 0;

      resultado.push({
        materia,
        temas: temasOrdenados,
        subtemas: todosLosSubtemas,
        parciales,
        completados,
        porcentaje,
      });
    }

    setMateriasConDatos(resultado);
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">Cargando materias...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Materias
          </p>

          <h1 className="mt-3 text-4xl font-bold">Materias disponibles</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Selecciona una materia para ver sus temas, contenido académico y parciales disponibles.
          </p>

          <Link
            href="/panel-alumno"
            className="mt-5 inline-flex rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Volver al panel
          </Link>
        </section>

        {materiasConDatos.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">Todavía no hay materias</h2>
            <p className="mt-2 text-slate-400">
              Cuando agregues materias desde el panel admin, aparecerán aquí.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {materiasConDatos.map((item) => {
              const materia = item.materia;
              const materiaId = String(materia.id);
              const titulo = obtenerTitulo(materia);
              const descripcion = obtenerDescripcion(materia);

              return (
                <article
                  key={materia.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
                >
                  <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Materia
                  </p>

                  <h2 className="mt-3 text-2xl font-bold">{titulo}</h2>

                  {descripcion && (
                    <p className="mt-4 min-h-[48px] text-sm leading-relaxed text-slate-300">
                      {descripcion}
                    </p>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-sm text-blue-300">Temas</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-400">
                        {item.temas.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-sm text-blue-300">Parciales</p>
                      <p className="mt-2 text-2xl font-bold text-yellow-300">
                        {item.parciales}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">Avance</p>
                      <p className="text-sm font-semibold text-slate-300">
                        {item.porcentaje}%
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {item.completados} de {item.subtemas.length} subtemas completados
                    </p>
                  </div>

                  <Link
                    href={`/materias/${materiaId}`}
                    className="mt-5 inline-flex font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    Ver temas →
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}