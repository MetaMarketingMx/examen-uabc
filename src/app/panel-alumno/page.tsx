"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

const ADMIN_EMAILS = ["unimed.michel@gmail.com", "jaa.alejandro@gmail.com"];

const ACIERTOS_MAXIMOS_PUNTAJE = 105;
const PUNTAJE_MAXIMO = 1300;

type AlumnoRegistro = {
  id?: string | number;
  user_id?: string | null;
  nombre_completo?: string;
  correo_electronico?: string;
  estado_validacion?: "pendiente" | "aprobado" | "rechazado";
  acceso_plataforma?: "activo" | "suspendido";
  alias?: string | null;
  usuario?: string | null;
  alias_publico?: string | null;
  nombre_usuario?: string | null;
  foto_perfil_url?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  imagen_perfil?: string | null;
  [key: string]: any;
};

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  nombre_materia?: string;
  materia?: string;
  descripcion?: string;
  created_at?: string;
  [key: string]: any;
};

type MateriaDisponible = {
  id: string | number;
  nombre: string;
};

type ResultadoSimulador = {
  id: string | number;
  simulador_id?: string | number;
  examen_nombre?: string;
  alumno_id?: string;
  alumno_nombre?: string;
  alumno_alias?: string | null;
  alias_publico?: string | null;
  alias?: string | null;
  usuario?: string | null;
  total_preguntas?: number;
  correctas?: number;
  calificacion?: number;
  puntaje_1300?: number;
  promedio_general?: number;
  aciertos_para_puntaje?: number;
  tiempo_limite_minutos?: number;
  tiempo_usado_segundos?: number;
  tipo_finalizacion?: string | null;
  finalizado_por?: string | null;
  finalizacion_automatica?: boolean | null;
  resumen_areas?: any;
  created_at?: string;
};

type ResultadoParcial = {
  id: string | number;
  parcial_id?: string | number;
  examen_nombre?: string;
  alumno_id?: string;
  alumno_nombre?: string;
  alumno_alias?: string | null;
  alias_publico?: string | null;
  alias?: string | null;
  usuario?: string | null;
  total_preguntas?: number;
  correctas?: number;
  calificacion?: number;
  tiempo_limite_minutos?: number;
  tiempo_usado_segundos?: number;
  created_at?: string;
};

type AreaResumen = {
  area: string;
  total_preguntas: number;
  correctas: number;
  promedio: number;
};

type RankingAlumno<T> = {
  lugar: number;
  total: number;
  mejorResultado: T | null;
};

type ProgresoMaterias = {
  porcentaje: number;
  terminados: number;
  total: number;
  disponible: boolean;
};

