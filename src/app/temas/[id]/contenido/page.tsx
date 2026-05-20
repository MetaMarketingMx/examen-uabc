"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
};

type Tema = {
  id: string | number;
  materia_id?: string | number | null;
  id_materia?: string | number | null;
  materia?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type Subtema = {
  id: string | number;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  tema?: string | number | null;
  unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type ContenidoSubtema = {
  id: string;
  subtema_id: string;
  tipo?: string | null;
  titulo?: string | null;
  contenido?: string | null;
  url?: string | null;
  orden?: number | null;
};

type Parcial = {
  id: string | number;
  materia_id?: string | number | null;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  tema?: string | number | null;
  unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
  orden?: number | null;
};

type ProgresoSubtema = {
  subtema_id: string | number;
  completado?: boolean | null;
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

function nombreDe(item?: Materia | Tema | Subtema | Parcial | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

function descripcionDe(item?: Parcial | Tema | Subtema | null) {
  return item?.descripcion || "";
}

function ordenarPorOrden<T extends { id: string | number; orden?: number | null }>(
  lista: T[]
) {
  return [...lista].sort((a, b) => {
    const ordenA = Number(a.orden ?? 0);
    const ordenB = Number(b.orden ?? 0);

    if (ordenA !== ordenB) return ordenA - ordenB;

    return String(a.id).localeCompare(String(b.id));
  });
}

function obtenerStorageKeyParcial(parcialId: string | number) {
  return `avance_parcial_${parcialId}`;
}

function contarRespuestasParcial(avance?: AvanceParcialLocal) {
  if (!avance?.respuestas || typeof avance.respuestas !== "object") return 0;
  return Object.keys(avance.respuestas).length;
}

function formatearTiempoSegundos(segundos?: number | null) {
  if (segundos === null || segundos === undefined) return "";

  const total = Math.max(0, Math.floor(Number(segundos)));
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

export default function ContenidoTemaPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const temaId = Array.isArray(params.id) ? params.id[0] : params.id;
  const subtemaInicial = searchParams.get("subtema");

  const [tema, setTema] = useState<Tema | null>(null);
  const [materia, setMateria] = useState<Materia | null>(null);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [contenidoPorSubtema, setContenidoPorSubtema] = useState<
    Record<string, string>
  >({});
  const [subtemasAbiertos, setSubtemasAbiertos] = useState<
    Record<string, boolean>
  >({});
  const [subtemasCompletados, setSubtemasCompletados] = useState<Set<string>>(
    new Set()
  );
  const [avancesParciales, setAvancesParciales] = useState<
    Record<string, AvanceParcialLocal>
  >({});
  const [resultadosParciales, setResultadosParciales] = useState<
    Record<string, ResultadoParcial>
  >({});

  const [guardandoSubtemaId, setGuardandoSubtemaId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaId, subtemaInicial]);

  useEffect(() => {
    function actualizarEstadoParciales() {
      leerAvancesParciales(parciales);
      cargarResultadosParciales(parciales);
    }

    window.addEventListener("focus", actualizarEstadoParciales);

    function alCambiarVisibilidad() {
      if (document.visibilityState === "visible") {
        actualizarEstadoParciales();
      }
    }

    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      window.removeEventListener("focus", actualizarEstadoParciales);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parciales]);

  async function consultarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    let primeraRespuestaValida: any[] = [];

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

  async function cargarDatos() {
    setLoading(true);
    setMensaje("");
    setError("");

    const { data: temaData } = await supabase
      .from("temas")
      .select("*")
      .eq("id", temaId)
      .single();

    const temaInfo = (temaData || null) as Tema | null;
    setTema(temaInfo);

    const materiaId =
      temaInfo?.materia_id || temaInfo?.id_materia || temaInfo?.materia;

    if (materiaId) {
      const { data: materiaData } = await supabase
        .from("materias")
        .select("*")
        .eq("id", materiaId)
        .single();

      setMateria((materiaData || null) as Materia | null);
    }

    const subtemasData = await consultarConFallback("subtemas", [
      { columna: "tema_id", valor: String(temaId) },
      { columna: "unidad_id", valor: String(temaId) },
      { columna: "id_tema", valor: String(temaId) },
      { columna: "id_unidad", valor: String(temaId) },
      { columna: "tema", valor: String(temaId) },
      { columna: "unidad", valor: String(temaId) },
    ]);

    const subtemasOrdenados = ordenarPorOrden((subtemasData || []) as Subtema[]);
    setSubtemas(subtemasOrdenados);

    const parcialesData = await consultarConFallback("parciales", [
      { columna: "tema_id", valor: String(temaId) },
      { columna: "unidad_id", valor: String(temaId) },
      { columna: "id_tema", valor: String(temaId) },
      { columna: "id_unidad", valor: String(temaId) },
      { columna: "tema", valor: String(temaId) },
      { columna: "unidad", valor: String(temaId) },
    ]);

    const parcialesOrdenados = ordenarPorOrden(
      (parcialesData || []) as Parcial[]
    );

    setParciales(parcialesOrdenados);
    leerAvancesParciales(parcialesOrdenados);
    await cargarResultadosParciales(parcialesOrdenados);

    const idsSubtemas = subtemasOrdenados.map((subtema) => String(subtema.id));

    if (idsSubtemas.length > 0) {
      const { data: contenidoData } = await supabase
        .from("contenido_subtemas")
        .select("*")
        .in("subtema_id", idsSubtemas)
        .order("orden", { ascending: true });

      const contenidoLista = (contenidoData || []) as ContenidoSubtema[];

      const mapaContenido: Record<string, string> = {};

      idsSubtemas.forEach((idSubtema) => {
        const bloques = contenidoLista
          .filter((bloque) => String(bloque.subtema_id) === String(idSubtema))
          .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));

        mapaContenido[idSubtema] = bloques
          .map((bloque) => bloque.contenido || "")
          .filter(Boolean)
          .join("");
      });

      setContenidoPorSubtema(mapaContenido);

      const abiertos: Record<string, boolean> = {};

      idsSubtemas.forEach((idSubtema) => {
        if (subtemaInicial) {
          abiertos[idSubtema] = String(idSubtema) === String(subtemaInicial);
        } else {
          abiertos[idSubtema] = true;
        }
      });

      setSubtemasAbiertos(abiertos);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (user) {
        const { data: progresoData, error: progresoError } = await supabase
          .from("progreso_subtemas")
          .select("subtema_id, completado")
          .eq("user_id", user.id)
          .eq("completado", true);

        if (!progresoError) {
          const progreso = (progresoData || []) as ProgresoSubtema[];

          setSubtemasCompletados(
            new Set(progreso.map((item) => String(item.subtema_id)))
          );
        } else {
          setSubtemasCompletados(new Set());
        }
      } else {
        setSubtemasCompletados(new Set());
      }

      setTimeout(() => {
        if (subtemaInicial) {
          const elemento = document.getElementById(`subtema-${subtemaInicial}`);
          elemento?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    } else {
      setContenidoPorSubtema({});
      setSubtemasAbiertos({});
      setSubtemasCompletados(new Set());
    }

    setLoading(false);
  }

  function leerAvancesParciales(listaParciales: Parcial[]) {
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

  async function cargarResultadosParciales(listaParciales: Parcial[]) {
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
      .from("resultados_parciales")
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

    ((data || []) as ResultadoParcial[]).forEach((resultado) => {
      const idParcial = String(resultado.parcial_id ?? "");

      if (!idParcial) return;

      if (!mapa[idParcial]) {
        mapa[idParcial] = resultado;
      }
    });

    setResultadosParciales(mapa);
  }

  function alternarSubtema(id: string | number) {
    const key = String(id);

    setSubtemasAbiertos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function obtenerIndiceSubtema(id: string | number) {
    return subtemas.findIndex((subtema) => String(subtema.id) === String(id));
  }

  function abrirSubtema(id: string | number) {
    const key = String(id);

    setSubtemasAbiertos((prev) => ({
      ...prev,
      [key]: true,
    }));

    setTimeout(() => {
      const elemento = document.getElementById(`subtema-${key}`);
      elemento?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function marcarComoCompletado(subtema: Subtema, irAlSiguiente = false) {
    setMensaje("");
    setError("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setError("Necesitas iniciar sesión para guardar tu avance.");
      return;
    }

    const idSubtema = String(subtema.id);
    const materiaId =
      tema?.materia_id ||
      tema?.id_materia ||
      tema?.materia ||
      materia?.id ||
      null;

    setGuardandoSubtemaId(idSubtema);

    const { error: upsertError } = await supabase
      .from("progreso_subtemas")
      .upsert(
        {
          user_id: user.id,
          materia_id: materiaId ? String(materiaId) : null,
          tema_id: String(temaId),
          subtema_id: idSubtema,
          completado: true,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,subtema_id",
        }
      );

    setGuardandoSubtemaId(null);

    if (upsertError) {
      setError("No se pudo guardar el avance. Revisa la tabla progreso_subtemas.");
      return;
    }

    setSubtemasCompletados((prev) => {
      const nuevo = new Set(prev);
      nuevo.add(idSubtema);
      return nuevo;
    });

    setMensaje("Avance guardado correctamente.");

    if (irAlSiguiente) {
      const indiceActual = obtenerIndiceSubtema(idSubtema);
      const siguiente = subtemas[indiceActual + 1];

      if (siguiente) {
        abrirSubtema(siguiente.id);
      }
    }
  }

  function irAnterior(id: string | number) {
    const indiceActual = obtenerIndiceSubtema(id);
    const anterior = subtemas[indiceActual - 1];

    if (anterior) {
      abrirSubtema(anterior.id);
    }
  }

  function irSiguiente(id: string | number) {
    const indiceActual = obtenerIndiceSubtema(id);
    const siguiente = subtemas[indiceActual + 1];

    if (siguiente) {
      abrirSubtema(siguiente.id);
    }
  }

  function obtenerEstadoParcial(parcial: Parcial): EstadoParcial {
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

  function obtenerVolverActual() {
    const subtemaActual = subtemaInicial
      ? `?subtema=${subtemaInicial}`
      : subtemas[0]
      ? `?subtema=${subtemas[0].id}`
      : "";

    return `/temas/${temaId}/contenido${subtemaActual}`;
  }

  function obtenerHrefParcial(parcial: Parcial) {
    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const resultado = resultadosParciales[idParcial];
    const volver = encodeURIComponent(obtenerVolverActual());

    if (estado === "Completado" && resultado) {
      return `/resultados?resultado=${encodeURIComponent(
        `parcial-${resultado.id}`
      )}&volver=${volver}`;
    }

    return `/parciales/${parcial.id}?volver=${volver}`;
  }

  function obtenerHrefNuevoIntento(parcial: Parcial) {
    const volver = encodeURIComponent(obtenerVolverActual());
    return `/parciales/${parcial.id}?nuevo=1&volver=${volver}`;
  }

  function obtenerTextoBotonParcial(parcial: Parcial) {
    const estado = obtenerEstadoParcial(parcial);

    if (estado === "En progreso") return "Continuar parcial";
    if (estado === "Completado") return "Ver resultado";
    return "Iniciar parcial";
  }

  function obtenerClasesEstadoParcial(estado: EstadoParcial) {
    if (estado === "En progreso") {
      return "border-amber-300 bg-amber-100 text-amber-800";
    }

    if (estado === "Completado") {
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    }

    return "border-blue-300 bg-blue-100 text-blue-800";
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
    parcial: Parcial
  ) {
    if (typeof window === "undefined") return;

    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const titulo = nombreDe(parcial);

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

  function TarjetaParcial({ parcial }: { parcial: Parcial }) {
    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const avance = avancesParciales[idParcial];
    const resultado = resultadosParciales[idParcial];

    const respuestasGuardadas = contarRespuestasParcial(avance);
    const tiempoRestante = formatearTiempoSegundos(avance?.segundos_restantes);
    const calificacion = obtenerCalificacionParcial(resultado);

    return (
      <div className="rounded-2xl border border-amber-300 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${obtenerClasesEstadoParcial(
                estado
              )}`}
            >
              {estado}
            </span>

            <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
              {nombreDe(parcial)}
            </h3>

            {descripcionDe(parcial) && (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {descripcionDe(parcial)}
              </p>
            )}

            {estado === "En progreso" && (
              <p className="mt-2 text-xs font-semibold text-amber-800">
                {respuestasGuardadas} respuestas guardadas
                {tiempoRestante ? ` · ${tiempoRestante} restantes` : ""}
              </p>
            )}

            {estado === "Completado" && resultado && (
              <p className="mt-2 text-xs font-semibold text-emerald-800">
                Último resultado: {calificacion}% ·{" "}
                {resultado.correctas ?? 0} aciertos ·{" "}
                {formatearFecha(resultado.created_at)}
              </p>
            )}

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Tiempo asignado: {parcial.tiempo_minutos || 30} minutos
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              href={obtenerHrefParcial(parcial)}
              className={`rounded-2xl px-4 py-3 text-center text-sm font-bold shadow-sm transition ${obtenerClasesBotonParcial(
                estado
              )}`}
            >
              {obtenerTextoBotonParcial(parcial)} →
            </Link>

            {(estado === "En progreso" || estado === "Completado") && (
              <Link
                href={obtenerHrefNuevoIntento(parcial)}
                onClick={(event) =>
                  confirmarNuevoIntentoParcial(event, parcial)
                }
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Nuevo intento
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3fb] px-4 py-6 text-slate-900 sm:px-6">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-blue-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-4xl">
                📖
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Contenido de la unidad
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Cargando contenido...
                </h1>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-blue-600" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!tema) {
    return (
      <main className="min-h-screen bg-[#edf3fb] px-4 py-6 text-slate-900 sm:px-6">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-3xl">
              ⚠️
            </div>

            <div>
              <p className="text-sm font-semibold text-red-700">Error</p>

              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                No se encontró la unidad
              </h1>

              <Link
                href="/materias"
                className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
              >
                Volver a materias
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const totalCompletados = subtemas.filter((subtema) =>
    subtemasCompletados.has(String(subtema.id))
  ).length;

  const porcentaje =
    subtemas.length > 0
      ? Math.round((totalCompletados / subtemas.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-[#edf3fb] text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/materias"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            ← Volver a materias
          </Link>

          {materia?.id && (
            <Link
              href={`/materias/${materia.id}`}
              className="rounded-2xl border border-blue-200 bg-blue-100 px-5 py-3 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-200"
            >
              Ver materia 📚
            </Link>
          )}
        </div>

        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-7 text-white shadow-sm">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
              Contenido de la unidad 📖
            </p>

            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {nombreDe(tema)}
            </h1>

            <p className="mt-3 text-sm font-semibold text-blue-50">
              Materia: {materia ? nombreDe(materia) : "Sin materia"}
            </p>

            {tema.descripcion && (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
                {tema.descripcion}
              </p>
            )}
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

        <section className="mb-6 rounded-[2rem] border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Avance de la unidad 📈
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {porcentaje}% completado
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {totalCompletados} de {subtemas.length} publicaciones
                completadas.
              </p>
            </div>

            <div className="w-full md:max-w-sm">
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              <p className="mt-2 text-right text-xs font-bold text-blue-700">
                Sigue avanzando 🚀
              </p>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-100 p-4 text-sm font-bold text-emerald-800 shadow-sm">
            ✅ {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-100 p-4 text-sm font-bold text-red-800 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {subtemas.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-300 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                📄
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Sin publicaciones
                </h2>

                <p className="mt-2 text-slate-600">
                  Esta unidad todavía no tiene publicaciones registradas.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {subtemas.map((subtema, index) => {
              const idSubtema = String(subtema.id);
              const abierto = Boolean(subtemasAbiertos[idSubtema]);
              const contenidoHtml = contenidoPorSubtema[idSubtema] || "";
              const completado = subtemasCompletados.has(idSubtema);
              const esPrimero = index === 0;
              const esUltimo = index === subtemas.length - 1;
              const guardando = guardandoSubtemaId === idSubtema;

              return (
                <article
                  key={idSubtema}
                  id={`subtema-${idSubtema}`}
                  className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm transition ${
                    abierto
                      ? "border-blue-300 ring-1 ring-blue-200"
                      : "border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => alternarSubtema(idSubtema)}
                    className={`flex w-full items-start justify-between gap-4 p-5 text-left transition sm:p-6 ${
                      abierto ? "bg-blue-100" : "bg-white hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ${
                          completado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {completado ? "✅" : "📄"}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                          Publicación {index + 1} de {subtemas.length}
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-900">
                          {nombreDe(subtema)}
                        </h2>

                        {subtema.descripcion && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {subtema.descripcion}
                          </p>
                        )}

                        {completado && (
                          <p className="mt-2 text-sm font-bold text-emerald-700">
                            ✓ Completado
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${
                        abierto
                          ? "border-blue-300 bg-white text-blue-700"
                          : "border-slate-300 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="border-t border-slate-200 bg-white">
                      {contenidoHtml ? (
                        <div
                          className="contenido-unidad px-4 py-5 text-slate-950 sm:px-6 sm:py-7"
                          dangerouslySetInnerHTML={{ __html: contenidoHtml }}
                        />
                      ) : (
                        <div className="px-5 py-6 text-slate-600 sm:px-6">
                          Este subtema todavía no tiene contenido publicado.
                        </div>
                      )}

                      <div className="border-t border-slate-200 bg-slate-100 px-4 py-4 sm:px-6">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => irAnterior(idSubtema)}
                            disabled={esPrimero}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ← Anterior
                          </button>

                          <button
                            type="button"
                            onClick={() => marcarComoCompletado(subtema, true)}
                            disabled={guardando}
                            className={`rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition ${
                              completado
                                ? "bg-emerald-500 text-white hover:bg-emerald-400"
                                : "bg-blue-600 text-white hover:bg-blue-500"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {guardando
                              ? "Guardando..."
                              : completado
                              ? "Completado ✓"
                              : "Marcar como completado"}
                          </button>

                          <button
                            type="button"
                            onClick={() => irSiguiente(idSubtema)}
                            disabled={esUltimo}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {parciales.length > 0 && (
          <section className="mt-6 rounded-[2rem] border border-amber-300 bg-amber-100 p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
              Parciales de esta unidad 📝
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Evaluación
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              Cuando termines de estudiar la unidad, puedes resolver el parcial
              correspondiente.
            </p>

            <div className="mt-4 space-y-3">
              {parciales.map((parcial) => (
                <TarjetaParcial key={String(parcial.id)} parcial={parcial} />
              ))}
            </div>
          </section>
        )}
      </section>

      <style jsx global>{`
        .contenido-unidad {
          line-height: 1.75;
          font-size: 16px;
          overflow-wrap: anywhere;
        }

        .contenido-unidad h1,
        .contenido-unidad h2,
        .contenido-unidad h3 {
          color: #0f172a;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
          line-height: 1.2;
        }

        .contenido-unidad h1 {
          font-size: 2rem;
        }

        .contenido-unidad h2 {
          font-size: 1.75rem;
        }

        .contenido-unidad h3 {
          font-size: 1.35rem;
        }

        .contenido-unidad p {
          margin: 0.85rem 0;
        }

        .contenido-unidad ul,
        .contenido-unidad ol {
          padding-left: 1.4rem;
          margin: 1rem 0;
        }

        .contenido-unidad li {
          margin: 0.35rem 0;
        }

        .contenido-unidad img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          margin: 1rem 0;
          background: white;
        }

        .contenido-unidad iframe {
          max-width: 100%;
          border-radius: 1rem;
        }

        .contenido-unidad video {
          max-width: 100%;
          border-radius: 1rem;
        }

        .contenido-unidad a {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 600;
        }

        .contenido-unidad figure {
          margin: 1.25rem 0;
        }

        .contenido-unidad figcaption {
          color: #64748b;
          font-size: 0.9rem;
          text-align: center;
        }

        @media (max-width: 640px) {
          .contenido-unidad {
            font-size: 15px;
          }

          .contenido-unidad h1 {
            font-size: 1.75rem;
          }

          .contenido-unidad h2 {
            font-size: 1.5rem;
          }

          .contenido-unidad h3 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </main>
  );
}