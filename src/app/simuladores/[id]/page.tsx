"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

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
  orden_en_seccion?: number | null;
  [key: string]: any;
};

type SeccionSimulador = {
  id: string | number;
  simulador_id?: string | number;
  nombre?: string | null;
  titulo?: string | null;
  orden?: number | null;
};

type InstruccionSimulador = {
  id: string | number;
  simulador_id?: string | number;
  titulo?: string | null;
  contenido?: string | null;
  orden?: number | null;
};

type ElementoRender =
  | {
      tipo: "instruccion";
      id: string;
      orden: number;
      instruccion: InstruccionSimulador;
    }
  | {
      tipo: "pregunta";
      id: string;
      orden: number;
      numeroPregunta: number;
      pregunta: Registro;
    };

type ResumenArea = {
  area: string;
  total_preguntas: number;
  correctas: number;
  promedio: number;
};

type AvanceSimulador = {
  simulador_id?: string | number;
  respuestas?: Record<string, string>;
  marcadas?: Record<string, boolean>;
  indiceActual?: number;
  segundos_restantes?: number | null;
  actualizado_en?: string;
};

type TipoFinalizacion = "manual" | "tiempo" | null;

const TABLA_SIMULADORES = "simuladores";
const TABLA_SECCIONES = "secciones_simuladores";
const TABLA_INSTRUCCIONES = "instrucciones_simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";
const TABLA_RESULTADOS = "resultados_simuladores";

const ACIERTOS_MAXIMOS_PUNTAJE = 105;
const PUNTAJE_MAXIMO = 1300;

