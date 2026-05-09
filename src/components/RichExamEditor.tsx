"use client";

import { useEffect, useRef, useState } from "react";
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
      .replace(/[^a-z0-9.\-_]/g, "-")
      .replace(/-+/g, "-");
  }

  async function subirImagen(archivo: File) {
    if (!archivo.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      return "";
    }

    setSubiendo(true);

    const nombreLimpio = limpiarNombreArchivo(archivo.name || "imagen.png");
    const ruta = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${nombreLimpio}`;

    const { error } = await supabase.storage
      .from(BUCKET_IMAGENES)
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Error subiendo imagen:", error);
      alert("No se pudo subir la imagen.");
      setSubiendo(false);
      return "";
    }

    const { data } = supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta);

    setSubiendo(false);
    return data.publicUrl;
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
        style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;border:1px solid #334155;" 
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

  async function manejarPegado(e: React.ClipboardEvent<HTMLDivElement>) {
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
    const confirmar = confirm("¿Seguro que quieres borrar todo el contenido de este campo?");
    if (!confirmar) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      onChange("");
      editorRef.current.focus();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <label className="mb-3 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ejecutarComando("bold")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Negrita
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("italic")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Cursiva
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("underline")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Subrayar
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyLeft")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Izq.
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyCenter")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Centrar
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("justifyRight")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Der.
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("insertUnorderedList")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Lista
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("formatBlock", "h2")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Título
        </button>

        <select
          onChange={(e) => {
            if (!e.target.value) return;
            ejecutarComando("fontSize", e.target.value);
            e.target.value = "";
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
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
          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
        >
          Subir imagen
        </button>

        <button
          type="button"
          onClick={() => ejecutarComando("removeFormat")}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          Limpiar formato
        </button>

        <button
          type="button"
          onClick={limpiarTodo}
          className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
        >
          Borrar campo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => manejarArchivoSeleccionado(e.target.files?.[0] ?? null)}
      />

      {subiendo && (
        <p className="mb-2 rounded-lg border border-yellow-700 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-300">
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
        className="rich-exam-editor min-h-[150px] w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
      />

      <p className="mt-3 text-xs text-slate-400">
        Puedes escribir con formato, subir imagen o pegar imagen directamente con Ctrl + V.
      </p>

      <style jsx>{`
        .rich-exam-editor:empty::before {
          content: attr(data-placeholder);
          color: #64748b;
        }

        .rich-exam-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #334155;
        }

        .rich-exam-editor h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0.5rem 0;
        }

        .rich-exam-editor ul {
          list-style: disc;
          padding-left: 1.5rem;
        }
      `}</style>
    </div>
  );
}