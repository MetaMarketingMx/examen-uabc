"use client";

import Link from "next/link";
import {
  type ClipboardEvent,
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  [key: string]: any;
};

type BloqueContenido = {
  id: string;
  subtema_id: string;
  tipo: "texto" | "imagen" | "video" | "pdf";
  titulo: string | null;
  contenido: string | null;
  url: string | null;
  alineacion: "izquierda" | "centro" | "derecha" | "justificado";
  tamano_texto: "pequeno" | "normal" | "grande" | "titulo";
  orden: number;
  created_at?: string;
  updated_at?: string;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_CONTENIDO = "contenido_subtemas";
const BUCKET_CONTENIDO = "contenido-subtemas";

export default function AdminContenidoSubtemasPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [subtemas, setSubtemas] = useState<Registro[]>([]);

  const [materiaId, setMateriaId] = useState("");
  const [temaId, setTemaId] = useState("");
  const [subtemaId, setSubtemaId] = useState("");
  const [bloquePrincipalId, setBloquePrincipalId] = useState<string | null>(
    null
  );

  const [recursoUrl, setRecursoUrl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

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

  function ordenarBloques(lista: BloqueContenido[]) {
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

  async function cargarDatosIniciales() {
    setCargando(true);
    setError("");

    const params = new URLSearchParams(window.location.search);

    const materiaUrl = params.get("materia") || "";
    const temaUrl = params.get("tema") || "";
    const subtemaUrl = params.get("subtema") || "";

    const { data: materiasData, error: materiasError } = await supabase
      .from(TABLA_MATERIAS)
      .select("*");

    if (materiasError) {
      setError("No se pudieron cargar las materias.");
      console.error(materiasError);
      setCargando(false);
      return;
    }

    setMaterias(ordenarLista(materiasData ?? []));

    if (materiaUrl) {
      setMateriaId(materiaUrl);

      const temasLista = await consultarConFallback(TABLA_TEMAS, [
        { columna: "materia_id", valor: materiaUrl },
        { columna: "id_materia", valor: materiaUrl },
        { columna: "materia", valor: materiaUrl },
      ]);

      setTemas(ordenarLista(temasLista));
    }

    if (temaUrl) {
      setTemaId(temaUrl);

      const subtemasLista = await consultarConFallback(TABLA_SUBTEMAS, [
        { columna: "tema_id", valor: temaUrl },
        { columna: "unidad_id", valor: temaUrl },
        { columna: "id_tema", valor: temaUrl },
        { columna: "id_unidad", valor: temaUrl },
        { columna: "tema", valor: temaUrl },
        { columna: "unidad", valor: temaUrl },
      ]);

      setSubtemas(ordenarLista(subtemasLista));
    }

    if (subtemaUrl) {
      setSubtemaId(subtemaUrl);
      await cargarContenido(subtemaUrl);
    }

    setCargando(false);
  }

  async function cargarContenido(idSubtema: string) {
    if (!idSubtema) return;

    setCargando(true);
    setError("");
    setMensaje("");

    const { data, error: fetchError } = await supabase
      .from(TABLA_CONTENIDO)
      .select("*")
      .eq("subtema_id", String(idSubtema))
      .order("orden", { ascending: true });

    if (fetchError) {
      setError("No se pudo cargar el contenido del subtema.");
      console.error(fetchError);
      setCargando(false);
      return;
    }

    const bloques = ordenarBloques((data ?? []) as BloqueContenido[]);

    if (bloques.length > 0) {
      setBloquePrincipalId(bloques[0].id);

      const html = convertirBloquesAntiguosAHtml(bloques);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
        }
      }, 0);
    } else {
      setBloquePrincipalId(null);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
      }, 0);
    }

    setCargando(false);
  }

  function ejecutarComando(comando: string, valor?: string) {
    editorRef.current?.focus();
    document.execCommand(comando, false, valor);
  }

  function insertarHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
  }

  function insertarSeparador() {
    insertarHtml(
      `<hr style="border:0;border-top:1px solid #334155;margin:24px 0;" />`
    );
  }

  function insertarCajaImportante() {
    insertarHtml(`
      <div style="border:1px solid #2563eb;background:#0f172a;border-radius:16px;padding:18px;margin:18px 0;">
        <p style="margin:0;font-weight:700;color:#93c5fd;">Nota importante</p>
        <p style="margin:8px 0 0 0;">Escribe aquí la información destacada.</p>
      </div>
    `);
  }

  async function guardarContenido() {
    if (!subtemaId) {
      setError("No hay un subtema seleccionado.");
      return;
    }

    const html = normalizarVideosGuardados(editorRef.current?.innerHTML || "");

    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }

    if (contenidoHtmlVacio(html)) {
      setError("Escribe o agrega contenido antes de guardar.");
      setMensaje("");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      subtema_id: String(subtemaId),
      tipo: "texto",
      titulo: "Contenido completo del subtema",
      contenido: html,
      url: null,
      alineacion: "izquierda",
      tamano_texto: "normal",
      orden: 1,
    };

    try {
      let idPrincipal = bloquePrincipalId;

      if (idPrincipal) {
        const { error: updateError } = await supabase
          .from(TABLA_CONTENIDO)
          .update(payload)
          .eq("id", idPrincipal);

        if (updateError) {
          console.error("Error actualizando contenido:", {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          });

          setError(
            updateError.message ||
              "No se pudo actualizar el contenido. Revisa permisos de Supabase."
          );

          setGuardando(false);
          return;
        }
      } else {
        const { data, error: insertError } = await supabase
          .from(TABLA_CONTENIDO)
          .insert(payload)
          .select("id")
          .single();

        if (insertError) {
          console.error("Error insertando contenido:", {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });

          setError(
            insertError.message ||
              "No se pudo insertar el contenido. Revisa permisos de Supabase."
          );

          setGuardando(false);
          return;
        }

        idPrincipal = data.id;
        setBloquePrincipalId(data.id);
      }

      if (idPrincipal) {
        const { error: deleteExtrasError } = await supabase
          .from(TABLA_CONTENIDO)
          .delete()
          .eq("subtema_id", String(subtemaId))
          .neq("id", idPrincipal);

        if (deleteExtrasError) {
          console.error("Error eliminando bloques extra:", {
            message: deleteExtrasError.message,
            code: deleteExtrasError.code,
            details: deleteExtrasError.details,
            hint: deleteExtrasError.hint,
          });
        }
      }

      setMensaje("Contenido guardado correctamente.");
    } catch (err) {
      console.error("Error inesperado guardando contenido:", err);
      setError("Ocurrió un error inesperado al guardar el contenido.");
    } finally {
      setGuardando(false);
    }
  }

  async function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const archivos = Array.from(e.clipboardData.files || []);

    if (archivos.length > 0) {
      e.preventDefault();

      for (const archivo of archivos) {
        await subirArchivoEInsertar(archivo);
      }

      return;
    }

    const texto = e.clipboardData.getData("text/plain")?.trim();

    if (texto && esUrl(texto)) {
      e.preventDefault();
      insertarRecursoDesdeUrl(texto);
    }
  }

  async function handleSeleccionArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);

    for (const archivo of archivos) {
      await subirArchivoEInsertar(archivo);
    }

    e.target.value = "";
  }

  async function subirArchivoEInsertar(archivo: File) {
    if (!subtemaId) {
      setError("Selecciona un subtema antes de subir archivos.");
      return;
    }

    setSubiendoArchivo(true);
    setError("");
    setMensaje("");

    const nombreSeguro = limpiarNombreArchivo(archivo.name);
    const ruta = `${subtemaId}/${Date.now()}-${nombreSeguro}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_CONTENIDO)
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: archivo.type || undefined,
      });

    if (uploadError) {
      setError("No se pudo subir el archivo.");
      console.error(uploadError);
      setSubiendoArchivo(false);
      return;
    }

    const { data } = supabase.storage
      .from(BUCKET_CONTENIDO)
      .getPublicUrl(ruta);

    const publicUrl = data.publicUrl;

    if (archivo.type.startsWith("image/")) {
      insertarImagen(publicUrl, archivo.name);
    } else if (archivo.type.startsWith("video/")) {
      insertarVideoArchivo(publicUrl);
    } else {
      insertarArchivoDescargable(publicUrl, archivo.name);
    }

    setMensaje("Archivo agregado al editor.");
    setSubiendoArchivo(false);
  }

  function insertarRecursoDesdeUrl(url: string) {
    if (esUrlVideo(url)) {
      const embed = convertirVideoAEmbed(url);

      if (embed) {
        insertarVideoEmbed(embed, url);
        setRecursoUrl("");
        return;
      }
    }

    if (esUrlImagen(url)) {
      insertarImagen(url, "Imagen");
      setRecursoUrl("");
      return;
    }

    if (esUrlPdf(url)) {
      insertarArchivoDescargable(url, "Documento PDF");
      setRecursoUrl("");
      return;
    }

    insertarHtml(
      `<a href="${escaparAtributo(
        url
      )}" target="_blank" rel="noreferrer" style="color:#2563eb;text-decoration:underline;">${escaparHtml(
        url
      )}</a>`
    );
    setRecursoUrl("");
  }

  function insertarUrlManual() {
    const url = recursoUrl.trim();

    if (!url) {
      setError("Pega un enlace antes de insertar.");
      return;
    }

    if (!esUrl(url)) {
      setError("El enlace no parece válido.");
      return;
    }

    setError("");
    insertarRecursoDesdeUrl(url);
  }

  function insertarImagen(src: string, alt: string) {
    insertarHtml(`
      <figure style="margin:22px 0;">
        <img src="${escaparAtributo(src)}" alt="${escaparAtributo(
      alt
    )}" style="display:block;max-width:100%;height:auto;border-radius:16px;border:1px solid #334155;margin:auto;" />
        <figcaption style="margin-top:8px;text-align:center;color:#64748b;font-size:14px;">${escaparHtml(
          alt
        )}</figcaption>
      </figure>
    `);
  }

  function insertarVideoEmbed(src: string, originalUrl: string) {
    insertarHtml(construirVideoIncrustadoHtml(src, originalUrl));
  }

  function insertarVideoArchivo(src: string) {
    insertarHtml(`
      <video controls style="display:block;width:100%;max-height:520px;border-radius:16px;border:1px solid #334155;margin:22px 0;background:#020617;">
        <source src="${escaparAtributo(src)}" />
        Tu navegador no puede reproducir este video.
      </video>
    `);
  }

  function insertarArchivoDescargable(src: string, nombre: string) {
    insertarHtml(`
      <div style="border:1px solid #334155;background:#0f172a;border-radius:16px;padding:18px;margin:18px 0;">
        <p style="margin:0 0 10px 0;font-weight:700;color:#e2e8f0;">Archivo descargable</p>
        <a href="${escaparAtributo(
          src
        )}" target="_blank" rel="noreferrer" download style="display:inline-block;border:1px solid #38bdf8;border-radius:12px;padding:10px 14px;color:#7dd3fc;text-decoration:none;font-weight:700;">
          Descargar: ${escaparHtml(nombre)}
        </a>
      </div>
    `);
  }

  const materiaSeleccionada = materias.find(
    (item) => String(item.id) === String(materiaId)
  );
  const temaSeleccionado = temas.find(
    (item) => String(item.id) === String(temaId)
  );
  const subtemaSeleccionado = subtemas.find(
    (item) => String(item.id) === String(subtemaId)
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">Contenido de subtemas</h1>

          <p className="mt-3 max-w-4xl text-slate-400">
            Edita el contenido del subtema como si fuera una publicación:
            escribe texto, da formato, pega imágenes con Ctrl + V, inserta
            videos por enlace y agrega archivos descargables.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin?seccion=subtemas"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-800"
            >
              Volver a subtemas
            </Link>

            {subtemaId && (
              <Link
                href={materiaId ? `/materias/${materiaId}` : "/materias"}
                target="_blank"
                className="rounded-xl border border-blue-700 px-5 py-3 font-semibold text-blue-300 hover:bg-blue-950"
              >
                Vista alumno
              </Link>
            )}
          </div>
        </header>

        {mensaje && (
          <div className="mb-6 rounded-xl border border-green-500 bg-green-950 p-4 text-sm text-green-200">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500 bg-red-950 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {cargando && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Cargando...
          </div>
        )}

        {subtemaSeleccionado ? (
          <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
              Subtema seleccionado
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              {obtenerTitulo(subtemaSeleccionado)}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Materia: {obtenerTitulo(materiaSeleccionada)} · Tema:{" "}
              {obtenerTitulo(temaSeleccionado)}
            </p>

            {obtenerDescripcion(subtemaSeleccionado) && (
              <p className="mt-4 text-slate-300">
                {obtenerDescripcion(subtemaSeleccionado)}
              </p>
            )}
          </section>
        ) : (
          <section className="mb-8 rounded-3xl border border-yellow-600 bg-yellow-950/30 p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-yellow-200">
              No hay subtema seleccionado
            </h2>

            <p className="mt-3 text-yellow-100">
              Regresa a la sección de subtemas y usa el botón “Administrar
              contenido” del subtema que quieras editar.
            </p>

            <Link
              href="/admin?seccion=subtemas"
              className="mt-5 inline-flex rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Volver a subtemas
            </Link>
          </section>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Editor de contenido</h2>
              <p className="mt-2 text-sm text-slate-400">
                Escribe, pega imágenes con Ctrl + V, pega enlaces de YouTube,
                Vimeo, PDF o imágenes, o sube archivos.
              </p>
            </div>

            <button
              type="button"
              onClick={guardarContenido}
              disabled={guardando || !subtemaId}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar contenido"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => ejecutarComando("bold")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-800"
            >
              Negrita
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("italic")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm italic hover:bg-slate-800"
            >
              Cursiva
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("underline")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm underline hover:bg-slate-800"
            >
              Subrayado
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("formatBlock", "h2")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Título
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("formatBlock", "p")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Texto normal
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("fontSize", "3")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Tamaño normal
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("fontSize", "5")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Texto grande
            </button>

            <select
              onChange={(e) => ejecutarComando("fontName", e.target.value)}
              defaultValue=""
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="" disabled>
                Tipo de letra
              </option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
            </select>

            <button
              type="button"
              onClick={() => ejecutarComando("justifyLeft")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Izquierda
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("justifyCenter")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Centrar
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("justifyRight")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Derecha
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("justifyFull")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Justificar
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("insertUnorderedList")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Lista
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("insertOrderedList")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Lista numérica
            </button>

            <button
              type="button"
              onClick={insertarSeparador}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Separador
            </button>

            <button
              type="button"
              onClick={insertarCajaImportante}
              className="rounded-lg border border-blue-700 px-3 py-2 text-sm text-blue-300 hover:bg-blue-950"
            >
              Caja importante
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={recursoUrl}
              onChange={(e) => setRecursoUrl(e.target.value)}
              disabled={!subtemaId}
              placeholder="Pega aquí un enlace de YouTube, Vimeo, imagen, PDF o cualquier recurso..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={insertarUrlManual}
              disabled={!subtemaId}
              className="rounded-xl border border-cyan-700 px-5 py-3 font-semibold text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
            >
              Insertar enlace/video
            </button>

            <label className="cursor-pointer rounded-xl border border-green-700 px-5 py-3 text-center font-semibold text-green-300 hover:bg-green-950">
              {subiendoArchivo ? "Subiendo..." : "Subir archivo"}
              <input
                type="file"
                multiple
                onChange={handleSeleccionArchivo}
                disabled={!subtemaId || subiendoArchivo}
                className="hidden"
              />
            </label>
          </div>

          <div
            ref={editorRef}
            contentEditable={Boolean(subtemaId)}
            suppressContentEditableWarning
            onPaste={handlePaste}
            className="prose-editor mt-6 min-h-[620px] rounded-2xl border border-slate-700 bg-white p-6 text-slate-950 outline-none focus:border-blue-500"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={guardarContenido}
              disabled={guardando || !subtemaId}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar contenido"}
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("undo")}
              disabled={!subtemaId}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Deshacer
            </button>

            <button
              type="button"
              onClick={() => ejecutarComando("redo")}
              disabled={!subtemaId}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Rehacer
            </button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .prose-editor {
          line-height: 1.7;
          font-size: 16px;
        }

        .prose-editor:empty:before {
          content: "Escribe aquí el contenido del subtema. También puedes pegar una imagen con Ctrl + V o pegar un enlace de video/PDF...";
          color: #64748b;
        }

        .prose-editor h2 {
          font-size: 2rem;
          font-weight: 800;
          margin: 1rem 0;
        }

        .prose-editor h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0;
        }

        .prose-editor p {
          margin: 0.75rem 0;
        }

        .prose-editor ul,
        .prose-editor ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }

        .prose-editor img {
          max-width: 100%;
          height: auto;
        }

        .prose-editor iframe {
          max-width: 100%;
        }

        .prose-editor a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
}

function construirVideoIncrustadoHtml(src: string, originalUrl: string) {
  return `
    <div
      data-tipo="video"
      data-video-url="${escaparAtributo(originalUrl)}"
      data-video-embed="${escaparAtributo(src)}"
      style="margin:22px 0;"
    >
      <div style="position:relative;width:100%;padding-top:56.25%;border:1px solid #334155;border-radius:16px;overflow:hidden;background:#020617;">
        <iframe
          src="${escaparAtributo(src)}"
          title="Video del subtema"
          style="position:absolute;inset:0;width:100%;height:100%;border:0;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
}

