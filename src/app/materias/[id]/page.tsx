"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  contenido?: string;
  texto?: string;
  texto_html?: string;
  contenido_html?: string;
  video_url?: string;
  url_video?: string;
  imagen_url?: string;
  image_url?: string;
  archivo_url?: string;
  material_url?: string;
  documento_url?: string;
  materia_id?: string | number;
  tema_id?: string | number;
  tiempo_minutos?: number;
  [key: string]: any;
};

type SubtemaPlano = {
  temaId: string;
  temaTitulo: string;
  subtemaId: string;
  subtemaTitulo: string;
};

type AvanceParcialLocal = {
  parcial_id?: string | number;
  respuestas?: Record<string, string>;
  segundos_restantes?: number | null;
  actualizado_en?: string;
};

type ResultadoParcial = {
  id: string | number;
  parcial_id?: string | number | null;
  alumno_id?: string | null;
  alumno_nombre?: string | null;
  total_preguntas?: number | null;
  correctas?: number | null;
  calificacion?: number | null;
  tiempo_usado_segundos?: number | null;
  created_at?: string | null;
  [key: string]: any;
};

type EstadoParcial = "Disponible" | "En progreso" | "Completado";

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_CONTENIDO = "contenido_subtemas";
const TABLA_PARCIALES = "parciales";
const TABLA_RESULTADOS_PARCIALES = "resultados_parciales";

