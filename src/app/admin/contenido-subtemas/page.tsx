"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  orden?: number;
  materia_id?: string | number;
  unidad_id?: string | number;
  tema_id?: string | number;
  subtema_id?: string | number;
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
  [key: string]: unknown;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_CONTENIDO = "contenido_subtemas";

export default function ContenidoSubtemasPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [subtemas, setSubtemas] = useState<Registro[]>([]);
  const [contenidos, setContenidos] = useState<Registro[]>([]);

  const [materiaId, setMateriaId] = useState("");
  const [temaId, setTemaId] = useState("");
  const [subtemaId, setSubtemaId] = useState("");

  const [contenidoHtml, setContenidoHtml] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [orden, setOrden] = useState("1");

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [origen, setOrigen] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigen(window.location.origin);
    }

    cargarMaterias();
  }, []);

  useEffect(() => {
    if (!materiaId) {
      setTemas([]);
      setSubtemas([]);
      setContenidos([]);
      setTemaId("");
      setSubtemaId("");
      limpiarFormulario();
      return;
    }

    cargarTemas(materiaId);
  }, [materiaId]);

  useEffect(() => {
    if (!temaId) {
      setSubtemas([]);
      setContenidos([]);
      setSubtemaId("");
      limpiarFormulario();
      return;
    }

    cargarSubtemas(temaId);
  }, [temaId]);

  useEffect(() => {
    if (!subtemaId) {
      setContenidos([]);
      limpiarFormulario();
      return;
    }

    cargarContenidos(subtemaId);
  }, [subtemaId]);

  const subtemaSeleccionado = useMemo(() => {
    return subtemas.find((item) => String(item.id) === String(subtemaId));
  }, [subtemas, subtemaId]);

  function obtenerTitulo(item: Registro | undefined) {
    if (!item) return "";
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
  }

  function ordenarLista(lista: Registro[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  async function cargarMaterias() {
    setCargando(true);

    const { data, error } = await supabase.from(TABLA_MATERIAS).select("*");

    if (error) {
      console.error("Error cargando materias:", error);
      alert("No se pudieron cargar las materias.");
      setCargando(false);
      return;
    }

    setMaterias(ordenarLista(data ?? []));
    setCargando(false);
  }

  async function cargarTemas(idMateria: string) {
    setCargando(true);
    setTemaId("");
    setSubtemaId("");
    setSubtemas([]);
    setContenidos([]);
    limpiarFormulario();

    let dataFinal: Registro[] | null = null;
    let errorFinal: unknown = null;

    const intentos = [
      supabase.from(TABLA_TEMAS).select("*").eq("materia_id", idMateria),
      supabase.from(TABLA_TEMAS).select("*").eq("id_materia", idMateria),
      supabase.from(TABLA_TEMAS).select("*").eq("materia", idMateria),
    ];

    for (const intento of intentos) {
      const { data, error } = await intento;

      if (!error) {
        dataFinal = data ?? [];
        errorFinal = null;
        break;
      }

      errorFinal = error;
    }

    if (errorFinal) {
      console.error("Error cargando temas:", errorFinal);
      alert("No se pudieron cargar los temas/unidades.");
      setCargando(false);
      return;
    }

    setTemas(ordenarLista(dataFinal ?? []));
    setCargando(false);
  }

  async function cargarSubtemas(idTema: string) {
    setCargando(true);
    setSubtemaId("");
    setContenidos([]);
    limpiarFormulario();

    let dataFinal: Registro[] | null = null;
    let errorFinal: unknown = null;

    const intentos = [
      supabase.from(TABLA_SUBTEMAS).select("*").eq("tema_id", idTema),
      supabase.from(TABLA_SUBTEMAS).select("*").eq("unidad_id", idTema),
      supabase.from(TABLA_SUBTEMAS).select("*").eq("id_tema", idTema),
      supabase.from(TABLA_SUBTEMAS).select("*").eq("id_unidad", idTema),
      supabase.from(TABLA_SUBTEMAS).select("*").eq("tema", idTema),
      supabase.from(TABLA_SUBTEMAS).select("*").eq("unidad", idTema),
    ];

    for (const intento of intentos) {
      const { data, error } = await intento;

      if (!error) {
        dataFinal = data ?? [];
        errorFinal = null;
        break;
      }

      errorFinal = error;
    }

    if (errorFinal) {
      console.error("Error cargando subtemas:", errorFinal);
      alert("No se pudieron cargar los subtemas.");
      setCargando(false);
      return;
    }

    setSubtemas(ordenarLista(dataFinal ?? []));
    setCargando(false);
  }

  async function cargarContenidos(idSubtema: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_CONTENIDO)
      .select("*")
      .eq("subtema_id", idSubtema);

    if (error) {
      console.error("Error cargando contenidos:", error);
      alert("No se pudieron cargar los contenidos del subtema.");
      setCargando(false);
      return;
    }

    const listaOrdenada = ordenarLista(data ?? []);
    setContenidos(listaOrdenada);

    if (!editandoId) {
      const siguienteOrden =
        listaOrdenada.length > 0
          ? Math.max(...listaOrdenada.map((item) => Number(item.orden ?? 0))) + 1
          : 1;

      setOrden(String(siguienteOrden));
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setContenidoHtml("");
    setVideoUrl("");
    setImagenUrl("");
    setArchivoUrl("");
    setOrden("1");

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  }

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

  function ejecutarComando(comando: string, valor?: string) {
    if (!editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(comando, false, valor);

    setContenidoHtml(editorRef.current.innerHTML);
  }

  function cambiarTamano(valor: string) {
    const mapa: Record<string, string> = {
      "14": "2",
      "16": "3",
      "20": "4",
      "24": "5",
      "32": "6",
      "40": "7",
    };

    ejecutarComando("fontSize", mapa[valor] ?? "3");
  }

  function agregarEnlace() {
    const url = prompt("Pega el enlace:");

    if (!url) return;

    ejecutarComando("createLink", url);
  }

  function limpiarFormato() {
    ejecutarComando("removeFormat");
    ejecutarComando("formatBlock", "p");
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

  function crearPayloads(textoActual: string) {
    const textoFinal = textoActual.trim();
    const videoFinal = videoUrl.trim() || null;
    const imagenFinal = imagenUrl.trim() || null;
    const archivoFinal = archivoUrl.trim() || null;
    const ordenFinal = Number(orden) || 1;

    const baseConTitulo = {
      subtema_id: subtemaId,
      titulo: "",
      orden: ordenFinal,
    };

    const baseSinTitulo = {
      subtema_id: subtemaId,
      orden: ordenFinal,
    };

    return [
      {
        ...baseConTitulo,
        tipo: "mixto",
        contenido: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        archivo_url: archivoFinal,
      },
      {
        ...baseSinTitulo,
        tipo: "mixto",
        contenido: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        archivo_url: archivoFinal,
      },
      {
        ...baseConTitulo,
        contenido: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        archivo_url: archivoFinal,
      },
      {
        ...baseSinTitulo,
        contenido: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        archivo_url: archivoFinal,
      },
      {
        ...baseConTitulo,
        texto: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        material_url: archivoFinal,
      },
      {
        ...baseSinTitulo,
        texto: textoFinal,
        video_url: videoFinal,
        imagen_url: imagenFinal,
        material_url: archivoFinal,
      },
    ];
  }

  async function guardarConFallback(payloads: Record<string, unknown>[]) {
    let ultimoError: unknown = null;

    for (const payload of payloads) {
      const respuesta = editandoId
        ? await supabase.from(TABLA_CONTENIDO).update(payload).eq("id", editandoId)
        : await supabase.from(TABLA_CONTENIDO).insert(payload);

      if (!respuesta.error) {
        return null;
      }

      ultimoError = respuesta.error;
    }

    return ultimoError;
  }

  async function guardarContenido() {
    if (!subtemaId) {
      alert("Primero selecciona una materia, tema/unidad y subtema.");
      return;
    }

    const textoActual = editorRef.current?.innerHTML ?? "";
    setContenidoHtml(textoActual);

    const hayContenido =
      textoActual.trim() ||
      videoUrl.trim() ||
      imagenUrl.trim() ||
      archivoUrl.trim();

    if (!hayContenido) {
      alert("Agrega texto, video, imagen o material antes de guardar.");
      return;
    }

    setGuardando(true);

    const payloads = crearPayloads(textoActual);
    const error = await guardarConFallback(payloads);

    if (error) {
      console.error("Error guardando contenido:", error);
      alert("No se pudo guardar el contenido. Revisa la consola para ver el detalle.");
      setGuardando(false);
      return;
    }

    await cargarContenidos(subtemaId);
    limpiarFormulario();
    setGuardando(false);
  }

  function editarBloque(bloque: Registro) {
    setEditandoId(bloque.id);

    const texto = obtenerTextoBloque(bloque);

    setContenidoHtml(texto);
    setVideoUrl(obtenerVideoBloque(bloque));
    setImagenUrl(obtenerImagenBloque(bloque));
    setArchivoUrl(obtenerArchivoBloque(bloque));
    setOrden(String(bloque.orden ?? 1));

    if (editorRef.current) {
      editorRef.current.innerHTML = texto;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarBloque(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar este bloque de contenido?");

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_CONTENIDO).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando contenido:", error);
      alert("No se pudo eliminar el contenido.");
      return;
    }

    if (subtemaId) {
      await cargarContenidos(subtemaId);
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contenido de subtemas</h1>
          <p className="mt-2 text-sm text-slate-400">
            Selecciona una materia, tema/unidad y subtema. El subtema será el título principal.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold">
              {editandoId ? "Editar contenido" : "Agregar contenido"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Materia
                </label>
                <select
                  value={materiaId}
                  onChange={(e) => setMateriaId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Selecciona una materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {obtenerTitulo(materia)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Tema / unidad
                </label>
                <select
                  value={temaId}
                  onChange={(e) => setTemaId(e.target.value)}
                  disabled={!materiaId}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Selecciona un tema/unidad</option>
                  {temas.map((tema) => (
                    <option key={tema.id} value={tema.id}>
                      {obtenerTitulo(tema)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Subtema
                </label>
                <select
                  value={subtemaId}
                  onChange={(e) => setSubtemaId(e.target.value)}
                  disabled={!temaId}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Selecciona un subtema</option>
                  {subtemas.map((subtema) => (
                    <option key={subtema.id} value={subtema.id}>
                      {obtenerTitulo(subtema)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Orden
                </label>
                <input
                  type="number"
                  min="1"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">Texto con formato</h3>

                <div className="mb-3 flex flex-wrap gap-2">
                  <select
                    onChange={(e) => cambiarTamano(e.target.value)}
                    defaultValue="16"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="20">20</option>
                    <option value="24">24</option>
                    <option value="32">32</option>
                    <option value="40">40</option>
                  </select>

                  <button type="button" onClick={() => ejecutarComando("bold")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Negrita
                  </button>

                  <button type="button" onClick={() => ejecutarComando("italic")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Cursiva
                  </button>

                  <button type="button" onClick={() => ejecutarComando("underline")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Subrayar
                  </button>

                  <button type="button" onClick={() => ejecutarComando("justifyLeft")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Izq.
                  </button>

                  <button type="button" onClick={() => ejecutarComando("justifyCenter")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Centrar
                  </button>

                  <button type="button" onClick={() => ejecutarComando("justifyRight")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Der.
                  </button>

                  <button type="button" onClick={() => ejecutarComando("formatBlock", "h3")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Subtítulo
                  </button>

                  <button type="button" onClick={() => ejecutarComando("insertUnorderedList")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Lista
                  </button>

                  <button type="button" onClick={agregarEnlace} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Enlace
                  </button>

                  <button type="button" onClick={limpiarFormato} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
                    Limpiar
                  </button>
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setContenidoHtml(e.currentTarget.innerHTML)}
                  className="min-h-[180px] rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                />

                <p className="mt-3 text-xs text-slate-400">
                  Puedes dejar este apartado vacío si solo quieres agregar imagen, video o material.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">Video</h3>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Pega aquí el link de YouTube o video"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">Imagen</h3>
                <input
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="Pega aquí el link de la imagen"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">Material descargable</h3>
                <input
                  value={archivoUrl}
                  onChange={(e) => setArchivoUrl(e.target.value)}
                  placeholder="Pega aquí el link del PDF, archivo o material"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarContenido}
                  disabled={guardando || !subtemaId}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Agregar contenido"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm text-slate-400">Vista previa del subtema</p>
              <h2 className="mt-1 text-3xl font-bold">
                {subtemaSeleccionado
                  ? obtenerTitulo(subtemaSeleccionado)
                  : "Selecciona un subtema"}
              </h2>
            </div>

            {cargando && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                Cargando...
              </div>
            )}

            {!cargando && !subtemaId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Selecciona una materia, tema/unidad y subtema para ver o agregar contenido.
              </div>
            )}

            {!cargando && subtemaId && contenidos.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Este subtema todavía no tiene contenido.
              </div>
            )}

            <div className="space-y-5">
              {contenidos.map((bloque) => {
                const texto = obtenerTextoBloque(bloque);
                const video = obtenerVideoBloque(bloque);
                const imagen = obtenerImagenBloque(bloque);
                const archivo = obtenerArchivoBloque(bloque);

                return (
                  <article
                    key={bloque.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Orden: {bloque.orden ?? "Sin orden"}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editarBloque(bloque)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarBloque(bloque.id)}
                          className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {texto && (
                      <div
                        className="mb-5 rounded-2xl bg-slate-900 p-5 leading-relaxed text-white"
                        dangerouslySetInnerHTML={{ __html: texto }}
                      />
                    )}

                    {video && (
                      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <p className="mb-3 text-sm font-semibold text-blue-300">
                          Video
                        </p>
                        {renderVideo(video)}
                      </div>
                    )}

                    {imagen && (
                      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <p className="mb-3 text-sm font-semibold text-blue-300">
                          Imagen
                        </p>
                        <img
                          src={imagen}
                          alt="Imagen del contenido"
                          className="max-h-[500px] w-full rounded-2xl object-contain"
                        />
                      </div>
                    )}

                    {archivo && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <p className="mb-3 text-sm font-semibold text-blue-300">
                          Material
                        </p>
                        <a
                          href={archivo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-700"
                        >
                          Abrir material
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}