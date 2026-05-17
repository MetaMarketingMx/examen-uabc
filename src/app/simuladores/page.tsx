"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

type Simulador = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  tiempo_minutos?: number;
  [key: string]: any;
};

type PreguntaSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
};

type ResultadoSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
  alumno_id?: string | null;
  alumno_nombre?: string | null;
  total_preguntas?: number | null;
  correctas?: number | null;
  calificacion?: number | null;
  tiempo_usado_segundos?: number | null;
  puntaje_1300?: number | null;
  created_at?: string | null;
  [key: string]: any;
};

type AvanceLocal = {
  simulador_id?: string | number;
  respuestas?: Record<string, string>;
  marcadas?: Record<string, boolean>;
  indiceActual?: number;
  segundos_restantes?: number | null;
  actualizado_en?: string;
};

type EstadoSimulador = "Disponible" | "En progreso" | "Completado";

const TABLA_SIMULADORES = "simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";
const TABLA_RESULTADOS = "resultados_simuladores";
const TABLA_CONFIG_SIMULADORES = "configuracion_simuladores";

const CLAVE_MENSAJE_PANEL = "panel_simuladores_alumno";
const ACIERTOS_MAXIMOS_PUNTAJE = 105;
const PUNTAJE_MAXIMO = 1300;

const TITULO_DEFAULT = "Continúa tu preparación con simuladores";
const CONTENIDO_DEFAULT =
  "Si sales de un simulador, puedes guardar tu avance y continuar después desde donde te quedaste, incluyendo tiempo restante, respuestas y preguntas marcadas.";

