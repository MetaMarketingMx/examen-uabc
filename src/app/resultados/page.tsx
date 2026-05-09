"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Resultado = {
  id: string | number;
  tipo: "Parcial" | "Simulador";
  examen_id: string;
  examen_nombre: string;
  alumno_id?: string;
  alumno_nombre?: string;
  total_preguntas?: number;
  correctas?: number;
  calificacion?: number;
  tiempo_limite_minutos?: number;
  tiempo_usado_segundos?: number;
  respuestas?: any;
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

export default function ResultadosPage() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "Parcial" | "Simulador">(
    "Todos"
  );
  const [resultadoDetalle, setResultadoDetalle] = useState<Resultado | null>(
    null
  );

  useEffect(() => {
    cargarResultados();
  }, []);

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
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
    const total = Number(segundos ?? 0);

    if (total <= 0) return "0:00";

    const minutos = Math.floor(total / 60);
    const seg = total % 60;

    return `${minutos}:${String(seg).padStart(2, "0")}`;
  }

  function calcularIncorrectas(resultado: Resultado) {
    const total = Number(resultado.total_preguntas ?? 0);
    const correctas = Number(resultado.correctas ?? 0);
    return Math.max(0, total - correctas);
  }

  function colorCalificacion(calificacion?: number) {
    const valor = Number(calificacion ?? 0);

    if (valor >= 80) return "text-green-300";
    if (valor >= 60) return "text-yellow-300";
    return "text-red-300";
  }

  async function cargarResultados() {
    setCargando(true);

    const [
      parcialesRes,
      simuladoresRes,
      catalogoParcialesRes,
      catalogoSimuladoresRes,
    ] = await Promise.all([
      supabase.from("resultados_parciales").select("*"),
      supabase.from("resultados_simuladores").select("*"),
      supabase.from("parciales").select("*"),
      supabase.from("simuladores").select("*"),
    ]);

    if (parcialesRes.error) {
      console.error("Error cargando resultados parciales:", parcialesRes.error);
    }

    if (simuladoresRes.error) {
      console.error("Error cargando resultados simuladores:", simuladoresRes.error);
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
          tipo: "Parcial",
          examen_id: examenId,
          examen_nombre: parcialesCatalogo.get(examenId) || `Parcial ${examenId}`,
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
          tipo: "Simulador",
          examen_id: examenId,
          examen_nombre:
            simuladoresCatalogo.get(examenId) || `Simulador ${examenId}`,
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

    const unidos = [...resultadosParciales, ...resultadosSimuladores].sort(
      (a, b) => {
        const fechaA = new Date(a.created_at ?? 0).getTime();
        const fechaB = new Date(b.created_at ?? 0).getTime();
        return fechaB - fechaA;
      }
    );

    setResultados(unidos);
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
        String(resultado.calificacion ?? "").includes(texto);

      return coincideTipo && coincideTexto;
    });
  }, [resultados, busqueda, filtroTipo]);

  const resumen = useMemo(() => {
    const total = resultadosFiltrados.length;

    const promedio =
      total > 0
        ? Math.round(
            resultadosFiltrados.reduce(
              (sum, item) => sum + Number(item.calificacion ?? 0),
              0
            ) / total
          )
        : 0;

    const aprobados = resultadosFiltrados.filter(
      (item) => Number(item.calificacion ?? 0) >= 60
    ).length;

    return { total, promedio, aprobados };
  }, [resultadosFiltrados]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
              Plataforma académica
            </p>

            <h1 className="mt-2 text-2xl font-bold">Examen UABC</h1>
          </div>

          <nav className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Inicio
            </Link>

            <Link
              href="/panel-alumno"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Panel del alumno
            </Link>

            <Link
              href="/materias"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Materias
            </Link>

            <Link
              href="/simuladores"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Simuladores
            </Link>

            <Link
              href="/resultados"
              className="rounded-xl border border-blue-700 bg-blue-950/40 px-4 py-2 font-semibold text-blue-300"
            >
              Resultados
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
            Resultados
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Resultados de parciales y simuladores
          </h2>

          <p className="mt-3 max-w-3xl text-slate-300">
            Consulta calificaciones, tiempo usado, fecha de entrega y respuestas completas.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Intentos registrados</p>
            <p className="mt-2 text-4xl font-black text-white">{resumen.total}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Promedio</p>
            <p className="mt-2 text-4xl font-black text-blue-300">
              {resumen.promedio}%
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Aprobados ≥ 60%</p>
            <p className="mt-2 text-4xl font-black text-green-300">
              {resumen.aprobados}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por alumno, examen o calificación"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            />

            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(e.target.value as "Todos" | "Parcial" | "Simulador")
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="Parcial">Parciales</option>
              <option value="Simulador">Simuladores</option>
            </select>

            <button
              type="button"
              onClick={cargarResultados}
              className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Actualizar
            </button>
          </div>
        </div>

        {cargando && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-300">
            Cargando resultados...
          </div>
        )}

        {!cargando && resultadosFiltrados.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
            <h3 className="text-2xl font-bold">Todavía no hay resultados</h3>

            <p className="mt-3 text-slate-400">
              Cuando un alumno termine un parcial o simulador, aparecerá aquí.
            </p>
          </div>
        )}

        {!cargando && resultadosFiltrados.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-950 text-sm text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Examen</th>
                    <th className="px-5 py-4">Alumno</th>
                    <th className="px-5 py-4">Calificación</th>
                    <th className="px-5 py-4">Correctas</th>
                    <th className="px-5 py-4">Incorrectas</th>
                    <th className="px-5 py-4">Tiempo usado</th>
                    <th className="px-5 py-4">Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {resultadosFiltrados.map((resultado) => (
                    <tr
                      key={resultado.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatearFecha(resultado.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            resultado.tipo === "Parcial"
                              ? "bg-yellow-950 text-yellow-300"
                              : "bg-cyan-950 text-cyan-300"
                          }`}
                        >
                          {resultado.tipo}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {resultado.examen_nombre}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {resultado.alumno_nombre || "Alumno sin nombre"}
                      </td>

                      <td
                        className={`px-5 py-4 text-2xl font-black ${colorCalificacion(
                          resultado.calificacion
                        )}`}
                      >
                        {Number(resultado.calificacion ?? 0)}%
                      </td>

                      <td className="px-5 py-4 text-green-300">
                        {resultado.correctas ?? 0}
                      </td>

                      <td className="px-5 py-4 text-red-300">
                        {calcularIncorrectas(resultado)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatearTiempo(resultado.tiempo_usado_segundos)}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setResultadoDetalle(resultado)}
                          className="rounded-xl border border-blue-700 px-4 py-2 font-semibold text-blue-300 hover:bg-blue-950"
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
                  Detalle del resultado
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {resultadoDetalle.examen_nombre}
                </h3>

                <p className="mt-2 text-slate-400">
                  {resultadoDetalle.alumno_nombre || "Alumno sin nombre"} ·{" "}
                  {formatearFecha(resultadoDetalle.created_at)}
                </p>

                <p
                  className={`mt-3 text-4xl font-black ${colorCalificacion(
                    resultadoDetalle.calificacion
                  )}`}
                >
                  {Number(resultadoDetalle.calificacion ?? 0)}%
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResultadoDetalle(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Total</p>
                <p className="mt-1 text-2xl font-bold">
                  {resultadoDetalle.total_preguntas ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Correctas</p>
                <p className="mt-1 text-2xl font-bold text-green-300">
                  {resultadoDetalle.correctas ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Incorrectas</p>
                <p className="mt-1 text-2xl font-bold text-red-300">
                  {calcularIncorrectas(resultadoDetalle)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Tiempo usado</p>
                <p className="mt-1 text-2xl font-bold text-blue-300">
                  {formatearTiempo(resultadoDetalle.tiempo_usado_segundos)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Entregado</p>
                <p className="mt-1 text-lg font-bold text-slate-200">
                  {formatearFecha(resultadoDetalle.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {parsearRespuestas(resultadoDetalle.respuestas).length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
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
                      className={`rounded-2xl border p-5 ${
                        respuesta.correcta
                          ? "border-green-700 bg-green-950/20"
                          : "border-red-700 bg-red-950/20"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="w-full">
                          <p className="text-sm font-bold text-slate-300">
                            Pregunta {respuesta.numero ?? index + 1}
                          </p>

                          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                            <ContenidoHtml html={respuesta.pregunta} />
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            respuesta.correcta
                              ? "bg-green-900 text-green-200"
                              : "bg-red-900 text-red-200"
                          }`}
                        >
                          {respuesta.correcta ? "Correcta" : "Incorrecta"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {opciones.length === 0 && (
                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                            Este resultado fue guardado antes de agregar el detalle
                            completo de opciones. Para ver opciones A, B, C y D,
                            realiza un nuevo intento.
                          </div>
                        )}

                        {opciones.map((opcion: any) => {
                          const esRespuestaAlumno =
                            String(respuesta.respuesta_alumno ?? "").toUpperCase() ===
                            String(opcion.clave ?? "").toUpperCase();

                          const esRespuestaCorrecta =
                            String(respuesta.respuesta_correcta ?? "").toUpperCase() ===
                            String(opcion.clave ?? "").toUpperCase();

                          let clase = "border-slate-800 bg-slate-950 text-slate-200";

                          if (esRespuestaCorrecta) {
                            clase = "border-green-700 bg-green-950/30 text-green-100";
                          }

                          if (esRespuestaAlumno && !esRespuestaCorrecta) {
                            clase = "border-red-700 bg-red-950/30 text-red-100";
                          }

                          return (
                            <div
                              key={opcion.clave}
                              className={`rounded-2xl border p-4 ${clase}`}
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <p className="font-black">Opción {opcion.clave}</p>

                                {esRespuestaAlumno && (
                                  <span className="rounded-full bg-blue-900 px-2 py-1 text-xs font-bold text-blue-200">
                                    Respuesta del alumno
                                  </span>
                                )}

                                {esRespuestaCorrecta && (
                                  <span className="rounded-full bg-green-900 px-2 py-1 text-xs font-bold text-green-200">
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
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-sm text-slate-400">
                            Respuesta del alumno
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {respuesta.respuesta_alumno || "Sin responder"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-sm text-slate-400">
                            Respuesta correcta
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-300">
                            {respuesta.respuesta_correcta || "No registrada"}
                          </p>
                        </div>
                      </div>

                      {respuesta.explicacion && (
                        <div className="mt-5 rounded-2xl border border-yellow-700/40 bg-yellow-950/20 p-4">
                          <p className="font-bold text-yellow-300">Explicación</p>

                          <p className="mt-2 text-slate-200">
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