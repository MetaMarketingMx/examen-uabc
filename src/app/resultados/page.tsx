"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

type Resultado = {
  id: string | number;
  id_original?: string | number;
  tipo: "Parcial" | "Simulador";
  examen_id: string;
  examen_nombre: string;
  alumno_id?: string;
  alumno_nombre?: string;
  total_preguntas?: number;
  correctas?: number;
  calificacion?: number;
  puntaje_1300?: number;
  promedio_general?: number;
  aciertos_para_puntaje?: number;
  tiempo_limite_minutos?: number;
  tiempo_usado_segundos?: number;
  respuestas?: any;
  resumen_areas?: any;
  created_at?: string;
};

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  [key: string]: any;
};

type FiltroTipo = "Todos" | "Parcial" | "Simulador";

const ACIERTOS_MAXIMOS_PUNTAJE = 105;
const PUNTAJE_MAXIMO = 1300;

export default function ResultadosPage() {
  const [simuladorParam, setSimuladorParam] = useState<
    string | null | undefined
  >(undefined);
  const [resultadoParam, setResultadoParam] = useState<string | null>(null);
  const [volverParam, setVolverParam] = useState<string | null>(null);

  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("Todos");
  const [resultadoDetalle, setResultadoDetalle] = useState<Resultado | null>(
    null
  );
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setSimuladorParam(params.get("simulador"));
    setResultadoParam(params.get("resultado"));
    setVolverParam(params.get("volver"));
  }, []);

  useEffect(() => {
    if (simuladorParam === undefined) return;

    cargarResultados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simuladorParam, resultadoParam]);

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

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";

    return String(
      item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`
    );
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

  function extraerAtributo(etiqueta: string, atributo: string) {
    const regex = new RegExp(`${atributo}\\s*=\\s*["']([^"']+)["']`, "i");
    const resultado = etiqueta.match(regex);
    return resultado?.[1] ?? "";
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

  function parsearRespuestas(respuestas: any): any[] {
    if (!respuestas) return [];

    if (Array.isArray(respuestas)) {
      return respuestas;
    }

    if (typeof respuestas === "string") {
      try {
        const parsed = JSON.parse(respuestas);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function parsearResumenAreas(resumen: any): any[] {
    if (!resumen) return [];

    if (Array.isArray(resumen)) return resumen;

    if (typeof resumen === "string") {
      try {
        const parsed = JSON.parse(resumen);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
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

  function calcularIncorrectas(resultado: Resultado) {
    const total = Number(resultado.total_preguntas ?? 0);
    const correctas = Number(resultado.correctas ?? 0);
    return Math.max(0, total - correctas);
  }

  function obtenerPuntaje(resultado?: Resultado | null) {
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

  function obtenerResultadoPrincipal(resultado: Resultado) {
    if (resultado.tipo === "Simulador") {
      return `${obtenerPuntaje(resultado)} / ${PUNTAJE_MAXIMO} puntos`;
    }

    return `${Number(resultado.calificacion ?? 0)}%`;
  }

  function obtenerEtiquetaResultado(resultado: Resultado) {
    if (resultado.tipo === "Simulador") return "Puntaje";
    return "Calificación";
  }

  function colorResultado(resultado: Resultado) {
    if (resultado.tipo === "Simulador") {
      const puntaje = obtenerPuntaje(resultado);

      if (puntaje >= 1000) return "text-emerald-700";
      if (puntaje >= 700) return "text-amber-700";
      return "text-red-700";
    }

    const valor = Number(resultado.calificacion ?? 0);

    if (valor >= 80) return "text-emerald-700";
    if (valor >= 60) return "text-amber-700";
    return "text-red-700";
  }

  function claseBadgeTipo(tipo: "Parcial" | "Simulador") {
    if (tipo === "Simulador") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  function cerrarDetalle() {
    if (volverParam === "simuladores") {
      if (typeof window !== "undefined") {
        window.location.href = "/simuladores";
      }

      return;
    }

    setResultadoDetalle(null);
  }

  async function cargarResultados() {
    setCargando(true);
    setResultadoDetalle(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const admin = detectarAdmin(user);

    setEsAdmin(admin);

    let consultaParciales = supabase
      .from("resultados_parciales")
      .select("*")
      .order("created_at", { ascending: false });

    let consultaSimuladores = supabase
      .from("resultados_simuladores")
      .select("*")
      .order("created_at", { ascending: false });

    if (user?.id && !admin) {
      consultaParciales = consultaParciales.eq("alumno_id", user.id);
      consultaSimuladores = consultaSimuladores.eq("alumno_id", user.id);
    }

    const [
      parcialesRes,
      simuladoresRes,
      catalogoParcialesRes,
      catalogoSimuladoresRes,
    ] = await Promise.all([
      consultaParciales,
      consultaSimuladores,
      supabase.from("parciales").select("*"),
      supabase.from("simuladores").select("*"),
    ]);

    if (parcialesRes.error) {
      console.error("Error cargando resultados parciales:", parcialesRes.error);
    }

    if (simuladoresRes.error) {
      console.error(
        "Error cargando resultados simuladores:",
        simuladoresRes.error
      );
    }

    const parcialesCatalogo = new Map<string, string>();
    const simuladoresCatalogo = new Map<string, string>();

    (catalogoParcialesRes.data ?? []).forEach((item: Registro) => {
      parcialesCatalogo.set(String(item.id), obtenerTitulo(item));
    });

    (catalogoSimuladoresRes.data ?? []).forEach((item: Registro) => {
      simuladoresCatalogo.set(String(item.id), obtenerTitulo(item));
    });

    const resultadosParciales: Resultado[] = (parcialesRes.data ?? []).map(
      (item: any) => {
        const examenId = String(item.parcial_id ?? "");

        return {
          id: `parcial-${item.id}`,
          id_original: item.id,
          tipo: "Parcial",
          examen_id: examenId,
          examen_nombre:
            parcialesCatalogo.get(examenId) || `Parcial ${examenId}`,
          alumno_id: item.alumno_id,
          alumno_nombre: item.alumno_nombre || "Alumno sin nombre",
          total_preguntas: item.total_preguntas ?? 0,
          correctas: item.correctas ?? 0,
          calificacion: Number(item.calificacion ?? 0),
          tiempo_limite_minutos: item.tiempo_limite_minutos ?? 0,
          tiempo_usado_segundos: item.tiempo_usado_segundos ?? 0,
          respuestas: item.respuestas,
          created_at: item.created_at,
        };
      }
    );

    const resultadosSimuladores: Resultado[] = (simuladoresRes.data ?? []).map(
      (item: any) => {
        const examenId = String(item.simulador_id ?? "");

        return {
          id: `simulador-${item.id}`,
          id_original: item.id,
          tipo: "Simulador",
          examen_id: examenId,
          examen_nombre:
            simuladoresCatalogo.get(examenId) || `Simulador ${examenId}`,
          alumno_id: item.alumno_id,
          alumno_nombre: item.alumno_nombre || "Alumno sin nombre",
          total_preguntas: item.total_preguntas ?? 0,
          correctas: item.correctas ?? 0,
          calificacion: Number(item.calificacion ?? 0),
          puntaje_1300: Number(item.puntaje_1300 ?? 0),
          promedio_general: Number(item.promedio_general ?? 0),
          aciertos_para_puntaje: Number(item.aciertos_para_puntaje ?? 0),
          tiempo_limite_minutos: item.tiempo_limite_minutos ?? 0,
          tiempo_usado_segundos: item.tiempo_usado_segundos ?? 0,
          respuestas: item.respuestas,
          resumen_areas: item.resumen_areas,
          created_at: item.created_at,
        };
      }
    );

    const unidos = [...resultadosParciales, ...resultadosSimuladores].sort(
      (a, b) => {
        const fechaA = new Date(a.created_at ?? 0).getTime();
        const fechaB = new Date(b.created_at ?? 0).getTime();
        return fechaB - fechaA;
      }
    );

    setResultados(unidos);

    if (resultadoParam) {
      const resultadoExacto = unidos.find(
        (resultado) =>
          String(resultado.id) === String(resultadoParam) ||
          String(resultado.id_original) === String(resultadoParam)
      );

      if (resultadoExacto) {
        setFiltroTipo(resultadoExacto.tipo);
        setBusqueda("");
        setResultadoDetalle(resultadoExacto);
        setCargando(false);
        return;
      }
    }

    if (simuladorParam) {
      const resultadoDelSimulador = unidos.find(
        (resultado) =>
          resultado.tipo === "Simulador" &&
          String(resultado.examen_id) === String(simuladorParam)
      );

      if (resultadoDelSimulador) {
        setFiltroTipo("Simulador");
        setBusqueda("");
        setResultadoDetalle(resultadoDelSimulador);
      }
    }

    setCargando(false);
  }

  const resultadosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return resultados.filter((resultado) => {
      const coincideTipo =
        filtroTipo === "Todos" || resultado.tipo === filtroTipo;

      const coincideTexto =
        !texto ||
        resultado.examen_nombre.toLowerCase().includes(texto) ||
        String(resultado.alumno_nombre ?? "").toLowerCase().includes(texto) ||
        String(resultado.calificacion ?? "").includes(texto) ||
        String(obtenerPuntaje(resultado)).includes(texto);

      return coincideTipo && coincideTexto;
    });
  }, [resultados, busqueda, filtroTipo]);

  const resumen = useMemo(() => {
    const total = resultadosFiltrados.length;

    const totalSimuladores = resultadosFiltrados.filter(
      (item) => item.tipo === "Simulador"
    ).length;

    const totalParciales = resultadosFiltrados.filter(
      (item) => item.tipo === "Parcial"
    ).length;

    const simuladores = resultadosFiltrados.filter(
      (item) => item.tipo === "Simulador"
    );

    const mejorPuntaje =
      simuladores.length > 0
        ? Math.max(...simuladores.map((item) => obtenerPuntaje(item)))
        : 0;

    return {
      total,
      totalSimuladores,
      totalParciales,
      mejorPuntaje,
    };
  }, [resultadosFiltrados]);

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Intentos registrados
              </p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {resumen.total}
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm font-bold text-blue-700">Simuladores</p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {resumen.totalSimuladores}
              </p>
            </div>

            <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
              <p className="text-sm font-bold text-violet-700">Parciales</p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {resumen.totalParciales}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm font-bold text-emerald-700">
                Mejor puntaje
              </p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {resumen.mejorPuntaje}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                sobre {PUNTAJE_MAXIMO}
              </p>
            </div>
          </div>

          {esAdmin && (
            <div className="mb-6 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              Vista de administrador: se muestran resultados de todos los
              alumnos.
            </div>
          )}

          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["Todos", "Simulador", "Parcial"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFiltroTipo(tipo)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      filtroTipo === tipo
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tipo === "Todos"
                      ? "Todos"
                      : tipo === "Simulador"
                      ? "Simuladores"
                      : "Parciales"}
                  </button>
                ))}
              </div>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por alumno, examen o puntaje..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 xl:w-80"
              />
            </div>
          </div>

          {cargando && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
              Cargando resultados...
            </div>
          )}

          {!cargando && resultadosFiltrados.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black">Todavía no hay resultados</h2>

              <p className="mt-3 text-slate-600">
                Cuando un alumno termine un parcial o simulador, aparecerá aquí.
              </p>
            </div>
          )}

          {!cargando && resultadosFiltrados.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Fecha</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4">Examen</th>
                      <th className="px-5 py-4">Alumno</th>
                      <th className="px-5 py-4">Resultado</th>
                      <th className="px-5 py-4">Aciertos</th>
                      <th className="px-5 py-4">Incorrectas</th>
                      <th className="px-5 py-4">Tiempo usado</th>
                      <th className="px-5 py-4">Detalle</th>
                    </tr>
                  </thead>

                  <tbody>
                    {resultadosFiltrados.map((resultado) => (
                      <tr
                        key={resultado.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatearFecha(resultado.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${claseBadgeTipo(
                              resultado.tipo
                            )}`}
                          >
                            {resultado.tipo}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {resultado.examen_nombre}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {resultado.alumno_nombre || "Alumno sin nombre"}
                        </td>

                        <td
                          className={`px-5 py-4 text-xl font-black ${colorResultado(
                            resultado
                          )}`}
                        >
                          <p>{obtenerResultadoPrincipal(resultado)}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {obtenerEtiquetaResultado(resultado)}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {resultado.correctas ?? 0} de{" "}
                          {resultado.total_preguntas ?? 0}
                        </td>

                        <td className="px-5 py-4 font-bold text-red-700">
                          {calcularIncorrectas(resultado)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatearTiempo(resultado.tiempo_usado_segundos)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setResultadoDetalle(resultado)}
                            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {resultadoDetalle && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
                    Detalle del resultado
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-900">
                    {resultadoDetalle.examen_nombre}
                  </h2>

                  <p className="mt-2 text-slate-600">
                    {resultadoDetalle.alumno_nombre || "Alumno sin nombre"} ·{" "}
                    {formatearFecha(resultadoDetalle.created_at)}
                  </p>

                  <p
                    className={`mt-4 text-4xl font-black ${colorResultado(
                      resultadoDetalle
                    )}`}
                  >
                    {obtenerResultadoPrincipal(resultadoDetalle)}
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {obtenerEtiquetaResultado(resultadoDetalle)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarDetalle}
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-5">
                {resultadoDetalle.tipo === "Simulador" && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-700">Puntaje</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {obtenerPuntaje(resultadoDetalle)}
                    </p>
                    <p className="text-xs font-bold text-blue-700">
                      sobre {PUNTAJE_MAXIMO}
                    </p>
                  </div>
                )}

                {resultadoDetalle.tipo === "Parcial" && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-sm font-bold text-violet-700">
                      Calificación
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {Number(resultadoDetalle.calificacion ?? 0)}%
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {resultadoDetalle.total_preguntas ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-700">
                    Correctas
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {resultadoDetalle.correctas ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">Incorrectas</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {calcularIncorrectas(resultadoDetalle)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-500">
                    Tiempo usado
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {formatearTiempo(resultadoDetalle.tiempo_usado_segundos)}
                  </p>
                </div>
              </div>

              {resultadoDetalle.tipo === "Simulador" &&
                parsearResumenAreas(resultadoDetalle.resumen_areas).length >
                  0 && (
                  <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-black text-slate-900">
                      Desglose por área
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {parsearResumenAreas(resultadoDetalle.resumen_areas).map(
                        (area: any, index: number) => (
                          <div
                            key={`${area.area ?? "area"}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <p className="text-sm font-bold text-blue-700">
                              {area.area ?? "Área"}
                            </p>

                            <p className="mt-2 text-2xl font-black text-slate-900">
                              {area.correctas ?? 0} de{" "}
                              {area.total_preguntas ?? 0}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {area.promedio ?? 0}% de acierto
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

              <div className="mt-8 space-y-4">
                {parsearRespuestas(resultadoDetalle.respuestas).length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                    Este resultado no tiene detalle de respuestas guardado.
                  </div>
                )}

                {parsearRespuestas(resultadoDetalle.respuestas).map(
                  (respuesta: any, index) => {
                    const opciones = Array.isArray(respuesta.opciones)
                      ? respuesta.opciones
                      : [];

                    return (
                      <article
                        key={`${respuesta.pregunta_id ?? index}`}
                        className={`rounded-3xl border p-5 ${
                          respuesta.correcta
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="w-full">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-slate-700">
                                Pregunta {respuesta.numero ?? index + 1}
                              </p>

                              {respuesta.area && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                  {respuesta.area}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                              <ContenidoHtml html={respuesta.pregunta} />
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${
                              respuesta.correcta
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {respuesta.correcta ? "Correcta" : "Incorrecta"}
                          </span>
                        </div>

                        <div className="mt-5 space-y-3">
                          {opciones.length === 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
                              Este resultado fue guardado antes de agregar el
                              detalle completo de opciones. Para ver opciones A,
                              B, C y D, realiza un nuevo intento.
                            </div>
                          )}

                          {opciones.map((opcion: any) => {
                            const esRespuestaAlumno =
                              String(
                                respuesta.respuesta_alumno ?? ""
                              ).toUpperCase() ===
                              String(opcion.clave ?? "").toUpperCase();

                            const esRespuestaCorrecta =
                              String(
                                respuesta.respuesta_correcta ?? ""
                              ).toUpperCase() ===
                              String(opcion.clave ?? "").toUpperCase();

                            let clase =
                              "border-slate-200 bg-white text-slate-700";

                            if (esRespuestaCorrecta) {
                              clase =
                                "border-emerald-300 bg-emerald-50 text-emerald-900";
                            }

                            if (esRespuestaAlumno && !esRespuestaCorrecta) {
                              clase = "border-red-300 bg-red-50 text-red-900";
                            }

                            return (
                              <div
                                key={opcion.clave}
                                className={`rounded-2xl border p-4 ${clase}`}
                              >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <p className="font-black">
                                    Opción {opcion.clave}
                                  </p>

                                  {esRespuestaAlumno && (
                                    <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                                      Respuesta del alumno
                                    </span>
                                  )}

                                  {esRespuestaCorrecta && (
                                    <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                                      Respuesta correcta
                                    </span>
                                  )}
                                </div>

                                <ContenidoHtml html={opcion.contenido} />
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-bold text-slate-500">
                              Respuesta del alumno
                            </p>

                            <p className="mt-1 text-xl font-black text-slate-900">
                              {respuesta.respuesta_alumno || "Sin responder"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-bold text-slate-500">
                              Respuesta correcta
                            </p>

                            <p className="mt-1 text-xl font-black text-emerald-700">
                              {respuesta.respuesta_correcta || "No registrada"}
                            </p>
                          </div>
                        </div>

                        {respuesta.explicacion && (
                          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="font-black text-amber-800">
                              Explicación
                            </p>

                            <p className="mt-2 text-slate-700">
                              {respuesta.explicacion}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

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
            font-weight: 800;
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
            font-weight: 800;
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