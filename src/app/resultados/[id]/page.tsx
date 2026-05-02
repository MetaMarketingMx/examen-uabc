"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DetalleRespuesta = {
  pregunta_id?: string | number | null;
  pregunta?: string;
  respuesta_usuario?: string;
  respuesta_correcta?: string;
  correcta?: boolean;
  dificultad?: string | null;
  explicacion?: string | null;
};

type Resultado = {
  id?: string | number | null;
  alumno_id?: string | null;
  alumno_email?: string | null;
  alumno_nombre?: string | null;
  tipo?: string | null;
  tipo_evaluacion?: string | null;
  parcial_id?: string | number | null;
  simulador_id?: string | number | null;
  titulo?: string | null;
  total_preguntas?: number | null;
  aciertos?: number | null;
  errores?: number | null;
  porcentaje?: number | null;
  calificacion?: number | null;
  tiempo_asignado_minutos?: number | null;
  tiempo_usado_segundos?: number | null;
  terminado_por_tiempo?: boolean | null;
  respuestas?: DetalleRespuesta[] | null;
  estadisticas?: {
    sin_responder?: number;
    total_preguntas?: number;
    aciertos?: number;
    errores?: number;
    porcentaje?: number;
  } | null;
  created_at?: string | null;
};

type Pregunta = {
  id: string | number;
  texto_pregunta?: string | null;
  pregunta?: string | null;
  texto?: string | null;
  imagen_pregunta?: string | null;

  opcion_a?: string | null;
  opcion_b?: string | null;
  opcion_c?: string | null;
  opcion_d?: string | null;

  imagen_opcion_a?: string | null;
  imagen_opcion_b?: string | null;
  imagen_opcion_c?: string | null;
  imagen_opcion_d?: string | null;

  respuesta_correcta?: string | null;
  respuesta?: string | null;

  explicacion?: string | null;
  justificacion?: string | null;
};

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "Sin fecha";

  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatearTiempo(segundos?: number | null) {
  const total = Number(segundos || 0);
  const min = Math.floor(total / 60);
  const seg = total % 60;

  return `${min} min ${seg} seg`;
}

function obtenerTipo(resultado?: Resultado | null) {
  return resultado?.tipo_evaluacion || resultado?.tipo || "evaluación";
}

function obtenerCalificacion(resultado?: Resultado | null) {
  return Number(resultado?.calificacion ?? resultado?.porcentaje ?? 0);
}

function textoDePregunta(
  pregunta?: Pregunta | null,
  detalle?: DetalleRespuesta
) {
  return (
    pregunta?.texto_pregunta ||
    pregunta?.pregunta ||
    pregunta?.texto ||
    detalle?.pregunta ||
    "Pregunta con imagen"
  );
}

function respuestaCorrectaDe(
  pregunta?: Pregunta | null,
  detalle?: DetalleRespuesta
) {
  return (
    pregunta?.respuesta_correcta ||
    pregunta?.respuesta ||
    detalle?.respuesta_correcta ||
    "Sin definir"
  ).toUpperCase();
}

function explicacionDe(
  pregunta?: Pregunta | null,
  detalle?: DetalleRespuesta
) {
  return (
    pregunta?.explicacion ||
    pregunta?.justificacion ||
    detalle?.explicacion ||
    ""
  );
}

function textoOpcion(pregunta: Pregunta | null | undefined, letra: string) {
  if (!pregunta) return "";

  if (letra === "A") return pregunta.opcion_a || "";
  if (letra === "B") return pregunta.opcion_b || "";
  if (letra === "C") return pregunta.opcion_c || "";
  if (letra === "D") return pregunta.opcion_d || "";

  return "";
}

function imagenOpcion(pregunta: Pregunta | null | undefined, letra: string) {
  if (!pregunta) return "";

  if (letra === "A") return pregunta.imagen_opcion_a || "";
  if (letra === "B") return pregunta.imagen_opcion_b || "";
  if (letra === "C") return pregunta.imagen_opcion_c || "";
  if (letra === "D") return pregunta.imagen_opcion_d || "";

  return "";
}

