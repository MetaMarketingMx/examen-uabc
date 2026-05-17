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

type SeccionSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  orden?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
};

const TABLA_SIMULADORES = "simuladores";
const TABLA_SECCIONES = "secciones_simuladores";

export default function AdminSeccionesSimuladoresPage() {
  const searchParams = useSearchParams();
  const simuladorUrl = searchParams.get("simulador") || "";

  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [simuladorId, setSimuladorId] = useState(simuladorUrl);
  const [secciones, setSecciones] = useState<SeccionSimulador[]>([]);

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [nombre, setNombre] = useState("");
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
      setSecciones([]);
      limpiarFormulario();
      return;
    }

    cargarSecciones(simuladorId);
  }, [simuladorId]);

  function obtenerTitulo(item: Registro | SeccionSimulador | null | undefined) {
    if (!item) return "";

    const anyItem = item as any;

    return String(
      anyItem.nombre ??
        anyItem.titulo ??
        anyItem.title ??
        `Registro ${anyItem.id}`
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

  function siguienteOrden(lista: SeccionSimulador[]) {
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

  async function cargarSecciones(idSimulador: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_SECCIONES)
      .select("*")
      .eq("simulador_id", String(idSimulador));

    if (error) {
      console.error("Error cargando secciones:", error);
      alert("No se pudieron cargar las secciones.");
      setSecciones([]);
      setCargando(false);
      return;
    }

    const lista = ordenarLista((data ?? []) as SeccionSimulador[]);
    setSecciones(lista);

    if (!editandoId) {
      setOrden(String(siguienteOrden(lista)));
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setOrden(String(siguienteOrden(secciones)));
  }

  async function guardarSeccion() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    if (!nombre.trim()) {
      alert("Escribe el nombre de la sección.");
      return;
    }

    setGuardando(true);

    const payload = {
      simulador_id: String(simuladorId),
      nombre: nombre.trim(),
      orden: Number(orden) || siguienteOrden(secciones),
      updated_at: new Date().toISOString(),
    };

    const respuesta = editandoId
      ? await supabase.from(TABLA_SECCIONES).update(payload).eq("id", editandoId)
      : await supabase.from(TABLA_SECCIONES).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando sección:", respuesta.error);
      alert("No se pudo guardar la sección.");
      setGuardando(false);
      return;
    }

    await cargarSecciones(simuladorId);
    setEditandoId(null);
    setNombre("");
    setOrden(String(siguienteOrden(secciones)));
    setGuardando(false);
  }

  function editarSeccion(item: SeccionSimulador) {
    setEditandoId(item.id);
    setNombre(obtenerTitulo(item));
    setOrden(String(item.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarSeccion(id: string | number) {
    const confirmar = confirm(
      "¿Seguro que quieres eliminar esta sección? Las preguntas que usen esta sección podrían quedar sin sección."
    );

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_SECCIONES).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando sección:", error);
      alert("No se pudo eliminar la sección.");
      return;
    }

    if (simuladorId) {
      await cargarSecciones(simuladorId);
    }
  }

  async function actualizarOrdenCompleto(listaOrdenada: SeccionSimulador[]) {
    const actualizaciones = listaOrdenada.map((item, index) =>
      supabase
        .from(TABLA_SECCIONES)
        .update({
          orden: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
    );

    const resultados = await Promise.all(actualizaciones);
    const error = resultados.find((resultado) => resultado.error)?.error;

    if (error) {
      console.error("Error actualizando orden:", error);
      alert("No se pudo actualizar el orden.");
      return false;
    }

    return true;
  }

  async function moverOrden(index: number, direccion: -1 | 1) {
    const listaActual = ordenarLista(secciones);
    const nuevoIndex = index + direccion;

    if (nuevoIndex < 0 || nuevoIndex >= listaActual.length) return;

    const nuevaLista = [...listaActual];
    const temporal = nuevaLista[index];
    nuevaLista[index] = nuevaLista[nuevoIndex];
    nuevaLista[nuevoIndex] = temporal;

    const ok = await actualizarOrdenCompleto(nuevaLista);

    if (ok && simuladorId) {
      await cargarSecciones(simuladorId);
    }
  }

  const simuladorSeleccionado = simuladores.find(
    (simulador) => String(simulador.id) === String(simuladorId)
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-purple-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Secciones de simuladores
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Las secciones son las áreas del examen, por ejemplo Comprensión
            lectora, Lengua escrita y Matemáticas. Sirven para clasificar las
            preguntas y calcular resultados por área.
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
                href={`/admin/preguntas-simuladores?simulador=${simuladorId}`}
                className="rounded-xl border border-cyan-700 px-5 py-3 font-semibold text-cyan-300 hover:bg-cyan-950"
              >
                Ir a preguntas
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
              {editandoId ? "Editar sección" : "Crear sección"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Simulador
                </label>

                <select
                  value={simuladorId}
                  onChange={(e) => setSimuladorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500"
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
                <div className="rounded-2xl border border-purple-700/40 bg-purple-950/20 p-4">
                  <p className="text-sm text-purple-200">Simulador elegido</p>
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
                  Nombre de la sección
                </label>

                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ejemplo: Comprensión lectora"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Orden
                </label>

                <input
                  type="number"
                  min="1"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarSeccion}
                  disabled={guardando || !simuladorId}
                  className="flex-1 rounded-xl bg-purple-500 px-4 py-3 font-bold text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Crear sección"}
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
                Secciones del simulador seleccionado
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
                Selecciona un simulador para ver sus secciones.
              </div>
            )}

            {!cargando && simuladorId && secciones.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Este simulador todavía no tiene secciones.
              </div>
            )}

            <div className="space-y-4">
              {ordenarLista(secciones).map((seccion, index) => (
                <article
                  key={seccion.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Orden: {index + 1}
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {obtenerTitulo(seccion)}
                      </h3>
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
                        disabled={index === secciones.length - 1}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => editarSeccion(seccion)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarSeccion(seccion.id)}
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