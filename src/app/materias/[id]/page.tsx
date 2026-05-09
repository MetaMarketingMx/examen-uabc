"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  [key: string]: any;
};

type SubtemaPlano = {
  temaId: string;
  temaTitulo: string;
  subtemaId: string;
  subtemaTitulo: string;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_CONTENIDO = "contenido_subtemas";
const TABLA_PARCIALES = "parciales";

export default function MateriaAlumnoPage() {
  const params = useParams();
  const rawId = params?.id;
  const materiaId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const [materia, setMateria] = useState<Registro | null>(null);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [subtemasPorTema, setSubtemasPorTema] = useState<Record<string, Registro[]>>({});
  const [contenidosPorSubtema, setContenidosPorSubtema] = useState<Record<string, Registro[]>>({});
  const [parcialesPorTema, setParcialesPorTema] = useState<Record<string, Registro[]>>({});

  const [temaActivoId, setTemaActivoId] = useState("");
  const [subtemaActivoId, setSubtemaActivoId] = useState("");

  const [completados, setCompletados] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [origen, setOrigen] = useState("");

  const storageKey = `avance-materia-${materiaId}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigen(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!materiaId) return;
    cargarAvanceLocal();
    cargarTodo();
  }, [materiaId]);

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
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
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
          nuevoContenidosPorSubtema[idSubtema] = ordenarLista(contenidosData ?? []);
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

    const primerTema = temasOrdenados[0];
    const primerosSubtemas = primerTema
      ? nuevoSubtemasPorTema[String(primerTema.id)] ?? []
      : [];
    const primerSubtema = primerosSubtemas[0];

    setTemaActivoId(primerTema ? String(primerTema.id) : "");
    setSubtemaActivoId(primerSubtema ? String(primerSubtema.id) : "");

    setCargando(false);
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
    return subtemasPlanos.findIndex((item) => item.subtemaId === subtemaActivoId);
  }, [subtemasPlanos, subtemaActivoId]);

  const totalSubtemas = subtemasPlanos.length;

  const totalCompletados = useMemo(() => {
    return subtemasPlanos.filter((item) => completados[item.subtemaId]).length;
  }, [subtemasPlanos, completados]);

  const porcentajeAvance =
    totalSubtemas > 0 ? Math.round((totalCompletados / totalSubtemas) * 100) : 0;

  function calcularAvanceTema(idTema: string) {
    const subtemas = subtemasPorTema[idTema] ?? [];
    const total = subtemas.length;
    const completadosTema = subtemas.filter((subtema) => completados[String(subtema.id)]).length;
    const porcentaje = total > 0 ? Math.round((completadosTema / total) * 100) : 0;

    return {
      total,
      completados: completadosTema,
      porcentaje,
    };
  }

  const subtemaActivo = useMemo(() => {
    if (!temaActivoId || !subtemaActivoId) return null;

    const subtemas = subtemasPorTema[temaActivoId] ?? [];
    return subtemas.find((subtema) => String(subtema.id) === subtemaActivoId) ?? null;
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
    return String(bloque.archivo_url ?? bloque.material_url ?? bloque.documento_url ?? "");
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
          className="aspect-video w-full rounded-2xl border border-slate-700 bg-black"
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
        className="w-full rounded-2xl border border-slate-700 bg-black"
        src={url}
        controls
      />
    );
  }

  function seleccionarSubtema(idTema: string, idSubtema: string) {
    setTemaActivoId(idTema);
    setSubtemaActivoId(idSubtema);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irAnterior() {
    if (indiceActivo <= 0) return;

    const anterior = subtemasPlanos[indiceActivo - 1];
    seleccionarSubtema(anterior.temaId, anterior.subtemaId);
  }

  function irSiguiente() {
    if (indiceActivo === -1 || indiceActivo >= subtemasPlanos.length - 1) return;

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

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">Cargando contenido...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
            Materia
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {materia ? obtenerTitulo(materia) : "Materia"}
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Selecciona un tema y después un subtema para estudiar el contenido.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="font-semibold text-white">Avance de la materia</p>
              <p className="text-sm text-slate-300">
                {totalCompletados} de {totalSubtemas} subtemas completados — {porcentajeAvance}%
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${porcentajeAvance}%` }}
              />
            </div>
          </div>
        </header>

        {temas.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">Todavía no hay temas</h2>
            <p className="mt-2 text-slate-400">
              Cuando agregues temas, subtemas, contenido y parciales desde el panel admin, aparecerán aquí.
            </p>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <h2 className="mb-4 text-xl font-bold">Temario y avance</h2>

              <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Total</p>
                  <p className="text-xs text-slate-300">{porcentajeAvance}%</p>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${porcentajeAvance}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {totalCompletados} de {totalSubtemas} subtemas completados
                </p>
              </div>

              <div className="space-y-4">
                {temas.map((tema) => {
                  const idTema = String(tema.id);
                  const subtemas = subtemasPorTema[idTema] ?? [];
                  const parcialesTema = parcialesPorTema[idTema] ?? [];
                  const temaActivo = temaActivoId === idTema;
                  const avanceTema = calcularAvanceTema(idTema);

                  return (
                    <div
                      key={tema.id}
                      className={`rounded-2xl border p-4 ${
                        temaActivo
                          ? "border-blue-700 bg-slate-950"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTemaActivoId(idTema);
                          if (subtemas[0]) {
                            setSubtemaActivoId(String(subtemas[0].id));
                          } else {
                            setSubtemaActivoId("");
                          }
                        }}
                        className={`w-full text-left font-semibold ${
                          temaActivo ? "text-blue-300" : "text-white"
                        }`}
                      >
                        {obtenerTitulo(tema)}
                      </button>

                      <div className="mt-3 rounded-xl bg-slate-900 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-400">
                            {avanceTema.completados} de {avanceTema.total} completados
                          </p>
                          <p className="text-xs font-semibold text-slate-300">
                            {avanceTema.porcentaje}%
                          </p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${avanceTema.porcentaje}%` }}
                          />
                        </div>
                      </div>

                      {subtemas.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
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
                                onClick={() => seleccionarSubtema(idTema, idSubtema)}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                                  activo
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                                }`}
                              >
                                <span>{obtenerTitulo(subtema)}</span>

                                <span
                                  className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${
                                    completado
                                      ? "bg-green-600 text-white"
                                      : "bg-slate-800 text-slate-500"
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
                        <div className="mt-4 rounded-xl border border-yellow-600/40 bg-yellow-950/30 p-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                            Parcial de la unidad
                          </p>

                          <div className="mt-2 space-y-2">
                            {parcialesTema.map((parcial) => (
                              <Link
                                key={parcial.id}
                                href={`/parciales/${parcial.id}`}
                                className="block rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-yellow-200 hover:bg-slate-900"
                              >
                                {obtenerTitulo(parcial)} →
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              {!subtemaActivo ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
                  <h2 className="text-2xl font-bold">Selecciona un subtema</h2>
                  <p className="mt-2 text-slate-400">
                    El contenido aparecerá en esta sección.
                  </p>

                  {parcialesDelTemaActivo.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-yellow-600/40 bg-yellow-950/30 p-5">
                      <p className="text-sm font-bold uppercase tracking-wider text-yellow-300">
                        Parcial disponible
                      </p>

                      <h3 className="mt-2 text-2xl font-bold text-white">
                        Parcial de la unidad
                      </h3>

                      <div className="mt-4 space-y-3">
                        {parcialesDelTemaActivo.map((parcial) => (
                          <Link
                            key={parcial.id}
                            href={`/parciales/${parcial.id}`}
                            className="inline-flex rounded-xl bg-yellow-500 px-5 py-3 font-bold text-slate-950 hover:bg-yellow-400"
                          >
                            Iniciar {obtenerTitulo(parcial)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm uppercase tracking-[0.25em] text-blue-300">
                      Subtema
                    </p>

                    <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-3xl font-bold">
                          {obtenerTitulo(subtemaActivo)}
                        </h2>

                        {indiceActivo >= 0 && (
                          <p className="mt-2 text-sm text-slate-400">
                            Subtema {indiceActivo + 1} de {totalSubtemas}
                          </p>
                        )}
                      </div>

                      <div>
                        {subtemaEstaCompletado ? (
                          <button
                            type="button"
                            onClick={quitarCompletado}
                            className="rounded-xl border border-green-700 bg-green-950 px-4 py-3 font-semibold text-green-300 hover:bg-green-900"
                          >
                            Completado ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={marcarCompletado}
                            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500"
                          >
                            Marcar como completado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {contenidosActivos.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
                      <h3 className="text-xl font-bold">Sin contenido todavía</h3>
                      <p className="mt-2 text-slate-400">
                        Agrega texto, video, imagen o material desde el panel admin.
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
                            className="rounded-3xl border border-slate-800 bg-slate-950 p-6"
                          >
                            {texto && (
                              <div
                                className="mb-6 rounded-2xl bg-slate-900 p-6 leading-relaxed text-white"
                                dangerouslySetInnerHTML={{ __html: texto }}
                              />
                            )}

                            {video && (
                              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                                <p className="mb-3 text-sm font-semibold text-blue-300">
                                  Video
                                </p>
                                {renderVideo(video)}
                              </div>
                            )}

                            {imagen && (
                              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                                <p className="mb-3 text-sm font-semibold text-blue-300">
                                  Imagen
                                </p>
                                <img
                                  src={imagen}
                                  alt="Imagen del contenido"
                                  className="max-h-[520px] w-full rounded-2xl object-contain"
                                />
                              </div>
                            )}

                            {archivo && (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                                <p className="mb-3 text-sm font-semibold text-blue-300">
                                  Material descargable
                                </p>
                                <a
                                  href={archivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
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

                  {esUltimoSubtemaDelTema && parcialesDelTemaActivo.length > 0 && (
                    <div className="mt-8 rounded-3xl border border-yellow-600/40 bg-yellow-950/30 p-6">
                      <p className="text-sm font-bold uppercase tracking-wider text-yellow-300">
                        Fin de la unidad
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-white">
                        Parcial de la unidad
                      </h3>

                      <p className="mt-3 text-slate-300">
                        Ya terminaste los subtemas de esta unidad. Ahora puedes realizar el parcial correspondiente.
                      </p>

                      <div className="mt-5 space-y-3">
                        {parcialesDelTemaActivo.map((parcial) => (
                          <div
                            key={parcial.id}
                            className="rounded-2xl border border-yellow-600/30 bg-slate-950 p-5"
                          >
                            <h4 className="text-xl font-bold text-white">
                              {obtenerTitulo(parcial)}
                            </h4>

                            {obtenerDescripcion(parcial) && (
                              <p className="mt-2 text-slate-400">
                                {obtenerDescripcion(parcial)}
                              </p>
                            )}

                            <Link
                              href={`/parciales/${parcial.id}`}
                              className="mt-4 inline-flex rounded-xl bg-yellow-500 px-5 py-3 font-bold text-slate-950 hover:bg-yellow-400"
                            >
                              Iniciar parcial →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={irAnterior}
                      disabled={indiceActivo <= 0}
                      className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
                        indiceActivo === -1 || indiceActivo >= subtemasPlanos.length - 1
                      }
                      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Completar y seguir →
                    </button>

                    <button
                      type="button"
                      onClick={irSiguiente}
                      disabled={
                        indiceActivo === -1 || indiceActivo >= subtemasPlanos.length - 1
                      }
                      className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
    </main>
  );
}