export default function MateriaAlumnoPage() {
  const params = useParams();
  const rawId = params?.id;
  const materiaId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const [materia, setMateria] = useState<Registro | null>(null);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [subtemasPorTema, setSubtemasPorTema] = useState<
    Record<string, Registro[]>
  >({});
  const [contenidosPorSubtema, setContenidosPorSubtema] = useState<
    Record<string, Registro[]>
  >({});
  const [parcialesPorTema, setParcialesPorTema] = useState<
    Record<string, Registro[]>
  >({});

  const [avancesParciales, setAvancesParciales] = useState<
    Record<string, AvanceParcialLocal>
  >({});
  const [resultadosParciales, setResultadosParciales] = useState<
    Record<string, ResultadoParcial>
  >({});

  const [temaActivoId, setTemaActivoId] = useState("");
  const [subtemaActivoId, setSubtemaActivoId] = useState("");

  const [completados, setCompletados] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [origen, setOrigen] = useState("");

  const storageKey = `avance-materia-${materiaId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOrigen(window.location.origin);

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    const primerAjuste = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });

    const segundoAjuste = window.setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }, 150);

    return () => {
      window.cancelAnimationFrame(primerAjuste);
      window.clearTimeout(segundoAjuste);
    };
  }, [materiaId]);

  useEffect(() => {
    if (!materiaId) return;

    cargarAvanceLocal();
    cargarTodo();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId]);

  useEffect(() => {
    const todosParciales = Object.values(parcialesPorTema).flat();

    if (todosParciales.length === 0) return;

    function actualizarEstadoParciales() {
      leerAvancesParciales(todosParciales);
      cargarResultadosParciales(todosParciales);
    }

    function actualizarSiRegresa() {
      if (document.visibilityState === "visible") {
        actualizarEstadoParciales();
      }
    }

    window.addEventListener("focus", actualizarEstadoParciales);
    document.addEventListener("visibilitychange", actualizarSiRegresa);

    return () => {
      window.removeEventListener("focus", actualizarEstadoParciales);
      document.removeEventListener("visibilitychange", actualizarSiRegresa);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcialesPorTema]);

  function scrollInicioMateria() {
    if (typeof window === "undefined") return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }, 80);
  }

  function cargarAvanceLocal() {
    if (typeof window === "undefined") return;

    try {
      const guardado = localStorage.getItem(storageKey);

      if (guardado) {
        setCompletados(JSON.parse(guardado));
      } else {
        setCompletados({});
      }
    } catch {
      setCompletados({});
    }
  }

  function guardarAvanceLocal(nuevoAvance: Record<string, boolean>) {
    setCompletados(nuevoAvance);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(nuevoAvance));
    }
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

  async function consultarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    let primeraRespuestaValida: Registro[] = [];

    for (const filtro of filtros) {
      const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .eq(filtro.columna, filtro.valor);

      if (!error) {
        const lista = data ?? [];

        if (primeraRespuestaValida.length === 0) {
          primeraRespuestaValida = lista;
        }

        if (lista.length > 0) {
          return lista;
        }
      }
    }

    return primeraRespuestaValida;
  }

  function obtenerStorageKeyParcial(parcialIdValor: string | number) {
    return `avance_parcial_${parcialIdValor}`;
  }

  function leerAvancesParciales(listaParciales: Registro[]) {
    if (typeof window === "undefined") return;

    const nuevosAvances: Record<string, AvanceParcialLocal> = {};

    listaParciales.forEach((parcial) => {
      const idParcial = String(parcial.id);
      const guardado = window.localStorage.getItem(
        obtenerStorageKeyParcial(idParcial)
      );

      if (!guardado) return;

      try {
        const avance = JSON.parse(guardado) as AvanceParcialLocal;

        const tieneRespuestas =
          avance?.respuestas &&
          typeof avance.respuestas === "object" &&
          Object.keys(avance.respuestas).length > 0;

        const tieneTiempo =
          typeof avance?.segundos_restantes === "number" &&
          avance.segundos_restantes >= 0;

        if (tieneRespuestas || tieneTiempo) {
          nuevosAvances[idParcial] = avance;
        }
      } catch (error) {
        console.error("No se pudo leer el avance del parcial:", error);
      }
    });

    setAvancesParciales(nuevosAvances);
  }

  async function cargarResultadosParciales(listaParciales: Registro[]) {
    const idsParciales = listaParciales.map((parcial) => String(parcial.id));

    if (idsParciales.length === 0) {
      setResultadosParciales({});
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user?.id) {
      setResultadosParciales({});
      return;
    }

    const { data, error } = await supabase
      .from(TABLA_RESULTADOS_PARCIALES)
      .select("*")
      .in("parcial_id", idsParciales)
      .eq("alumno_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("No se pudieron cargar resultados de parciales:", error);
      setResultadosParciales({});
      return;
    }

    const mapa: Record<string, ResultadoParcial> = {};

    ((data ?? []) as ResultadoParcial[]).forEach((resultado) => {
      const idParcial = String(resultado.parcial_id ?? "");
      if (!idParcial) return;

      if (!mapa[idParcial]) {
        mapa[idParcial] = resultado;
      }
    });

    setResultadosParciales(mapa);
  }

  async function cargarTodo() {
    setCargando(true);

    const { data: materiaData, error: materiaError } = await supabase
      .from(TABLA_MATERIAS)
      .select("*")
      .eq("id", materiaId)
      .single();

    if (materiaError) {
      console.error("Error cargando materia:", materiaError);
      setCargando(false);
      scrollInicioMateria();
      return;
    }

    setMateria(materiaData);

    const temasData = await consultarConFallback(TABLA_TEMAS, [
      { columna: "materia_id", valor: materiaId },
      { columna: "id_materia", valor: materiaId },
      { columna: "materia", valor: materiaId },
    ]);

    const temasOrdenados = ordenarLista(temasData);
    setTemas(temasOrdenados);

    const nuevoSubtemasPorTema: Record<string, Registro[]> = {};
    const nuevoContenidosPorSubtema: Record<string, Registro[]> = {};
    const nuevoParcialesPorTema: Record<string, Registro[]> = {};

    for (const tema of temasOrdenados) {
      const idTema = String(tema.id);

      const subtemasData = await consultarConFallback(TABLA_SUBTEMAS, [
        { columna: "tema_id", valor: idTema },
        { columna: "unidad_id", valor: idTema },
        { columna: "id_tema", valor: idTema },
        { columna: "id_unidad", valor: idTema },
        { columna: "tema", valor: idTema },
        { columna: "unidad", valor: idTema },
      ]);

      const subtemasOrdenados = ordenarLista(subtemasData);
      nuevoSubtemasPorTema[idTema] = subtemasOrdenados;

      for (const subtema of subtemasOrdenados) {
        const idSubtema = String(subtema.id);

        const { data: contenidosData, error: contenidosError } = await supabase
          .from(TABLA_CONTENIDO)
          .select("*")
          .eq("subtema_id", idSubtema);

        if (contenidosError) {
          console.error("Error cargando contenidos:", contenidosError);
          nuevoContenidosPorSubtema[idSubtema] = [];
        } else {
          nuevoContenidosPorSubtema[idSubtema] = ordenarLista(
            contenidosData ?? []
          );
        }
      }

      const parcialesData = await consultarConFallback(TABLA_PARCIALES, [
        { columna: "tema_id", valor: idTema },
        { columna: "unidad_id", valor: idTema },
        { columna: "id_tema", valor: idTema },
        { columna: "id_unidad", valor: idTema },
      ]);

      nuevoParcialesPorTema[idTema] = ordenarLista(parcialesData);
    }

    setSubtemasPorTema(nuevoSubtemasPorTema);
    setContenidosPorSubtema(nuevoContenidosPorSubtema);
    setParcialesPorTema(nuevoParcialesPorTema);

    const todosParciales = Object.values(nuevoParcialesPorTema).flat();

    leerAvancesParciales(todosParciales);
    await cargarResultadosParciales(todosParciales);

    const primerTema = temasOrdenados[0];
    const primerosSubtemas = primerTema
      ? nuevoSubtemasPorTema[String(primerTema.id)] ?? []
      : [];
    const primerSubtema = primerosSubtemas[0];

    setTemaActivoId(primerTema ? String(primerTema.id) : "");
    setSubtemaActivoId(primerSubtema ? String(primerSubtema.id) : "");

    setCargando(false);
    scrollInicioMateria();
  }

  const subtemasPlanos = useMemo<SubtemaPlano[]>(() => {
    const lista: SubtemaPlano[] = [];

    temas.forEach((tema) => {
      const idTema = String(tema.id);
      const subtemas = subtemasPorTema[idTema] ?? [];

      subtemas.forEach((subtema) => {
        lista.push({
          temaId: idTema,
          temaTitulo: obtenerTitulo(tema),
          subtemaId: String(subtema.id),
          subtemaTitulo: obtenerTitulo(subtema),
        });
      });
    });

    return lista;
  }, [temas, subtemasPorTema]);

  const indiceActivo = useMemo(() => {
    return subtemasPlanos.findIndex(
      (item) => item.subtemaId === subtemaActivoId
    );
  }, [subtemasPlanos, subtemaActivoId]);

  const totalSubtemas = subtemasPlanos.length;

  const totalCompletados = useMemo(() => {
    return subtemasPlanos.filter((item) => completados[item.subtemaId]).length;
  }, [subtemasPlanos, completados]);

  const porcentajeAvance =
    totalSubtemas > 0
      ? Math.round((totalCompletados / totalSubtemas) * 100)
      : 0;

  function calcularAvanceTema(idTema: string) {
    const subtemas = subtemasPorTema[idTema] ?? [];
    const total = subtemas.length;
    const completadosTema = subtemas.filter(
      (subtema) => completados[String(subtema.id)]
    ).length;
    const porcentaje =
      total > 0 ? Math.round((completadosTema / total) * 100) : 0;

    return {
      total,
      completados: completadosTema,
      porcentaje,
    };
  }

  const subtemaActivo = useMemo(() => {
    if (!temaActivoId || !subtemaActivoId) return null;

    const subtemas = subtemasPorTema[temaActivoId] ?? [];

    return (
      subtemas.find((subtema) => String(subtema.id) === subtemaActivoId) ??
      null
    );
  }, [temaActivoId, subtemaActivoId, subtemasPorTema]);

  const contenidosActivos = useMemo(() => {
    if (!subtemaActivoId) return [];
    return contenidosPorSubtema[subtemaActivoId] ?? [];
  }, [subtemaActivoId, contenidosPorSubtema]);

  const parcialesDelTemaActivo = useMemo(() => {
    if (!temaActivoId) return [];
    return parcialesPorTema[temaActivoId] ?? [];
  }, [temaActivoId, parcialesPorTema]);

  const subtemaEstaCompletado = Boolean(completados[subtemaActivoId]);

  const esUltimoSubtemaDelTema = useMemo(() => {
    if (!temaActivoId || !subtemaActivoId) return false;

    const subtemas = subtemasPorTema[temaActivoId] ?? [];
    if (subtemas.length === 0) return false;

    const ultimo = subtemas[subtemas.length - 1];
    return String(ultimo.id) === String(subtemaActivoId);
  }, [temaActivoId, subtemaActivoId, subtemasPorTema]);

  function obtenerTextoBloque(bloque: Registro) {
    return String(
      bloque.contenido ??
        bloque.texto ??
        bloque.texto_html ??
        bloque.contenido_html ??
        ""
    );
  }

  function obtenerArchivoBloque(bloque: Registro) {
    return String(
      bloque.archivo_url ?? bloque.material_url ?? bloque.documento_url ?? ""
    );
  }

  function obtenerImagenBloque(bloque: Registro) {
    return String(bloque.imagen_url ?? bloque.image_url ?? "");
  }

  function obtenerVideoBloque(bloque: Registro) {
    return String(bloque.video_url ?? bloque.url_video ?? "");
  }

  function obtenerYoutubeId(url: string) {
    if (!url) return "";

    const limpio = url.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(limpio)) {
      return limpio;
    }

    try {
      const parsed = new URL(limpio);

      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.replace("/", "").split("?")[0];
      }

      if (parsed.hostname.includes("youtube.com")) {
        const idNormal = parsed.searchParams.get("v");

        if (idNormal) return idNormal;

        const partes = parsed.pathname.split("/").filter(Boolean);
        const embedIndex = partes.indexOf("embed");
        const shortsIndex = partes.indexOf("shorts");

        if (embedIndex !== -1 && partes[embedIndex + 1]) {
          return partes[embedIndex + 1];
        }

        if (shortsIndex !== -1 && partes[shortsIndex + 1]) {
          return partes[shortsIndex + 1];
        }
      }

      return "";
    } catch {
      return "";
    }
  }

  function renderVideo(url: string) {
    if (!url) return null;

    const youtubeId = obtenerYoutubeId(url);

    if (youtubeId) {
      const src = `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1${
        origen ? `&origin=${encodeURIComponent(origen)}` : ""
      }`;

      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-slate-200 bg-black"
          src={src}
          title="Video de YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }

    return (
      <video
        className="w-full rounded-2xl border border-slate-200 bg-black"
        src={url}
        controls
      />
    );
  }

  function seleccionarSubtema(idTema: string, idSubtema: string) {
    setTemaActivoId(idTema);
    setSubtemaActivoId(idSubtema);

    setTimeout(() => {
      const destino = document.getElementById("contenido-activo");

      destino?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function irAnterior() {
    if (indiceActivo <= 0) return;

    const anterior = subtemasPlanos[indiceActivo - 1];
    seleccionarSubtema(anterior.temaId, anterior.subtemaId);
  }

  function irSiguiente() {
    if (indiceActivo === -1 || indiceActivo >= subtemasPlanos.length - 1) {
      return;
    }

    const siguiente = subtemasPlanos[indiceActivo + 1];
    seleccionarSubtema(siguiente.temaId, siguiente.subtemaId);
  }

  function marcarCompletado() {
    if (!subtemaActivoId) return;

    const nuevoAvance = {
      ...completados,
      [subtemaActivoId]: true,
    };

    guardarAvanceLocal(nuevoAvance);
  }

  function quitarCompletado() {
    if (!subtemaActivoId) return;

    const nuevoAvance = {
      ...completados,
      [subtemaActivoId]: false,
    };

    guardarAvanceLocal(nuevoAvance);
  }

  function obtenerIconoMateria(nombreMateria: string) {
    const texto = nombreMateria.toLowerCase();

    if (texto.includes("lectora") || texto.includes("lectura")) return "📖";
    if (texto.includes("lengua") || texto.includes("escrita")) return "✍️";
    if (texto.includes("mate")) return "🧮";
    if (texto.includes("salud") || texto.includes("ciencia")) return "🧬";

    return "📚";
  }

  function obtenerEstadoParcial(parcial: Registro): EstadoParcial {
    const idParcial = String(parcial.id);

    if (avancesParciales[idParcial]) return "En progreso";
    if (resultadosParciales[idParcial]) return "Completado";

    return "Disponible";
  }

  function obtenerCalificacionParcial(resultado?: ResultadoParcial | null) {
    if (!resultado) return 0;

    const calificacionGuardada = Number(resultado.calificacion ?? 0);

    if (calificacionGuardada > 0) return calificacionGuardada;

    const correctas = Number(resultado.correctas ?? 0);
    const total = Number(resultado.total_preguntas ?? 0);

    if (total <= 0) return 0;

    return Math.round((correctas / total) * 100);
  }

  function contarRespuestasParcial(avance?: AvanceParcialLocal) {
    if (!avance?.respuestas || typeof avance.respuestas !== "object") return 0;
    return Object.keys(avance.respuestas).length;
  }

  function formatearTiempoSegundos(segundos?: number | null) {
    if (segundos === null || segundos === undefined) return "";

    const total = Math.max(0, Math.floor(segundos));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const seg = total % 60;

    if (horas > 0) {
      return `${horas}:${String(minutos).padStart(2, "0")}:${String(
        seg
      ).padStart(2, "0")}`;
    }

    return `${minutos}:${String(seg).padStart(2, "0")}`;
  }

  function obtenerHrefParcial(parcial: Registro) {
    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const resultado = resultadosParciales[idParcial];

    if (estado === "Completado" && resultado) {
      return `/resultados?resultado=${encodeURIComponent(
        `parcial-${resultado.id}`
      )}&volver=/materias/${materiaId}`;
    }

    return `/parciales/${parcial.id}?volver=/materias/${materiaId}`;
  }

  function obtenerHrefNuevoIntento(parcial: Registro) {
    return `/parciales/${parcial.id}?nuevo=1&volver=/materias/${materiaId}`;
  }

  function obtenerTextoBotonParcial(parcial: Registro) {
    const estado = obtenerEstadoParcial(parcial);

    if (estado === "En progreso") return "Continuar parcial";
    if (estado === "Completado") return "Ver resultado";
    return "Iniciar parcial";
  }

  function obtenerClasesEstadoParcial(estado: EstadoParcial) {
    if (estado === "En progreso") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (estado === "Completado") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  function obtenerClasesBotonParcial(estado: EstadoParcial) {
    if (estado === "En progreso") {
      return "bg-amber-500 text-slate-950 hover:bg-amber-400";
    }

    if (estado === "Completado") {
      return "bg-emerald-600 text-white hover:bg-emerald-500";
    }

    return "bg-blue-600 text-white hover:bg-blue-500";
  }

  function confirmarNuevoIntentoParcial(
    event: MouseEvent<HTMLAnchorElement>,
    parcial: Registro
  ) {
    if (typeof window === "undefined") return;

    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const titulo = obtenerTitulo(parcial);

    const mensaje =
      estado === "En progreso"
        ? `Este parcial tiene un avance guardado.\n\nSi inicias un nuevo intento, se perderá ese avance y comenzarás desde cero.\n\n¿Deseas continuar?`
        : `Vas a iniciar un nuevo intento de "${titulo}".\n\nTus resultados anteriores seguirán guardados en Resultados, pero este nuevo intento comenzará desde cero.\n\n¿Deseas continuar?`;

    const confirmar = window.confirm(mensaje);

    if (!confirmar) {
      event.preventDefault();
      return;
    }

    window.localStorage.removeItem(obtenerStorageKeyParcial(idParcial));

    setAvancesParciales((prev) => {
      const copia = { ...prev };
      delete copia[idParcial];
      return copia;
    });
  }

  function TarjetaParcialUnidad({
    parcial,
    compacto = false,
  }: {
    parcial: Registro;
    compacto?: boolean;
  }) {
    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const avance = avancesParciales[idParcial];
    const resultado = resultadosParciales[idParcial];

    const respuestasGuardadas = contarRespuestasParcial(avance);
    const tiempoRestante = formatearTiempoSegundos(avance?.segundos_restantes);
    const calificacion = obtenerCalificacionParcial(resultado);

    return (
      <div
        className={`rounded-2xl border bg-white shadow-sm ${
          compacto ? "border-amber-100 p-3" : "border-amber-100 p-5"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${obtenerClasesEstadoParcial(
                estado
              )}`}
            >
              {estado}
            </span>

            <h4
              className={`mt-3 font-semibold text-slate-900 ${
                compacto ? "text-base" : "text-xl"
              }`}
            >
              {obtenerTitulo(parcial)}
            </h4>

            {!compacto && obtenerDescripcion(parcial) && (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {obtenerDescripcion(parcial)}
              </p>
            )}

            {estado === "En progreso" && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {respuestasGuardadas} respuestas guardadas
                {tiempoRestante ? ` · ${tiempoRestante} restantes` : ""}
              </p>
            )}

            {estado === "Completado" && resultado && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Último resultado: {calificacion}% ·{" "}
                {resultado.correctas ?? 0} aciertos
              </p>
            )}
          </div>
        </div>

        <div
          className={`mt-4 ${
            compacto
              ? "grid gap-2"
              : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          }`}
        >
          <Link
            href={obtenerHrefParcial(parcial)}
            className={`rounded-2xl px-4 py-3 text-center text-sm font-bold shadow-sm transition ${obtenerClasesBotonParcial(
              estado
            )}`}
          >
            {obtenerTextoBotonParcial(parcial)} →
          </Link>

          {estado === "Completado" && resultado && (
            <Link
              href={`/resultados?resultado=${encodeURIComponent(
                `parcial-${resultado.id}`
              )}&volver=/materias/${materiaId}`}
              className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700 hover:bg-emerald-100"
            >
              Ver resultado
            </Link>
          )}

          {(estado === "En progreso" || estado === "Completado") && (
            <Link
              href={obtenerHrefNuevoIntento(parcial)}
              onClick={(event) => confirmarNuevoIntentoParcial(event, parcial)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Nuevo intento
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-4xl">
              📚
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-600">Materia</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Cargando contenido...
              </h1>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      </main>
    );
  }

  const tituloMateria = materia ? obtenerTitulo(materia) : "Materia";
  const iconoMateria = obtenerIconoMateria(tituloMateria);

  return (
    <main id="inicio-materia" className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/materias"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Volver a materias
          </Link>

          <Link
            href="/resultados"
            className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            Ver resultados 🏆
          </Link>
        </div>

        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white shadow-sm">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
              Materia {iconoMateria}
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {tituloMateria}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
              Selecciona un tema y después un subtema para estudiar el contenido.
              Tu avance se guarda en esta materia.
            </p>
          </div>

          <div className="absolute bottom-0 right-8 hidden h-44 w-72 lg:block">
            <div className="absolute bottom-0 right-10 h-28 w-40 rounded-t-[3rem] bg-white/25 backdrop-blur" />
            <div className="absolute bottom-10 right-20 h-20 w-20 rounded-full bg-white/30" />
            <div className="absolute bottom-8 right-0 h-24 w-36 rounded-3xl bg-white/90 shadow-lg" />
            <div className="absolute bottom-16 right-7 h-3 w-24 rounded-full bg-blue-200" />
            <div className="absolute bottom-11 right-7 h-3 w-20 rounded-full bg-blue-100" />
            <div className="absolute bottom-20 right-4 text-4xl">✏️</div>
          </div>

          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute right-72 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResumenCard
            icono="🧩"
            titulo="Unidades"
            valor={temas.length}
            detalle="registradas"
            color="blue"
          />

          <ResumenCard
            icono="📌"
            titulo="Subtemas"
            valor={totalSubtemas}
            detalle="publicaciones"
            color="violet"
          />

          <ResumenCard
            icono="✅"
            titulo="Completados"
            valor={`${totalCompletados}/${totalSubtemas}`}
            detalle="avance"
            color="emerald"
          />

          <ResumenCard
            icono="📈"
            titulo="Progreso"
            valor={`${porcentajeAvance}%`}
            detalle="de la materia"
            color="amber"
          />
        </section>

        <section className="mb-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Avance de la materia 📈
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {porcentajeAvance}% completado
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {totalCompletados} de {totalSubtemas} subtemas completados.
              </p>
            </div>

            <div className="w-full md:max-w-sm">
              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${porcentajeAvance}%` }}
                />
              </div>

              <p className="mt-2 text-right text-xs font-bold text-blue-700">
                Sigue avanzando 🚀
              </p>
            </div>
          </div>
        </section>

        {temas.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Todavía no hay temas
            </h2>

            <p className="mt-2 text-slate-500">
              Cuando agregues temas, subtemas, contenido y parciales desde el
              panel admin, aparecerán aquí.
            </p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <aside
              id="temario-materia"
              className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"
            >
              <div className="mb-5">
                <p className="text-sm font-semibold text-blue-600">
                  Temario y avance 🧭
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  Unidades
                </h2>
              </div>

              <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-700">Total</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {porcentajeAvance}%
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${porcentajeAvance}%` }}
                  />
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {totalCompletados} de {totalSubtemas} subtemas completados
                </p>
              </div>

              <div className="space-y-4">
                {temas.map((tema, index) => {
                  const idTema = String(tema.id);
                  const subtemas = subtemasPorTema[idTema] ?? [];
                  const parcialesTema = parcialesPorTema[idTema] ?? [];
                  const temaActivo = temaActivoId === idTema;
                  const avanceTema = calcularAvanceTema(idTema);

                  return (
                    <div
                      key={tema.id}
                      className={`rounded-3xl border p-4 transition ${
                        temaActivo
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTemaActivoId(idTema);

                          if (subtemas[0]) {
                            seleccionarSubtema(idTema, String(subtemas[0].id));
                          } else {
                            setSubtemaActivoId("");
                          }
                        }}
                        className={`w-full text-left ${
                          temaActivo ? "text-blue-700" : "text-slate-900"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
                          Unidad {index + 1}
                        </p>

                        <h3 className="mt-1 font-semibold leading-tight">
                          {obtenerTitulo(tema)}
                        </h3>
                      </button>

                      <div className="mt-3 rounded-2xl bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-slate-500">
                            {avanceTema.completados} de {avanceTema.total}{" "}
                            completados
                          </p>

                          <p className="text-xs font-semibold text-blue-700">
                            {avanceTema.porcentaje}%
                          </p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${avanceTema.porcentaje}%` }}
                          />
                        </div>
                      </div>

                      {subtemas.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-400">
                          Sin subtemas todavía.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {subtemas.map((subtema) => {
                            const idSubtema = String(subtema.id);
                            const activo = subtemaActivoId === idSubtema;
                            const completado = Boolean(completados[idSubtema]);

                            return (
                              <button
                                key={subtema.id}
                                type="button"
                                onClick={() =>
                                  seleccionarSubtema(idTema, idSubtema)
                                }
                                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold transition ${
                                  activo
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                }`}
                              >
                                <span className="line-clamp-1">
                                  {obtenerTitulo(subtema)}
                                </span>

                                <span
                                  className={`flex h-7 min-w-7 items-center justify-center rounded-full text-xs ${
                                    completado
                                      ? "bg-emerald-500 text-white"
                                      : activo
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {completado ? "✓" : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {parcialesTema.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                            Parcial de la unidad 📝
                          </p>

                          <div className="mt-2 space-y-2">
                            {parcialesTema.map((parcial) => (
                              <TarjetaParcialUnidad
                                key={parcial.id}
                                parcial={parcial}
                                compacto
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            <section
              id="contenido-activo"
              className="scroll-mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              {!subtemaActivo ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Selecciona un subtema
                  </h2>

                  <p className="mt-2 text-slate-500">
                    El contenido aparecerá en esta sección.
                  </p>

                  {parcialesDelTemaActivo.length > 0 && (
                    <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
                        Parcial disponible
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                        Parcial de la unidad
                      </h3>

                      <div className="mt-4 space-y-3">
                        {parcialesDelTemaActivo.map((parcial) => (
                          <TarjetaParcialUnidad
                            key={parcial.id}
                            parcial={parcial}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
                      Subtema 📄
                    </p>

                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-3xl font-semibold text-slate-900">
                          {obtenerTitulo(subtemaActivo)}
                        </h2>

                        {indiceActivo >= 0 && (
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            Subtema {indiceActivo + 1} de {totalSubtemas}
                          </p>
                        )}
                      </div>

                      <div>
                        {subtemaEstaCompletado ? (
                          <button
                            type="button"
                            onClick={quitarCompletado}
                            className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Completado ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={marcarCompletado}
                            className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500"
                          >
                            Marcar como completado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {contenidosActivos.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
                      <h3 className="text-xl font-semibold text-slate-900">
                        Sin contenido todavía
                      </h3>

                      <p className="mt-2 text-slate-500">
                        Agrega texto, video, imagen o material desde el panel
                        admin.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {contenidosActivos.map((bloque) => {
                        const texto = obtenerTextoBloque(bloque);
                        const video = obtenerVideoBloque(bloque);
                        const imagen = obtenerImagenBloque(bloque);
                        const archivo = obtenerArchivoBloque(bloque);

                        return (
                          <article
                            key={bloque.id}
                            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                          >
                            {texto && (
                              <div
                                className="contenido-materia mb-6 rounded-3xl border border-slate-100 bg-slate-50 p-5 leading-relaxed text-slate-900 sm:p-6"
                                dangerouslySetInnerHTML={{ __html: texto }}
                              />
                            )}

                            {video && (
                              <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-sm font-bold text-blue-700">
                                  Video 🎬
                                </p>

                                {renderVideo(video)}
                              </div>
                            )}

                            {imagen && (
                              <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-sm font-bold text-blue-700">
                                  Imagen 🖼️
                                </p>

                                <img
                                  src={imagen}
                                  alt="Imagen del contenido"
                                  className="max-h-[520px] w-full rounded-2xl object-contain"
                                />
                              </div>
                            )}

                            {archivo && (
                              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-sm font-bold text-blue-700">
                                  Material descargable 📎
                                </p>

                                <a
                                  href={archivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
                                >
                                  Abrir material
                                </a>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {esUltimoSubtemaDelTema &&
                    parcialesDelTemaActivo.length > 0 && (
                      <div className="mt-8 rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
                          Fin de la unidad 📝
                        </p>

                        <h3 className="mt-2 text-3xl font-semibold text-slate-900">
                          Parcial de la unidad
                        </h3>

                        <p className="mt-3 text-slate-600">
                          Ya terminaste los subtemas de esta unidad. Ahora puedes
                          realizar el parcial correspondiente.
                        </p>

                        <div className="mt-5 space-y-3">
                          {parcialesDelTemaActivo.map((parcial) => (
                            <TarjetaParcialUnidad
                              key={parcial.id}
                              parcial={parcial}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={irAnterior}
                      disabled={indiceActivo <= 0}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Anterior
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        marcarCompletado();
                        irSiguiente();
                      }}
                      disabled={
                        indiceActivo === -1 ||
                        indiceActivo >= subtemasPlanos.length - 1
                      }
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Completar y seguir →
                    </button>

                    <button
                      type="button"
                      onClick={irSiguiente}
                      disabled={
                        indiceActivo === -1 ||
                        indiceActivo >= subtemasPlanos.length - 1
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente →
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      <style jsx global>{`
        .contenido-materia {
          line-height: 1.75;
          overflow-wrap: anywhere;
        }

        .contenido-materia h1,
        .contenido-materia h2,
        .contenido-materia h3 {
          color: #0f172a;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
          line-height: 1.2;
        }

        .contenido-materia h1 {
          font-size: 2rem;
        }

        .contenido-materia h2 {
          font-size: 1.65rem;
        }

        .contenido-materia h3 {
          font-size: 1.35rem;
        }

        .contenido-materia p {
          margin: 0.75rem 0;
        }

        .contenido-materia ul,
        .contenido-materia ol {
          padding-left: 1.4rem;
          margin: 1rem 0;
        }

        .contenido-materia li {
          margin: 0.35rem 0;
        }

        .contenido-materia img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          margin: 1rem 0;
          background: white;
        }

        .contenido-materia iframe,
        .contenido-materia video {
          max-width: 100%;
          border-radius: 1rem;
        }

        .contenido-materia a {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}

function ResumenCard({
  icono,
  titulo,
  valor,
  detalle,
  color,
}: {
  icono: string;
  titulo: string;
  valor: string | number;
  detalle: string;
  color: "blue" | "violet" | "emerald" | "amber";
}) {
  const estilos = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${estilos[color]}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
          {icono}
        </div>

        <div>
          <p className="text-sm font-bold">{titulo}</p>

          <p className="mt-1 text-3xl font-semibold text-slate-900">{valor}</p>

          <p className="mt-1 text-sm font-bold">{detalle}</p>
        </div>
      </div>
    </div>
  );
}