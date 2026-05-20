"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  parcial_id?: string | number;

  materia_id?: string | number;
  tema_id?: string | number;
  unidad_id?: string | number;
  id_tema?: string | number;
  id_unidad?: string | number;
  tema?: string | number;
  unidad?: string | number;

  [key: string]: any;
};

const TABLA_PARCIALES = "parciales";
const TABLA_PREGUNTAS = "preguntas_parciales";
const TABLA_RESULTADOS = "resultados_parciales";

export default function ParcialAlumnoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const rawId = params?.id;
  const parcialId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const volverParam = searchParams.get("volver");
  const volverDesdeUrl =
    volverParam && volverParam.startsWith("/") ? volverParam : "";

  const storageKey = parcialId ? `avance_parcial_${parcialId}` : "";
  const nuevoIntento = searchParams.get("nuevo") === "1";

  const [parcial, setParcial] = useState<Registro | null>(null);
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
  const [mostrarDialogoSalida, setMostrarDialogoSalida] = useState(false);
  const [destinoVolver, setDestinoVolver] = useState(
    volverDesdeUrl || "/materias"
  );
  const [destinoSalidaPendiente, setDestinoSalidaPendiente] = useState<
    string | null
  >(null);

  const salidaPermitidaRef = useRef(false);
  const avanceOriginalRef = useRef<string | null>(null);
  const historialProtegidoRef = useRef(false);

  useEffect(() => {
    if (!parcialId) return;
    cargarParcial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcialId]);

  useEffect(() => {
    if (!parcial || mostrarResultado) return;

    const limite = Number(parcial.tiempo_minutos ?? 0);
    if (limite <= 0 || segundosRestantes === null) return;

    const intervalo = window.setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          window.clearInterval(intervalo);
          setTimeout(() => {
            terminarParcial(true);
          }, 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcial, mostrarResultado, segundosRestantes, respuestas, preguntas]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!historialProtegidoRef.current) {
      window.history.pushState(
        { parcialProtegido: true },
        "",
        window.location.href
      );

      historialProtegidoRef.current = true;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (mostrarResultado || salidaPermitidaRef.current) return;

      event.preventDefault();
      event.returnValue = "¿Seguro que deseas salir del parcial?";
    };

    const handlePopState = () => {
      if (mostrarResultado || salidaPermitidaRef.current) return;

      window.history.pushState(
        { parcialProtegido: true },
        "",
        window.location.href
      );

      setDestinoSalidaPendiente(destinoVolver);
      setMostrarDialogoSalida(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mostrarResultado, destinoVolver]);

  useEffect(() => {
    function interceptarClicks(event: MouseEvent) {
      if (mostrarResultado || salidaPermitidaRef.current) return;

      const target = event.target as HTMLElement | null;
      const enlace = target?.closest("a") as HTMLAnchorElement | null;

      if (!enlace) return;

      const href = enlace.getAttribute("href");

      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("javascript:")) return;
      if (enlace.target === "_blank") return;

      event.preventDefault();

      try {
        const url = new URL(href, window.location.origin);
        const destino = `${url.pathname}${url.search}${url.hash}`;
        setDestinoSalidaPendiente(destino);
      } catch {
        setDestinoSalidaPendiente(href);
      }

      setMostrarDialogoSalida(true);
    }

    document.addEventListener("click", interceptarClicks, true);

    return () => {
      document.removeEventListener("click", interceptarClicks, true);
    };
  }, [mostrarResultado]);

  function construirDestinoVolver(parcialData: Registro | null) {
    if (volverDesdeUrl) {
      return volverDesdeUrl;
    }

    const temaRelacionado =
      parcialData?.tema_id ||
      parcialData?.unidad_id ||
      parcialData?.id_tema ||
      parcialData?.id_unidad ||
      parcialData?.tema ||
      parcialData?.unidad;

    if (temaRelacionado) {
      return `/temas/${temaRelacionado}/contenido`;
    }

    return "/materias";
  }

  function navegarSalidaPermitida() {
    const destino = destinoSalidaPendiente || destinoVolver;

    if (destino) {
      router.push(destino);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/materias");
  }

  function volverAtras() {
    if (mostrarResultado) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }

      router.push(destinoVolver);
      return;
    }

    setDestinoSalidaPendiente(destinoVolver);
    setMostrarDialogoSalida(true);
  }

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";

    return String(
      item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`
    );
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
      <div className="prose-exam text-slate-700">
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

      avanceOriginalRef.current = avanceGuardado;

      if (!avanceGuardado) return;

      const avance = JSON.parse(avanceGuardado);

      if (avance?.respuestas && typeof avance.respuestas === "object") {
        setRespuestas(avance.respuestas);
      }

      if (
        typeof avance?.segundos_restantes === "number" &&
        avance.segundos_restantes >= 0
      ) {
        setSegundosRestantes(avance.segundos_restantes);
      }

      setMensajeAvance("Se recuperó un avance guardado de este parcial.");
    } catch (error) {
      console.error("No se pudo cargar el avance local:", error);
    }
  }

  function guardarAvanceLocal() {
    if (!storageKey || typeof window === "undefined") return false;

    try {
      const avanceNuevo = JSON.stringify({
        parcial_id: parcialId,
        respuestas,
        segundos_restantes: segundosRestantes,
        actualizado_en: new Date().toISOString(),
      });

      window.localStorage.setItem(storageKey, avanceNuevo);
      avanceOriginalRef.current = avanceNuevo;

      setMensajeAvance("Avance guardado correctamente en este dispositivo.");
      setAvanceGuardadoReciente(true);

      window.setTimeout(() => {
        setAvanceGuardadoReciente(false);
      }, 2500);

      return true;
    } catch (error) {
      console.error("No se pudo guardar el avance local:", error);
      setMensajeAvance("No se pudo guardar el avance en este dispositivo.");
      setAvanceGuardadoReciente(false);
      return false;
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

  function restaurarAvanceOriginal() {
    if (!storageKey || typeof window === "undefined") return;

    try {
      if (avanceOriginalRef.current) {
        window.localStorage.setItem(storageKey, avanceOriginalRef.current);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error("No se pudo restaurar el avance original:", error);
    }
  }

  function confirmarSalida(sinGuardar = false) {
    if (sinGuardar) {
      salidaPermitidaRef.current = true;
      setMostrarDialogoSalida(false);
      navegarSalidaPermitida();
      return;
    }

    const guardado = guardarAvanceLocal();

    if (guardado) {
      salidaPermitidaRef.current = true;
      setMostrarDialogoSalida(false);
      navegarSalidaPermitida();
    }
  }

  function cancelarSalida() {
    setMostrarDialogoSalida(false);
    setDestinoSalidaPendiente(null);
    restaurarAvanceOriginal();
  }

  async function cargarParcial() {
    salidaPermitidaRef.current = false;
    historialProtegidoRef.current = false;
    setCargando(true);

    const { data: parcialData, error: parcialError } = await supabase
      .from(TABLA_PARCIALES)
      .select("*")
      .eq("id", parcialId)
      .single();

    if (parcialError) {
      console.error("Error cargando parcial:", parcialError);
      setParcial(null);
      setPreguntas([]);
      setDestinoVolver(volverDesdeUrl || "/materias");
      setCargando(false);
      return;
    }

    setParcial(parcialData);

    const destinoCalculado = construirDestinoVolver(parcialData);
    setDestinoVolver(destinoCalculado);

    const limite = Number(parcialData.tiempo_minutos ?? 0);
    const segundosIniciales = limite > 0 ? limite * 60 : null;

    setSegundosRestantes(segundosIniciales);
    setInicioTimestamp(Date.now());

    const { data: preguntasData, error: preguntasError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("parcial_id", parcialId);

    if (preguntasError) {
      console.error("Error cargando preguntas:", preguntasError);
      setPreguntas([]);
    } else {
      setPreguntas(ordenarLista(preguntasData ?? []));
    }

    if (nuevoIntento) {
      borrarAvanceLocal();
      setRespuestas({});
      setMensajeAvance("Comenzando un nuevo intento desde cero.");
    } else {
      cargarAvanceLocal();
    }

    setCargando(false);
  }

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

  const totalCorrectas = useMemo(() => {
    return calcularCorrectas(respuestas);
  }, [preguntas, respuestas]);

  const calificacion =
    preguntas.length > 0
      ? Math.round((totalCorrectas / preguntas.length) * 100)
      : 0;

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

  async function guardarResultado(respuestasActuales: Record<string, string>) {
    if (!parcial) return;

    const correctas = calcularCorrectas(respuestasActuales);
    const total = preguntas.length;
    const calif = total > 0 ? Math.round((correctas / total) * 100) : 0;
    const tiempoUsado = obtenerTiempoUsado();

    const detalleRespuestas = preguntas.map((item, index) => {
      const idPregunta = String(item.id);
      const respuestaAlumno = respuestasActuales[idPregunta] ?? "";
      const respuestaCorrecta = String(
        item.respuesta_correcta ?? ""
      ).toUpperCase();

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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { error } = await supabase.from(TABLA_RESULTADOS).insert({
      parcial_id: parcialId,
      alumno_id: user?.id ?? "sin-login",
      alumno_nombre:
        user?.email ?? user?.user_metadata?.nombre_completo ?? "Alumno",
      total_preguntas: total,
      correctas,
      calificacion: calif,
      tiempo_limite_minutos: Number(parcial.tiempo_minutos ?? 0),
      tiempo_usado_segundos: tiempoUsado,
      respuestas: detalleRespuestas,
    });

    if (error) {
      console.error("Error guardando resultado:", error);
      setResultadoGuardado(false);
    } else {
      setResultadoGuardado(true);
      borrarAvanceLocal();
    }

    setGuardandoResultado(false);
  }

  async function terminarParcial(automatico = false) {
    if (preguntas.length === 0 || mostrarResultado || guardandoResultado) return;

    const sinResponder = preguntas.some(
      (pregunta) => !respuestas[String(pregunta.id)]
    );

    if (sinResponder && !automatico) {
      const confirmar = confirm(
        "Hay preguntas sin responder. ¿Quieres terminar el parcial de todos modos?"
      );

      if (!confirmar) return;
    }

    salidaPermitidaRef.current = true;
    setMostrarResultado(true);
    await guardarResultado(respuestas);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reiniciarParcial() {
    setRespuestas({});
    setMostrarResultado(false);
    setResultadoGuardado(false);
    setGuardandoResultado(false);
    setMensajeAvance("");
    setAvanceGuardadoReciente(false);
    salidaPermitidaRef.current = false;
    historialProtegidoRef.current = false;
    borrarAvanceLocal();

    const limite = Number(parcial?.tiempo_minutos ?? 0);
    setSegundosRestantes(limite > 0 ? limite * 60 : null);
    setInicioTimestamp(Date.now());

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📝
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-600">Parcial</p>

                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Cargando parcial...
                </h1>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-blue-600" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!parcial) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">
              Parcial no encontrado
            </h1>

            <p className="mt-3 text-slate-600">
              No se encontró el parcial solicitado.
            </p>

            <Link
              href={destinoVolver}
              className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
            >
              Volver a la unidad
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="fixed bottom-4 right-4 z-50 rounded-3xl border border-blue-300 bg-white px-5 py-4 text-center shadow-2xl ring-4 ring-blue-100/70 md:bottom-auto md:top-24">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
          Tiempo
        </p>

        <p className="mt-1 text-3xl font-semibold leading-none text-slate-950 sm:text-4xl">
          {formatearTiempo(segundosRestantes)}
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={volverAtras}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Volver a la unidad
          </button>
        </div>

        <header className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-6 text-white shadow-sm sm:mb-8 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100">
                Parcial de unidad
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {obtenerTitulo(parcial)}
              </h1>

              {obtenerDescripcion(parcial) && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
                  {obtenerDescripcion(parcial)}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/40 bg-white p-5 text-center shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
                Tiempo restante
              </p>

              <p className="mt-2 text-4xl font-semibold leading-none text-slate-950">
                {formatearTiempo(segundosRestantes)}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 right-8 hidden h-36 w-60 lg:block">
            <div className="absolute bottom-0 right-10 h-24 w-36 rounded-t-[3rem] bg-white/25 backdrop-blur" />
            <div className="absolute bottom-8 right-0 h-20 w-32 rounded-3xl bg-white/90 shadow-lg" />
            <div className="absolute bottom-14 right-7 h-3 w-20 rounded-full bg-blue-200" />
            <div className="absolute bottom-10 right-7 h-3 w-16 rounded-full bg-blue-100" />
            <div className="absolute bottom-16 right-4 text-3xl">📝</div>
          </div>

          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
        </header>

        {mensajeAvance && !mostrarResultado && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
              avanceGuardadoReciente
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-blue-100 bg-blue-50 text-blue-700"
            }`}
          >
            {mensajeAvance}
          </div>
        )}

        {mostrarResultado && (
          <section className="mb-6 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Resultado
            </p>

            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              {totalCorrectas} de {preguntas.length} correctas —{" "}
              {calificacion}%
            </h2>

            <p className="mt-2 text-slate-600">
              Tiempo usado: {formatearTiempo(obtenerTiempoUsado())}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {guardandoResultado
                ? "Guardando resultado..."
                : resultadoGuardado
                ? "Resultado guardado correctamente."
                : "El resultado no se pudo guardar. Revisa la consola."}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={destinoVolver}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-bold text-white hover:bg-blue-500"
              >
                Volver a la unidad
              </Link>

              <button
                type="button"
                onClick={reiniciarParcial}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Reintentar parcial
              </button>
            </div>
          </section>
        )}

        {preguntas.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Este parcial todavía no tiene preguntas
            </h2>

            <p className="mt-3 text-slate-600">
              Agrega preguntas desde el panel de administración.
            </p>

            <Link
              href={destinoVolver}
              className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
            >
              Volver a la unidad
            </Link>
          </section>
        ) : (
          <>
            <section className="space-y-4 sm:space-y-6">
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
                    className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-blue-600">
                        Pregunta {index + 1}
                      </p>

                      {mostrarResultado && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            respuestaAlumno === respuestaCorrecta
                              ? "bg-emerald-600 text-white"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {respuestaAlumno === respuestaCorrecta
                            ? "Correcta"
                            : "Incorrecta"}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <ContenidoPregunta html={pregunta.pregunta} />
                    </div>

                    <div className="mt-5 space-y-3">
                      {opciones.map((opcion) => {
                        const seleccionada = respuestaAlumno === opcion.clave;
                        const esCorrecta = respuestaCorrecta === opcion.clave;

                        let clase =
                          "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50";

                        if (mostrarResultado && esCorrecta) {
                          clase =
                            "border-emerald-300 bg-emerald-50 text-emerald-900";
                        } else if (
                          mostrarResultado &&
                          seleccionada &&
                          !esCorrecta
                        ) {
                          clase = "border-red-300 bg-red-50 text-red-900";
                        } else if (seleccionada) {
                          clase = "border-blue-300 bg-blue-50 text-blue-900";
                        }

                        return (
                          <button
                            key={opcion.clave}
                            type="button"
                            onClick={() =>
                              seleccionarRespuesta(idPregunta, opcion.clave)
                            }
                            className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition ${clase}`}
                          >
                            <p className="mb-2 font-semibold">
                              Opción {opcion.clave}
                            </p>

                            <ContenidoPregunta html={opcion.html} />
                          </button>
                        );
                      })}
                    </div>

                    {mostrarResultado && pregunta.explicacion && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="font-semibold text-amber-800">
                          Explicación
                        </p>

                        <p className="mt-2 text-slate-700">
                          {pregunta.explicacion}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <section className="mt-6 flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:mt-8 sm:p-6">
              {!mostrarResultado ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={volverAtras}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-bold text-slate-700 hover:bg-slate-50"
                    >
                      ← Volver atrás
                    </button>

                    <button
                      type="button"
                      onClick={() => terminarParcial(false)}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
                    >
                      Terminar parcial
                    </button>
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    Si sales del parcial, la plataforma te preguntará si deseas
                    guardar tu avance antes de abandonar la pantalla.
                  </p>

                  {mostrarDialogoSalida && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
                      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Salir del parcial
                        </h2>

                        <p className="mt-3 text-slate-600">
                          Si sales ahora, puedes guardar tus respuestas para
                          continuar después o salir sin guardar este avance.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => confirmarSalida(false)}
                            className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
                          >
                            Guardar y salir
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarSalida(true)}
                            className="rounded-2xl bg-amber-500 px-5 py-3 font-bold text-slate-950 hover:bg-amber-400"
                          >
                            Salir sin guardar
                          </button>

                          <button
                            type="button"
                            onClick={cancelarSalida}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Continuar aquí
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={destinoVolver}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-bold text-white hover:bg-blue-500"
                  >
                    Volver a la unidad
                  </Link>

                  <button
                    type="button"
                    onClick={reiniciarParcial}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Reintentar parcial
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
          border: 1px solid #e2e8f0;
          display: block;
          background: white;
        }

        .prose-exam h1,
        .prose-exam h2,
        .prose-exam h3 {
          color: #0f172a;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .prose-exam h2 {
          font-size: 1.5rem;
        }

        .prose-exam p {
          margin: 0.35rem 0;
        }

        .prose-exam ul,
        .prose-exam ol {
          padding-left: 1.4rem;
          margin: 0.5rem 0;
        }

        .prose-exam ul {
          list-style: disc;
        }

        .prose-exam ol {
          list-style: decimal;
        }

        .prose-exam strong,
        .prose-exam b {
          font-weight: 600;
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