"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DetalleRespuesta = {
  pregunta_id?: string | number | null;
  pregunta?: string;
  respuesta_usuario?: string;
  respuesta_correcta?: string;
  correcta?: boolean;
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

function obtenerTipo(resultado: Resultado) {
  return resultado.tipo_evaluacion || resultado.tipo || "evaluación";
}

function obtenerCalificacion(resultado: Resultado) {
  return Number(resultado.calificacion ?? resultado.porcentaje ?? 0);
}

export default function ResultadosPage() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarResultados();
  }, []);

  async function cargarResultados() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("resultados")
      .select("*")
      .or(
        "alumno_id.eq.alumno_demo,alumno_email.eq.alumno_demo@examen-uabc.local"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(`No se pudieron cargar los resultados. ${error.message || ""}`);
      setResultados([]);
    } else {
      setResultados((data || []) as Resultado[]);
    }

    setLoading(false);
  }

  const resumen = useMemo(() => {
    const intentos = resultados.length;

    if (intentos === 0) {
      return {
        intentos: 0,
        promedio: 0,
        mejor: 0,
        menor: 0,
        aciertos: 0,
        errores: 0,
        parciales: 0,
        simuladores: 0,
      };
    }

    const calificaciones = resultados.map(obtenerCalificacion);

    const promedio = Math.round(
      calificaciones.reduce((acc, item) => acc + item, 0) / intentos
    );

    const mejor = Math.max(...calificaciones);
    const menor = Math.min(...calificaciones);

    const aciertos = resultados.reduce(
      (acc, item) => acc + Number(item.aciertos || 0),
      0
    );

    const errores = resultados.reduce(
      (acc, item) => acc + Number(item.errores || 0),
      0
    );

    const parciales = resultados.filter(
      (item) => obtenerTipo(item) === "parcial"
    ).length;

    const simuladores = resultados.filter(
      (item) => obtenerTipo(item) === "simulador"
    ).length;

    return {
      intentos,
      promedio,
      mejor,
      menor,
      aciertos,
      errores,
      parciales,
      simuladores,
    };
  }, [resultados]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Resultados
          </p>

          <h1 className="text-4xl font-bold">Mis calificaciones</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Aquí puedes consultar el historial de parciales y simuladores
            realizados, junto con tu calificación, aciertos, errores, tiempo
            usado y detalle de respuestas.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/panel-alumno"
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Volver al panel
            </Link>

            <Link
              href="/simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Ir a simuladores
            </Link>

            <button
              onClick={cargarResultados}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Actualizar resultados
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500 bg-red-950/50 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Cargando resultados...
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-5 md:grid-cols-4 lg:grid-cols-8">
              <ResumenCard
                titulo="Intentos"
                valor={String(resumen.intentos)}
                color="text-sky-400"
              />

              <ResumenCard
                titulo="Promedio"
                valor={String(resumen.promedio)}
                color="text-emerald-400"
              />

              <ResumenCard
                titulo="Mejor"
                valor={String(resumen.mejor)}
                color="text-yellow-400"
              />

              <ResumenCard
                titulo="Menor"
                valor={String(resumen.menor)}
                color="text-red-400"
              />

              <ResumenCard
                titulo="Aciertos"
                valor={String(resumen.aciertos)}
                color="text-emerald-400"
              />

              <ResumenCard
                titulo="Errores"
                valor={String(resumen.errores)}
                color="text-red-400"
              />

              <ResumenCard
                titulo="Parciales"
                valor={String(resumen.parciales)}
                color="text-pink-400"
              />

              <ResumenCard
                titulo="Simuladores"
                valor={String(resumen.simuladores)}
                color="text-cyan-400"
              />
            </section>

            {resultados.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <h2 className="text-2xl font-bold">
                  Aún no hay calificaciones guardadas
                </h2>

                <p className="mt-3 text-slate-400">
                  Cuando termines un parcial o simulador, tu resultado aparecerá
                  aquí.
                </p>

                <Link
                  href="/panel-alumno"
                  className="mt-6 inline-block rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Ir al panel del alumno
                </Link>
              </div>
            ) : (
              <section className="grid gap-5">
                {resultados.map((resultado, index) => {
                  const tipo = obtenerTipo(resultado);
                  const calificacion = obtenerCalificacion(resultado);
                  const sinResponder =
                    resultado.estadisticas?.sin_responder ?? 0;

                  const resultadoId =
                    resultado.id !== undefined && resultado.id !== null
                      ? String(resultado.id)
                      : "";

                  return (
                    <div
                      key={resultadoId || `resultado-${index}`}
                      className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide text-sky-400">
                            {tipo === "parcial" ? "Parcial" : "Simulador"}
                          </p>

                          <h2 className="mt-1 text-2xl font-bold">
                            {resultado.titulo || "Evaluación sin título"}
                          </h2>

                          <p className="mt-2 text-sm text-slate-400">
                            {formatearFecha(resultado.created_at)}
                          </p>

                          {resultado.terminado_por_tiempo && (
                            <p className="mt-3 rounded-xl border border-red-500 bg-red-950/50 px-3 py-2 text-sm text-red-200">
                              Terminó porque se agotó el tiempo.
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-6">
                          <MiniCard
                            titulo="Calificación"
                            valor={String(calificacion)}
                            color="text-sky-400"
                          />

                          <MiniCard
                            titulo="Aciertos"
                            valor={String(resultado.aciertos || 0)}
                            color="text-emerald-400"
                          />

                          <MiniCard
                            titulo="Errores"
                            valor={String(resultado.errores || 0)}
                            color="text-red-400"
                          />

                          <MiniCard
                            titulo="Sin responder"
                            valor={String(sinResponder)}
                            color="text-yellow-400"
                          />

                          <MiniCard
                            titulo="Total"
                            valor={String(resultado.total_preguntas || 0)}
                            color="text-white"
                          />

                          <MiniCard
                            titulo="Tiempo"
                            valor={formatearTiempo(
                              resultado.tiempo_usado_segundos
                            )}
                            color="text-pink-400"
                          />
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <h3 className="font-bold">Resumen del examen</h3>

                        <p className="mt-2 text-sm text-slate-300">
                          Obtuviste{" "}
                          <span className="font-bold text-sky-400">
                            {calificacion}
                          </span>{" "}
                          de calificación, con{" "}
                          <span className="font-bold text-emerald-400">
                            {resultado.aciertos || 0}
                          </span>{" "}
                          aciertos y{" "}
                          <span className="font-bold text-red-400">
                            {resultado.errores || 0}
                          </span>{" "}
                          errores.
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                          Tiempo asignado:{" "}
                          {resultado.tiempo_asignado_minutos || 0} minutos.
                          Tiempo usado:{" "}
                          {formatearTiempo(resultado.tiempo_usado_segundos)}.
                        </p>

                        <p className="mt-3 text-sm text-slate-300">
                          {calificacion >= 90
                            ? "Excelente resultado. Dominas muy bien este contenido."
                            : calificacion >= 70
                              ? "Buen resultado. Conviene revisar las preguntas incorrectas."
                              : calificacion >= 60
                                ? "Resultado aprobatorio, pero se recomienda repasar."
                                : "Se recomienda estudiar nuevamente este contenido y volver a intentarlo."}
                        </p>
                      </div>

                      {resultadoId ? (
                        <Link
                          href={`/resultados/${resultadoId}`}
                          className="mt-5 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Ver examen completo
                        </Link>
                      ) : (
                        <p className="mt-5 text-sm text-yellow-300">
                          Este resultado no tiene ID disponible.
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
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

function MiniCard({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-950 p-4">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}