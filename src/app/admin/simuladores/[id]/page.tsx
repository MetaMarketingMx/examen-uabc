"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

  seccion_id?: string | number | null;
  area?: string | null;
  instruccion_grupo?: string | null;
  orden_en_seccion?: number | null;

  [key: string]: any;
};

type SeccionSimulador = {
  id: string | number;
  simulador_id?: string | number;
  nombre?: string | null;
  titulo?: string | null;
  instrucciones?: string | null;
  orden?: number | null;
};

type SeccionRender = {
  id: string;
  nombre: string;
  preguntas: Registro[];
};

type ResumenArea = {
  area: string;
  total_preguntas: number;
  correctas: number;
  promedio: number;
};

const TABLA_SIMULADORES = "simuladores";
const TABLA_SECCIONES = "secciones_simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";
const TABLA_RESULTADOS = "resultados_simuladores";

const ACIERTOS_MAXIMOS_PUNTAJE = 105;
const PUNTAJE_MAXIMO = 1300;

export default function SimuladorAlumnoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = params?.id;
  const simuladorId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const volverParam = searchParams.get("volver");
  const destinoVolver =
    volverParam && volverParam.startsWith("/") ? volverParam : "/simuladores";

  const storageKey = simuladorId ? `avance_simulador_${simuladorId}` : "";

  const [simulador, setSimulador] = useState<Registro | null>(null);
  const [secciones, setSecciones] = useState<SeccionSimulador[]>([]);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [resultadoGuardado, setResultadoGuardado] = useState(false);
  const [guardandoResultado, setGuardandoResultado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(
    null
  );
  const [inicioTimestamp, setInicioTimestamp] = useState<number | null>(null);
  const [mensajeAvance, setMensajeAvance] = useState("");
  const [avanceGuardadoReciente, setAvanceGuardadoReciente] = useState(false);

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

  function obtenerTitulo(item: Registro | SeccionSimulador | null | undefined) {
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

  function ordenarLista(lista: Registro[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden_en_seccion ?? a.orden ?? 0);
      const ordenB = Number(b.orden_en_seccion ?? b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function ordenarSecciones(lista: SeccionSimulador[]) {
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

  function cargarAvanceLocal() {
    if (!storageKey || typeof window === "undefined") return;

    try {
      const avanceGuardado = window.localStorage.getItem(storageKey);
      if (!avanceGuardado) return;

      const avance = JSON.parse(avanceGuardado);

      if (avance?.respuestas && typeof avance.respuestas === "object") {
        setRespuestas(avance.respuestas);
        setMensajeAvance("Se recuperó un avance guardado de este simulador.");
      }
    } catch (error) {
      console.error("No se pudo cargar el avance local:", error);
    }
  }

  function guardarAvanceLocal() {
    if (!storageKey || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          simulador_id: simuladorId,
          respuestas,
          actualizado_en: new Date().toISOString(),
        })
      );

      setMensajeAvance("Avance guardado correctamente en este dispositivo.");
      setAvanceGuardadoReciente(true);

      window.setTimeout(() => {
        setAvanceGuardadoReciente(false);
      }, 2500);
    } catch (error) {
      console.error("No se pudo guardar el avance local:", error);
      setMensajeAvance("No se pudo guardar el avance en este dispositivo.");
      setAvanceGuardadoReciente(false);
    }
  }

  function borrarAvanceLocal() {
    if (!storageKey || typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("No se pudo borrar el avance local:", error);
    }
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

    const { data: seccionesData, error: seccionesError } = await supabase
      .from(TABLA_SECCIONES)
      .select("*")
      .eq("simulador_id", String(simuladorId));

    if (seccionesError) {
      console.warn(
        "No se pudieron cargar secciones_simuladores. Si aún no ejecutaste el SQL, el simulador funcionará sin secciones.",
        seccionesError
      );
      setSecciones([]);
    } else {
      setSecciones(
        ordenarSecciones((seccionesData ?? []) as SeccionSimulador[])
      );
    }

    const { data: preguntasData, error: preguntasError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("simulador_id", simuladorId);

    if (preguntasError) {
      console.error("Error cargando preguntas:", preguntasError);
      setPreguntas([]);
    } else {
      setPreguntas(ordenarLista((preguntasData ?? []) as Registro[]));
    }

    cargarAvanceLocal();
    setCargando(false);
  }

  function construirSeccionesRender() {
    const preguntasUsadas = new Set<string>();
    const lista: SeccionRender[] = [];

    secciones.forEach((seccion) => {
      const preguntasDeSeccion = ordenarLista(
        preguntas.filter(
          (pregunta) => String(pregunta.seccion_id ?? "") === String(seccion.id)
        )
      );

      if (preguntasDeSeccion.length > 0) {
        preguntasDeSeccion.forEach((pregunta) =>
          preguntasUsadas.add(String(pregunta.id))
        );

        lista.push({
          id: String(seccion.id),
          nombre: obtenerTitulo(seccion),
          preguntas: preguntasDeSeccion,
        });
      }
    });

    const preguntasSinSeccion = preguntas.filter(
      (pregunta) => !preguntasUsadas.has(String(pregunta.id))
    );

    const gruposPorArea = new Map<string, SeccionRender>();

    preguntasSinSeccion.forEach((pregunta) => {
      const area = String(pregunta.area || "General");

      if (!gruposPorArea.has(area)) {
        gruposPorArea.set(area, {
          id: area,
          nombre: area,
          preguntas: [],
        });
      }

      gruposPorArea.get(area)?.preguntas.push(pregunta);
    });

    gruposPorArea.forEach((grupo) => {
      grupo.preguntas = ordenarLista(grupo.preguntas);
      lista.push(grupo);
    });

    if (lista.length === 0 && preguntas.length > 0) {
      lista.push({
        id: "general",
        nombre: "General",
        preguntas: ordenarLista(preguntas),
      });
    }

    return lista;
  }

  const seccionesRender = useMemo(() => {
    return construirSeccionesRender();
  }, [secciones, preguntas]);

  function calcularCorrectas(respuestasActuales: Record<string, string>) {
    return preguntas.filter((pregunta) => {
      const idPregunta = String(pregunta.id);
      const respuestaAlumno = respuestasActuales[idPregunta];
      const respuestaCorrecta = String(
        pregunta.respuesta_correcta ?? ""
      ).toUpperCase();

      return respuestaAlumno === respuestaCorrecta;
    }).length;
  }

  function calcularResumenAreas(
    respuestasActuales: Record<string, string>
  ): ResumenArea[] {
    return seccionesRender.map((seccion) => {
      const correctas = seccion.preguntas.filter((pregunta) => {
        const idPregunta = String(pregunta.id);
        const respuestaAlumno = respuestasActuales[idPregunta];
        const respuestaCorrecta = String(
          pregunta.respuesta_correcta ?? ""
        ).toUpperCase();

        return respuestaAlumno === respuestaCorrecta;
      }).length;

      const total = seccion.preguntas.length;
      const promedio = total > 0 ? Math.round((correctas / total) * 100) : 0;

      return {
        area: seccion.nombre,
        total_preguntas: total,
        correctas,
        promedio,
      };
    });
  }

  const totalCorrectas = useMemo(() => {
    return calcularCorrectas(respuestas);
  }, [preguntas, respuestas]);

  const totalPreguntas = preguntas.length;

  const promedioGeneral =
    totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0;

  const aciertosParaPuntaje = Math.min(
    totalCorrectas,
    ACIERTOS_MAXIMOS_PUNTAJE
  );

  const puntaje1300 =
    ACIERTOS_MAXIMOS_PUNTAJE > 0
      ? Math.min(
          PUNTAJE_MAXIMO,
          Math.round(
            (aciertosParaPuntaje / ACIERTOS_MAXIMOS_PUNTAJE) * PUNTAJE_MAXIMO
          )
        )
      : 0;

  const resumenAreas = useMemo(() => {
    return calcularResumenAreas(respuestas);
  }, [seccionesRender, respuestas]);

  function seleccionarRespuesta(idPregunta: string, opcion: string) {
    if (mostrarResultado) return;

    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: opcion,
    }));

    setMensajeAvance("");
    setAvanceGuardadoReciente(false);
  }

  function formatearTiempo(segundos: number | null) {
    if (segundos === null) return "Sin límite";

    const minutos = Math.floor(segundos / 60);
    const seg = segundos % 60;

    return `${String(minutos).padStart(2, "0")}:${String(seg).padStart(
      2,
      "0"
    )}`;
  }

  function obtenerTiempoUsado() {
    if (!inicioTimestamp) return 0;
    return Math.max(0, Math.floor((Date.now() - inicioTimestamp) / 1000));
  }

  function obtenerAreaDePregunta(pregunta: Registro) {
    const seccion = secciones.find(
      (item) => String(item.id) === String(pregunta.seccion_id ?? "")
    );

    return seccion?.nombre || seccion?.titulo || pregunta.area || "General";
  }

  async function guardarResultado(respuestasActuales: Record<string, string>) {
    if (!simulador) return;

    const correctas = calcularCorrectas(respuestasActuales);
    const total = preguntas.length;
    const promedio = total > 0 ? Math.round((correctas / total) * 100) : 0;
    const aciertosPuntaje = Math.min(correctas, ACIERTOS_MAXIMOS_PUNTAJE);
    const puntaje =
      ACIERTOS_MAXIMOS_PUNTAJE > 0
        ? Math.min(
            PUNTAJE_MAXIMO,
            Math.round(
              (aciertosPuntaje / ACIERTOS_MAXIMOS_PUNTAJE) * PUNTAJE_MAXIMO
            )
          )
        : 0;

    const tiempoUsado = obtenerTiempoUsado();
    const resumen = calcularResumenAreas(respuestasActuales);

    const detalleRespuestas = preguntas.map((item, index) => {
      const idPregunta = String(item.id);
      const respuestaAlumno = respuestasActuales[idPregunta] ?? "";
      const respuestaCorrecta = String(
        item.respuesta_correcta ?? ""
      ).toUpperCase();

      return {
        numero: index + 1,
        pregunta_id: item.id,
        area: obtenerAreaDePregunta(item),
        seccion_id: item.seccion_id ?? null,
        instruccion: item.instruccion_grupo ?? null,
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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const payloadCompleto = {
      simulador_id: simuladorId,
      alumno_id: user?.id ?? "sin-login",
      alumno_nombre:
        user?.email ?? user?.user_metadata?.nombre_completo ?? "Alumno",
      total_preguntas: total,
      correctas,
      calificacion: promedio,
      tiempo_limite_minutos: Number(simulador.tiempo_minutos ?? 0),
      tiempo_usado_segundos: tiempoUsado,
      respuestas: detalleRespuestas,
      resumen_areas: resumen,
      puntaje_1300: puntaje,
      promedio_general: promedio,
      aciertos_para_puntaje: aciertosPuntaje,
    };

    const { error } = await supabase
      .from(TABLA_RESULTADOS)
      .insert(payloadCompleto);

    if (error) {
      console.error("Error guardando resultado completo:", error);

      const payloadBasico = {
        simulador_id: simuladorId,
        alumno_id: user?.id ?? "sin-login",
        alumno_nombre:
          user?.email ?? user?.user_metadata?.nombre_completo ?? "Alumno",
        total_preguntas: total,
        correctas,
        calificacion: promedio,
        tiempo_limite_minutos: Number(simulador.tiempo_minutos ?? 0),
        tiempo_usado_segundos: tiempoUsado,
        respuestas: detalleRespuestas,
      };

      const { error: errorBasico } = await supabase
        .from(TABLA_RESULTADOS)
        .insert(payloadBasico);

      if (errorBasico) {
        console.error("Error guardando resultado básico:", errorBasico);
        setResultadoGuardado(false);
      } else {
        setResultadoGuardado(true);
        borrarAvanceLocal();
      }
    } else {
      setResultadoGuardado(true);
      borrarAvanceLocal();
    }

    setGuardandoResultado(false);
  }

  async function terminarSimulador(automatico = false) {
    if (preguntas.length === 0 || mostrarResultado || guardandoResultado) return;

    const sinResponder = preguntas.some(
      (pregunta) => !respuestas[String(pregunta.id)]
    );

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
    setMensajeAvance("");
    setAvanceGuardadoReciente(false);
    borrarAvanceLocal();

    const limite = Number(simulador?.tiempo_minutos ?? 0);
    setSegundosRestantes(limite > 0 ? limite * 60 : null);
    setInicioTimestamp(Date.now());

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-10">
        <section className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:rounded-3xl sm:p-8">
          <p className="text-slate-300">Cargando simulador...</p>
        </section>
      </main>
    );
  }

  if (!simulador) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-10">
        <section className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:rounded-3xl sm:p-8">
          <h1 className="text-3xl font-bold">Simulador no encontrado</h1>

          <p className="mt-3 text-slate-400">
            No se encontró el simulador solicitado.
          </p>

          <Link
            href={destinoVolver}
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Volver a simuladores
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-4 text-white sm:px-6 sm:py-8">
      <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-cyan-500/50 bg-slate-950/95 px-4 py-3 text-center shadow-2xl backdrop-blur md:bottom-auto md:top-24">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
          Tiempo
        </p>
        <p className="mt-1 text-xl font-black text-white sm:text-2xl">
          {formatearTiempo(segundosRestantes)}
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={destinoVolver}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Volver a simuladores
          </Link>
        </div>

        <header className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:mb-8 sm:rounded-3xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
                Simulador
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                {obtenerTitulo(simulador)}
              </h1>

              {obtenerDescripcion(simulador) && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
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

          {mensajeAvance && !mostrarResultado && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                avanceGuardadoReciente
                  ? "border-green-500 bg-green-950 text-green-200"
                  : "border-cyan-600 bg-cyan-950 text-cyan-200"
              }`}
            >
              {mensajeAvance}
            </div>
          )}

          {mostrarResultado && (
            <div className="mt-6 rounded-2xl border border-cyan-600/40 bg-cyan-950/30 p-5">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Resultado
              </p>

              <h2 className="mt-2 text-4xl font-black text-white">
                {puntaje1300} / {PUNTAJE_MAXIMO} puntos
              </h2>

              <p className="mt-2 text-xl font-bold text-cyan-200">
                {totalCorrectas} de {preguntas.length} aciertos — Promedio{" "}
                {promedioGeneral}%
              </p>

              <p className="mt-2 text-sm text-slate-300">
                El puntaje obtenido, de forma similar al examen de admisión, no
                evalúa necesariamente todas las preguntas del simulador. Se
                calcula con base en el desempeño del alumno y tiene un máximo de{" "}
                {PUNTAJE_MAXIMO} puntos.
              </p>

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

              {resumenAreas.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {resumenAreas.map((area) => (
                    <div
                      key={area.area}
                      className="rounded-2xl border border-slate-700 bg-slate-950 p-4"
                    >
                      <p className="text-sm font-bold text-cyan-300">
                        {area.area}
                      </p>

                      <p className="mt-2 text-2xl font-black text-white">
                        {area.promedio}%
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {area.correctas} de {area.total_preguntas} aciertos
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={destinoVolver}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Volver a simuladores
                </Link>

                <button
                  type="button"
                  onClick={reiniciarSimulador}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Reintentar simulador
                </button>
              </div>
            </div>
          )}
        </header>

        {preguntas.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:rounded-3xl sm:p-8">
            <h2 className="text-2xl font-bold">
              Este simulador todavía no tiene preguntas
            </h2>

            <p className="mt-3 text-slate-400">
              Agrega preguntas desde el panel de administración.
            </p>

            <Link
              href={destinoVolver}
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Volver a simuladores
            </Link>
          </section>
        ) : (
          <>
            <section className="space-y-8">
              {seccionesRender.map((seccion) => (
                <section
                  key={seccion.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6"
                >
                  <div className="mb-5 border-b border-slate-800 pb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
                      Área / sección
                    </p>

                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                      {seccion.nombre}
                    </h2>

                    <p className="mt-3 text-sm text-slate-400">
                      {seccion.preguntas.length} preguntas
                    </p>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {seccion.preguntas.map((pregunta, index) => {
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
                      ].filter(
                        (opcion) => !contenidoVacio(String(opcion.html ?? ""))
                      );

                      return (
                        <article
                          key={pregunta.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl sm:p-6"
                        >
                          <p className="text-sm font-semibold text-blue-300">
                            Pregunta {index + 1}
                          </p>

                          {pregunta.instruccion_grupo && (
                            <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4 text-sm leading-6 text-cyan-50">
                              {pregunta.instruccion_grupo}
                            </div>
                          )}

                          <div className="mt-3">
                            <ContenidoPregunta html={pregunta.pregunta} />
                          </div>

                          <div className="mt-5 space-y-3">
                            {opciones.map((opcion) => {
                              const seleccionada =
                                respuestaAlumno === opcion.clave;
                              const esCorrecta =
                                respuestaCorrecta === opcion.clave;

                              let clase =
                                "border-slate-700 bg-slate-900 hover:bg-slate-800";

                              if (mostrarResultado && esCorrecta) {
                                clase =
                                  "border-green-600 bg-green-950 text-green-200";
                              } else if (
                                mostrarResultado &&
                                seleccionada &&
                                !esCorrecta
                              ) {
                                clase =
                                  "border-red-600 bg-red-950 text-red-200";
                              } else if (seleccionada) {
                                clase =
                                  "border-blue-600 bg-blue-950 text-blue-100";
                              }

                              return (
                                <button
                                  key={opcion.clave}
                                  type="button"
                                  onClick={() =>
                                    seleccionarRespuesta(
                                      idPregunta,
                                      opcion.clave
                                    )
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${clase}`}
                                >
                                  <p className="mb-2 font-bold">
                                    {opcion.clave})
                                  </p>
                                  <ContenidoPregunta html={opcion.html} />
                                </button>
                              );
                            })}
                          </div>

                          {mostrarResultado && pregunta.explicacion && (
                            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
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
                  </div>
                </section>
              ))}
            </section>

            <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:mt-8 sm:rounded-3xl sm:p-6">
              {!mostrarResultado ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Link
                      href={destinoVolver}
                      className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-white hover:bg-slate-800"
                    >
                      ← Volver a simuladores
                    </Link>

                    <button
                      type="button"
                      onClick={guardarAvanceLocal}
                      className={`rounded-xl px-5 py-3 text-center font-semibold transition ${
                        avanceGuardadoReciente
                          ? "border border-green-500 bg-green-500 text-slate-950"
                          : "border border-cyan-700 text-cyan-300 hover:bg-cyan-950"
                      }`}
                    >
                      {avanceGuardadoReciente
                        ? "Avance guardado ✓"
                        : "Guardar avance"}
                    </button>

                    <button
                      type="button"
                      onClick={() => terminarSimulador(false)}
                      className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                    >
                      Terminar simulador
                    </button>
                  </div>

                  {mensajeAvance && !mostrarResultado && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                        avanceGuardadoReciente
                          ? "border-green-500 bg-green-950 text-green-200"
                          : "border-cyan-600 bg-cyan-950 text-cyan-200"
                      }`}
                    >
                      {mensajeAvance}
                    </div>
                  )}

                  <p className="text-xs leading-5 text-slate-400">
                    Guardar avance conserva tus respuestas en este dispositivo.
                    El resultado final solo se guarda al terminar el simulador.
                  </p>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={destinoVolver}
                    className="rounded-xl bg-cyan-500 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Volver a simuladores
                  </Link>

                  <button
                    type="button"
                    onClick={reiniciarSimulador}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
                  >
                    Reintentar simulador
                  </button>
                </div>
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