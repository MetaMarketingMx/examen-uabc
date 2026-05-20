"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
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

type Parcial = {
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

type ProgresoSubtema = {
  subtema_id: string | number;
  tema_id?: string | number | null;
  materia_id?: string | number | null;
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

function descripcionDe(item?: Materia | Tema | Subtema | Parcial | null) {
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

function temaPerteneceAMateria(tema: Tema, materiaId: string | number) {
  const id = String(materiaId);

  return (
    String(tema.materia_id ?? "") === id ||
    String(tema.id_materia ?? "") === id ||
    String(tema.materia ?? "") === id
  );
}

function subtemaPerteneceATema(subtema: Subtema, temaId: string | number) {
  const id = String(temaId);

  return (
    String(subtema.tema_id ?? "") === id ||
    String(subtema.unidad_id ?? "") === id ||
    String(subtema.id_tema ?? "") === id ||
    String(subtema.id_unidad ?? "") === id ||
    String(subtema.tema ?? "") === id ||
    String(subtema.unidad ?? "") === id
  );
}

function parcialPerteneceATema(parcial: Parcial, temaId: string | number) {
  const id = String(temaId);

  return (
    String(parcial.tema_id ?? "") === id ||
    String(parcial.unidad_id ?? "") === id ||
    String(parcial.id_tema ?? "") === id ||
    String(parcial.id_unidad ?? "") === id ||
    String(parcial.tema ?? "") === id ||
    String(parcial.unidad ?? "") === id
  );
}

function obtenerIconoMateria(nombre: string) {
  const texto = nombre.toLowerCase();

  if (texto.includes("lectora") || texto.includes("lectura")) return "📖";
  if (texto.includes("lengua") || texto.includes("escrita")) return "✍️";
  if (texto.includes("mate")) return "🧮";
  if (texto.includes("salud") || texto.includes("ciencia")) return "🧬";

  return "📚";
}

function obtenerEstiloMateria(index: number) {
  const estilos = [
    {
      fondo: "bg-blue-100",
      fondoSuave: "bg-blue-50",
      borde: "border-blue-200",
      texto: "text-blue-800",
      barra: "bg-blue-600",
      boton: "bg-blue-600 hover:bg-blue-500",
      icono: "bg-blue-600",
      sombra: "shadow-blue-100/70",
    },
    {
      fondo: "bg-violet-100",
      fondoSuave: "bg-violet-50",
      borde: "border-violet-200",
      texto: "text-violet-800",
      barra: "bg-violet-600",
      boton: "bg-violet-600 hover:bg-violet-500",
      icono: "bg-violet-600",
      sombra: "shadow-violet-100/70",
    },
    {
      fondo: "bg-emerald-100",
      fondoSuave: "bg-emerald-50",
      borde: "border-emerald-200",
      texto: "text-emerald-800",
      barra: "bg-emerald-600",
      boton: "bg-emerald-600 hover:bg-emerald-500",
      icono: "bg-emerald-600",
      sombra: "shadow-emerald-100/70",
    },
    {
      fondo: "bg-amber-100",
      fondoSuave: "bg-amber-50",
      borde: "border-amber-200",
      texto: "text-amber-800",
      barra: "bg-amber-500",
      boton: "bg-amber-500 hover:bg-amber-400",
      icono: "bg-amber-500",
      sombra: "shadow-amber-100/70",
    },
  ];

  return estilos[index % estilos.length];
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

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [subtemasCompletados, setSubtemasCompletados] = useState<Set<string>>(
    new Set()
  );

  const [avancesParciales, setAvancesParciales] = useState<
    Record<string, AvanceParcialLocal>
  >({});
  const [resultadosParciales, setResultadosParciales] = useState<
    Record<string, ResultadoParcial>
  >({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

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

  async function cargarDatos() {
    setLoading(true);

    const { data: materiasData, error: materiasError } = await supabase
      .from("materias")
      .select("*");

    if (materiasError) {
      console.error("Error cargando materias:", materiasError);
      setMaterias([]);
      setLoading(false);
      return;
    }

    const { data: temasData } = await supabase.from("temas").select("*");
    const { data: subtemasData } = await supabase.from("subtemas").select("*");
    const { data: parcialesData } = await supabase.from("parciales").select("*");

    const materiasOrdenadas = ordenarPorOrden((materiasData || []) as Materia[]);
    const temasOrdenados = ordenarPorOrden((temasData || []) as Tema[]);
    const subtemasOrdenados = ordenarPorOrden((subtemasData || []) as Subtema[]);
    const parcialesOrdenados = ordenarPorOrden(
      (parcialesData || []) as Parcial[]
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (user) {
      const { data: progresoData, error: progresoError } = await supabase
        .from("progreso_subtemas")
        .select("*")
        .eq("user_id", user.id)
        .eq("completado", true);

      if (!progresoError) {
        const progreso = (progresoData || []) as ProgresoSubtema[];

        setSubtemasCompletados(
          new Set(progreso.map((item) => String(item.subtema_id)))
        );
      } else {
        console.error("Error cargando progreso:", progresoError);
        setSubtemasCompletados(new Set());
      }
    } else {
      setSubtemasCompletados(new Set());
    }

    setMaterias(materiasOrdenadas);
    setTemas(temasOrdenados);
    setSubtemas(subtemasOrdenados);
    setParciales(parcialesOrdenados);

    leerAvancesParciales(parcialesOrdenados);
    await cargarResultadosParciales(parcialesOrdenados);

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

  function obtenerTemasDeMateria(materiaId: string | number) {
    return ordenarPorOrden(
      temas.filter((tema) => temaPerteneceAMateria(tema, materiaId))
    );
  }

  function obtenerSubtemasDeTema(temaId: string | number) {
    return ordenarPorOrden(
      subtemas.filter((subtema) => subtemaPerteneceATema(subtema, temaId))
    );
  }

  function obtenerParcialesDeTema(temaId: string | number) {
    return ordenarPorOrden(
      parciales.filter((parcial) => parcialPerteneceATema(parcial, temaId))
    );
  }

  function contarCompletados(listaSubtemas: Subtema[]) {
    return listaSubtemas.filter((subtema) =>
      subtemasCompletados.has(String(subtema.id))
    ).length;
  }

  function obtenerPrimerPendiente(listaSubtemas: Subtema[]) {
    return (
      listaSubtemas.find(
        (subtema) => !subtemasCompletados.has(String(subtema.id))
      ) || listaSubtemas[0]
    );
  }

  function obtenerTextoBotonUnidad(listaSubtemas: Subtema[]) {
    if (listaSubtemas.length === 0) return "Ver unidad";

    const completados = contarCompletados(listaSubtemas);

    if (completados === 0) return "Iniciar unidad";
    if (completados >= listaSubtemas.length) return "Repasar unidad";
    return "Continuar avance";
  }

  function obtenerResumenMateria(materiaId: string | number) {
    const temasMateria = obtenerTemasDeMateria(materiaId);

    const totalSubtemas = temasMateria.reduce((total, tema) => {
      return total + obtenerSubtemasDeTema(tema.id).length;
    }, 0);

    const completados = temasMateria.reduce((total, tema) => {
      return total + contarCompletados(obtenerSubtemasDeTema(tema.id));
    }, 0);

    const totalParciales = temasMateria.reduce((total, tema) => {
      return total + obtenerParcialesDeTema(tema.id).length;
    }, 0);

    const porcentaje =
      totalSubtemas > 0 ? Math.round((completados / totalSubtemas) * 100) : 0;

    return {
      temasMateria,
      totalTemas: temasMateria.length,
      totalSubtemas,
      totalParciales,
      completados,
      porcentaje,
    };
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

  function obtenerHrefParcial(parcial: Parcial) {
    const idParcial = String(parcial.id);
    const estado = obtenerEstadoParcial(parcial);
    const resultado = resultadosParciales[idParcial];

    if (estado === "Completado" && resultado) {
      return `/resultados?resultado=${encodeURIComponent(
        `parcial-${resultado.id}`
      )}&volver=/materias`;
    }

    return `/parciales/${parcial.id}?volver=/materias`;
  }

  function obtenerHrefNuevoIntento(parcial: Parcial) {
    return `/parciales/${parcial.id}?nuevo=1&volver=/materias`;
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

  const totalTemas = temas.length;
  const totalSubtemas = subtemas.length;
  const totalParciales = parciales.length;
  const totalCompletados = contarCompletados(subtemas);
  const porcentajeGeneral =
    totalSubtemas > 0
      ? Math.round((totalCompletados / totalSubtemas) * 100)
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3fb] px-4 py-6 text-slate-900 sm:px-6">
        <section className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-blue-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-4xl">
                📚
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-700">Materias</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Cargando materias...
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

  return (
    <main className="min-h-screen bg-[#edf3fb] text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-7 text-white shadow-sm">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
              Plataforma académica 📚
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Materias
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
              Selecciona una materia para revisar sus unidades, subtemas,
              publicaciones de estudio y parciales disponibles.
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
            icono="📘"
            titulo="Materias"
            valor={materias.length}
            detalle="disponibles"
            color="blue"
          />

          <ResumenCard
            icono="🧩"
            titulo="Unidades"
            valor={totalTemas}
            detalle="registradas"
            color="violet"
          />

          <ResumenCard
            icono="📌"
            titulo="Publicaciones"
            valor={totalSubtemas}
            detalle="subtemas"
            color="emerald"
          />

          <ResumenCard
            icono="📝"
            titulo="Parciales"
            valor={totalParciales}
            detalle="disponibles"
            color="amber"
          />
        </section>

        <section className="mb-6 rounded-[2rem] border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Avance general 📈
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {porcentajeGeneral}% completado
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {totalCompletados} de {totalSubtemas} publicaciones
                completadas.
              </p>
            </div>

            <div className="w-full md:max-w-sm">
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${porcentajeGeneral}%` }}
                />
              </div>

              <p className="mt-2 text-right text-xs font-bold text-blue-700">
                Sigue avanzando 🚀
              </p>
            </div>
          </div>
        </section>

        {materias.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-300 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-4xl">
                📚
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  No hay materias todavía
                </h2>

                <p className="mt-3 text-slate-600">
                  Cuando el administrador agregue materias, aparecerán aquí.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            {materias.map((materia, materiaIndex) => {
              const resumen = obtenerResumenMateria(materia.id);
              const estilo = obtenerEstiloMateria(materiaIndex);
              const iconoMateria = obtenerIconoMateria(nombreDe(materia));

              return (
                <article
                  key={String(materia.id)}
                  className={`overflow-hidden rounded-[2rem] border ${estilo.borde} bg-white shadow-sm ${estilo.sombra} transition hover:-translate-y-1 hover:shadow-lg`}
                >
                  <div className={`${estilo.fondo} border-b ${estilo.borde} p-5 sm:p-6`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div
                          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl ${estilo.icono} text-4xl text-white shadow-sm`}
                        >
                          {iconoMateria}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.25em] ${estilo.texto}`}
                          >
                            Materia
                          </p>

                          <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">
                            {nombreDe(materia)}
                          </h2>

                          {materia.descripcion && (
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                              {materia.descripcion}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div
                          className={`rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold ${estilo.texto} shadow-sm`}
                        >
                          {resumen.porcentaje}% avance
                        </div>

                        <Link
                          href={`/materias/${materia.id}`}
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          Ver materia 📚
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-6">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniDato
                        icono="🧩"
                        titulo="Unidades"
                        valor={resumen.totalTemas}
                      />

                      <MiniDato
                        icono="📌"
                        titulo="Publicaciones"
                        valor={resumen.totalSubtemas}
                      />

                      <MiniDato
                        icono="📝"
                        titulo="Parciales"
                        valor={resumen.totalParciales}
                      />
                    </div>

                    <div className={`mt-5 rounded-3xl border ${estilo.borde} ${estilo.fondoSuave} p-4`}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-800">
                          Avance de la materia
                        </p>

                        <p className={`text-sm font-semibold ${estilo.texto}`}>
                          {resumen.porcentaje}%
                        </p>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${estilo.barra} transition-all`}
                          style={{ width: `${resumen.porcentaje}%` }}
                        />
                      </div>

                      <p className="mt-3 text-xs font-semibold text-slate-600">
                        {resumen.completados} de {resumen.totalSubtemas}{" "}
                        publicaciones completadas
                      </p>
                    </div>

                    <div className="mt-5 space-y-5">
                      {resumen.temasMateria.map((tema, temaIndex) => {
                        const subtemasTema = obtenerSubtemasDeTema(tema.id);
                        const parcialesTema = obtenerParcialesDeTema(tema.id);
                        const subtemasVisibles = subtemasTema.slice(0, 3);
                        const completadosTema = contarCompletados(subtemasTema);
                        const porcentajeTema =
                          subtemasTema.length > 0
                            ? Math.round(
                                (completadosTema / subtemasTema.length) * 100
                              )
                            : 0;

                        const subtemaDestino =
                          obtenerPrimerPendiente(subtemasTema);

                        const hrefContinuar = subtemaDestino
                          ? `/temas/${tema.id}/contenido?subtema=${subtemaDestino.id}`
                          : `/temas/${tema.id}/contenido`;

                        return (
                          <div
                            key={String(tema.id)}
                            className="rounded-3xl border border-slate-300 bg-slate-100 p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                                  Unidad {temaIndex + 1}
                                </p>

                                <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-950">
                                  {nombreDe(tema)}
                                </h3>

                                {tema.descripcion && (
                                  <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {tema.descripcion}
                                  </p>
                                )}
                              </div>

                              <Link
                                href={hrefContinuar}
                                className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-500"
                              >
                                {obtenerTextoBotonUnidad(subtemasTema)} →
                              </Link>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-semibold text-slate-600">
                                  {completadosTema} de {subtemasTema.length}{" "}
                                  completadas
                                </p>

                                <p className="text-sm font-semibold text-blue-700">
                                  {porcentajeTema}%
                                </p>
                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-all"
                                  style={{ width: `${porcentajeTema}%` }}
                                />
                              </div>
                            </div>

                            {subtemasTema.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {subtemasVisibles.map((subtema) => {
                                  const completado = subtemasCompletados.has(
                                    String(subtema.id)
                                  );

                                  return (
                                    <Link
                                      key={String(subtema.id)}
                                      href={`/temas/${tema.id}/contenido?subtema=${subtema.id}`}
                                      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                                    >
                                      <div className="min-w-0">
                                        <h4 className="truncate text-base font-semibold leading-tight text-slate-900 group-hover:text-blue-700">
                                          {nombreDe(subtema)}
                                        </h4>

                                        {subtema.descripcion && (
                                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                            {subtema.descripcion}
                                          </p>
                                        )}
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                                          completado
                                            ? "bg-emerald-500 text-white"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {completado ? "✓" : "→"}
                                      </span>
                                    </Link>
                                  );
                                })}

                                <Link
                                  href={`/temas/${tema.id}/contenido`}
                                  className="mt-3 flex w-full justify-center rounded-2xl border border-blue-300 bg-blue-100 px-4 py-3 text-center font-bold text-blue-800 transition hover:bg-blue-600 hover:text-white"
                                >
                                  Ver las {subtemasTema.length} publicaciones →
                                </Link>
                              </div>
                            )}

                            {parcialesTema.length > 0 && (
                              <div className="mt-4 rounded-3xl border border-amber-300 bg-amber-100 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
                                  Parcial de la unidad 📝
                                </p>

                                <div className="mt-3 space-y-3">
                                  {parcialesTema.map((parcial) => (
                                    <TarjetaParcial
                                      key={String(parcial.id)}
                                      parcial={parcial}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );

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

            <h4 className="mt-3 text-lg font-semibold leading-tight text-slate-950">
              {nombreDe(parcial)}
            </h4>

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
    blue: "border-blue-200 bg-blue-100 text-blue-800",
    violet: "border-violet-200 bg-violet-100 text-violet-800",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
    amber: "border-amber-200 bg-amber-100 text-amber-800",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${estilos[color]}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
          {icono}
        </div>

        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold">{detalle}</p>
        </div>
      </div>
    </div>
  );
}

function MiniDato({
  icono,
  titulo,
  valor,
}: {
  icono: string;
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3">
      <p className="text-lg">{icono}</p>
      <p className="mt-1 text-xs font-bold text-slate-600">{titulo}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{valor}</p>
    </div>
  );
}