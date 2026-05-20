"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import { supabase } from "@/lib/supabaseClient";

const BUCKET_IMAGENES = "imagenes-examenes";

type RichExamEditorProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  folder: "parciales" | "simuladores";
};

export function isRichTextEmpty(html: string) {
  const sinImagenes = !/<img\s/i.test(html || "");
  const texto = (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return sinImagenes && texto.length === 0;
}

export function RichExamEditor({
  label,
  value,
  onChange,
  placeholder,
  folder,
}: RichExamEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (document.activeElement !== editor && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  function limpiarNombreArchivo(nombre: string) {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.\-_]/g, "-")
      .replace(/-+/g, "-");
  }

  async function subirImagen(archivo: File) {
    if (!archivo.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      return "";
    }

    setSubiendo(true);

    try {
      const nombreLimpio = limpiarNombreArchivo(archivo.name || "imagen.png");
      const ruta = `${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${nombreLimpio}`;

      const { error } = await supabase.storage
        .from(BUCKET_IMAGENES)
        .upload(ruta, archivo, {
          cacheControl: "3600",
          upsert: true,
          contentType: archivo.type || undefined,
        });

      if (error) {
        console.error("Error subiendo imagen:", error);
        alert("No se pudo subir la imagen.");
        return "";
      }

      const { data } = supabase.storage
        .from(BUCKET_IMAGENES)
        .getPublicUrl(ruta);

      return data.publicUrl;
    } catch (err) {
      console.error("Error inesperado subiendo imagen:", err);
      alert("No se pudo subir la imagen.");
      return "";
    } finally {
      setSubiendo(false);
    }
  }

  function actualizarValor() {
    const editor = editorRef.current;
    if (!editor) return;

    onChange(editor.innerHTML);
  }

  function ejecutarComando(comando: string, valor?: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(comando, false, valor);
    actualizarValor();
  }

  async function insertarImagen(archivo: File) {
    const url = await subirImagen(archivo);
    if (!url) return;

    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const htmlImagen = `
      <img
        src="${url}"
        alt="imagen"
        style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;border:1px solid #cbd5e1;"
      />
    `;

    document.execCommand("insertHTML", false, htmlImagen);
    actualizarValor();
  }

  async function manejarArchivoSeleccionado(archivo: File | null) {
    if (!archivo) return;

    await insertarImagen(archivo);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function manejarPegado(e: ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData.items);
    const imagenes = items.filter((item) => item.type.startsWith("image/"));

    if (imagenes.length === 0) {
      return;
    }

    e.preventDefault();

    for (const item of imagenes) {
      const archivo = item.getAsFile();

      if (archivo) {
        await insertarImagen(archivo);
      }
    }
  }

  function limpiarTodo() {
    const confirmar = confirm(
      "¿Seguro que quieres borrar todo el contenido de este campo?"
    );

    if (!confirmar) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      onChange("");
      editorRef.current.focus();
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="mb-3 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ejecutarComando("bold")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Negrita
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("italic")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold italic text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Cursiva
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("underline")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 underline transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Subrayar
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyLeft")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Izq.
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyCenter")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Centrar
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyRight")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Der.
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("insertUnorderedList")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Lista
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("formatBlock", "h2")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Título
        </button>

        <select
          onChange={(e) => {
            if (!e.target.value) return;
            ejecutarComando("fontSize", e.target.value);
            e.target.value = "";
          }}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
          defaultValue=""
        >
          <option value="">Tamaño</option>
          <option value="3">Normal</option>
          <option value="4">Mediano</option>
          <option value="5">Grande</option>
          <option value="6">Muy grande</option>
        </select>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendo}
          className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {subiendo ? "Subiendo..." : "Subir imagen"}
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("removeFormat")}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Limpiar formato
        </button>

        <button
          type="button"
          onClick={limpiarTodo}
          className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Borrar campo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          manejarArchivoSeleccionado(e.target.files?.[0] ?? null)
        }
      />

      {subiendo && (
        <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Subiendo imagen...
        </p>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={actualizarValor}
        onPaste={manejarPegado}
        data-placeholder={placeholder || ""}
        className="rich-exam-editor min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Puedes escribir con formato, subir imagen o pegar imagen directamente
        con Ctrl + V.
      </p>

      <style jsx>{`
        .rich-exam-editor {
          line-height: 1.7;
          font-size: 15px;
        }

        .rich-exam-editor:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }

        .rich-exam-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #cbd5e1;
        }

        .rich-exam-editor h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0.5rem 0;
          color: #020617;
        }

        .rich-exam-editor p {
          margin: 0.5rem 0;
        }

        .rich-exam-editor ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        .rich-exam-editor ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        .rich-exam-editor a {
          color: #2563eb;
          text-decoration: underline;
        }

        .rich-exam-editor font[size="5"] {
          font-size: 1.5rem;
        }

        .rich-exam-editor font[size="6"] {
          font-size: 2rem;
        }
      `}</style>
    </div>
  );
}