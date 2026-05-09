"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
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
  simulador_id?: string | number;
  [key: string]: any;
};

const TABLA_SIMULADORES = "simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";
const TABLA_RESULTADOS = "resultados_simuladores";

export default function SimuladorAlumnoPage() {
  const params = useParams();
  const rawId = params?.id;
  const simuladorId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const [simulador, setSimulador] = useState<Registro | null>(null);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [resultadoGuardado, setResultadoGuardado] = useState(false);
  const [guardandoResultado, setGuardandoResultado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [inicioTimestamp, setInicioTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!simuladorId) return;
    cargarSimulador();
  }, [simuladorId]);

  useEffect(() => {
    if (!simulador || mostrarResultado) return;

    const limite = Number(simulador.tiempo_minutos ?? 0);
    if (limite <= 0 || segundosRestantes === null) return;

    const intervalo = window.setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          window.clearInterval(intervalo);
          setTimeout(() => {
            terminarSimulador(true);
          }, 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [simulador, mostrarResultado, segundosRestantes, respuestas, preguntas]);

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

  function prepararHtml(html?: string) {
    if (!html) return "";

    let limpio = String(html);

    for (let i = 0; i < 10; i++) {
      const anterior = limpio;

      if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = limpio;
        limpio = textarea.value;
      }

      limpio = limpio
        .replace(/&amp;lt;/g, "<")
        .replace(/&amp;gt;/g, ">")
        .replace(/&amp;quot;/g, '"')
        .replace(/&amp;#34;/g, '"')
        .replace(/&amp;#39;/g, "'")
        .replace(/&amp;nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");

      if (limpio === anterior) break;
    }

    return limpio;
  }

  function contenidoVacio(html?: string) {
    const contenido = prepararHtml(html);
    const tieneImagen = /<img\b/i.test(contenido);

    const texto = contenido
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return !tieneImagen && texto.length === 0;
  }

  function extraerAtributo(etiqueta: string, atributo: string) {
    const regex = new RegExp(`${atributo}\\s*=\\s*["']([^"']+)["']`, "i");
    const resultado = etiqueta.match(regex);
    return resultado?.[1] ?? "";
  }

  function ContenidoPregunta({ html }: { html?: string }) {
    const contenido = prepararHtml(html);

    if (contenidoVacio(contenido)) return null;

    const partes: Array<
      | { tipo: "texto"; contenido: string }
      | { tipo: "imagen"; src: string; alt: string }
    > = [];

    const regexImagen = /<img\b[^>]*>/gi;
    let ultimoIndice = 0;
    let coincidencia: RegExpExecArray | null;

    while ((coincidencia = regexImagen.exec(contenido)) !== null) {
      const textoAntes = contenido.slice(ultimoIndice, coincidencia.index);

      if (textoAntes.trim()) {
        partes.push({ tipo: "texto", contenido: textoAntes });
      }

      const etiquetaImagen = coincidencia[0];
      const src = extraerAtributo(etiquetaImagen, "src");
      const alt = extraerAtributo(etiquetaImagen, "alt") || "Imagen";

      if (src) {
        partes.push({ tipo: "imagen", src, alt });
      }

      ultimoIndice = coincidencia.index + etiquetaImagen.length;
    }

    const textoDespues = contenido.slice(ultimoIndice);

    if (textoDespues.trim()) {
      partes.push({ tipo: "texto", contenido: textoDespues });
    }

    return (
      <div className="prose-exam text-slate-100">
        {partes.map((parte, index) => {
          if (parte.tipo === "imagen") {
            return (
              <img
                key={`imagen-${index}`}
                src={parte.src}
                alt={parte.alt}
                className="exam-image"
              />
            );
          }

          return (
            <span
              key={`texto-${index}`}
              dangerouslySetInnerHTML={{
                __html: prepararHtml(parte.contenido),
              }}
            />
          );
        })}
      </div>
    );
  }

  async function cargarSimulador() {
    setCargando(true);

    const { data: simuladorData, error: simuladorError } = await supabase
      .from(TABLA_SIMULADORES)
      .select("*")
      .eq("id", simuladorId)
      .single();

    if (simuladorError) {
      console.error("Error cargando simulador:", simuladorError);
      setSimulador(null);
      setPreguntas([]);
      setCargando(false);
      return;
    }

    setSimulador(simuladorData);

    const limite = Number(simuladorData.tiempo_minutos ?? 0);
    setSegundosRestantes(limite > 0 ? limite * 60 : null);
    setInicioTimestamp(Date.now());

    const { data: preguntasData, error: preguntasError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("simulador_id", simuladorId);

    if (preguntasError) {
      console.error("Error cargando preguntas:", preguntasError);
      setPreguntas([]);
    } else {
      setPreguntas(ordenarLista(preguntasData ?? []));
    }

    setCargando(false);
  }

  function calcularCorrectas(respuestasActuales: Record<string, string>) {
    return preguntas.filter((pregunta) => {
      const idPregunta = String(pregunta.id);
      const respuestaAlumno = respuestasActuales[idPregunta];
      const respuestaCorrecta = String(pregunta.respuesta_correcta ?? "").toUpperCase();

      return respuestaAlumno === respuestaCorrecta;
    }).length;
  }

  const totalCorrectas = useMemo(() => {
    return calcularCorrectas(respuestas);
  }, [preguntas, respuestas]);

  const calificacion =
    preguntas.length > 0 ? Math.round((totalCorrectas / preguntas.length) * 100) : 0;

  function seleccionarRespuesta(idPregunta: string, opcion: string) {
    if (mostrarResultado) return;

    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: opcion,
    }));
  }

  function formatearTiempo(segundos: number | null) {
    if (segundos === null) return "Sin límite";

    const minutos = Math.floor(segundos / 60);
    const seg = segundos % 60;

    return `${String(minutos).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  }

  function obtenerTiempoUsado() {
    if (!inicioTimestamp) return 0;
    return Math.max(0, Math.floor((Date.now() - inicioTimestamp) / 1000));
  }

  async function guardarResultado(respuestasActuales: Record<string, string>) {
    if (!simulador) return;

    const correctas = calcularCorrectas(respuestasActuales);
    const total = preguntas.length;
    const calif = total > 0 ? Math.round((correctas / total) * 100) : 0;
    const tiempoUsado = obtenerTiempoUsado();

    const detalleRespuestas = preguntas.map((item, index) => {
      const idPregunta = String(item.id);
      const respuestaAlumno = respuestasActuales[idPregunta] ?? "";
      const respuestaCorrecta = String(item.respuesta_correcta ?? "").toUpperCase();

      return {
        numero: index + 1,
        pregunta_id: item.id,
        pregunta: prepararHtml(item.pregunta ?? ""),
        opciones: [
          { clave: "A", contenido: prepararHtml(item.opcion_a ?? "") },
          { clave: "B", contenido: prepararHtml(item.opcion_b ?? "") },
          { clave: "C", contenido: prepararHtml(item.opcion_c ?? "") },
          { clave: "D", contenido: prepararHtml(item.opcion_d ?? "") },
        ],
        respuesta_alumno: respuestaAlumno,
        respuesta_correcta: respuestaCorrecta,
        correcta: respuestaAlumno === respuestaCorrecta,
        explicacion: item.explicacion ?? "",
      };
    });

    setGuardandoResultado(true);

    const { error } = await supabase.from(TABLA_RESULTADOS).insert({
      simulador_id: simuladorId,
      alumno_id: "sin-login",
      alumno_nombre: "Alumno sin login",
      total_preguntas: total,
      correctas,
      calificacion: calif,
      tiempo_limite_minutos: Number(simulador.tiempo_minutos ?? 0),
      tiempo_usado_segundos: tiempoUsado,
      respuestas: detalleRespuestas,
    });

    if (error) {
      console.error("Error guardando resultado:", error);
      setResultadoGuardado(false);
    } else {
      setResultadoGuardado(true);
    }

    setGuardandoResultado(false);
  }

  async function terminarSimulador(automatico = false) {
    if (preguntas.length === 0 || mostrarResultado || guardandoResultado) return;

    const sinResponder = preguntas.some((pregunta) => !respuestas[String(pregunta.id)]);

    if (sinResponder && !automatico) {
      const confirmar = confirm(
        "Hay preguntas sin responder. ¿Quieres terminar el simulador de todos modos?"
      );

      if (!confirmar) return;
    }

    setMostrarResultado(true);
    await guardarResultado(respuestas);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reiniciarSimulador() {
    setRespuestas({});
    setMostrarResultado(false);
    setResultadoGuardado(false);
    setGuardandoResultado(false);

    const limite = Number(simulador?.tiempo_minutos ?? 0);
    setSegundosRestantes(limite > 0 ? limite * 60 : null);
    setInicioTimestamp(Date.now());

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">Cargando simulador...</p>
        </section>
      </main>
    );
  }

  if (!simulador) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold">Simulador no encontrado</h1>

          <p className="mt-3 text-slate-400">
            No se encontró el simulador solicitado.
          </p>

          <Link
            href="/simuladores"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Volver a simuladores
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-cyan-500/50 bg-slate-950/95 px-5 py-4 text-center shadow-2xl backdrop-blur md:bottom-auto md:top-24">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
          Tiempo restante
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          {formatearTiempo(segundosRestantes)}
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
                Simulador
              </p>

              <h1 className="mt-3 text-4xl font-bold">
                {obtenerTitulo(simulador)}
              </h1>

              {obtenerDescripcion(simulador) && (
                <p className="mt-4 max-w-3xl text-slate-300">
                  {obtenerDescripcion(simulador)}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4 text-center">
              <p className="text-sm text-cyan-300">Tiempo restante</p>
              <p className="mt-1 text-3xl font-bold">
                {formatearTiempo(segundosRestantes)}
              </p>
            </div>
          </div>

          {mostrarResultado && (
            <div className="mt-6 rounded-2xl border border-cyan-600/40 bg-cyan-950/30 p-5">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Resultado
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {totalCorrectas} de {preguntas.length} correctas — {calificacion}%
              </h2>

              <p className="mt-2 text-slate-300">
                Tiempo usado: {formatearTiempo(obtenerTiempoUsado())}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {guardandoResultado
                  ? "Guardando resultado..."
                  : resultadoGuardado
                  ? "Resultado guardado correctamente."
                  : "El resultado no se pudo guardar. Revisa la consola."}
              </p>
            </div>
          )}
        </header>

        {preguntas.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
            <h2 className="text-2xl font-bold">
              Este simulador todavía no tiene preguntas
            </h2>

            <p className="mt-3 text-slate-400">
              Agrega preguntas desde el panel de administración.
            </p>

            <Link
              href="/simuladores"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Volver a simuladores
            </Link>
          </section>
        ) : (
          <>
            <section className="space-y-6">
              {preguntas.map((pregunta, index) => {
                const idPregunta = String(pregunta.id);
                const respuestaAlumno = respuestas[idPregunta];
                const respuestaCorrecta = String(
                  pregunta.respuesta_correcta ?? ""
                ).toUpperCase();

                const opciones = [
                  { clave: "A", html: pregunta.opcion_a },
                  { clave: "B", html: pregunta.opcion_b },
                  { clave: "C", html: pregunta.opcion_c },
                  { clave: "D", html: pregunta.opcion_d },
                ].filter((opcion) => !contenidoVacio(String(opcion.html ?? "")));

                return (
                  <article
                    key={pregunta.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6"
                  >
                    <p className="text-sm font-semibold text-blue-300">
                      Pregunta {index + 1}
                    </p>

                    <div className="mt-3">
                      <ContenidoPregunta html={pregunta.pregunta} />
                    </div>

                    <div className="mt-5 space-y-3">
                      {opciones.map((opcion) => {
                        const seleccionada = respuestaAlumno === opcion.clave;
                        const esCorrecta = respuestaCorrecta === opcion.clave;

                        let clase =
                          "border-slate-700 bg-slate-950 hover:bg-slate-800";

                        if (mostrarResultado && esCorrecta) {
                          clase = "border-green-600 bg-green-950 text-green-200";
                        } else if (mostrarResultado && seleccionada && !esCorrecta) {
                          clase = "border-red-600 bg-red-950 text-red-200";
                        } else if (seleccionada) {
                          clase = "border-blue-600 bg-blue-950 text-blue-100";
                        }

                        return (
                          <button
                            key={opcion.clave}
                            type="button"
                            onClick={() => seleccionarRespuesta(idPregunta, opcion.clave)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${clase}`}
                          >
                            <p className="mb-2 font-bold">{opcion.clave})</p>
                            <ContenidoPregunta html={opcion.html} />
                          </button>
                        );
                      })}
                    </div>

                    {mostrarResultado && pregunta.explicacion && (
                      <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                        <p className="font-semibold text-yellow-300">
                          Explicación
                        </p>

                        <p className="mt-2 text-slate-300">
                          {pregunta.explicacion}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <section className="mt-8 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/simuladores"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-white hover:bg-slate-800"
              >
                Volver a simuladores
              </Link>

              {mostrarResultado ? (
                <button
                  type="button"
                  onClick={reiniciarSimulador}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
                >
                  Reintentar simulador
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => terminarSimulador(false)}
                  className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Terminar simulador
                </button>
              )}
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .prose-exam {
          line-height: 1.6;
          word-break: break-word;
        }

        .prose-exam img,
        .exam-image {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #334155;
          display: block;
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

        .prose-exam font[size="4"] {
          font-size: 1.25rem;
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