function normalizarVideosGuardados(html: string) {
  if (typeof document === "undefined") return html;

  const contenedor = document.createElement("div");
  contenedor.innerHTML = html;

  const tarjetasVideo = contenedor.querySelectorAll('[data-tipo="video"]');

  tarjetasVideo.forEach((tarjeta) => {
    const embed =
      tarjeta.getAttribute("data-video-embed") ||
      convertirVideoAEmbed(tarjeta.getAttribute("data-video-url") || "");

    const originalUrl = tarjeta.getAttribute("data-video-url") || embed;

    if (!embed) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = construirVideoIncrustadoHtml(embed, originalUrl);

    const nuevoVideo = wrapper.firstElementChild;

    if (nuevoVideo) {
      tarjeta.replaceWith(nuevoVideo);
    }
  });

  return contenedor.innerHTML;
}

function contenidoHtmlVacio(html: string) {
  const limpio = html
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<video\b[^>]*>.*?<\/video>/gi, "")
    .replace(/<a\b[^>]*>.*?<\/a>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  const tieneMedia =
    /<img\b/i.test(html) ||
    /<iframe\b/i.test(html) ||
    /<video\b/i.test(html) ||
    /<a\b/i.test(html);

  return !limpio && !tieneMedia;
}

function convertirBloquesAntiguosAHtml(bloques: BloqueContenido[]) {
  if (bloques.length === 0) return "";

  if (bloques.length === 1 && bloques[0].tipo === "texto") {
    return normalizarVideosGuardados(bloques[0].contenido || "");
  }

  return bloques
    .map((bloque) => {
      if (bloque.tipo === "texto") {
        return normalizarVideosGuardados(`<div>${bloque.contenido || ""}</div>`);
      }

      if (bloque.tipo === "imagen" && bloque.url) {
        return `
          <figure style="margin:22px 0;">
            <img src="${escaparAtributo(
              bloque.url
            )}" alt="${escaparAtributo(
          bloque.titulo || "Imagen"
        )}" style="display:block;max-width:100%;height:auto;border-radius:16px;border:1px solid #334155;margin:auto;" />
          </figure>
        `;
      }

      if (bloque.tipo === "video" && bloque.url) {
        const embed = convertirVideoAEmbed(bloque.url);

        if (embed) {
          return construirVideoIncrustadoHtml(embed, bloque.url);
        }

        return "";
      }

      if (bloque.tipo === "pdf" && bloque.url) {
        return `
          <div style="border:1px solid #334155;background:#0f172a;border-radius:16px;padding:18px;margin:18px 0;">
            <p style="margin:0 0 10px 0;font-weight:700;color:#e2e8f0;">Archivo descargable</p>
            <a href="${escaparAtributo(
              bloque.url
            )}" target="_blank" rel="noreferrer" download style="display:inline-block;border:1px solid #38bdf8;border-radius:12px;padding:10px 14px;color:#7dd3fc;text-decoration:none;font-weight:700;">
              Descargar: ${escaparHtml(bloque.titulo || "PDF")}
            </a>
          </div>
        `;
      }

      return "";
    })
    .join("");
}

function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function esUrl(valor: string) {
  try {
    new URL(valor);
    return true;
  } catch {
    return false;
  }
}

function esUrlImagen(url: string) {
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
}

function esUrlPdf(url: string) {
  return /\.pdf(\?.*)?$/i.test(url);
}

function esUrlVideo(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be") ||
      parsed.hostname.includes("vimeo.com")
    );
  } catch {
    return false;
  }
}

function convertirVideoAEmbed(url: string) {
  if (!url.trim()) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }

    return "";
  } catch {
    return "";
  }
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escaparAtributo(texto: string) {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}