export default function PanelAlumnoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [aliasAlumno, setAliasAlumno] = useState("");
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [userIdActual, setUserIdActual] = useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [cargandoProgreso, setCargandoProgreso] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);

  const [totalMaterias, setTotalMaterias] = useState(0);
  const [totalSimuladoresDisponibles, setTotalSimuladoresDisponibles] =
    useState(0);
  const [totalParcialesDisponibles, setTotalParcialesDisponibles] =
    useState(0);

  const [materiasDisponibles, setMateriasDisponibles] = useState<
    MateriaDisponible[]
  >([]);

  const [progresoMaterias, setProgresoMaterias] = useState<ProgresoMaterias>({
    porcentaje: 0,
    terminados: 0,
    total: 0,
    disponible: false,
  });

  const [resultadosSimuladores, setResultadosSimuladores] = useState<
    ResultadoSimulador[]
  >([]);

  const [rankingSimuladores, setRankingSimuladores] = useState<
    ResultadoSimulador[]
  >([]);

  const [resultadosParciales, setResultadosParciales] = useState<
    ResultadoParcial[]
  >([]);

  const [rankingParciales, setRankingParciales] = useState<ResultadoParcial[]>(
    []
  );

  useEffect(() => {
    cargarDatosAlumno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";

    return String(
      item.nombre ??
        item.titulo ??
        item.title ??
        item.nombre_materia ??
        item.materia ??
        item.descripcion ??
        `Materia ${item.id}`
    );
  }

  function obtenerAliasDesdeAlumno(
    alumno: AlumnoRegistro | null,
    user: any,
    emailUsuario: string
  ) {
    const alias = String(
      alumno?.alias ??
        alumno?.usuario ??
        alumno?.alias_publico ??
        alumno?.nombre_usuario ??
        user?.user_metadata?.alias ??
        user?.user_metadata?.usuario ??
        ""
    ).trim();

    if (alias) return alias;

    if (emailUsuario) return emailUsuario.split("@")[0];

    return "Alumno";
  }

  function obtenerFotoDesdeAlumno(alumno: AlumnoRegistro | null, user: any) {
    return String(
      alumno?.foto_perfil_url ??
        alumno?.foto_url ??
        alumno?.avatar_url ??
        alumno?.imagen_perfil ??
        user?.user_metadata?.avatar_url ??
        ""
    ).trim();
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

  function formatearFecha(fecha?: string) {
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

  function formatearTiempo(segundos?: number) {
    const total = Math.max(0, Math.floor(Number(segundos ?? 0)));

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

  function parsearResumenAreas(resumen: any): AreaResumen[] {
    if (!resumen) return [];

    if (Array.isArray(resumen)) {
      return resumen
        .map((area) => ({
          area: String(area.area ?? "Área"),
          total_preguntas: Number(area.total_preguntas ?? 0),
          correctas: Number(area.correctas ?? 0),
          promedio: Number(area.promedio ?? 0),
        }))
        .filter((area) => area.total_preguntas > 0);
    }

    if (typeof resumen === "string") {
      try {
        const parsed = JSON.parse(resumen);
        return parsearResumenAreas(parsed);
      } catch {
        return [];
      }
    }

    return [];
  }

  function crearAliasAlumno(
    resultado: ResultadoSimulador | ResultadoParcial | null | undefined
  ) {
    if (!resultado) return "Alumno";

    const aliasElegido = String(
      resultado.alias_publico ??
        resultado.alumno_alias ??
        resultado.alias ??
        resultado.usuario ??
        ""
    ).trim();

    if (aliasElegido) return aliasElegido;

    const nombreAlumno = String(resultado.alumno_nombre ?? "").trim();

    if (!nombreAlumno || nombreAlumno.toLowerCase() === "alumno sin nombre") {
      return "Alumno";
    }

    if (nombreAlumno.includes("@")) {
      return nombreAlumno.split("@")[0] || "Alumno";
    }

    return nombreAlumno;
  }

  function obtenerClaveAlumno(resultado: ResultadoSimulador | ResultadoParcial) {
    const id = String(resultado.alumno_id ?? "").trim();

    if (id && id !== "sin-login") {
      return `id-${id}`;
    }

    return `nombre-${crearAliasAlumno(resultado).toLowerCase()}`;
  }

  function esMejorResultadoSimulador(
    nuevo: ResultadoSimulador,
    actual: ResultadoSimulador
  ) {
    const puntajeNuevo = obtenerPuntaje(nuevo);
    const puntajeActual = obtenerPuntaje(actual);

    if (puntajeNuevo !== puntajeActual) return puntajeNuevo > puntajeActual;

    const tiempoNuevo = Number(nuevo.tiempo_usado_segundos ?? 999999999);
    const tiempoActual = Number(actual.tiempo_usado_segundos ?? 999999999);

    if (tiempoNuevo !== tiempoActual) return tiempoNuevo < tiempoActual;

    const fechaNueva = new Date(nuevo.created_at ?? 0).getTime();
    const fechaActual = new Date(actual.created_at ?? 0).getTime();

    return fechaNueva > fechaActual;
  }

  function esMejorResultadoParcial(
    nuevo: ResultadoParcial,
    actual: ResultadoParcial
  ) {
    const calificacionNueva = Number(nuevo.calificacion ?? 0);
    const calificacionActual = Number(actual.calificacion ?? 0);

    if (calificacionNueva !== calificacionActual) {
      return calificacionNueva > calificacionActual;
    }

    const correctasNueva = Number(nuevo.correctas ?? 0);
    const correctasActual = Number(actual.correctas ?? 0);

    if (correctasNueva !== correctasActual) {
      return correctasNueva > correctasActual;
    }

    const tiempoNuevo = Number(nuevo.tiempo_usado_segundos ?? 999999999);
    const tiempoActual = Number(actual.tiempo_usado_segundos ?? 999999999);

    if (tiempoNuevo !== tiempoActual) return tiempoNuevo < tiempoActual;

    const fechaNueva = new Date(nuevo.created_at ?? 0).getTime();
    const fechaActual = new Date(actual.created_at ?? 0).getTime();

    return fechaNueva > fechaActual;
  }

  function ordenarRankingSimuladores(lista: ResultadoSimulador[]) {
    return [...lista].sort((a, b) => {
      const puntajeA = obtenerPuntaje(a);
      const puntajeB = obtenerPuntaje(b);

      if (puntajeA !== puntajeB) return puntajeB - puntajeA;

      const tiempoA = Number(a.tiempo_usado_segundos ?? 999999999);
      const tiempoB = Number(b.tiempo_usado_segundos ?? 999999999);

      if (tiempoA !== tiempoB) return tiempoA - tiempoB;

      const fechaA = new Date(a.created_at ?? 0).getTime();
      const fechaB = new Date(b.created_at ?? 0).getTime();

      return fechaB - fechaA;
    });
  }

  function ordenarRankingParciales(lista: ResultadoParcial[]) {
    return [...lista].sort((a, b) => {
      const calificacionA = Number(a.calificacion ?? 0);
      const calificacionB = Number(b.calificacion ?? 0);

      if (calificacionA !== calificacionB) return calificacionB - calificacionA;

      const correctasA = Number(a.correctas ?? 0);
      const correctasB = Number(b.correctas ?? 0);

      if (correctasA !== correctasB) return correctasB - correctasA;

      const tiempoA = Number(a.tiempo_usado_segundos ?? 999999999);
      const tiempoB = Number(b.tiempo_usado_segundos ?? 999999999);

      if (tiempoA !== tiempoB) return tiempoA - tiempoB;

      const fechaA = new Date(a.created_at ?? 0).getTime();
      const fechaB = new Date(b.created_at ?? 0).getTime();

      return fechaB - fechaA;
    });
  }

  function estaSubtemaTerminado(item: any) {
    const estado = String(item.estado ?? item.status ?? "").toLowerCase();

    return (
      item.terminado === true ||
      item.completado === true ||
      item.finalizado === true ||
      Number(item.porcentaje ?? item.progreso ?? 0) >= 100 ||
      Boolean(item.fecha_terminado) ||
      Boolean(item.fecha_finalizado) ||
      Boolean(item.completed_at) ||
      Boolean(item.terminado_at) ||
      estado === "terminado" ||
      estado === "completado" ||
      estado === "finalizado"
    );
  }

  function obtenerIdSubtemaDesdeProgreso(item: any) {
    return String(
      item.subtema_id ??
        item.id_subtema ??
        item.subtemaId ??
        item.subtema ??
        item.id ??
        ""
    ).trim();
  }

  function progresoPerteneceAlUsuario(item: any, userId: string) {
    const userIdItem = String(item.user_id ?? "").trim();
    const alumnoIdItem = String(item.alumno_id ?? "").trim();

    if (!userIdItem && !alumnoIdItem) return true;

    return userIdItem === userId || alumnoIdItem === userId;
  }

  async function cargarDatosAlumno() {
    setCargando(true);
    setCargandoProgreso(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setCargando(false);
      setCargandoProgreso(false);
      return;
    }

    setUserIdActual(user.id);

    const emailUsuario = user.email?.toLowerCase() || "";
    const admin = ADMIN_EMAILS.includes(emailUsuario);

    setEsAdmin(admin);

    if (admin) {
      setNombre("Administrador");
      setCorreo(emailUsuario);
      setAliasAlumno("Administrador");
      setFotoPerfilUrl("");
      setCargando(false);
      setCargandoProgreso(false);
      return;
    }

    let alumno: AlumnoRegistro | null = null;

    const { data: alumnoPorUserId } = await supabase
      .from("alumnos_registro")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    alumno = alumnoPorUserId as AlumnoRegistro | null;

    if (!alumno && emailUsuario) {
      const { data: alumnoPorCorreo } = await supabase
        .from("alumnos_registro")
        .select("*")
        .eq("correo_electronico", emailUsuario)
        .maybeSingle();

      alumno = alumnoPorCorreo as AlumnoRegistro | null;
    }

    if (alumno) {
      setNombre(alumno.nombre_completo ?? "Alumno");
      setCorreo(alumno.correo_electronico ?? emailUsuario);
      setAliasAlumno(obtenerAliasDesdeAlumno(alumno, user, emailUsuario));
      setFotoPerfilUrl(obtenerFotoDesdeAlumno(alumno, user));
    } else {
      setNombre(user.user_metadata?.nombre_completo ?? "Alumno");
      setCorreo(emailUsuario);
      setAliasAlumno(obtenerAliasDesdeAlumno(null, user, emailUsuario));
      setFotoPerfilUrl(obtenerFotoDesdeAlumno(null, user));
    }

    await cargarProgresoAlumno(user.id);

    setCargando(false);
  }

  async function subirFotoPerfil(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];

    if (!archivo || !userIdActual) return;

    if (!archivo.type.startsWith("image/")) {
      alert("Selecciona una imagen válida.");
      return;
    }

    setSubiendoFoto(true);

    const extension = archivo.name.split(".").pop() || "jpg";
    const ruta = `${userIdActual}/perfil-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("perfiles")
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo foto:", uploadError);
      alert("No se pudo subir la foto. Revisa el bucket perfiles y sus permisos.");
      setSubiendoFoto(false);
      return;
    }

    const { data } = supabase.storage.from("perfiles").getPublicUrl(ruta);
    const publicUrl = data.publicUrl;

    let fotoGuardada = false;

    const { data: guardadoPorUserId, error: errorPorUserId } = await supabase
      .from("alumnos_registro")
      .update({ foto_perfil_url: publicUrl })
      .eq("user_id", userIdActual)
      .select("id, foto_perfil_url")
      .maybeSingle();

    if (errorPorUserId) {
      console.warn("No se pudo guardar foto por user_id:", errorPorUserId);
    }

    if (guardadoPorUserId?.foto_perfil_url) {
      fotoGuardada = true;
    }

    if (!fotoGuardada && correo) {
      const { data: guardadoPorCorreo, error: errorPorCorreo } = await supabase
        .from("alumnos_registro")
        .update({ foto_perfil_url: publicUrl })
        .ilike("correo_electronico", correo.toLowerCase())
        .select("id, foto_perfil_url")
        .maybeSingle();

      if (errorPorCorreo) {
        console.warn("No se pudo guardar foto por correo:", errorPorCorreo);
      }

      if (guardadoPorCorreo?.foto_perfil_url) {
        fotoGuardada = true;
      }
    }

    if (!fotoGuardada) {
      console.warn(
        "La foto se subió al bucket, pero no se guardó en alumnos_registro.foto_perfil_url"
      );
      alert(
        "La foto se subió, pero no se pudo guardar en el perfil del alumno. Revisa las políticas RLS de alumnos_registro."
      );
      setSubiendoFoto(false);
      return;
    }

    setFotoPerfilUrl(publicUrl);
    setSubiendoFoto(false);

    event.target.value = "";
  }

  async function cargarProgresoAlumno(userId: string) {
    setCargandoProgreso(true);

    const [
      misSimuladoresRes,
      rankingSimuladoresRes,
      misParcialesRes,
      rankingParcialesRes,
      catalogoSimuladoresRes,
      catalogoParcialesRes,
      catalogoMateriasRes,
      catalogoSubtemasRes,
      progresoSubtemasRes,
    ] = await Promise.all([
      supabase
        .from("resultados_simuladores")
        .select("*")
        .eq("alumno_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("resultados_simuladores")
        .select("*")
        .order("puntaje_1300", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),

      supabase
        .from("resultados_parciales")
        .select("*")
        .eq("alumno_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("resultados_parciales")
        .select("*")
        .order("calificacion", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),

      supabase.from("simuladores").select("*"),

      supabase.from("parciales").select("*"),

      supabase.from("materias").select("*"),

      supabase.from("subtemas").select("*"),

      supabase.from("progreso_subtemas").select("*"),
    ]);

    if (misSimuladoresRes.error) {
      console.error(
        "Error cargando progreso de simuladores:",
        misSimuladoresRes.error
      );
      setResultadosSimuladores([]);
    }

    if (misParcialesRes.error) {
      console.error(
        "Error cargando progreso de parciales:",
        misParcialesRes.error
      );
      setResultadosParciales([]);
    }

    if (rankingSimuladoresRes.error) {
      console.warn(
        "No se pudo cargar ranking de simuladores:",
        rankingSimuladoresRes.error
      );
    }

    if (rankingParcialesRes.error) {
      console.warn(
        "No se pudo cargar ranking de parciales:",
        rankingParcialesRes.error
      );
    }

    if (catalogoSimuladoresRes.error) {
      console.warn(
        "No se pudieron cargar simuladores disponibles:",
        catalogoSimuladoresRes.error
      );
      setTotalSimuladoresDisponibles(0);
    } else {
      setTotalSimuladoresDisponibles((catalogoSimuladoresRes.data ?? []).length);
    }

    if (catalogoParcialesRes.error) {
      console.warn(
        "No se pudieron cargar parciales disponibles:",
        catalogoParcialesRes.error
      );
      setTotalParcialesDisponibles(0);
    } else {
      setTotalParcialesDisponibles((catalogoParcialesRes.data ?? []).length);
    }

    if (catalogoMateriasRes.error) {
      console.warn("No se pudieron cargar materias:", catalogoMateriasRes.error);
      setTotalMaterias(0);
      setMateriasDisponibles([]);
    } else {
      const materias = (catalogoMateriasRes.data ?? [])
        .map((item: Registro) => ({
          id: item.id,
          nombre: obtenerTitulo(item),
        }))
        .filter(
          (materia) =>
            materia.id !== undefined &&
            materia.id !== null &&
            materia.nombre.trim().length > 0
        );

      setTotalMaterias(materias.length);
      setMateriasDisponibles(materias);
    }

    if (catalogoSubtemasRes.error || progresoSubtemasRes.error) {
      console.warn(
        "No se pudo calcular avance de materias todavía:",
        catalogoSubtemasRes.error ?? progresoSubtemasRes.error
      );

      setProgresoMaterias({
        porcentaje: 0,
        terminados: 0,
        total: 0,
        disponible: false,
      });
    } else {
      const totalSubtemas = (catalogoSubtemasRes.data ?? []).length;

      const progresoDelUsuario = (progresoSubtemasRes.data ?? []).filter(
        (item: any) => progresoPerteneceAlUsuario(item, userId)
      );

      const subtemasTerminadosUnicos = new Set(
        progresoDelUsuario
          .filter(estaSubtemaTerminado)
          .map(obtenerIdSubtemaDesdeProgreso)
          .filter(Boolean)
      );

      const terminados = subtemasTerminadosUnicos.size;

      setProgresoMaterias({
        porcentaje:
          totalSubtemas > 0
            ? Math.round((terminados / totalSubtemas) * 100)
            : 0,
        terminados,
        total: totalSubtemas,
        disponible: totalSubtemas > 0,
      });
    }

    const catalogoSimuladores = new Map<string, string>();
    const catalogoParciales = new Map<string, string>();

    (catalogoSimuladoresRes.data ?? []).forEach((item: Registro) => {
      catalogoSimuladores.set(String(item.id), obtenerTitulo(item));
    });

    (catalogoParcialesRes.data ?? []).forEach((item: Registro) => {
      catalogoParciales.set(String(item.id), obtenerTitulo(item));
    });

    function mapearSimulador(item: any): ResultadoSimulador {
      const simuladorId = String(item.simulador_id ?? "");

      return {
        id: item.id,
        simulador_id: item.simulador_id,
        examen_nombre:
          item.examen_nombre ??
          catalogoSimuladores.get(simuladorId) ??
          `Simulador ${simuladorId}`,
        alumno_id: item.alumno_id,
        alumno_nombre: item.alumno_nombre,
        alumno_alias:
          item.alumno_alias ??
          item.alias_publico ??
          item.alias ??
          item.usuario ??
          null,
        alias_publico: item.alias_publico ?? null,
        alias: item.alias ?? null,
        usuario: item.usuario ?? null,
        total_preguntas: item.total_preguntas ?? 0,
        correctas: item.correctas ?? 0,
        calificacion: Number(item.calificacion ?? 0),
        puntaje_1300: Number(item.puntaje_1300 ?? 0),
        promedio_general: Number(item.promedio_general ?? 0),
        aciertos_para_puntaje: Number(item.aciertos_para_puntaje ?? 0),
        tiempo_limite_minutos: item.tiempo_limite_minutos ?? 0,
        tiempo_usado_segundos: item.tiempo_usado_segundos ?? 0,
        tipo_finalizacion: item.tipo_finalizacion ?? null,
        finalizado_por: item.finalizado_por ?? null,
        finalizacion_automatica: item.finalizacion_automatica ?? false,
        resumen_areas: item.resumen_areas,
        created_at: item.created_at,
      };
    }

    function mapearParcial(item: any): ResultadoParcial {
      const parcialId = String(item.parcial_id ?? "");

      return {
        id: item.id,
        parcial_id: item.parcial_id,
        examen_nombre:
          item.examen_nombre ??
          catalogoParciales.get(parcialId) ??
          `Parcial ${parcialId}`,
        alumno_id: item.alumno_id,
        alumno_nombre: item.alumno_nombre,
        alumno_alias:
          item.alumno_alias ??
          item.alias_publico ??
          item.alias ??
          item.usuario ??
          null,
        alias_publico: item.alias_publico ?? null,
        alias: item.alias ?? null,
        usuario: item.usuario ?? null,
        total_preguntas: item.total_preguntas ?? 0,
        correctas: item.correctas ?? 0,
        calificacion: Number(item.calificacion ?? 0),
        tiempo_limite_minutos: item.tiempo_limite_minutos ?? 0,
        tiempo_usado_segundos: item.tiempo_usado_segundos ?? 0,
        created_at: item.created_at,
      };
    }

    setResultadosSimuladores(
      (misSimuladoresRes.data ?? []).map(mapearSimulador)
    );

    setRankingSimuladores(
      (rankingSimuladoresRes.data ?? []).map(mapearSimulador)
    );

    setResultadosParciales((misParcialesRes.data ?? []).map(mapearParcial));

    setRankingParciales((rankingParcialesRes.data ?? []).map(mapearParcial));

    setCargandoProgreso(false);
  }

  const resumenProgreso = useMemo(() => {
    const intentosSimuladores = resultadosSimuladores.length;
    const intentosParciales = resultadosParciales.length;

    const ultimoSimulador =
      intentosSimuladores > 0 ? resultadosSimuladores[0] : null;

    const mejorSimulador =
      intentosSimuladores > 0
        ? ordenarRankingSimuladores(resultadosSimuladores)[0]
        : null;

    const mejorParcial =
      intentosParciales > 0
        ? ordenarRankingParciales(resultadosParciales)[0]
        : null;

    const mapaAreas = new Map<
      string,
      { area: string; total_preguntas: number; correctas: number }
    >();

    resultadosSimuladores.forEach((resultado) => {
      parsearResumenAreas(resultado.resumen_areas).forEach((area) => {
        if (!mapaAreas.has(area.area)) {
          mapaAreas.set(area.area, {
            area: area.area,
            total_preguntas: 0,
            correctas: 0,
          });
        }

        const registro = mapaAreas.get(area.area)!;
        registro.total_preguntas += Number(area.total_preguntas ?? 0);
        registro.correctas += Number(area.correctas ?? 0);
      });
    });

    const areasCalculadas: AreaResumen[] = Array.from(mapaAreas.values())
      .filter((area) => area.total_preguntas > 0)
      .map((area) => ({
        area: area.area,
        total_preguntas: area.total_preguntas,
        correctas: area.correctas,
        promedio: Math.round((area.correctas / area.total_preguntas) * 100),
      }))
      .sort((a, b) => b.promedio - a.promedio);

    const areaFuerte = areasCalculadas[0] ?? null;
    const areaReforzar =
      areasCalculadas.length > 1
        ? areasCalculadas[areasCalculadas.length - 1]
        : null;

    const simuladoresCompletadosUnicos = new Set(
      resultadosSimuladores
        .map((resultado) =>
          String(resultado.simulador_id ?? resultado.examen_nombre ?? "")
        )
        .filter(Boolean)
    );

    const parcialesCompletadosUnicos = new Set(
      resultadosParciales
        .map((resultado) =>
          String(resultado.parcial_id ?? resultado.examen_nombre ?? "")
        )
        .filter(Boolean)
    );

    const simuladoresCompletados =
      totalSimuladoresDisponibles > 0
        ? Math.min(
            simuladoresCompletadosUnicos.size,
            totalSimuladoresDisponibles
          )
        : 0;

    const parcialesCompletados =
      totalParcialesDisponibles > 0
        ? Math.min(parcialesCompletadosUnicos.size, totalParcialesDisponibles)
        : 0;

    const avanceSimuladores =
      totalSimuladoresDisponibles > 0
        ? Math.round(
            (simuladoresCompletados / totalSimuladoresDisponibles) * 100
          )
        : 0;

    const avanceParciales =
      totalParcialesDisponibles > 0
        ? Math.round((parcialesCompletados / totalParcialesDisponibles) * 100)
        : 0;

    const componentesAvance: number[] = [];

    if (totalSimuladoresDisponibles > 0) {
      componentesAvance.push(avanceSimuladores);
    }

    if (totalParcialesDisponibles > 0) {
      componentesAvance.push(avanceParciales);
    }

    if (progresoMaterias.disponible) {
      componentesAvance.push(progresoMaterias.porcentaje);
    }

    const avanceGlobal =
      componentesAvance.length > 0
        ? Math.round(
            componentesAvance.reduce((total, valor) => total + valor, 0) /
              componentesAvance.length
          )
        : 0;

    return {
      intentosSimuladores,
      intentosParciales,
      ultimoSimulador,
      mejorSimulador,
      mejorParcial,
      areaFuerte,
      areaReforzar,
      historialSimuladores: resultadosSimuladores.slice(0, 5),
      historialParciales: resultadosParciales.slice(0, 5),
      avanceGlobal,
      avanceSimuladores,
      avanceParciales,
      avanceMaterias: progresoMaterias.porcentaje,
      simuladoresCompletados,
      totalSimuladoresDisponibles,
      parcialesCompletados,
      totalParcialesDisponibles,
    };
  }, [
    resultadosSimuladores,
    resultadosParciales,
    progresoMaterias,
    totalSimuladoresDisponibles,
    totalParcialesDisponibles,
  ]);

  const rankingAlumnoSimuladores = useMemo<
    RankingAlumno<ResultadoSimulador>
  >(() => {
    if (!userIdActual || rankingSimuladores.length === 0) {
      return {
        lugar: 0,
        total: 0,
        mejorResultado: null,
      };
    }

    const mejoresPorAlumno = new Map<string, ResultadoSimulador>();

    rankingSimuladores.forEach((resultado) => {
      const clave = obtenerClaveAlumno(resultado);
      const actual = mejoresPorAlumno.get(clave);

      if (!actual || esMejorResultadoSimulador(resultado, actual)) {
        mejoresPorAlumno.set(clave, resultado);
      }
    });

    const rankingOrdenado = ordenarRankingSimuladores(
      Array.from(mejoresPorAlumno.values())
    );

    const indice = rankingOrdenado.findIndex(
      (resultado) => String(resultado.alumno_id) === String(userIdActual)
    );

    if (indice < 0) {
      return {
        lugar: 0,
        total: rankingOrdenado.length,
        mejorResultado: null,
      };
    }

    return {
      lugar: indice + 1,
      total: rankingOrdenado.length,
      mejorResultado: rankingOrdenado[indice],
    };
  }, [rankingSimuladores, userIdActual]);

  const rankingAlumnoParcial = useMemo<RankingAlumno<ResultadoParcial>>(() => {
    const mejorParcial = resumenProgreso.mejorParcial;

    if (!userIdActual || !mejorParcial || rankingParciales.length === 0) {
      return {
        lugar: 0,
        total: 0,
        mejorResultado: null,
      };
    }

    const parcialesDelMismoExamen = rankingParciales.filter(
      (resultado) =>
        String(resultado.parcial_id ?? "") ===
        String(mejorParcial.parcial_id ?? "")
    );

    const mejoresPorAlumno = new Map<string, ResultadoParcial>();

    parcialesDelMismoExamen.forEach((resultado) => {
      const clave = obtenerClaveAlumno(resultado);
      const actual = mejoresPorAlumno.get(clave);

      if (!actual || esMejorResultadoParcial(resultado, actual)) {
        mejoresPorAlumno.set(clave, resultado);
      }
    });

    const rankingOrdenado = ordenarRankingParciales(
      Array.from(mejoresPorAlumno.values())
    );

    const indice = rankingOrdenado.findIndex(
      (resultado) => String(resultado.alumno_id) === String(userIdActual)
    );

    if (indice < 0) {
      return {
        lugar: 0,
        total: rankingOrdenado.length,
        mejorResultado: null,
      };
    }

    return {
      lugar: indice + 1,
      total: rankingOrdenado.length,
      mejorResultado: rankingOrdenado[indice],
    };
  }, [rankingParciales, resumenProgreso.mejorParcial, userIdActual]);

  const iniciales = useMemo(() => {
    const base = aliasAlumno || nombre || "Alumno";
    const limpio = base.trim();

    if (!limpio) return "AP";

    const partes = limpio.split(/\s+/).filter(Boolean);

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0] ?? "A"}${partes[1][0] ?? "P"}`.toUpperCase();
  }, [aliasAlumno, nombre]);

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
        <section className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Panel del alumno
              </p>

              <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                Bienvenido a la plataforma 👋
              </h1>
            </div>

            <div className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 md:mt-0 md:w-auto md:bg-transparent md:p-0">
              <AvatarAlumno
                fotoPerfilUrl={fotoPerfilUrl}
                iniciales={iniciales}
                size="sm"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {aliasAlumno || nombre || "Alumno"}
                </p>

                <p className="truncate text-xs text-slate-500">{correo}</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1fr_330px] xl:items-start">
            <div className="order-1 space-y-6 xl:col-start-1 xl:row-start-1">
              <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white shadow-sm">
                <div className="relative z-10 max-w-2xl">
                  <p className="text-sm font-semibold text-blue-100">
                    Plataforma académica
                  </p>

                  <h2 className="mt-3 text-4xl font-semibold tracking-tight">
                    Sigue practicando y alcanza tu máximo potencial.
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50">
                    Consulta tus simuladores, parciales, ranking y avance
                    académico desde un solo lugar.
                  </p>
                </div>

                <div className="absolute bottom-0 right-8 hidden h-44 w-72 lg:block">
                  <div className="absolute bottom-0 right-10 h-28 w-40 rounded-t-[3rem] bg-white/25 backdrop-blur" />
                  <div className="absolute bottom-10 right-20 h-20 w-20 rounded-full bg-white/30" />
                  <div className="absolute bottom-16 right-28 h-12 w-12 rounded-full bg-slate-900/20" />
                  <div className="absolute bottom-8 right-0 h-24 w-36 rounded-3xl bg-white/90 shadow-lg" />
                  <div className="absolute bottom-16 right-7 h-3 w-24 rounded-full bg-blue-200" />
                  <div className="absolute bottom-11 right-7 h-3 w-20 rounded-full bg-blue-100" />
                  <div className="absolute bottom-20 right-4 text-4xl">✏️</div>
                </div>

                <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute right-72 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  {cargando ? (
                    <p className="text-sm text-slate-500">
                      Cargando tus datos...
                    </p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <AvatarAlumno
                        fotoPerfilUrl={fotoPerfilUrl}
                        iniciales={iniciales}
                        size="lg"
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-600">
                          Información del alumno
                        </p>

                        <h3 className="mt-1 truncate text-xl font-semibold text-slate-900">
                          {aliasAlumno || nombre || "Alumno"}
                        </h3>

                        {nombre && aliasAlumno && nombre !== aliasAlumno && (
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {nombre}
                          </p>
                        )}

                        {correo && (
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {correo}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            Alumno activo
                          </span>

                          <label className="cursor-pointer rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">
                            {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={subirFotoPerfil}
                              disabled={subiendoFoto}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white">
                      ✓
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-emerald-800">
                        Tu acceso está activo
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        Desde aquí podrás entrar a tus materias, simuladores y
                        resultados.
                      </p>
                    </div>
                  </div>

                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-emerald-200/60" />
                </div>
              </section>
            </div>

            <aside className="order-2 space-y-5 xl:col-start-2 xl:row-start-1">
              {!esAdmin && (
                <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        Avance global
                      </p>

                      <h3 className="mt-3 text-4xl font-semibold text-slate-900">
                        {resumenProgreso.avanceGlobal}%
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Promedio de avance considerando simuladores, parciales y
                        materias disponibles.
                      </p>
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                      📈
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, resumenProgreso.avanceGlobal)
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <AvanceDetalle
                      texto="Simuladores"
                      valor={resumenProgreso.avanceSimuladores}
                      detalle={
                        resumenProgreso.totalSimuladoresDisponibles > 0
                          ? `${resumenProgreso.simuladoresCompletados} de ${resumenProgreso.totalSimuladoresDisponibles} completados`
                          : "sin simuladores disponibles"
                      }
                    />

                    <AvanceDetalle
                      texto="Parciales"
                      valor={resumenProgreso.avanceParciales}
                      detalle={
                        resumenProgreso.totalParcialesDisponibles > 0
                          ? `${resumenProgreso.parcialesCompletados} de ${resumenProgreso.totalParcialesDisponibles} completados`
                          : "sin parciales disponibles"
                      }
                    />

                    <AvanceDetalle
                      texto="Materias"
                      valor={resumenProgreso.avanceMaterias}
                      detalle={
                        progresoMaterias.disponible
                          ? `${progresoMaterias.terminados} de ${progresoMaterias.total} subtemas terminados`
                          : "avance no disponible"
                      }
                    />
                  </div>
                </section>
              )}
            </aside>

            <div className="order-3 space-y-6 xl:col-start-1 xl:row-start-2">
              {!esAdmin && (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        Mi progreso académico
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        Resumen competitivo
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Aquí puedes ver tus mejores resultados, ranking y
                        últimos intentos.
                      </p>
                    </div>

                    <Link
                      href="/resultados"
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-500"
                    >
                      Ver resultados completos →
                    </Link>
                  </div>

                  {cargandoProgreso ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-500">
                      Cargando tu progreso...
                    </div>
                  ) : resumenProgreso.intentosSimuladores === 0 &&
                    resumenProgreso.intentosParciales === 0 ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                      <h3 className="text-xl font-semibold text-slate-900">
                        Aún no tienes evaluaciones terminadas
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Cuando termines tu primer simulador o parcial, aquí
                        aparecerá tu progreso académico.
                      </p>

                      <Link
                        href="/simuladores"
                        className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
                      >
                        Ir a simuladores
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                          icono="📋"
                          titulo="Intentos de simulador"
                          valor={resumenProgreso.intentosSimuladores}
                          descripcion="Simuladores registrados"
                          color="blue"
                        />

                        <MetricCard
                          icono="🎯"
                          titulo="Último puntaje"
                          valor={obtenerPuntaje(
                            resumenProgreso.ultimoSimulador
                          )}
                          descripcion={`sobre ${PUNTAJE_MAXIMO}`}
                          color="violet"
                        />

                        <MetricCard
                          icono="🏆"
                          titulo="Mejor puntaje"
                          valor={obtenerPuntaje(
                            resumenProgreso.mejorSimulador
                          )}
                          descripcion={`sobre ${PUNTAJE_MAXIMO}`}
                          color="emerald"
                        />

                        <MetricCard
                          icono="👑"
                          titulo="Ranking simuladores"
                          valor={
                            rankingAlumnoSimuladores.lugar > 0
                              ? `#${rankingAlumnoSimuladores.lugar}`
                              : "—"
                          }
                          descripcion={
                            rankingAlumnoSimuladores.total > 0
                              ? `de ${rankingAlumnoSimuladores.total} alumnos`
                              : "sin ranking disponible"
                          }
                          color="amber"
                        />
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <MetricCard
                          icono="⭐"
                          titulo="Mejor parcial"
                          valor={
                            resumenProgreso.mejorParcial
                              ? `${Number(
                                  resumenProgreso.mejorParcial.calificacion ??
                                    0
                                )}%`
                              : "—"
                          }
                          descripcion={
                            resumenProgreso.mejorParcial?.examen_nombre ??
                            "sin parciales"
                          }
                          color="violet"
                        />

                        <MetricCard
                          icono="🥇"
                          titulo="Ranking del parcial"
                          valor={
                            rankingAlumnoParcial.lugar > 0
                              ? `#${rankingAlumnoParcial.lugar}`
                              : "—"
                          }
                          descripcion={
                            rankingAlumnoParcial.total > 0
                              ? `de ${rankingAlumnoParcial.total} alumnos`
                              : "sin ranking disponible"
                          }
                          color="orange"
                        />

                        <MetricCard
                          href="/materias"
                          icono="📘"
                          titulo="Materias"
                          valor={totalMaterias > 0 ? totalMaterias : "—"}
                          descripcion={
                            totalMaterias > 0
                              ? "Ver materias disponibles"
                              : "materias no cargadas"
                          }
                          color="cyan"
                        />
                      </div>

                      {materiasDisponibles.length > 0 && (
                        <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-blue-600">
                                Materias disponibles
                              </p>

                              <h3 className="mt-1 text-xl font-semibold text-slate-900">
                                Elige una materia para continuar
                              </h3>
                            </div>

                            <Link
                              href="/materias"
                              className="text-sm font-bold text-blue-600 hover:text-blue-500"
                            >
                              Ver todas →
                            </Link>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {materiasDisponibles.map((materia) => (
                              <Link
                                key={materia.id}
                                href={`/materias/${materia.id}`}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                                    📘
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                                      {materia.nombre}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Abrir materia
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </section>
                      )}

                      {(resumenProgreso.areaFuerte ||
                        resumenProgreso.areaReforzar) && (
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          {resumenProgreso.areaFuerte && (
                            <AreaCard
                              tipo="fuerte"
                              titulo="Área más fuerte"
                              area={resumenProgreso.areaFuerte.area}
                              porcentaje={resumenProgreso.areaFuerte.promedio}
                              detalle="¡Sigue así! Estás por buen camino."
                            />
                          )}

                          {resumenProgreso.areaReforzar && (
                            <AreaCard
                              tipo="reforzar"
                              titulo="Área por reforzar"
                              area={resumenProgreso.areaReforzar.area}
                              porcentaje={
                                resumenProgreso.areaReforzar.promedio
                              }
                              detalle="¡Tú puedes mejorar! Sigue practicando."
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-6 grid gap-5 xl:grid-cols-2">
                        {resumenProgreso.historialSimuladores.length > 0 && (
                          <HistorialSimuladores
                            resultados={resumenProgreso.historialSimuladores}
                            obtenerPuntaje={obtenerPuntaje}
                            formatearTiempo={formatearTiempo}
                            formatearFecha={formatearFecha}
                          />
                        )}

                        {resumenProgreso.historialParciales.length > 0 && (
                          <HistorialParciales
                            resultados={resumenProgreso.historialParciales}
                            formatearTiempo={formatearTiempo}
                            formatearFecha={formatearFecha}
                          />
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            <aside className="order-4 space-y-5 xl:col-start-2 xl:row-start-2">
              <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 to-cyan-500 p-6 text-white shadow-sm">
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-blue-100">
                    Competencia académica
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold">
                    ¡Compite, mejora y alcanza la cima!
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-blue-50">
                    Cada intento te acerca a tu mejor versión.
                  </p>

                  <Link
                    href="/resultados"
                    className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  >
                    Ver ranking general →
                  </Link>
                </div>

                <div className="absolute bottom-6 right-6 text-7xl opacity-90">
                  🏆
                </div>

                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute right-10 top-10 h-5 w-5 rotate-12 rounded-md bg-yellow-300/70" />
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Consejo del día
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  La constancia es la clave del éxito. Pequeños esfuerzos cada
                  día te llevan a grandes resultados.
                </p>

                <div className="mt-5 flex items-end justify-center gap-2 rounded-3xl bg-blue-50 p-5">
                  <span className="text-5xl">🎓</span>
                  <span className="text-4xl">📚</span>
                  <span className="text-3xl">🌱</span>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </AlumnoProtegido>
  );
}

function AvatarAlumno({
  fotoPerfilUrl,
  iniciales,
  size = "md",
}: {
  fotoPerfilUrl: string;
  iniciales: string;
  size?: "sm" | "md" | "lg";
}) {
  const medidas = {
    sm: "h-11 w-11 text-sm",
    md: "h-14 w-14 text-base",
    lg: "h-16 w-16 text-xl",
  };

  if (fotoPerfilUrl) {
    return (
      <img
        src={fotoPerfilUrl}
        alt="Foto de perfil del alumno"
        className={`${medidas[size]} shrink-0 rounded-full object-cover ring-4 ring-blue-50`}
      />
    );
  }

  return (
    <div
      className={`${medidas[size]} flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white ring-4 ring-blue-50`}
    >
      {iniciales}
    </div>
  );
}

function MetricCard({
  icono,
  titulo,
  valor,
  descripcion,
  color,
  href,
}: {
  icono: string;
  titulo: string;
  valor: string | number;
  descripcion: string;
  color: "blue" | "violet" | "emerald" | "amber" | "orange" | "cyan";
  href?: string;
}) {
  const estilos = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
  };

  const contenido = (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
        {icono}
      </div>

      <div>
        <p className="text-sm font-bold">{titulo}</p>

        <p className="mt-2 text-3xl font-semibold text-slate-900">{valor}</p>

        <p className="mt-1 text-xs font-semibold">{descripcion}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${estilos[color]}`}
      >
        {contenido}
      </Link>
    );
  }

  return (
    <div className={`rounded-3xl border p-5 ${estilos[color]}`}>
      {contenido}
    </div>
  );
}

function AreaCard({
  tipo,
  titulo,
  area,
  porcentaje,
  detalle,
}: {
  tipo: "fuerte" | "reforzar";
  titulo: string;
  area: string;
  porcentaje: number;
  detalle: string;
}) {
  const esFuerte = tipo === "fuerte";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 ${
        esFuerte
          ? "border-emerald-100 bg-emerald-50"
          : "border-red-100 bg-red-50"
      }`}
    >
      <div className="relative z-10">
        <p
          className={`text-sm font-bold ${
            esFuerte ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {titulo}
        </p>

        <h3 className="mt-2 text-2xl font-semibold text-slate-900">{area}</h3>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full rounded-full ${
                esFuerte ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, porcentaje))}%`,
              }}
            />
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-black text-white ${
              esFuerte ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {porcentaje}%
          </span>
        </div>

        <p
          className={`mt-3 text-sm ${
            esFuerte ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {detalle}
        </p>
      </div>

      <div className="absolute bottom-5 right-6 text-6xl opacity-25">
        {esFuerte ? "🎯" : "🏋️"}
      </div>
    </div>
  );
}

function AvanceDetalle({
  texto,
  valor,
  detalle,
}: {
  texto: string;
  valor: number;
  detalle: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-700">{texto}</p>
          <p className="text-xs text-slate-500">{detalle}</p>
        </div>

        <p className="text-sm font-black text-slate-900">{valor}%</p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${Math.max(0, Math.min(100, valor))}%`,
          }}
        />
      </div>
    </div>
  );
}

function HistorialSimuladores({
  resultados,
  obtenerPuntaje,
  formatearTiempo,
  formatearFecha,
}: {
  resultados: ResultadoSimulador[];
  obtenerPuntaje: (resultado?: ResultadoSimulador | null) => number;
  formatearTiempo: (segundos?: number) => string;
  formatearFecha: (fecha?: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Últimos simuladores
          </h3>

          <p className="mt-1 text-xs text-slate-500">Tus últimos 5 intentos.</p>
        </div>

        <Link
          href="/resultados"
          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-600 shadow-sm"
        >
          Ver todos
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="px-5 py-3">Simulador</th>
              <th className="px-5 py-3">Puntaje</th>
              <th className="px-5 py-3">Tiempo</th>
              <th className="px-5 py-3">Fecha</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map((resultado) => (
              <tr
                key={resultado.id}
                className="border-t border-slate-100 text-sm"
              >
                <td className="px-5 py-3 font-semibold text-slate-700">
                  {resultado.examen_nombre}
                </td>

                <td className="px-5 py-3 font-bold text-blue-700">
                  {obtenerPuntaje(resultado)}
                  <span className="text-xs text-slate-400">
                    {" "}
                    / {PUNTAJE_MAXIMO}
                  </span>
                </td>

                <td className="px-5 py-3 text-slate-500">
                  {formatearTiempo(resultado.tiempo_usado_segundos)}
                </td>

                <td className="px-5 py-3 text-xs text-slate-500">
                  {formatearFecha(resultado.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistorialParciales({
  resultados,
  formatearTiempo,
  formatearFecha,
}: {
  resultados: ResultadoParcial[];
  formatearTiempo: (segundos?: number) => string;
  formatearFecha: (fecha?: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Últimos parciales
          </h3>

          <p className="mt-1 text-xs text-slate-500">Tus últimos 5 parciales.</p>
        </div>

        <Link
          href="/resultados"
          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-violet-600 shadow-sm"
        >
          Ver todos
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="px-5 py-3">Parcial</th>
              <th className="px-5 py-3">Calificación</th>
              <th className="px-5 py-3">Tiempo</th>
              <th className="px-5 py-3">Fecha</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map((resultado) => (
              <tr
                key={resultado.id}
                className="border-t border-slate-100 text-sm"
              >
                <td className="px-5 py-3 font-semibold text-slate-700">
                  {resultado.examen_nombre}
                </td>

                <td className="px-5 py-3 font-bold text-violet-700">
                  {Number(resultado.calificacion ?? 0)}%
                </td>

                <td className="px-5 py-3 text-slate-500">
                  {formatearTiempo(resultado.tiempo_usado_segundos)}
                </td>

                <td className="px-5 py-3 text-xs text-slate-500">
                  {formatearFecha(resultado.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}