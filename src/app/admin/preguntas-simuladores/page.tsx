"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RichExamEditor, isRichTextEmpty } from "@/components/RichExamEditor";

type Registro = {
  id: string | number;
  titulo?: string;
  nombre?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  tiempo_minutos?: number;
  pregunta?: string;
  opcion_a?: string;
  opcion_b?: string;
  opcion_c?: string;
  opcion_d?: string;
  respuesta_correcta?: string;
  explicacion?: string;
  orden?: number;
  [key: string]: any;
};

const TABLA_SIMULADORES = "simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";

export default function AdminPreguntasSimuladoresPage() {
  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);
  const [simuladorId, setSimuladorId] = useState("");
  const [tiempoMinutos, setTiempoMinutos] = useState("0");

  const [pregunta, setPregunta] = useState("");
  const [opcionA, setOpcionA] = useState("");
  const [opcionB, setOpcionB] = useState("");
  const [opcionC, setOpcionC] = useState("");
  const [opcionD, setOpcionD] = useState("");

  const [respuestaCorrecta, setRespuestaCorrecta] = useState("A");
  const [explicacion, setExplicacion] = useState("");
  const [orden, setOrden] = useState("1");

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  useEffect(() => {
    if (!simuladorId) {
      setPreguntas([]);
      setTiempoMinutos("0");
      limpiarFormulario();
      return;
    }

    const simulador = simuladores.find((item) => String(item.id) === String(simuladorId));
    setTiempoMinutos(String(simulador?.tiempo_minutos ?? 0));
    cargarPreguntas(simuladorId);
  }, [simuladorId]);

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
  }

  function obtenerDescripcion(item: Registro | null | undefined) {
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

  async function cargarSimuladores() {
    setCargando(true);

    const { data, error } = await supabase.from(TABLA_SIMULADORES).select("*");

    if (error) {
      console.error("Error cargando simuladores:", error);
      alert("No se pudieron cargar los simuladores.");
      setCargando(false);
      return;
    }

    setSimuladores(ordenarLista(data ?? []));
    setCargando(false);
  }

  async function cargarPreguntas(idSimulador: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("simulador_id", idSimulador);

    if (error) {
      console.error("Error cargando preguntas:", error);
      alert("No se pudieron cargar las preguntas.");
      setCargando(false);
      return;
    }

    const listaOrdenada = ordenarLista(data ?? []);
    setPreguntas(listaOrdenada);

    if (!editandoId) {
      const siguienteOrden =
        listaOrdenada.length > 0
          ? Math.max(...listaOrdenada.map((item) => Number(item.orden ?? 0))) + 1
          : 1;

      setOrden(String(siguienteOrden));
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setPregunta("");
    setOpcionA("");
    setOpcionB("");
    setOpcionC("");
    setOpcionD("");
    setRespuestaCorrecta("A");
    setExplicacion("");
    setOrden("1");
  }

  async function guardarTiempoSimulador() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    const { error } = await supabase
      .from(TABLA_SIMULADORES)
      .update({ tiempo_minutos: Number(tiempoMinutos) || 0 })
      .eq("id", simuladorId);

    if (error) {
      console.error("Error guardando tiempo:", error);
      alert("No se pudo guardar el tiempo del simulador.");
      return;
    }

    alert("Tiempo del simulador guardado.");
    await cargarSimuladores();
  }

  async function guardarPregunta() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    if (isRichTextEmpty(pregunta)) {
      alert("Escribe la pregunta o pega una imagen.");
      return;
    }

    if (isRichTextEmpty(opcionA) || isRichTextEmpty(opcionB)) {
      alert("Al menos debes llenar la opción A y la opción B.");
      return;
    }

    setGuardando(true);

    const payload = {
      simulador_id: simuladorId,
      pregunta,
      opcion_a: opcionA,
      opcion_b: opcionB,
      opcion_c: opcionC,
      opcion_d: opcionD,
      respuesta_correcta: respuestaCorrecta,
      explicacion: explicacion.trim(),
      orden: Number(orden) || 1,
    };

    const respuesta = editandoId
      ? await supabase.from(TABLA_PREGUNTAS).update(payload).eq("id", editandoId)
      : await supabase.from(TABLA_PREGUNTAS).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando pregunta:", respuesta.error);
      alert("No se pudo guardar la pregunta.");
      setGuardando(false);
      return;
    }

    await cargarPreguntas(simuladorId);
    limpiarFormulario();
    setGuardando(false);
  }

  function editarPregunta(item: Registro) {
    setEditandoId(item.id);
    setPregunta(String(item.pregunta ?? ""));
    setOpcionA(String(item.opcion_a ?? ""));
    setOpcionB(String(item.opcion_b ?? ""));
    setOpcionC(String(item.opcion_c ?? ""));
    setOpcionD(String(item.opcion_d ?? ""));
    setRespuestaCorrecta(String(item.respuesta_correcta ?? "A").toUpperCase());
    setExplicacion(String(item.explicacion ?? ""));
    setOrden(String(item.orden ?? 1));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarPregunta(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta pregunta?");
    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_PREGUNTAS).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando pregunta:", error);
      alert("No se pudo eliminar la pregunta.");
      return;
    }

    if (simuladorId) {
      await cargarPreguntas(simuladorId);
    }
  }

  function VistaHtml({ html }: { html?: string }) {
    if (!html || isRichTextEmpty(html)) return null;

    return (
      <div
        className="prose-exam mt-2 text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const simuladorSeleccionado = simuladores.find(
    (simulador) => String(simulador.id) === String(simuladorId)
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Preguntas de simuladores
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Agrega preguntas con formato, imágenes pegadas con Ctrl + V, tiempo límite y respuestas correctas.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Volver al admin
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[520px_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold">
              {editandoId ? "Editar pregunta" : "Agregar pregunta"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Simulador
                </label>
                <select
                  value={simuladorId}
                  onChange={(e) => setSimuladorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Selecciona un simulador</option>
                  {simuladores.map((simulador) => (
                    <option key={simulador.id} value={simulador.id}>
                      {obtenerTitulo(simulador)}
                    </option>
                  ))}
                </select>
              </div>

              {simuladorId && (
                <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/20 p-4">
                  <label className="mb-2 block text-sm font-medium text-cyan-200">
                    Tiempo límite del simulador en minutos
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={tiempoMinutos}
                    onChange={(e) => setTiempoMinutos(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />

                  <p className="mt-2 text-sm text-slate-400">
                    Usa 0 para dejar el simulador sin límite.
                  </p>

                  <button
                    type="button"
                    onClick={guardarTiempoSimulador}
                    className="mt-3 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    Guardar tiempo
                  </button>
                </div>
              )}

              <RichExamEditor
                label="Pregunta con formato"
                value={pregunta}
                onChange={setPregunta}
                placeholder="Escribe la pregunta. También puedes pegar una imagen con Ctrl + V."
                folder="simuladores"
              />

              <RichExamEditor
                label="Opción A"
                value={opcionA}
                onChange={setOpcionA}
                placeholder="Texto, fórmula o imagen de la opción A"
                folder="simuladores"
              />

              <RichExamEditor
                label="Opción B"
                value={opcionB}
                onChange={setOpcionB}
                placeholder="Texto, fórmula o imagen de la opción B"
                folder="simuladores"
              />

              <RichExamEditor
                label="Opción C"
                value={opcionC}
                onChange={setOpcionC}
                placeholder="Texto, fórmula o imagen de la opción C"
                folder="simuladores"
              />

              <RichExamEditor
                label="Opción D"
                value={opcionD}
                onChange={setOpcionD}
                placeholder="Texto, fórmula o imagen de la opción D"
                folder="simuladores"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Respuesta correcta
                  </label>
                  <select
                    value={respuestaCorrecta}
                    onChange={(e) => setRespuestaCorrecta(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Explicación
                </label>
                <textarea
                  value={explicacion}
                  onChange={(e) => setExplicacion(e.target.value)}
                  rows={4}
                  placeholder="Explica por qué esa es la respuesta correcta"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarPregunta}
                  disabled={guardando || !simuladorId}
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Agregar pregunta"}
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
                Preguntas del simulador seleccionado
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                {simuladorSeleccionado
                  ? obtenerTitulo(simuladorSeleccionado)
                  : "Selecciona un simulador"}
              </h2>

              {simuladorSeleccionado && obtenerDescripcion(simuladorSeleccionado) && (
                <p className="mt-2 text-slate-400">
                  {obtenerDescripcion(simuladorSeleccionado)}
                </p>
              )}

              {simuladorSeleccionado && (
                <Link
                  href={`/simuladores/${simuladorSeleccionado.id}`}
                  target="_blank"
                  className="mt-4 inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Ver como alumno →
                </Link>
              )}
            </div>

            {cargando && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                Cargando...
              </div>
            )}

            {!cargando && !simuladorId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Selecciona un simulador para ver sus preguntas.
              </div>
            )}

            {!cargando && simuladorId && preguntas.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Este simulador todavía no tiene preguntas.
              </div>
            )}

            <div className="space-y-4">
              {preguntas.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="w-full">
                      <p className="text-sm text-slate-500">
                        Pregunta {index + 1} · Orden: {item.orden ?? "Sin orden"}
                      </p>

                      <VistaHtml html={item.pregunta} />

                      <div className="mt-4 grid gap-3 text-sm text-slate-300">
                        {[
                          ["A", item.opcion_a],
                          ["B", item.opcion_b],
                          ["C", item.opcion_c],
                          ["D", item.opcion_d],
                        ].map(([letra, html]: any) => (
                          <div
                            key={letra}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                          >
                            <p className="mb-2 font-bold">{letra})</p>
                            <VistaHtml html={html} />
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-sm font-bold text-green-300">
                        Respuesta correcta: {item.respuesta_correcta}
                      </p>

                      {item.explicacion && (
                        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                          <p className="text-sm font-bold text-yellow-300">
                            Explicación
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {item.explicacion}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editarPregunta(item)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarPregunta(item.id)}
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

      <style jsx global>{`
        .prose-exam img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #334155;
        }

        .prose-exam h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0.5rem 0;
        }

        .prose-exam ul {
          list-style: disc;
          padding-left: 1.5rem;
        }

        .prose-exam font[size="5"] {
          font-size: 1.5rem;
        }

        .prose-exam font[size="6"] {
          font-size: 2rem;
        }
      `}</style>
    </main>
  );
}