export default function SimuladoresPage() {
  const [simuladores, setSimuladores] = useState<Simulador[]>([]);
  const [preguntasPorSimulador, setPreguntasPorSimulador] = useState<
    Record<string, number>
  >({});
  const [resultadosPorSimulador, setResultadosPorSimulador] = useState<
    Record<string, ResultadoSimulador>
  >({});
  const [todosResultados, setTodosResultados] = useState<ResultadoSimulador[]>(
    []
  );
  const [avancesLocales, setAvancesLocales] = useState<
    Record<string, AvanceLocal>
  >({});

  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "Todos" | "Disponibles" | "En progreso" | "Completados"
  >("Todos");

  const [esAdmin, setEsAdmin] = useState(false);
  const [tituloPanel, setTituloPanel] = useState(TITULO_DEFAULT);
  const [contenidoPanel, setContenidoPanel] = useState(CONTENIDO_DEFAULT);
  const [editandoPanel, setEditandoPanel] = useState(false);
  const [tituloEditado, setTituloEditado] = useState(TITULO_DEFAULT);
  const [contenidoEditado, setContenidoEditado] = useState(CONTENIDO_DEFAULT);
  const [guardandoPanel, setGuardandoPanel] = useState(false);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  useEffect(() => {
    if (simuladores.length === 0) return;

    leerAvancesLocales(simuladores);

    function actualizarAlVolver() {
      leerAvancesLocales(simuladores);
    }

    window.addEventListener("focus", actualizarAlVolver);
    document.addEventListener("visibilitychange", actualizarAlVolver);

    return () => {
      window.removeEventListener("focus", actualizarAlVolver);
      document.removeEventListener("visibilitychange", actualizarAlVolver);
    };
  }, [simuladores]);

  function detectarAdmin(user: any) {
    const metadata = user?.user_metadata ?? {};
    const appMetadata = user?.app_metadata ?? {};
    const email = String(user?.email ?? "").toLowerCase();

    const correosAdmin = [
      "jaa.alejandro@gmail.com",
      "unimed.michel@gmail.com",
    ];

    const valores = [
      metadata.rol,
      metadata.role,
      metadata.tipo,
      metadata.tipo_usuario,
      metadata.perfil,
      metadata.usuario_rol,
      metadata.user_role,
      metadata.rol_usuario,
      appMetadata.rol,
      appMetadata.role,
      appMetadata.tipo,
      appMetadata.perfil,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      correosAdmin.includes(email) ||
      valores.includes("admin") ||
      valores.includes("administrador") ||
      metadata.es_admin === true ||
      metadata.admin === true ||
      appMetadata.es_admin === true ||
      appMetadata.admin === true
    );
  }

  function obtenerTitulo(item: Simulador | null | undefined) {
    if (!item) return "";

    return String(
      item.nombre ?? item.titulo ?? item.title ?? `Simulador ${item.id}`
    );
  }

  function obtenerDescripcion(item: Simulador | null | undefined) {
    if (!item) return "";
    return String(item.descripcion ?? item.description ?? "");
  }

  function ordenarLista(lista: Simulador[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function obtenerStorageKey(simuladorId: string | number) {
    return `avance_simulador_${simuladorId}`;
  }

  function leerAvancesLocales(lista: Simulador[]) {
    if (typeof window === "undefined") return;

    const nuevosAvances: Record<string, AvanceLocal> = {};

    lista.forEach((simulador) => {
      const id = String(simulador.id);
      const storageKey = obtenerStorageKey(id);
      const guardado = window.localStorage.getItem(storageKey);

      if (!guardado) return;

      try {
        const avance = JSON.parse(guardado) as AvanceLocal;

        const tieneRespuestas =
          avance?.respuestas &&
          typeof avance.respuestas === "object" &&
          Object.keys(avance.respuestas).length > 0;

        const tieneMarcadas =
          avance?.marcadas &&
          typeof avance.marcadas === "object" &&
          Object.values(avance.marcadas).some(Boolean);

        const tieneTiempo =
          typeof avance?.segundos_restantes === "number" &&
          avance.segundos_restantes >= 0;

        const tieneIndice =
          Number.isInteger(avance?.indiceActual) &&
          Number(avance.indiceActual) > 0;

        if (tieneRespuestas || tieneMarcadas || tieneTiempo || tieneIndice) {
          nuevosAvances[id] = avance;
        }
      } catch (error) {
        console.error("No se pudo leer avance local:", error);
      }
    });

    setAvancesLocales(nuevosAvances);
  }

  async function cargarMensajePanel() {
    const { data, error } = await supabase
      .from(TABLA_CONFIG_SIMULADORES)
      .select("*")
      .eq("clave", CLAVE_MENSAJE_PANEL)
      .maybeSingle();

    if (error) {
      console.warn(
        "No se pudo cargar configuracion_simuladores. Se usará el texto por defecto.",
        error
      );
      return;
    }

    if (data) {
      const titulo = String(data.titulo || TITULO_DEFAULT);
      const contenido = String(data.contenido || CONTENIDO_DEFAULT);

      setTituloPanel(titulo);
      setContenidoPanel(contenido);
      setTituloEditado(titulo);
      setContenidoEditado(contenido);
    }
  }

  async function guardarMensajePanel() {
    const titulo = tituloEditado.trim() || TITULO_DEFAULT;
    const contenido = contenidoEditado.trim() || CONTENIDO_DEFAULT;

    setGuardandoPanel(true);

    const { error } = await supabase.from(TABLA_CONFIG_SIMULADORES).upsert({
      clave: CLAVE_MENSAJE_PANEL,
      titulo,
      contenido,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("No se pudo guardar el mensaje del panel:", error);
      alert(
        "No se pudo guardar el aviso. Revisa que exista la tabla configuracion_simuladores."
      );
      setGuardandoPanel(false);
      return;
    }

    setTituloPanel(titulo);
    setContenidoPanel(contenido);
    setEditandoPanel(false);
    setGuardandoPanel(false);
  }

  async function cargarSimuladores() {
    setCargando(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    setEsAdmin(detectarAdmin(user));

    await cargarMensajePanel();

    const { data: simuladoresData, error: simuladoresError } = await supabase
      .from(TABLA_SIMULADORES)
      .select("*");

    if (simuladoresError) {
      console.error("Error cargando simuladores:", simuladoresError);
      alert("No se pudieron cargar los simuladores.");
      setSimuladores([]);
      setCargando(false);
      return;
    }

    const simuladoresOrdenados = ordenarLista(
      (simuladoresData ?? []) as Simulador[]
    );

    setSimuladores(simuladoresOrdenados);
    leerAvancesLocales(simuladoresOrdenados);

    const { data: preguntasData, error: preguntasError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("id, simulador_id");

    if (preguntasError) {
      console.warn(
        "No se pudieron cargar preguntas_simuladores:",
        preguntasError
      );
      setPreguntasPorSimulador({});
    } else {
      const conteo: Record<string, number> = {};

      ((preguntasData ?? []) as PreguntaSimulador[]).forEach((pregunta) => {
        const idSimulador = String(pregunta.simulador_id ?? "");
        if (!idSimulador) return;

        conteo[idSimulador] = (conteo[idSimulador] ?? 0) + 1;
      });

      setPreguntasPorSimulador(conteo);
    }

    let consultaResultados = supabase
      .from(TABLA_RESULTADOS)
      .select("*")
      .order("created_at", { ascending: false });

    if (user?.id) {
      consultaResultados = consultaResultados.eq("alumno_id", user.id);
    }

    const { data: resultadosData, error: resultadosError } =
      await consultaResultados;

    if (resultadosError) {
      console.warn(
        "No se pudieron cargar resultados_simuladores:",
        resultadosError
      );
      setResultadosPorSimulador({});
      setTodosResultados([]);
    } else {
      const resultados = (resultadosData ?? []) as ResultadoSimulador[];
      const mapa: Record<string, ResultadoSimulador> = {};

      resultados.forEach((resultado) => {
        const idSimulador = String(resultado.simulador_id ?? "");
        if (!idSimulador) return;

        if (!mapa[idSimulador]) {
          mapa[idSimulador] = resultado;
        }
      });

      setResultadosPorSimulador(mapa);
      setTodosResultados(resultados);
    }

    setCargando(false);
  }

  function contarRespuestas(avance?: AvanceLocal) {
    if (!avance?.respuestas || typeof avance.respuestas !== "object") return 0;
    return Object.keys(avance.respuestas).length;
  }

  function contarMarcadas(avance?: AvanceLocal) {
    if (!avance?.marcadas || typeof avance.marcadas !== "object") return 0;
    return Object.values(avance.marcadas).filter(Boolean).length;
  }

  function obtenerEstado(simulador: Simulador): EstadoSimulador {
    const id = String(simulador.id);
    const avance = avancesLocales[id];
    const resultado = resultadosPorSimulador[id];

    if (avance) return "En progreso";
    if (resultado) return "Completado";
    return "Disponible";
  }

  function formatearTiempoMinutos(minutos?: number | null) {
    const total = Number(minutos ?? 0);

    if (total <= 0) return "Sin límite";

    const horas = Math.floor(total / 60);
    const mins = total % 60;

    if (horas > 0 && mins > 0) return `${horas} h ${mins} min`;
    if (horas > 0) return `${horas} h`;
    return `${mins} min`;
  }

  function formatearTiempoSegundos(segundos?: number | null) {
    if (segundos === null || segundos === undefined) return "Sin límite";

    const total = Math.max(0, Math.floor(segundos));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const seg = total % 60;

    return `${horas}:${String(minutos).padStart(2, "0")}:${String(
      seg
    ).padStart(2, "0")}`;
  }

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "Sin fecha";

    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(fecha));
    } catch {
      return fecha;
    }
  }

  function obtenerPuntaje(resultado?: ResultadoSimulador | null) {
    if (!resultado) return 0;

    const puntajeGuardado = Number(resultado.puntaje_1300 ?? 0);

    if (puntajeGuardado > 0) {
      return Math.min(PUNTAJE_MAXIMO, puntajeGuardado);
    }

    const correctas = Number(resultado.correctas ?? 0);

    if (correctas <= 0) return 0;

    return Math.min(
      PUNTAJE_MAXIMO,
      Math.round(
        (Math.min(correctas, ACIERTOS_MAXIMOS_PUNTAJE) /
          ACIERTOS_MAXIMOS_PUNTAJE) *
          PUNTAJE_MAXIMO
      )
    );
  }

  function obtenerTextoBotonPrincipal(simulador: Simulador) {
    const estado = obtenerEstado(simulador);

    if (estado === "En progreso") return "Continuar avance";
    if (estado === "Completado") return "Ver resultado";
    return "Iniciar simulador";
  }

  function obtenerHrefPrincipal(simulador: Simulador) {
    const estado = obtenerEstado(simulador);

    if (estado === "Completado") {
      return `/resultados?simulador=${encodeURIComponent(
        String(simulador.id)
      )}&volver=simuladores`;
    }

    return `/simuladores/${simulador.id}`;
  }

  function obtenerHrefNuevoIntento(simulador: Simulador) {
    return `/simuladores/${simulador.id}?nuevo=1`;
  }

  function obtenerHrefResultado(resultado: ResultadoSimulador) {
    return `/resultados?resultado=${encodeURIComponent(
      `simulador-${resultado.id}`
    )}&volver=simuladores`;
  }

  function obtenerClasesEstado(estado: EstadoSimulador) {
    if (estado === "En progreso") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (estado === "Completado") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  function obtenerClasesBoton(simulador: Simulador) {
    const estado = obtenerEstado(simulador);

    if (estado === "Completado") {
      return "bg-emerald-600 text-white hover:bg-emerald-500";
    }

    if (estado === "En progreso") {
      return "bg-amber-500 text-slate-950 hover:bg-amber-400";
    }

    return "bg-blue-600 text-white hover:bg-blue-500";
  }

  function confirmarNuevoIntento(
    event: MouseEvent<HTMLAnchorElement>,
    simulador: Simulador
  ) {
    if (typeof window === "undefined") return;

    const estado = obtenerEstado(simulador);
    const titulo = obtenerTitulo(simulador);

    const mensaje =
  estado === "En progreso"
    ? `Este simulador tiene un avance guardado.\n\nSi inicias un nuevo intento, se borrará ese avance guardado y el simulador comenzará desde cero.\n\nLos intentos que ya finalizaste seguirán disponibles en Resultados.\n\n¿Deseas continuar?`
    : `Vas a iniciar un nuevo intento de "${titulo}".\n\nLos intentos que ya finalizaste seguirán disponibles en Resultados, pero este simulador comenzará desde cero.\n\n¿Deseas continuar?`;

    const confirmar = window.confirm(mensaje);

    if (!confirmar) {
      event.preventDefault();
      return;
    }

    const id = String(simulador.id);
    const storageKey = obtenerStorageKey(id);

    window.localStorage.removeItem(storageKey);

    setAvancesLocales((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  }

  const simuladoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return simuladores.filter((simulador) => {
      const titulo = obtenerTitulo(simulador).toLowerCase();
      const descripcion = obtenerDescripcion(simulador).toLowerCase();
      const estado = obtenerEstado(simulador);

      const coincideTexto =
        !texto || titulo.includes(texto) || descripcion.includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" ||
        (filtroEstado === "Disponibles" && estado === "Disponible") ||
        (filtroEstado === "En progreso" && estado === "En progreso") ||
        (filtroEstado === "Completados" && estado === "Completado");

      return coincideTexto && coincideEstado;
    });
  }, [
    simuladores,
    busqueda,
    filtroEstado,
    avancesLocales,
    resultadosPorSimulador,
  ]);

  const resumen = useMemo(() => {
    const total = simuladores.length;

    const enProgreso = simuladores.filter(
      (simulador) => obtenerEstado(simulador) === "En progreso"
    ).length;

    const completados = simuladores.filter(
      (simulador) => obtenerEstado(simulador) === "Completado"
    ).length;

    const mejorPuntaje =
      todosResultados.length > 0
        ? Math.max(
            ...todosResultados.map((resultado) => obtenerPuntaje(resultado))
          )
        : 0;

    return {
      total,
      enProgreso,
      completados,
      mejorPuntaje,
    };
  }, [simuladores, avancesLocales, resultadosPorSimulador, todosResultados]);

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px] sm:px-6">
          <div className="space-y-6">
            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              {!editandoPanel ? (
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      Aviso
                    </span>

                    <h2 className="mt-3 text-xl font-black">{tituloPanel}</h2>

                    <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {contenidoPanel}
                    </p>
                  </div>

                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setTituloEditado(tituloPanel);
                        setContenidoEditado(contenidoPanel);
                        setEditandoPanel(true);
                      }}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      Editar aviso
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                    Editando aviso del alumno
                  </span>

                  <div className="mt-4 space-y-3">
                    <input
                      value={tituloEditado}
                      onChange={(event) => setTituloEditado(event.target.value)}
                      placeholder="Título del aviso"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400"
                    />

                    <textarea
                      value={contenidoEditado}
                      onChange={(event) =>
                        setContenidoEditado(event.target.value)
                      }
                      placeholder="Escribe el aviso para los alumnos..."
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-400"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={guardarMensajePanel}
                        disabled={guardandoPanel}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {guardandoPanel ? "Guardando..." : "Guardar aviso"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditandoPanel(false)}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Todos",
                      "Disponibles",
                      "En progreso",
                      "Completados",
                    ] as const
                  ).map((filtro) => (
                    <button
                      key={filtro}
                      type="button"
                      onClick={() => setFiltroEstado(filtro)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        filtroEstado === filtro
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {filtro}
                    </button>
                  ))}
                </div>

                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar simulador..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 xl:w-72"
                />
              </div>
            </section>

            {cargando && (
              <section className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
                Cargando simuladores...
              </section>
            )}

            {!cargando && simuladores.length === 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-black">
                  Todavía no hay simuladores
                </h2>

                <p className="mt-3 text-slate-600">
                  Cuando agregues simuladores desde el panel admin, aparecerán
                  aquí.
                </p>

                <Link
                  href="/admin"
                  className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
                >
                  Ir al admin
                </Link>
              </section>
            )}

            {!cargando &&
              simuladores.length > 0 &&
              simuladoresFiltrados.length === 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-black">
                    No hay simuladores con ese filtro
                  </h2>

                  <p className="mt-3 text-slate-600">
                    Prueba cambiar la búsqueda o seleccionar otro estado.
                  </p>
                </section>
              )}

            {!cargando && simuladoresFiltrados.length > 0 && (
              <section className="grid gap-4">
                {simuladoresFiltrados.map((simulador) => {
                  const id = String(simulador.id);
                  const estado = obtenerEstado(simulador);
                  const avance = avancesLocales[id];
                  const resultado = resultadosPorSimulador[id];
                  const totalPreguntas = preguntasPorSimulador[id] ?? 0;
                  const respuestasGuardadas = contarRespuestas(avance);
                  const marcadasGuardadas = contarMarcadas(avance);

                  const porcentajeAvance =
                    totalPreguntas > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (respuestasGuardadas / totalPreguntas) * 100
                          )
                        )
                      : 0;

                  return (
                    <article
                      key={simulador.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${obtenerClasesEstado(
                                estado
                              )}`}
                            >
                              {estado}
                            </span>

                            {estado === "En progreso" && (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                Avance guardado
                              </span>
                            )}

                            {estado === "Completado" && (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                Último intento
                              </span>
                            )}
                          </div>

                          <h2 className="mt-3 text-2xl font-black">
                            {obtenerTitulo(simulador)}
                          </h2>

                          {obtenerDescripcion(simulador) && (
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                              {obtenerDescripcion(simulador)}
                            </p>
                          )}

                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Preguntas
                              </p>
                              <p className="mt-1 text-xl font-black">
                                {totalPreguntas > 0
                                  ? totalPreguntas
                                  : "Sin preguntas"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Tiempo límite
                              </p>
                              <p className="mt-1 text-xl font-black">
                                {formatearTiempoMinutos(
                                  simulador.tiempo_minutos
                                )}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Estado
                              </p>
                              <p className="mt-1 text-xl font-black">
                                {estado}
                              </p>
                            </div>
                          </div>

                          {estado === "En progreso" && (
                            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                              <div className="flex flex-wrap justify-between gap-2 text-sm">
                                <span className="font-bold text-amber-800">
                                  Avance actual
                                </span>
                                <span className="font-bold text-amber-800">
                                  {porcentajeAvance}%
                                </span>
                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
                                <div
                                  className="h-full rounded-full bg-amber-500"
                                  style={{ width: `${porcentajeAvance}%` }}
                                />
                              </div>

                              <p className="mt-3 text-sm leading-6 text-amber-800">
                                {respuestasGuardadas} respuestas guardadas
                                {marcadasGuardadas > 0
                                  ? ` · ${marcadasGuardadas} marcadas para revisar`
                                  : ""}{" "}
                                {typeof avance?.segundos_restantes === "number"
                                  ? ` · ${formatearTiempoSegundos(
                                      avance.segundos_restantes
                                    )} restantes`
                                  : ""}
                              </p>
                            </div>
                          )}

                          {estado === "Completado" && resultado && (
                            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                              <p className="text-sm font-bold text-emerald-800">
                                Último resultado
                              </p>

                              <p className="mt-1 text-2xl font-black text-slate-900">
                                {obtenerPuntaje(resultado)} / {PUNTAJE_MAXIMO}{" "}
                                puntos
                              </p>

                              <p className="mt-1 text-sm leading-6 text-emerald-800">
                                {resultado.correctas ?? 0} de{" "}
                                {resultado.total_preguntas ?? totalPreguntas}{" "}
                                aciertos · Tiempo usado:{" "}
                                {formatearTiempoSegundos(
                                  resultado.tiempo_usado_segundos
                                )}
                              </p>

                              <p className="mt-1 text-xs text-emerald-700">
                                {formatearFecha(resultado.created_at)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 xl:w-52">
                          <Link
                            href={obtenerHrefPrincipal(simulador)}
                            className={`rounded-2xl px-5 py-3 text-center text-sm font-black transition ${obtenerClasesBoton(
                              simulador
                            )}`}
                          >
                            {obtenerTextoBotonPrincipal(simulador)}
                          </Link>

                          {(estado === "En progreso" ||
                            estado === "Completado") && (
                            <Link
                              href={obtenerHrefNuevoIntento(simulador)}
                              onClick={(event) =>
                                confirmarNuevoIntento(event, simulador)
                              }
                              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Nuevo intento
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Resumen</h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-black">{resumen.total}</p>
                  <p className="text-xs font-bold text-slate-500">
                    Simuladores
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4 text-center">
                  <p className="text-3xl font-black">
                    {resumen.enProgreso}
                  </p>
                  <p className="text-xs font-bold text-amber-700">
                    En progreso
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-black">
                    {resumen.completados}
                  </p>
                  <p className="text-xs font-bold text-emerald-700">
                    Completados
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4 text-center">
                  <p className="text-3xl font-black">
                    {resumen.mejorPuntaje}
                  </p>
                  <p className="text-xs font-bold text-blue-700">
                    Mejor puntaje
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Últimos resultados</h2>

              {todosResultados.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Cuando termines un simulador, tus resultados aparecerán aquí.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {todosResultados.slice(0, 3).map((resultado) => {
                    const nombreSimulador =
                      simuladores.find(
                        (item) =>
                          String(item.id) === String(resultado.simulador_id)
                      ) ?? null;

                    return (
                      <Link
                        key={resultado.id}
                        href={obtenerHrefResultado(resultado)}
                        className="block rounded-2xl bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-sm"
                      >
                        <p className="font-bold">
                          {nombreSimulador
                            ? obtenerTitulo(nombreSimulador)
                            : `Simulador ${resultado.simulador_id}`}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {obtenerPuntaje(resultado)} / {PUNTAJE_MAXIMO} puntos
                          · {resultado.correctas ?? 0} aciertos
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatearFecha(resultado.created_at)}
                        </p>

                        <p className="mt-2 text-xs font-bold text-blue-600">
                          Ver detalle del intento →
                        </p>
                      </Link>
                    );
                  })}

                  <Link
                    href="/resultados"
                    className="inline-flex text-sm font-bold text-blue-600 hover:text-blue-500"
                  >
                    Ver todos los resultados →
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Consejo</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Si no puedes terminar un simulador, usa{" "}
                <span className="font-bold text-slate-900">
                  Volver a simuladores
                </span>{" "}
                y elige{" "}
                <span className="font-bold text-slate-900">Guardar avance</span>
                . Podrás continuar después con tus respuestas y tiempo restante.
              </p>
            </section>
          </aside>
        </section>
      </main>
    </AlumnoProtegido>
  );
}