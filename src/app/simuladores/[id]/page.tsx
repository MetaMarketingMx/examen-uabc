"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pregunta = {
  id: string;
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
  dificultad?: string | null;
};

type Simulador = {
  id: string;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
};

type DetalleRespuesta = {
  pregunta_id: string;
  pregunta: string;
  respuesta_usuario: string;
  respuesta_correcta: string;
  correcta: boolean;
  dificultad?: string | null;
  explicacion?: string | null;
};

function tituloDe(item?: Simulador | null) {
  return item?.nombre || item?.titulo || "Simulador";
}

function textoDePregunta(pregunta?: Pregunta | null) {
  if (!pregunta) return "";
  return pregunta.texto_pregunta || pregunta.pregunta || pregunta.texto || "";
}

function respuestaCorrectaDe(pregunta?: Pregunta | null) {
  if (!pregunta) return "";
  return (pregunta.respuesta_correcta || pregunta.respuesta || "").toUpperCase();
}

function explicacionDe(pregunta?: Pregunta | null) {
  if (!pregunta) return "";
  return pregunta.explicacion || pregunta.justificacion || "";
}

function formatearTiempo(segundos: number) {
  const seguro = Math.max(0, segundos);
  const min = Math.floor(seguro / 60);
  const seg = seguro % 60;

  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export default function SimuladorPage() {
  const params = useParams();
  const simuladorId = String(params.id);

  const [simulador, setSimulador] = useState<Simulador | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);

  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  const [terminado, setTerminado] = useState(false);
  const [terminadoPorTiempo, setTerminadoPorTiempo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  const [tiempoAsignadoMinutos, setTiempoAsignadoMinutos] = useState(60);
  const [segundosRestantes, setSegundosRestantes] = useState(60 * 60);

  const resultadoGuardadoRef = useRef(false);

  useEffect(() => {
    cargarDatos();
  }, [simuladorId]);

  useEffect(() => {
    if (loading || terminado || preguntas.length === 0) return;

    const intervalo = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [loading, terminado, preguntas.length]);

  useEffect(() => {
    if (
      !loading &&
      !terminado &&
      preguntas.length > 0 &&
      segundosRestantes === 0
    ) {
      terminarExamen(true);
    }
  }, [segundosRestantes, loading, terminado, preguntas.length]);

  async function cargarDatos() {
    setLoading(true);
    setErrorGuardar("");
    resultadoGuardadoRef.current = false;

    const { data: simuladorData } = await supabase
      .from("simuladores")
      .select("*")
      .eq("id", simuladorId)
      .single();

    const { data: preguntasData } = await supabase
      .from("preguntas")
      .select("*")
      .eq("simulador_id", simuladorId)
      .order("orden", { ascending: true });

    const simuladorInfo = (simuladorData || null) as Simulador | null;
    const minutos = Number(simuladorInfo?.tiempo_minutos || 60);

    setSimulador(simuladorInfo);
    setPreguntas((preguntasData || []) as Pregunta[]);
    setTiempoAsignadoMinutos(minutos);
    setSegundosRestantes(minutos * 60);
    setActual(0);
    setRespuestas({});
    setTerminado(false);
    setTerminadoPorTiempo(false);
    setLoading(false);
  }

  const preguntaActual = preguntas[actual];

  const estadisticas = useMemo(() => {
    let aciertos = 0;
    let errores = 0;
    let sinResponder = 0;

    preguntas.forEach((pregunta) => {
      const respuestaUsuario = respuestas[pregunta.id] || "";
      const correcta = respuestaCorrectaDe(pregunta);

      if (!respuestaUsuario) {
        sinResponder += 1;
      } else if (respuestaUsuario.toUpperCase() === correcta) {
        aciertos += 1;
      } else {
        errores += 1;
      }
    });

    const total = preguntas.length;
    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;

    return {
      total,
      aciertos,
      errores,
      sinResponder,
      porcentaje,
    };
  }, [preguntas, respuestas]);

  const tiempoUsadoSegundos = Math.max(
    0,
    tiempoAsignadoMinutos * 60 - segundosRestantes
  );

  function seleccionarRespuesta(letra: string) {
    if (!preguntaActual || terminado) return;

    setRespuestas((prev) => ({
      ...prev,
      [preguntaActual.id]: letra,
    }));
  }

  function siguiente() {
    if (actual < preguntas.length - 1) {
      setActual((prev) => prev + 1);
    } else {
      terminarExamen(false);
    }
  }

  function anterior() {
    if (actual > 0) {
      setActual((prev) => prev - 1);
    }
  }

  async function terminarExamen(porTiempo: boolean) {
    if (resultadoGuardadoRef.current) return;

    resultadoGuardadoRef.current = true;
    setGuardando(true);
    setErrorGuardar("");
    setTerminadoPorTiempo(porTiempo);

    const tiempoAsignadoSegundos = tiempoAsignadoMinutos * 60;

    const tiempoUsado = porTiempo
      ? tiempoAsignadoSegundos
      : Math.min(tiempoAsignadoSegundos, tiempoUsadoSegundos);

    const detalles: DetalleRespuesta[] = preguntas.map((pregunta) => {
      const respuestaUsuario = respuestas[pregunta.id] || "";
      const correcta = respuestaCorrectaDe(pregunta);

      return {
        pregunta_id: pregunta.id,
        pregunta: textoDePregunta(pregunta) || "Pregunta con imagen",
        respuesta_usuario: respuestaUsuario || "Sin responder",
        respuesta_correcta: correcta || "Sin definir",
        correcta:
          Boolean(respuestaUsuario) &&
          respuestaUsuario.toUpperCase() === correcta,
        dificultad: pregunta.dificultad || null,
        explicacion: explicacionDe(pregunta) || null,
      };
    });

    const payload = {
      alumno_id: "alumno_demo",
      alumno_email: "alumno_demo@examen-uabc.local",
      alumno_nombre: "Alumno demo",

      tipo: "simulador",
      tipo_evaluacion: "simulador",

      parcial_id: null,
      simulador_id: simuladorId,
      titulo: tituloDe(simulador),

      total_preguntas: estadisticas.total,
      aciertos: estadisticas.aciertos,
      errores: estadisticas.errores,
      porcentaje: estadisticas.porcentaje,
      calificacion: estadisticas.porcentaje,

      tiempo_asignado_minutos: tiempoAsignadoMinutos,
      tiempo_usado_segundos: tiempoUsado,
      terminado_por_tiempo: porTiempo,

      respuestas: detalles,
      estadisticas: {
        total_preguntas: estadisticas.total,
        aciertos: estadisticas.aciertos,
        errores: estadisticas.errores,
        sin_responder: estadisticas.sinResponder,
        porcentaje: estadisticas.porcentaje,
      },
    };

    const { error } = await supabase.from("resultados").insert(payload);

    if (error) {
      const mensajeError =
        "El resultado se calculó, pero no se pudo guardar. " +
        "Código: " +
        (error.code || "sin código") +
        " | Mensaje: " +
        (error.message || "sin mensaje") +
        " | Detalle: " +
        (error.details || "sin detalle");

      setErrorGuardar(mensajeError);
    }

    setGuardando(false);
    setTerminado(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Cargando simulador...
      </main>
    );
  }

  if (!preguntas.length) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold">{tituloDe(simulador)}</h1>

          <p className="mt-4 text-slate-300">
            Este simulador todavía no tiene preguntas.
          </p>

          <Link
            href="/simuladores"
            className="mt-6 inline-block rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
          >
            Volver a simuladores
          </Link>
        </div>
      </main>
    );
  }

  if (terminado) {
    const aprobado = estadisticas.porcentaje >= 60;

    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Resultado del simulador
          </p>

          <h1 className="mt-2 text-4xl font-bold">{tituloDe(simulador)}</h1>

          <p className="mt-3 text-slate-400">
            Este es el resumen de tu simulador. Puedes revisar tu calificación,
            tiempo usado, respuestas correctas, errores y retroalimentación.
          </p>

          {terminadoPorTiempo && (
            <div className="mt-5 rounded-2xl border border-red-500 bg-red-950/50 p-4 text-red-200">
              El simulador terminó porque se agotó el tiempo asignado.
            </div>
          )}

          {errorGuardar && (
            <div className="mt-5 rounded-2xl border border-yellow-500 bg-yellow-950/50 p-4 text-yellow-200">
              {errorGuardar}
            </div>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-6">
            <ResultadoCard
              titulo="Calificación"
              valor={String(estadisticas.porcentaje)}
              color="text-sky-400"
            />

            <ResultadoCard
              titulo="Aciertos"
              valor={String(estadisticas.aciertos)}
              color="text-emerald-400"
            />

            <ResultadoCard
              titulo="Errores"
              valor={String(estadisticas.errores)}
              color="text-red-400"
            />

            <ResultadoCard
              titulo="Sin responder"
              valor={String(estadisticas.sinResponder)}
              color="text-yellow-400"
            />

            <ResultadoCard
              titulo="Total"
              valor={String(estadisticas.total)}
              color="text-white"
            />

            <ResultadoCard
              titulo="Tiempo usado"
              valor={formatearTiempo(tiempoUsadoSegundos)}
              color="text-pink-400"
            />
          </section>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-2xl font-bold">Resumen general</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Estado</p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    aprobado ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {aprobado ? "Aprobado" : "Requiere repaso"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Tiempo asignado</p>

                <p className="mt-2 text-2xl font-bold text-sky-400">
                  {tiempoAsignadoMinutos} minutos
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Retroalimentación</p>

              <p className="mt-2 text-slate-200">
                {estadisticas.porcentaje >= 90
                  ? "Excelente resultado. Tienes un dominio muy fuerte en este simulador."
                  : estadisticas.porcentaje >= 70
                    ? "Buen resultado. Conviene revisar las preguntas incorrectas para mejorar."
                    : estadisticas.porcentaje >= 60
                      ? "Resultado aprobatorio, pero se recomienda repasar antes de intentar otro simulador."
                      : "Se recomienda estudiar nuevamente los temas relacionados y volver a intentar el simulador."}
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-2xl font-bold">Resumen de respuestas</h2>

            <div className="mt-5 grid gap-4">
              {preguntas.map((pregunta, index) => {
                const usuario = respuestas[pregunta.id] || "";
                const correcta = respuestaCorrectaDe(pregunta);
                const bien =
                  Boolean(usuario) && usuario.toUpperCase() === correcta;

                return (
                  <div
                    key={pregunta.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <p className="text-sm font-bold text-sky-400">
                          Pregunta {index + 1}
                        </p>

                        <h3 className="mt-1 font-semibold">
                          {textoDePregunta(pregunta) || "Pregunta con imagen"}
                        </h3>
                      </div>

                      <div
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${
                          bien
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-red-950 text-red-300"
                        }`}
                      >
                        {bien ? "Correcta" : "Incorrecta"}
                      </div>
                    </div>

                    {pregunta.imagen_pregunta && (
                      <img
                        src={pregunta.imagen_pregunta}
                        alt="Imagen de pregunta"
                        className="mt-4 max-h-[320px] w-full rounded-xl bg-white object-contain"
                      />
                    )}

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-950 p-4">
                        <p className="text-sm text-slate-400">Tu respuesta</p>

                        <p className="mt-1 font-bold text-white">
                          {usuario || "Sin responder"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950 p-4">
                        <p className="text-sm text-slate-400">
                          Respuesta correcta
                        </p>

                        <p className="mt-1 font-bold text-emerald-400">
                          {correcta || "Sin definir"}
                        </p>
                      </div>
                    </div>

                    {explicacionDe(pregunta) && (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-sm text-slate-400">Explicación</p>

                        <p className="mt-1 text-slate-200">
                          {explicacionDe(pregunta)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/panel-alumno"
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
            >
              Volver al panel
            </Link>

            <Link
              href="/resultados"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold"
            >
              Ver mis calificaciones
            </Link>

            <Link
              href="/simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold"
            >
              Volver a simuladores
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const tiempoCritico = segundosRestantes <= 60;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
                Simulador
              </p>

              <h1 className="mt-2 text-3xl font-bold">{tituloDe(simulador)}</h1>

              <p className="mt-3 text-slate-400">
                Pregunta {actual + 1} de {preguntas.length}
              </p>
            </div>

            <div
              className={`rounded-2xl border px-6 py-4 text-center ${
                tiempoCritico
                  ? "border-red-500 bg-red-950 text-red-200"
                  : "border-sky-500 bg-sky-950 text-sky-200"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide">
                Tiempo restante
              </p>

              <p className="mt-1 text-4xl font-bold">
                {formatearTiempo(segundosRestantes)}
              </p>

              <p className="mt-1 text-xs">
                Tiempo asignado: {tiempoAsignadoMinutos} min
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          {preguntaActual.imagen_pregunta && (
            <img
              src={preguntaActual.imagen_pregunta}
              alt="Imagen de pregunta"
              className="mb-5 max-h-[420px] w-full rounded-2xl bg-white object-contain"
            />
          )}

          {textoDePregunta(preguntaActual) && (
            <h2 className="mb-5 text-2xl font-bold">
              {textoDePregunta(preguntaActual)}
            </h2>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Opcion
              letra="A"
              texto={preguntaActual.opcion_a}
              imagen={preguntaActual.imagen_opcion_a}
              seleccionada={respuestas[preguntaActual.id] === "A"}
              onClick={() => seleccionarRespuesta("A")}
            />

            <Opcion
              letra="B"
              texto={preguntaActual.opcion_b}
              imagen={preguntaActual.imagen_opcion_b}
              seleccionada={respuestas[preguntaActual.id] === "B"}
              onClick={() => seleccionarRespuesta("B")}
            />

            <Opcion
              letra="C"
              texto={preguntaActual.opcion_c}
              imagen={preguntaActual.imagen_opcion_c}
              seleccionada={respuestas[preguntaActual.id] === "C"}
              onClick={() => seleccionarRespuesta("C")}
            />

            <Opcion
              letra="D"
              texto={preguntaActual.opcion_d}
              imagen={preguntaActual.imagen_opcion_d}
              seleccionada={respuestas[preguntaActual.id] === "D"}
              onClick={() => seleccionarRespuesta("D")}
            />
          </div>

          <div className="mt-8 flex justify-between gap-4">
            <button
              onClick={anterior}
              disabled={actual === 0}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              onClick={siguiente}
              disabled={!respuestas[preguntaActual.id] || guardando}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"
            >
              {guardando
                ? "Guardando..."
                : actual === preguntas.length - 1
                  ? "Terminar"
                  : "Siguiente"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Opcion({
  letra,
  texto,
  imagen,
  seleccionada,
  onClick,
}: {
  letra: string;
  texto?: string | null;
  imagen?: string | null;
  seleccionada: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        seleccionada
          ? "border-sky-400 bg-sky-950"
          : "border-slate-700 bg-slate-950 hover:border-sky-500"
      }`}
    >
      <p className="mb-2 font-bold text-sky-400">Opción {letra}</p>

      {imagen && (
        <img
          src={imagen}
          alt={`Opción ${letra}`}
          className="mb-3 max-h-[260px] w-full rounded-xl bg-white object-contain"
        />
      )}

      {texto && <p>{texto}</p>}
    </button>
  );
}

function ResultadoCard({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}