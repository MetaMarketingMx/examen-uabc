"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
};

type Tema = {
  id: string | number;
  materia_id?: string | number | null;
  id_materia?: string | number | null;
  materia?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type Subtema = {
  id: string | number;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  tema?: string | number | null;
  unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type Parcial = {
  id: string | number;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
  orden?: number | null;
};

function nombreDe(item?: Materia | Tema | Subtema | Parcial | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

function ordenarPorOrden<T extends { id: string | number; orden?: number | null }>(
  lista: T[]
) {
  return [...lista].sort((a, b) => {
    const ordenA = Number(a.orden ?? 0);
    const ordenB = Number(b.orden ?? 0);

    if (ordenA !== ordenB) return ordenA - ordenB;

    return String(a.id).localeCompare(String(b.id));
  });
}

export default function MateriaDetallePage() {
  const params = useParams();
  const materiaId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [materia, setMateria] = useState<Materia | null>(null);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemasPorTema, setSubtemasPorTema] = useState<
    Record<string, Subtema[]>
  >({});
  const [parcialesPorTema, setParcialesPorTema] = useState<
    Record<string, Parcial[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [materiaId]);

  async function consultarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    let primeraRespuestaValida: any[] = [];

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

  async function cargarDatos() {
    setLoading(true);

    const { data: materiaData } = await supabase
      .from("materias")
      .select("*")
      .eq("id", materiaId)
      .single();

    const materiaInfo = (materiaData || null) as Materia | null;
    setMateria(materiaInfo);

    const temasData = await consultarConFallback("temas", [
      { columna: "materia_id", valor: String(materiaId) },
      { columna: "id_materia", valor: String(materiaId) },
      { columna: "materia", valor: String(materiaId) },
    ]);

    const temasOrdenados = ordenarPorOrden((temasData || []) as Tema[]);
    setTemas(temasOrdenados);

    const nuevoMapaSubtemas: Record<string, Subtema[]> = {};
    const nuevoMapaParciales: Record<string, Parcial[]> = {};

    for (const tema of temasOrdenados) {
      const idTema = String(tema.id);

      const subtemasData = await consultarConFallback("subtemas", [
        { columna: "tema_id", valor: idTema },
        { columna: "unidad_id", valor: idTema },
        { columna: "id_tema", valor: idTema },
        { columna: "id_unidad", valor: idTema },
        { columna: "tema", valor: idTema },
        { columna: "unidad", valor: idTema },
      ]);

      const parcialesData = await consultarConFallback("parciales", [
        { columna: "tema_id", valor: idTema },
        { columna: "unidad_id", valor: idTema },
        { columna: "id_tema", valor: idTema },
        { columna: "id_unidad", valor: idTema },
        { columna: "tema", valor: idTema },
        { columna: "unidad", valor: idTema },
      ]);

      nuevoMapaSubtemas[idTema] = ordenarPorOrden(
        (subtemasData || []) as Subtema[]
      );

      nuevoMapaParciales[idTema] = ordenarPorOrden(
        (parcialesData || []) as Parcial[]
      );
    }

    setSubtemasPorTema(nuevoMapaSubtemas);
    setParcialesPorTema(nuevoMapaParciales);

    setLoading(false);
  }

  const totalSubtemas = Object.values(subtemasPorTema).reduce(
    (total, lista) => total + lista.length,
    0
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-white">
        Cargando materia...
      </main>
    );
  }

  if (!materia) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-white">
        <section className="mx-auto max-w-3xl rounded-2xl border border-red-500 bg-red-950/40 p-5">
          <h1 className="text-2xl font-bold">No se encontró la materia</h1>

          <Link
            href="/materias"
            className="mt-5 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
          >
            Volver a materias
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/materias"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Materias
          </Link>

          <Link
            href="/panel-alumno"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Panel
          </Link>
        </div>

        <header className="mb-5 border-b border-slate-800 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
            Materia
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            {nombreDe(materia)}
          </h1>

          {materia.descripcion && (
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              {materia.descripcion}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-slate-200">Avance general</p>
              <p className="font-bold text-slate-300">0%</p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-0 rounded-full bg-sky-500" />
            </div>

            <p className="mt-3 text-sm text-slate-400">
              0 de {totalSubtemas} publicaciones completadas
            </p>
          </div>
        </header>

        <section className="mb-5">
          <h2 className="text-2xl font-bold">Temario y avance</h2>

          {temas.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-slate-400">
                Esta materia todavía no tiene unidades registradas.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {temas.map((tema, temaIndex) => {
                const idTema = String(tema.id);
                const subtemas = subtemasPorTema[idTema] || [];
                const parciales = parcialesPorTema[idTema] || [];
                const subtemasVisibles = subtemas.slice(0, 3);

                return (
                  <article
                    key={idTema}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                        Unidad {temaIndex + 1}
                      </p>

                      <h3 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
                        {nombreDe(tema)}
                      </h3>

                      {tema.descripcion && (
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {tema.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="mb-4 rounded-2xl bg-slate-950 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-slate-400">
                          0 de {subtemas.length} completadas
                        </p>
                        <p className="text-sm font-bold text-slate-300">0%</p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-0 rounded-full bg-sky-500" />
                      </div>
                    </div>

                    {subtemas.length === 0 ? (
                      <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-400">
                        Esta unidad todavía no tiene publicaciones.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {subtemasVisibles.map((subtema) => (
                          <Link
                            key={String(subtema.id)}
                            href={`/temas/${idTema}/contenido?subtema=${subtema.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700"
                          >
                            <div>
                              <h4 className="text-base font-semibold leading-tight">
                                {nombreDe(subtema)}
                              </h4>

                              {subtema.descripcion && (
                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                  {subtema.descripcion}
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 rounded-full bg-slate-700 px-3 py-1 text-sm font-bold">
                              →
                            </span>
                          </Link>
                        ))}

                        <Link
                          href={`/temas/${idTema}/contenido`}
                          className="mt-3 flex w-full justify-center rounded-xl bg-sky-500 px-4 py-3 text-center font-bold text-slate-950 hover:bg-sky-400"
                        >
                          Ver las {subtemas.length} publicaciones
                        </Link>
                      </div>
                    )}

                    {parciales.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-yellow-700/60 bg-yellow-950/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                          Parcial de la unidad
                        </p>

                        <div className="mt-3 space-y-2">
                          {parciales.map((parcial) => (
                            <Link
                              key={String(parcial.id)}
                              href={`/parciales/${parcial.id}`}
                              className="block rounded-xl bg-slate-950 px-4 py-3 hover:bg-slate-900"
                            >
                              <h4 className="font-bold text-yellow-300">
                                {nombreDe(parcial)} →
                              </h4>

                              <p className="mt-1 text-xs text-slate-400">
                                Tiempo asignado:{" "}
                                {parcial.tiempo_minutos || 30} minutos
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}