export default function ResultadoDetallePage() {
  const params = useParams();

  const resultadoId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actual, setActual] = useState(0);

  useEffect(() => {
    cargarResultado();
  }, [resultadoId]);

  async function cargarResultado() {
    setLoading(true);
    setError("");

    if (!resultadoId || resultadoId === "undefined") {
      setError("No se recibió el ID del resultado.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("resultados")
      .select("*")
      .eq("id", resultadoId)
      .single();

    if (error) {
      setError(`No se pudo cargar el resultado. ${error.message || ""}`);
      setLoading(false);
      return;
    }

    const resultadoData = data as Resultado;
    setResultado(resultadoData);

    const detalles = Array.isArray(resultadoData.respuestas)
      ? resultadoData.respuestas
      : [];

    const idsPreguntas = detalles
      .map((detalle) => detalle.pregunta_id)
      .filter((id) => id !== undefined && id !== null)
      .map((id) => String(id));

    if (idsPreguntas.length > 0) {
      const { data: preguntasData, error: preguntasError } = await supabase
        .from("preguntas")
        .select("*")
        .in("id", idsPreguntas);

      if (preguntasError) {
        console.error(preguntasError);
      } else {
        setPreguntas((preguntasData || []) as Pregunta[]);
      }
    }

    setLoading(false);
  }

  const detalles = useMemo(() => {
    return Array.isArray(resultado?.respuestas) ? resultado.respuestas : [];
  }, [resultado]);

  const detalleActual = detalles[actual];

  const preguntaActual = useMemo(() => {
    if (!detalleActual?.pregunta_id) return null;

    return (
      preguntas.find(
        (pregunta) => String(pregunta.id) === String(detalleActual.pregunta_id)
      ) || null
    );
  }, [preguntas, detalleActual]);

  const calificacion = obtenerCalificacion(resultado);
  const tipo = obtenerTipo(resultado);
  const correcta = respuestaCorrectaDe(preguntaActual, detalleActual);
  const respuestaUsuario = detalleActual?.respuesta_usuario || "Sin responder";

  const esCorrecta =
    Boolean(detalleActual?.correcta) ||
    respuestaUsuario.toUpperCase() === correcta.toUpperCase();

  function irAnterior() {
    if (actual > 0) {
      setActual((prev) => prev - 1);
    }
  }

  function irSiguiente() {
    if (actual < detalles.length - 1) {
      setActual((prev) => prev + 1);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Cargando detalle del resultado...
      </main>
    );
  }

  if (error || !resultado) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500 bg-red-950/40 p-8">
          <h1 className="text-3xl font-bold">No se pudo abrir el resultado</h1>

          <p className="mt-3 text-red-200">{error}</p>

          <Link
            href="/resultados"
            className="mt-6 inline-block rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
          >
            Volver a resultados
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
                Detalle del examen
              </p>

              <h1 className="text-4xl font-bold">
                {resultado.titulo || "Evaluación sin título"}
              </h1>

              <p className="mt-3 text-slate-400">
                {tipo === "parcial" ? "Parcial" : "Simulador"} ·{" "}
                {formatearFecha(resultado.created_at)}
              </p>

              {resultado.terminado_por_tiempo && (
                <p className="mt-4 rounded-xl border border-red-500 bg-red-950/50 px-4 py-3 text-red-200">
                  Este examen terminó porque se agotó el tiempo asignado.
                </p>
              )}
            </div>

            <Link
              href="/resultados"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Volver a resultados
            </Link>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-6">
          <ResumenCard
            titulo="Calificación"
            valor={String(calificacion)}
            color="text-sky-400"
          />

          <ResumenCard
            titulo="Aciertos"
            valor={String(resultado.aciertos || 0)}
            color="text-emerald-400"
          />

          <ResumenCard
            titulo="Errores"
            valor={String(resultado.errores || 0)}
            color="text-red-400"
          />

          <ResumenCard
            titulo="Sin responder"
            valor={String(resultado.estadisticas?.sin_responder || 0)}
            color="text-yellow-400"
          />

          <ResumenCard
            titulo="Total"
            valor={String(resultado.total_preguntas || 0)}
            color="text-white"
          />

          <ResumenCard
            titulo="Tiempo usado"
            valor={formatearTiempo(resultado.tiempo_usado_segundos)}
            color="text-pink-400"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Preguntas</h2>

            <p className="mt-2 text-sm text-slate-400">
              Selecciona una pregunta para revisar su detalle.
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {detalles.map((detalle, index) => {
                const activa = index === actual;
                const bien = Boolean(detalle.correcta);

                return (
                  <button
                    key={`${detalle.pregunta_id}-${index}`}
                    onClick={() => setActual(index)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      activa
                        ? "border-sky-400 bg-sky-950 text-sky-200"
                        : bien
                          ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                          : "border-red-700 bg-red-950/40 text-red-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p>
                <span className="font-bold text-emerald-400">Verde:</span>{" "}
                correcta
              </p>

              <p className="mt-1">
                <span className="font-bold text-red-400">Rojo:</span>{" "}
                incorrecta o sin responder
              </p>

              <p className="mt-1">
                <span className="font-bold text-sky-400">Azul:</span> pregunta
                actual
              </p>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            {!detalleActual ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                No hay detalle de respuestas para este resultado.
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-sky-400">
                      Pregunta {actual + 1} de {detalles.length}
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {textoDePregunta(preguntaActual, detalleActual)}
                    </h2>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      esCorrecta
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-red-950 text-red-300"
                    }`}
                  >
                    {esCorrecta ? "Correcta" : "Incorrecta"}
                  </div>
                </div>

                {preguntaActual?.imagen_pregunta && (
                  <img
                    src={preguntaActual.imagen_pregunta}
                    alt="Imagen de pregunta"
                    className="mb-5 max-h-[420px] w-full rounded-2xl bg-white object-contain"
                  />
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {["A", "B", "C", "D"].map((letra) => {
                    const texto = textoOpcion(preguntaActual, letra);
                    const imagen = imagenOpcion(preguntaActual, letra);

                    const fueElegida =
                      respuestaUsuario.toUpperCase() === letra.toUpperCase();

                    const esCorrectaOpcion =
                      correcta.toUpperCase() === letra.toUpperCase();

                    return (
                      <div
                        key={letra}
                        className={`rounded-2xl border p-4 ${
                          esCorrectaOpcion
                            ? "border-emerald-500 bg-emerald-950/40"
                            : fueElegida
                              ? "border-red-500 bg-red-950/40"
                              : "border-slate-800 bg-slate-950"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-bold text-sky-400">
                            Opción {letra}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {fueElegida && (
                              <span className="rounded-full bg-sky-950 px-3 py-1 text-xs font-bold text-sky-300">
                                Tu respuesta
                              </span>
                            )}

                            {esCorrectaOpcion && (
                              <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-300">
                                Correcta
                              </span>
                            )}
                          </div>
                        </div>

                        {imagen && (
                          <img
                            src={imagen}
                            alt={`Opción ${letra}`}
                            className="mb-3 max-h-[260px] w-full rounded-xl bg-white object-contain"
                          />
                        )}

                        {texto ? (
                          <p>{texto}</p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Sin texto registrado
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <section className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Respuesta del alumno
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {respuestaUsuario}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Respuesta correcta
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-400">
                      {correcta}
                    </p>
                  </div>
                </section>

                {explicacionDe(preguntaActual, detalleActual) && (
                  <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">Explicación</p>

                    <p className="mt-2 text-slate-200">
                      {explicacionDe(preguntaActual, detalleActual)}
                    </p>
                  </section>
                )}

                <div className="mt-8 flex justify-between gap-4">
                  <button
                    onClick={irAnterior}
                    disabled={actual === 0}
                    className="rounded-xl border border-slate-700 px-5 py-3 font-semibold disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  <button
                    onClick={irSiguiente}
                    disabled={actual === detalles.length - 1}
                    className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}