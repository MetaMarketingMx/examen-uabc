"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
  title?: string | null;
  descripcion?: string | null;
  description?: string | null;
  orden?: number | null;
  tiempo_minutos?: number | null;
  [key: string]: any;
};

type InstruccionSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
  titulo?: string | null;
  contenido?: string | null;
  orden?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
};

const TABLA_SIMULADORES = "simuladores";
const TABLA_INSTRUCCIONES = "instrucciones_simuladores";

export default function AdminInstruccionesSimuladoresPage() {
  const searchParams = useSearchParams();
  const simuladorUrl = searchParams.get("simulador") || "";

  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [simuladorId, setSimuladorId] = useState(simuladorUrl);
  const [instrucciones, setInstrucciones] = useState<InstruccionSimulador[]>(
    []
  );

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [orden, setOrden] = useState("1");

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  useEffect(() => {
    if (simuladorUrl) {
      setSimuladorId(simuladorUrl);
    }
  }, [simuladorUrl]);

  useEffect(() => {
    if (!simuladorId) {
      setInstrucciones([]);
      limpiarFormulario();
      return;
    }

    cargarInstrucciones(simuladorId);
  }, [simuladorId]);

  function obtenerTitulo(item: Registro | InstruccionSimulador | null | undefined) {
    if (!item) return "";

    return String(
      item.nombre ??
        item.titulo ??
        (item as Registro).title ??
        `Registro ${item.id}`
    );
  }

  function obtenerDescripcion(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.descripcion ?? item.description ?? "");
  }

  function ordenarLista<T extends { id: string | number; orden?: number | null }>(
    lista: T[]
  ) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function siguienteOrden(lista: InstruccionSimulador[]) {
    if (lista.length === 0) return 1;
    return Math.max(...lista.map((item) => Number(item.orden ?? 0))) + 1;
  }

  async function cargarSimuladores() {
    setCargando(true);

    const { data, error } = await supabase.from(TABLA_SIMULADORES).select("*");

    if (error) {
      console.error("Error cargando simuladores:", error);
      alert("No se pudieron cargar los simuladores.");
      setCargando(false);
      return;
    }

    setSimuladores(ordenarLista((data ?? []) as Registro[]));
    setCargando(false);
  }

  async function cargarInstrucciones(idSimulador: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_INSTRUCCIONES)
      .select("*")
      .eq("simulador_id", String(idSimulador));

    if (error) {
      console.error("Error cargando instrucciones:", error);
      alert(
        "No se pudieron cargar las instrucciones. Revisa que exista la tabla instrucciones_simuladores."
      );
      setInstrucciones([]);
      setCargando(false);
      return;
    }

    const lista = ordenarLista((data ?? []) as InstruccionSimulador[]);
    setInstrucciones(lista);

    if (!editandoId) {
      setOrden(String(siguienteOrden(lista)));
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setTitulo("");
    setContenido("");
    setOrden("1");
  }

  async function guardarInstruccion() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    if (!contenido.trim()) {
      alert("Escribe el texto de la instrucción.");
      return;
    }

    setGuardando(true);

    const payload = {
      simulador_id: String(simuladorId),
      titulo: titulo.trim() || null,
      contenido: contenido.trim(),
      orden: Number(orden) || 1,
      updated_at: new Date().toISOString(),
    };

    const respuesta = editandoId
      ? await supabase
          .from(TABLA_INSTRUCCIONES)
          .update(payload)
          .eq("id", editandoId)
      : await supabase.from(TABLA_INSTRUCCIONES).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando instrucción:", respuesta.error);
      alert("No se pudo guardar la instrucción.");
      setGuardando(false);
      return;
    }

    await cargarInstrucciones(simuladorId);
    limpiarFormulario();
    setGuardando(false);
  }

  function editarInstruccion(item: InstruccionSimulador) {
    setEditandoId(item.id);
    setTitulo(String(item.titulo ?? ""));
    setContenido(String(item.contenido ?? ""));
    setOrden(String(item.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarInstruccion(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta instrucción?");

    if (!confirmar) return;

    const { error } = await supabase
      .from(TABLA_INSTRUCCIONES)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando instrucción:", error);
      alert("No se pudo eliminar la instrucción.");
      return;
    }

    if (simuladorId) {
      await cargarInstrucciones(simuladorId);
    }
  }

  async function moverOrden(index: number, direccion: -1 | 1) {
    const nuevoIndex = index + direccion;

    if (nuevoIndex < 0 || nuevoIndex >= instrucciones.length) return;

    const actual = instrucciones[index];
    const objetivo = instrucciones[nuevoIndex];

    const ordenActual = Number(actual.orden ?? index + 1);
    const ordenObjetivo = Number(objetivo.orden ?? nuevoIndex + 1);

    const r1 = await supabase
      .from(TABLA_INSTRUCCIONES)
      .update({ orden: ordenObjetivo })
      .eq("id", actual.id);

    if (r1.error) {
      console.error("Error moviendo instrucción:", r1.error);
      alert("No se pudo cambiar el orden.");
      return;
    }

    const r2 = await supabase
      .from(TABLA_INSTRUCCIONES)
      .update({ orden: ordenActual })
      .eq("id", objetivo.id);

    if (r2.error) {
      console.error("Error moviendo instrucción:", r2.error);
      alert("No se pudo cambiar el orden.");
      return;
    }

    if (simuladorId) {
      await cargarInstrucciones(simuladorId);
    }
  }

  const simuladorSeleccionado = simuladores.find(
    (simulador) => String(simulador.id) === String(simuladorId)
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Instrucciones de simuladores
          </h1>

          <p className="mt-3 max-w-4xl text-slate-400">
            Agrega textos independientes dentro del simulador. Estas instrucciones
            no pertenecen a una pregunta ni a una sección; solo aparecen en el
            orden que indiques.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin?seccion=simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Volver a simuladores
            </Link>

            {simuladorId && (
              <Link
                href={`/admin/secciones-simuladores?simulador=${simuladorId}`}
                className="rounded-xl border border-purple-700 px-5 py-3 font-semibold text-purple-300 hover:bg-purple-950"
              >
                Secciones
              </Link>
            )}

            {simuladorId && (
              <Link
                href={`/admin/preguntas-simuladores?simulador=${simuladorId}`}
                className="rounded-xl border border-cyan-700 px-5 py-3 font-semibold text-cyan-300 hover:bg-cyan-950"
              >
                Preguntas
              </Link>
            )}

            {simuladorId && (
              <Link
                href={`/simuladores/${simuladorId}`}
                target="_blank"
                className="rounded-xl border border-blue-700 px-5 py-3 font-semibold text-blue-300 hover:bg-blue-950"
              >
                Vista alumno
              </Link>
            )}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold">
              {editandoId ? "Editar instrucción" : "Crear instrucción"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Simulador
                </label>

                <select
                  value={simuladorId}
                  onChange={(e) => setSimuladorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona un simulador</option>
                  {simuladores.map((simulador) => (
                    <option key={simulador.id} value={simulador.id}>
                      {obtenerTitulo(simulador)}
                    </option>
                  ))}
                </select>
              </div>

              {simuladorSeleccionado && (
                <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4">
                  <p className="text-sm text-emerald-200">Simulador elegido</p>
                  <h3 className="mt-1 text-xl font-bold">
                    {obtenerTitulo(simuladorSeleccionado)}
                  </h3>

                  {obtenerDescripcion(simuladorSeleccionado) && (
                    <p className="mt-2 text-sm text-slate-400">
                      {obtenerDescripcion(simuladorSeleccionado)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Título opcional
                </label>

                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ejemplo: Lectura 1"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Texto de instrucción
                </label>

                <textarea
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  rows={10}
                  placeholder="Ejemplo: Lee el siguiente texto y responde las preguntas que aparecen a continuación..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Orden dentro del simulador
                </label>

                <input
                  type="number"
                  min="1"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Si quieres que esta instrucción aparezca antes de la pregunta
                  1, usa orden 1. Si quieres que aparezca después de varias
                  preguntas, usa un orden intermedio.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarInstruccion}
                  disabled={guardando || !simuladorId}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Crear instrucción"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm text-slate-400">
                Instrucciones del simulador seleccionado
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                {simuladorSeleccionado
                  ? obtenerTitulo(simuladorSeleccionado)
                  : "Selecciona un simulador"}
              </h2>
            </div>

            {cargando && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                Cargando...
              </div>
            )}

            {!cargando && !simuladorId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Selecciona un simulador para ver sus instrucciones.
              </div>
            )}

            {!cargando && simuladorId && instrucciones.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Este simulador todavía no tiene instrucciones independientes.
              </div>
            )}

            <div className="space-y-4">
              {instrucciones.map((instruccion, index) => (
                <article
                  key={instruccion.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Orden: {instruccion.orden ?? "Sin orden"}
                      </p>

                      {instruccion.titulo && (
                        <h3 className="mt-1 text-2xl font-bold">
                          {instruccion.titulo}
                        </h3>
                      )}

                      <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
                        {instruccion.contenido}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moverOrden(index, -1)}
                        disabled={index === 0}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => moverOrden(index, 1)}
                        disabled={index === instrucciones.length - 1}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => editarInstruccion(instruccion)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarInstruccion(instruccion.id)}
                        className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}