export default function SimuladorAlumnoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = params?.id;
  const simuladorId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const nuevoIntento = searchParams.get("nuevo") === "1";

  const volverParam = searchParams.get("volver");
  const destinoVolver =
    volverParam && volverParam.startsWith("/") ? volverParam : "/simuladores";

  const storageKey = simuladorId ? `avance_simulador_${simuladorId}` : "";

  const salidaPermitidaRef = useRef(false);
  const avanceOriginalRef = useRef<string | null>(null);

  const finalizacionEnProcesoRef = useRef(false);
  const guardadoEnProcesoRef = useRef(false);

  const [simulador, setSimulador] = useState<Registro | null>(null);
  const [secciones, setSecciones] = useState<SeccionSimulador[]>([]);
  const [instrucciones, setInstrucciones] = useState<InstruccionSimulador[]>(
    []
  );
  const [preguntas, setPreguntas] = useState<Registro[]>([]);

  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [indiceActual, setIndiceActual] = useState(0);

  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [resultadoGuardado, setResultadoGuardado] = useState(false);
  const [resultadoGuardadoId, setResultadoGuardadoId] = useState<
    string | number | null
  >(null);
  const [guardandoResultado, setGuardandoResultado] = useState(false);
  const [tipoFinalizacion, setTipoFinalizacion] =
    useState<TipoFinalizacion>(null);

  const [cargando, setCargando] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(
    null
  );
  const [inicioTimestamp, setInicioTimestamp] = useState<number | null>(null);

  const [mensajeAvance, setMensajeAvance] = useState("");
  const [avanceGuardadoReciente, setAvanceGuardadoReciente] = useState(false);
  const [mostrarDialogoSalida, setMostrarDialogoSalida] = useState(false);
  const [avanceListoParaSalir, setAvanceListoParaSalir] = useState(false);
  const [destinoPendiente, setDestinoPendiente] = useState<string | null>(null);

  useEffect(() => {
    if (!simuladorId) return;
    cargarSimulador();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simuladorId, nuevoIntento]);

  useEffect(() => {
    if (!simulador || mostrarResultado || guardandoResultado) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    simulador,
    mostrarResultado,
    guardandoResultado,
    segundosRestantes,
    respuestas,
    preguntas,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mostrarResultado) return;

    const manejarSalida = (event: BeforeUnloadEvent) => {
      if (salidaPermitidaRef.current) return;
      if (Object.keys(respuestas).length === 0) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", manejarSalida);

    return () => {
      window.removeEventListener("beforeunload", manejarSalida);
    };
  }, [respuestas, mostrarResultado]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mostrarResultado) return;

    window.history.pushState(
      { simuladorActivo: true },
      "",
      window.location.href
    );

    const manejarAtras = () => {
      setDestinoPendiente(destinoVolver);
      setAvanceListoParaSalir(false);
      setMostrarDialogoSalida(true);

      window.history.pushState(
        { simuladorActivo: true },
        "",
        window.location.href
      );
    };

    window.addEventListener("popstate", manejarAtras);

    return () => {
      window.removeEventListener("popstate", manejarAtras);
    };
  }, [mostrarResultado, destinoVolver]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mostrarResultado) return;

    const manejarClickSalida = (event: MouseEvent) => {
      if (salidaPermitidaRef.current) return;
      if (mostrarDialogoSalida) return;

      const objetivo = event.target as HTMLElement | null;
      if (!objetivo) return;

      const boton = objetivo.closest("button") as HTMLButtonElement | null;

      if (boton) {
        const textoBoton = boton.textContent?.trim().toLowerCase() ?? "";

        const esCerrarSesion =
          textoBoton.includes("cerrar sesión") ||
          textoBoton.includes("cerrar sesion");

        if (esCerrarSesion) {
          event.preventDefault();
          event.stopPropagation();

          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }

          setDestinoPendiente("/login?cerrarSesion=1");
          setAvanceListoParaSalir(false);
          setMostrarDialogoSalida(true);
          return;
        }
      }

      const enlace = objetivo.closest("a") as HTMLAnchorElement | null;

      if (!enlace) return;

      const href = enlace.getAttribute("href");

      if (!href) return;
      if (href.startsWith("#")) return;
      if (enlace.target === "_blank") return;
      if (enlace.hasAttribute("download")) return;

      const url = new URL(enlace.href, window.location.href);

      if (url.origin !== window.location.origin) return;

      const destino = `${url.pathname}${url.search}${url.hash}`;
      const rutaActual = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (destino === rutaActual) return;

      event.preventDefault();
      event.stopPropagation();

      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      setDestinoPendiente(destino);
      setAvanceListoParaSalir(false);
      setMostrarDialogoSalida(true);
    };

    document.addEventListener("click", manejarClickSalida, true);

    return () => {
      document.removeEventListener("click", manejarClickSalida, true);
    };
  }, [mostrarResultado, mostrarDialogoSalida]);

  useEffect(() => {
    if (elementosRender.length === 0) return;

    if (indiceActual >= elementosRender.length) {
      setIndiceActual(Math.max(0, elementosRender.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceActual]);

  function obtenerTitulo(
    item: Registro | SeccionSimulador | InstruccionSimulador | null | undefined
  ) {
    if (!item) return "";

    const anyItem = item as any;

    return String(
      anyItem.nombre ??
        anyItem.titulo ??
        anyItem.title ??
        `Registro ${anyItem.id}`
    );
  }

  function ordenarPreguntas(lista: Registro[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? a.orden_en_seccion ?? 0);
      const ordenB = Number(b.orden ?? b.orden_en_seccion ?? 0);

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

  function ordenarInstrucciones(lista: InstruccionSimulador[]) {
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

  function ContenidoHtml({ html }: { html?: string }) {
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

  function obtenerStorageKey() {
    return storageKey;
  }

  function leerAvanceGuardadoCrudo() {
    if (!obtenerStorageKey() || typeof window === "undefined") return null;

    try {
      return window.localStorage.getItem(obtenerStorageKey());
    } catch (error) {
      console.error("No se pudo leer el avance original:", error);
      return null;
    }
  }

  function borrarAvanceLocal() {
    if (!obtenerStorageKey() || typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(obtenerStorageKey());
    } catch (error) {
      console.error("No se pudo borrar el avance local:", error);
    }
  }

  function restaurarAvanceOriginal() {
    if (!obtenerStorageKey() || typeof window === "undefined") return;

    try {
      if (avanceOriginalRef.current) {
        window.localStorage.setItem(
          obtenerStorageKey(),
          avanceOriginalRef.current
        );
      } else {
        window.localStorage.removeItem(obtenerStorageKey());
      }
    } catch (error) {
      console.error("No se pudo restaurar el avance original:", error);
    }
  }

  function cargarAvanceLocal(segundosIniciales: number | null) {
    if (!obtenerStorageKey() || typeof window === "undefined") return;

    try {
      const avanceGuardado = window.localStorage.getItem(obtenerStorageKey());

      avanceOriginalRef.current = avanceGuardado;

      if (!avanceGuardado) return;

      const avance = JSON.parse(avanceGuardado) as AvanceSimulador;

      if (avance?.respuestas && typeof avance.respuestas === "object") {
        setRespuestas(avance.respuestas);
      }

      if (avance?.marcadas && typeof avance.marcadas === "object") {
        setMarcadas(avance.marcadas);
      }

      if (Number.isInteger(avance?.indiceActual)) {
        setIndiceActual(Math.max(0, Number(avance.indiceActual)));
      }

      if (
        typeof avance?.segundos_restantes === "number" &&
        avance.segundos_restantes >= 0
      ) {
        setSegundosRestantes(avance.segundos_restantes);
      } else {
        setSegundosRestantes(segundosIniciales);
      }

      setMensajeAvance("Se recuperó un avance guardado de este simulador.");
    } catch (error) {
      console.error("No se pudo cargar el avance local:", error);
    }
  }

  function guardarAvanceLocal() {
    if (!obtenerStorageKey() || typeof window === "undefined") return false;

    try {
      const avanceNuevo = JSON.stringify({
        simulador_id: simuladorId,
        respuestas,
        marcadas,
        indiceActual,
        segundos_restantes: segundosRestantes,
        actualizado_en: new Date().toISOString(),
      });

      window.localStorage.setItem(obtenerStorageKey(), avanceNuevo);
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

  async function cargarSimulador() {
    setCargando(true);
    setMostrarResultado(false);
    setResultadoGuardado(false);
    setResultadoGuardadoId(null);
    setGuardandoResultado(false);
    setTipoFinalizacion(null);

    finalizacionEnProcesoRef.current = false;
    guardadoEnProcesoRef.current = false;

    if (nuevoIntento) {
      avanceOriginalRef.current = null;
      borrarAvanceLocal();
      setRespuestas({});
      setMarcadas({});
      setIndiceActual(0);
    } else {
      avanceOriginalRef.current = leerAvanceGuardadoCrudo();
    }

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
    const segundosIniciales = limite > 0 ? limite * 60 : null;

    setSegundosRestantes(segundosIniciales);
    setInicioTimestamp(Date.now());

    const { data: seccionesData, error: seccionesError } = await supabase
      .from(TABLA_SECCIONES)
      .select("*")
      .eq("simulador_id", String(simuladorId));

    if (seccionesError) {
      console.warn("No se pudieron cargar las secciones.", seccionesError);
      setSecciones([]);
    } else {
      setSecciones(
        ordenarSecciones((seccionesData ?? []) as SeccionSimulador[])
      );
    }

    const { data: instruccionesData, error: instruccionesError } =
      await supabase
        .from(TABLA_INSTRUCCIONES)
        .select("*")
        .eq("simulador_id", String(simuladorId));

    if (instruccionesError) {
      console.warn(
        "No se pudieron cargar instrucciones_simuladores.",
        instruccionesError
      );
      setInstrucciones([]);
    } else {
      setInstrucciones(
        ordenarInstrucciones(
          (instruccionesData ?? []) as InstruccionSimulador[]
        )
      );
    }

    const { data: preguntasData, error: preguntasError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("simulador_id", String(simuladorId));

    if (preguntasError) {
      console.error("Error cargando preguntas:", preguntasError);
      setPreguntas([]);
    } else {
      setPreguntas(ordenarPreguntas((preguntasData ?? []) as Registro[]));
    }

    if (!nuevoIntento) {
      cargarAvanceLocal(segundosIniciales);
    } else {
      setMensajeAvance("Nuevo intento iniciado desde cero.");
    }

    setCargando(false);
  }

  function obtenerOrdenPregunta(pregunta: Registro) {
    return Number(pregunta.orden ?? pregunta.orden_en_seccion ?? 0);
  }

  function construirElementosRender(): ElementoRender[] {
    const elementosBase: Array<
      | {
          tipo: "instruccion";
          id: string;
          orden: number;
          instruccion: InstruccionSimulador;
        }
      | {
          tipo: "pregunta";
          id: string;
          orden: number;
          pregunta: Registro;
        }
    > = [
      ...instrucciones.map((instruccion) => ({
        tipo: "instruccion" as const,
        id: `instruccion-${instruccion.id}`,
        orden: Number(instruccion.orden ?? 0),
        instruccion,
      })),
      ...preguntas.map((pregunta) => ({
        tipo: "pregunta" as const,
        id: `pregunta-${pregunta.id}`,
        orden: obtenerOrdenPregunta(pregunta),
        pregunta,
      })),
    ];

    elementosBase.sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;

      if (a.tipo !== b.tipo) {
        return a.tipo === "instruccion" ? -1 : 1;
      }

      return a.id.localeCompare(b.id);
    });

    let contadorPreguntas = 0;

    return elementosBase.map((elemento) => {
      if (elemento.tipo === "pregunta") {
        contadorPreguntas += 1;

        return {
          ...elemento,
          numeroPregunta: contadorPreguntas,
        };
      }

      return elemento;
    });
  }

  const elementosRender = useMemo(() => {
    return construirElementosRender();
  }, [instrucciones, preguntas]);

  const elementoActual = elementosRender[indiceActual] ?? null;

  const preguntasNavegacion = useMemo(() => {
    return elementosRender.filter(
      (elemento): elemento is Extract<ElementoRender, { tipo: "pregunta" }> =>
        elemento.tipo === "pregunta"
    );
  }, [elementosRender]);

  function obtenerIndiceElementoPorPregunta(idPregunta: string | number) {
    return elementosRender.findIndex(
      (elemento) =>
        elemento.tipo === "pregunta" &&
        String(elemento.pregunta.id) === String(idPregunta)
    );
  }

  function obtenerAreaDePregunta(pregunta: Registro) {
    const seccion = secciones.find(
      (item) => String(item.id) === String(pregunta.seccion_id ?? "")
    );

    return seccion?.nombre || seccion?.titulo || pregunta.area || "General";
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

  function calcularResumenAreas(
    respuestasActuales: Record<string, string>
  ): ResumenArea[] {
    const mapa = new Map<string, { total: number; correctas: number }>();

    preguntas.forEach((pregunta) => {
      const area = obtenerAreaDePregunta(pregunta);
      const idPregunta = String(pregunta.id);
      const respuestaAlumno = respuestasActuales[idPregunta];
      const respuestaCorrecta = String(
        pregunta.respuesta_correcta ?? ""
      ).toUpperCase();

      if (!mapa.has(area)) {
        mapa.set(area, { total: 0, correctas: 0 });
      }

      const registro = mapa.get(area)!;
      registro.total += 1;

      if (respuestaAlumno === respuestaCorrecta) {
        registro.correctas += 1;
      }
    });

    return Array.from(mapa.entries()).map(([area, datos]) => ({
      area,
      total_preguntas: datos.total,
      correctas: datos.correctas,
      promedio:
        datos.total > 0 ? Math.round((datos.correctas / datos.total) * 100) : 0,
    }));
  }

  const totalCorrectas = useMemo(() => {
    return calcularCorrectas(respuestas);
  }, [preguntas, respuestas]);

  const totalPreguntas = preguntas.length;
  const totalRespondidas = Object.keys(respuestas).filter((id) =>
    preguntas.some((pregunta) => String(pregunta.id) === String(id))
  ).length;

  const porcentajeAvance =
    totalPreguntas > 0
      ? Math.round((totalRespondidas / totalPreguntas) * 100)
      : 0;

  const promedioGeneral =
    totalPreguntas > 0
      ? Math.round((totalCorrectas / totalPreguntas) * 100)
      : 0;

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
  }, [secciones, preguntas, respuestas]);

  function seleccionarRespuesta(idPregunta: string, opcion: string) {
    if (mostrarResultado) return;

    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: opcion,
    }));

    setMensajeAvance("");
    setAvanceGuardadoReciente(false);
  }

  function alternarMarcada(idPregunta: string) {
    setMarcadas((prev) => ({
      ...prev,
      [idPregunta]: !prev[idPregunta],
    }));
  }

  function irAnterior() {
    setIndiceActual((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irSiguiente() {
    setIndiceActual((prev) => Math.min(elementosRender.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irAPregunta(idPregunta: string | number) {
    const indice = obtenerIndiceElementoPorPregunta(idPregunta);

    if (indice >= 0) {
      setIndiceActual(indice);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function formatearTiempo(segundos: number | null) {
    if (segundos === null) return "Sin límite";

    const total = Math.max(0, Math.floor(segundos));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const seg = total % 60;

    return `${horas}:${String(minutos).padStart(2, "0")}:${String(
      seg
    ).padStart(2, "0")}`;
  }

  function obtenerTiempoUsado() {
    if (!inicioTimestamp) return 0;
    return Math.max(0, Math.floor((Date.now() - inicioTimestamp) / 1000));
  }

  async function guardarResultado(
    respuestasActuales: Record<string, string>,
    automaticoPorTiempo = false
  ) {
    if (!simulador) return null;

    if (guardadoEnProcesoRef.current) {
      console.warn("El resultado ya se está guardando. Se evitó un duplicado.");
      return null;
    }

    guardadoEnProcesoRef.current = true;
    setGuardandoResultado(true);
    setResultadoGuardado(false);
    setResultadoGuardadoId(null);

    try {
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

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      const tipo = automaticoPorTiempo ? "tiempo_agotado" : "normal";
      const finalizadoPor = automaticoPorTiempo ? "sistema" : "alumno";

      const payloadCompleto = {
        simulador_id: simuladorId,
        alumno_id: user?.id ?? "sin-login",
        alumno_nombre:
          user?.user_metadata?.nombre_completo ??
          user?.email ??
          "Alumno sin nombre",
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
        tipo_finalizacion: tipo,
        finalizado_por: finalizadoPor,
        finalizacion_automatica: automaticoPorTiempo,
      };

      const { data: resultadoInsertado, error } = await supabase
        .from(TABLA_RESULTADOS)
        .insert(payloadCompleto)
        .select("id")
        .single();

      if (error) {
        console.error("Error guardando resultado completo:", error);

        const payloadBasico = {
          simulador_id: simuladorId,
          alumno_id: user?.id ?? "sin-login",
          alumno_nombre:
            user?.user_metadata?.nombre_completo ??
            user?.email ??
            "Alumno sin nombre",
          total_preguntas: total,
          correctas,
          calificacion: promedio,
          tiempo_limite_minutos: Number(simulador.tiempo_minutos ?? 0),
          tiempo_usado_segundos: tiempoUsado,
          respuestas: detalleRespuestas,
          tipo_finalizacion: tipo,
          finalizado_por: finalizadoPor,
          finalizacion_automatica: automaticoPorTiempo,
        };

        const { data: resultadoBasicoInsertado, error: errorBasico } =
          await supabase
            .from(TABLA_RESULTADOS)
            .insert(payloadBasico)
            .select("id")
            .single();

        if (errorBasico) {
          console.error("Error guardando resultado básico:", errorBasico);
          setResultadoGuardado(false);
          setResultadoGuardadoId(null);
          return null;
        }

        setResultadoGuardado(true);
        setResultadoGuardadoId(resultadoBasicoInsertado?.id ?? null);
        borrarAvanceLocal();
        avanceOriginalRef.current = null;

        return resultadoBasicoInsertado?.id ?? null;
      }

      setResultadoGuardado(true);
      setResultadoGuardadoId(resultadoInsertado?.id ?? null);
      borrarAvanceLocal();
      avanceOriginalRef.current = null;

      return resultadoInsertado?.id ?? null;
    } finally {
      setGuardandoResultado(false);
      guardadoEnProcesoRef.current = false;
    }
  }

  async function terminarSimulador(automatico = false) {
    if (
      preguntas.length === 0 ||
      mostrarResultado ||
      guardandoResultado ||
      finalizacionEnProcesoRef.current
    ) {
      return;
    }

    const sinResponder = preguntas.some(
      (pregunta) => !respuestas[String(pregunta.id)]
    );

    if (sinResponder && !automatico) {
      const confirmar = window.confirm(
        "Hay preguntas sin responder. ¿Quieres finalizar el simulador de todos modos?"
      );

      if (!confirmar) return;
    }

    finalizacionEnProcesoRef.current = true;

    setTipoFinalizacion(automatico ? "tiempo" : "manual");
    setMostrarResultado(true);

    try {
      await guardarResultado(respuestas, automatico);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error al finalizar simulador:", error);
      setResultadoGuardado(false);
    }
  }

  function reiniciarSimulador() {
    setRespuestas({});
    setMarcadas({});
    setIndiceActual(0);
    setMostrarResultado(false);
    setResultadoGuardado(false);
    setResultadoGuardadoId(null);
    setGuardandoResultado(false);
    setTipoFinalizacion(null);

    finalizacionEnProcesoRef.current = false;
    guardadoEnProcesoRef.current = false;

    setMensajeAvance("Nuevo intento iniciado desde cero.");
    setAvanceGuardadoReciente(false);
    borrarAvanceLocal();
    avanceOriginalRef.current = null;

    const limite = Number(simulador?.tiempo_minutos ?? 0);
    setSegundosRestantes(limite > 0 ? limite * 60 : null);
    setInicioTimestamp(Date.now());

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function abrirDialogoSalida() {
    setDestinoPendiente(destinoVolver);
    setAvanceListoParaSalir(false);
    setMostrarDialogoSalida(true);
  }

  function guardarParaSalir() {
    const guardado = guardarAvanceLocal();

    if (guardado) {
      setAvanceListoParaSalir(true);
    }
  }

  async function salirDespuesDeGuardar() {
    salidaPermitidaRef.current = true;

    if (destinoPendiente === "/login?cerrarSesion=1") {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    window.location.href = destinoPendiente || destinoVolver;
  }

  async function descartarCambiosYSalir() {
    salidaPermitidaRef.current = true;
    restaurarAvanceOriginal();

    if (destinoPendiente === "/login?cerrarSesion=1") {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    window.location.href = destinoPendiente || destinoVolver;
  }

  function seguirEnElExamen() {
    setMostrarDialogoSalida(false);
    setAvanceListoParaSalir(false);
    setDestinoPendiente(null);
  }

  function obtenerClaseBotonPregunta(idPregunta: string | number) {
    const id = String(idPregunta);
    const respondida = Boolean(respuestas[id]);
    const marcada = Boolean(marcadas[id]);

    if (marcada) {
      return "border-amber-300 bg-amber-50 text-amber-700";
    }

    if (respondida) {
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-white text-slate-600";
  }

  if (cargando) {
    return (
      <AlumnoProtegido>
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
          <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-slate-600">Cargando simulador...</p>
          </section>
        </main>
      </AlumnoProtegido>
    );
  }

  if (!simulador) {
    return (
      <AlumnoProtegido>
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
          <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black">Simulador no encontrado</h1>

            <p className="mt-3 text-slate-600">
              No se encontró el simulador solicitado.
            </p>

            <Link
              href={destinoVolver}
              className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
            >
              Volver a simuladores
            </Link>
          </section>
        </main>
      </AlumnoProtegido>
    );
  }

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={abrirDialogoSalida}
                className="text-sm font-bold text-blue-600 hover:text-blue-500"
              >
                ← Volver a simuladores
              </button>

              <p className="mt-2 text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                {obtenerTitulo(simulador)}
              </p>

              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                {elementoActual?.tipo === "pregunta"
                  ? `Pregunta ${elementoActual.numeroPregunta} de ${totalPreguntas}`
                  : "Instrucción del simulador"}
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className={`rounded-2xl px-5 py-3 text-center text-white shadow-sm ${
                  segundosRestantes !== null && segundosRestantes <= 60
                    ? "bg-red-700"
                    : "bg-slate-900"
                }`}
              >
                <p className="text-xs font-semibold text-slate-300">
                  Tiempo restante
                </p>
                <p className="text-2xl font-black">
                  {formatearTiempo(segundosRestantes)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => terminarSimulador(false)}
                disabled={
                  guardandoResultado ||
                  mostrarResultado ||
                  finalizacionEnProcesoRef.current
                }
                className="rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardandoResultado || finalizacionEnProcesoRef.current
                  ? "Finalizando..."
                  : "Finalizar intento"}
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Progreso general
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${porcentajeAvance}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600">
                {porcentajeAvance}%
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {mensajeAvance && !mostrarResultado && (
              <div
                className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
                  avanceGuardadoReciente
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {mensajeAvance}
              </div>
            )}

            {mostrarResultado && (
              <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                {tipoFinalizacion === "tiempo" && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
                    <p className="text-sm font-black uppercase tracking-[0.2em]">
                      Tiempo agotado
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      El tiempo terminó
                    </h2>

                    <p className="mt-2 text-sm leading-6">
                      Tu simulador fue entregado automáticamente. Se guardaron
                      las respuestas que alcanzaste a contestar.
                    </p>
                  </div>
                )}

                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">
                  Resultado
                </p>

                <h2 className="mt-3 text-4xl font-black text-slate-900">
                  {puntaje1300} / {PUNTAJE_MAXIMO} puntos
                </h2>

                <p className="mt-2 text-lg font-bold text-slate-700">
                  {totalCorrectas} de {preguntas.length} aciertos · Promedio{" "}
                  {promedioGeneral}%
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tiempo usado: {formatearTiempo(obtenerTiempoUsado())}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Finalización:{" "}
                  <span className="font-bold">
                    {tipoFinalizacion === "tiempo"
                      ? "Automática por tiempo agotado"
                      : "Manual por el alumno"}
                  </span>
                </p>

                <p className="mt-2 text-sm font-bold text-slate-500">
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
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-sm font-bold text-blue-700">
                          {area.area}
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {area.correctas} de {area.total_preguntas}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {area.promedio}% de acierto
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {resultadoGuardadoId && (
                    <Link
                      href={`/resultados?resultado=${resultadoGuardadoId}&volver=simuladores`}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-bold text-white hover:bg-blue-500"
                    >
                      Ver detalle completo
                    </Link>
                  )}

                  <Link
                    href={destinoVolver}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
                  >
                    Volver a simuladores
                  </Link>

                  <button
                    type="button"
                    onClick={reiniciarSimulador}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Nuevo intento
                  </button>
                </div>
              </section>
            )}

            {preguntas.length === 0 && instrucciones.length === 0 ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-black">
                  Este simulador todavía no tiene contenido
                </h2>

                <p className="mt-3 text-slate-600">
                  Agrega instrucciones o preguntas desde el panel de
                  administración.
                </p>

                <Link
                  href={destinoVolver}
                  className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
                >
                  Volver a simuladores
                </Link>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                {elementoActual?.tipo === "instruccion" && (
                  <article>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      Instrucción
                    </span>

                    {elementoActual.instruccion.titulo && (
                      <h2 className="mt-4 text-2xl font-black">
                        {elementoActual.instruccion.titulo}
                      </h2>
                    )}

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                      <ContenidoHtml
                        html={elementoActual.instruccion.contenido ?? ""}
                      />
                    </div>
                  </article>
                )}

                {elementoActual?.tipo === "pregunta" && (
                  <article>
                    {(() => {
                      const pregunta = elementoActual.pregunta;
                      const idPregunta = String(pregunta.id);
                      const respuestaAlumno = respuestas[idPregunta];
                      const respuestaCorrecta = String(
                        pregunta.respuesta_correcta ?? ""
                      ).toUpperCase();
                      const area = obtenerAreaDePregunta(pregunta);
                      const estaMarcada = Boolean(marcadas[idPregunta]);

                      const opciones = [
                        { clave: "A", html: pregunta.opcion_a },
                        { clave: "B", html: pregunta.opcion_b },
                        { clave: "C", html: pregunta.opcion_c },
                        { clave: "D", html: pregunta.opcion_d },
                      ].filter(
                        (opcion) => !contenidoVacio(String(opcion.html ?? ""))
                      );

                      return (
                        <>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                {area}
                              </span>

                              <p className="mt-4 text-sm font-black text-blue-600">
                                Pregunta {elementoActual.numeroPregunta}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => alternarMarcada(idPregunta)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                                estaMarcada
                                  ? "border-amber-300 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {estaMarcada
                                ? "Marcada para revisar"
                                : "Marcar para revisar"}
                            </button>
                          </div>

                          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                            <ContenidoHtml html={pregunta.pregunta} />
                          </div>

                          <div className="mt-6 space-y-3">
                            {opciones.map((opcion) => {
                              const seleccionada =
                                respuestaAlumno === opcion.clave;
                              const esCorrecta =
                                respuestaCorrecta === opcion.clave;

                              let clase =
                                "border-slate-200 bg-white hover:bg-slate-50";

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
                                clase =
                                  "border-blue-400 bg-blue-50 text-blue-900";
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
                                  className={`w-full rounded-2xl border p-4 text-left transition ${clase}`}
                                >
                                  <div className="flex gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-black">
                                      {opcion.clave}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <ContenidoHtml html={opcion.html} />
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {mostrarResultado && pregunta.explicacion && (
                            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                              <p className="font-black text-amber-800">
                                Explicación
                              </p>

                              <p className="mt-2 text-slate-700">
                                {pregunta.explicacion}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </article>
                )}

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={irAnterior}
                    disabled={indiceActual <= 0}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={irSiguiente}
                    disabled={indiceActual >= elementosRender.length - 1}
                    className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Navegación rápida</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Puedes saltar a cualquier pregunta sin cargar todo el simulador
                en pantalla.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-xs font-bold text-emerald-700">
                    Respondidas
                  </p>
                  <p className="text-2xl font-black">{totalRespondidas}</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-xs font-bold text-amber-700">Marcadas</p>
                  <p className="text-2xl font-black">
                    {Object.values(marcadas).filter(Boolean).length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    Pendientes
                  </p>
                  <p className="text-2xl font-black">
                    {Math.max(0, totalPreguntas - totalRespondidas)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3">
                {preguntasNavegacion.map((elemento) => {
                  const idPregunta = String(elemento.pregunta.id);
                  const indiceElemento = obtenerIndiceElementoPorPregunta(
                    elemento.pregunta.id
                  );
                  const esActual = indiceElemento === indiceActual;

                  return (
                    <button
                      key={elemento.id}
                      type="button"
                      onClick={() => irAPregunta(elemento.pregunta.id)}
                      className={`h-9 w-9 rounded-xl border text-sm font-black ${
                        esActual
                          ? "border-slate-900 bg-slate-900 text-white"
                          : obtenerClaseBotonPregunta(idPregunta)
                      }`}
                    >
                      {elemento.numeroPregunta}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" />
                  Respondida
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-amber-300 bg-amber-50" />
                  Marcada
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-slate-900 bg-slate-900" />
                  Actual
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Salir del examen</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cuando quieras salir del examen, usa{" "}
                <span className="font-bold">Volver a simuladores</span>. Podrás
                guardar tus cambios, descartarlos o seguir trabajando.
              </p>
            </section>
          </aside>
        </section>

        {mostrarDialogoSalida && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              {!avanceListoParaSalir ? (
                <>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    Continuar después
                  </span>

                  <h2 className="mt-4 text-2xl font-black text-slate-900">
                    ¿Qué quieres hacer antes de salir?
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Puedes guardar tus cambios actuales para continuar después
                    desde este punto. Si descartas, se perderán solo los cambios
                    hechos en esta sesión y se conservará tu último avance
                    guardado, si ya existía.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={guardarParaSalir}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                    >
                      Guardar avance
                    </button>

                    <button
                      type="button"
                      onClick={descartarCambiosYSalir}
                      className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                    >
                      Descartar cambios y salir
                    </button>

                    <button
                      type="button"
                      onClick={seguirEnElExamen}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Seguir en el examen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Avance guardado
                  </span>

                  <h2 className="mt-4 text-2xl font-black text-slate-900">
                    Tu avance fue guardado
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Tus respuestas, preguntas marcadas y tiempo restante
                    quedaron guardados en este dispositivo. Puedes salir o
                    seguir trabajando en el examen.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={salirDespuesDeGuardar}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                    >
                      {destinoPendiente && destinoPendiente !== destinoVolver
                        ? "Salir ahora"
                        : "Salir a simuladores"}
                    </button>

                    <button
                      type="button"
                      onClick={seguirEnElExamen}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Seguir en el examen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <style jsx global>{`
          .prose-exam {
            line-height: 1.7;
            word-break: break-word;
          }

          .prose-exam img,
          .exam-image {
            max-width: 100%;
            height: auto;
            border-radius: 14px;
            margin: 12px 0;
            border: 1px solid #e2e8f0;
            display: block;
            background: white;
          }

          .prose-exam h1,
          .prose-exam h2,
          .prose-exam h3 {
            color: #0f172a;
            font-weight: 900;
            margin: 0.5rem 0;
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
            font-weight: 900;
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
    </AlumnoProtegido>
  );
}