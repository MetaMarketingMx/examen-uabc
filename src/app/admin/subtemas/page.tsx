"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
};

type Tema = {
  id: string | number;
  materia_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
};

type Subtema = {
  id: string;
  materia_id?: string | null;
  tema_id?: string | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
  activo?: boolean | null;
};

function nombreDe(item?: Materia | Tema | Subtema | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

export default function AdminSubtemasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [materiaId, setMateriaId] = useState("");
  const [temaId, setTemaId] = useState("");

  const [subtemaTitulo, setSubtemaTitulo] = useState("");
  const [subtemaDescripcion, setSubtemaDescripcion] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (temaId) {
      cargarSubtemas(temaId);
    } else {
      setSubtemas([]);
    }
  }, [temaId]);

  const temasFiltrados = useMemo(() => {
    return temas.filter((tema) => String(tema.materia_id) === String(materiaId));
  }, [temas, materiaId]);

  async function cargarDatosIniciales() {
    setLoading(true);
    setError("");

    const [materiasRes, temasRes] = await Promise.all([
      supabase.from("materias").select("*").order("orden", { ascending: true }),
      supabase.from("temas").select("*").order("orden", { ascending: true }),
    ]);

    if (materiasRes.error) {
      setError("No se pudieron cargar las materias.");
    }

    if (temasRes.error) {
      setError("No se pudieron cargar las unidades/temas.");
    }

    setMaterias((materiasRes.data || []) as Materia[]);
    setTemas((temasRes.data || []) as Tema[]);
    setLoading(false);
  }

  async function cargarSubtemas(idTema: string) {
    setError("");

    const { data, error } = await supabase
      .from("subtemas")
      .select("*")
      .eq("tema_id", idTema)
      .order("orden", { ascending: true });

    if (error) {
      setError("No se pudieron cargar los subtemas.");
      setSubtemas([]);
      return;
    }

    setSubtemas((data || []) as Subtema[]);
  }

  function limpiarFormulario() {
    setSubtemaTitulo("");
    setSubtemaDescripcion("");
    setEditandoId(null);
  }

  async function guardarSubtema(e: FormEvent) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!materiaId || !temaId) {
      setError("Selecciona una materia y una unidad/tema.");
      return;
    }

    if (!subtemaTitulo.trim()) {
      setError("Escribe el título del subtema.");
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("subtemas")
        .update({
          materia_id: materiaId,
          tema_id: temaId,
          nombre: subtemaTitulo.trim(),
          titulo: subtemaTitulo.trim(),
          descripcion: subtemaDescripcion.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editandoId);

      if (error) {
        setError("No se pudo actualizar el subtema.");
        return;
      }

      setMensaje("Subtema actualizado correctamente.");
      limpiarFormulario();
      cargarSubtemas(temaId);
      return;
    }

    const siguienteOrden =
      subtemas.length > 0
        ? Math.max(...subtemas.map((subtema) => Number(subtema.orden || 0))) + 1
        : 1;

    const { error } = await supabase.from("subtemas").insert({
      materia_id: materiaId,
      tema_id: temaId,
      nombre: subtemaTitulo.trim(),
      titulo: subtemaTitulo.trim(),
      descripcion: subtemaDescripcion.trim(),
      orden: siguienteOrden,
      activo: true,
    });

    if (error) {
      setError("No se pudo guardar el subtema.");
      return;
    }

    setMensaje("Subtema agregado correctamente.");
    limpiarFormulario();
    cargarSubtemas(temaId);
  }

  function editarSubtema(subtema: Subtema) {
    setEditandoId(subtema.id);
    setSubtemaTitulo(subtema.nombre || subtema.titulo || "");
    setSubtemaDescripcion(subtema.descripcion || "");
  }

  async function eliminarSubtema(id: string) {
    const confirmar = confirm("¿Eliminar este subtema?");
    if (!confirmar) return;

    setMensaje("");
    setError("");

    const { error } = await supabase.from("subtemas").delete().eq("id", id);

    if (error) {
      setError("No se pudo eliminar el subtema.");
      return;
    }

    setMensaje("Subtema eliminado correctamente.");
    cargarSubtemas(temaId);
  }

  async function moverSubtema(index: number, direccion: "arriba" | "abajo") {
    const nuevoIndex = direccion === "arriba" ? index - 1 : index + 1;

    if (nuevoIndex < 0 || nuevoIndex >= subtemas.length) return;

    const subtemaA = subtemas[index];
    const subtemaB = subtemas[nuevoIndex];

    const ordenA = Number(subtemaA.orden || index + 1);
    const ordenB = Number(subtemaB.orden || nuevoIndex + 1);

    setMensaje("");
    setError("");

    const { error: errorA } = await supabase
      .from("subtemas")
      .update({
        orden: ordenB,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtemaA.id);

    const { error: errorB } = await supabase
      .from("subtemas")
      .update({
        orden: ordenA,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtemaB.id);

    if (errorA || errorB) {
      setError("No se pudo mover el subtema.");
      return;
    }

    cargarSubtemas(temaId);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Admin
          </p>

          <h1 className="text-4xl font-bold">Administrar subtemas</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Crea subtemas dentro de cada unidad/tema. Después podrás agregar
            contenido por bloques: texto con formato, imágenes, videos y
            materiales.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Volver a Admin
            </Link>

            {temaId && (
              <Link
                href={`/temas/${temaId}`}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
              >
                Ver unidad como alumno
              </Link>
            )}
          </div>
        </div>

        {mensaje && (
          <div className="mb-5 rounded-2xl border border-emerald-500 bg-emerald-950/50 p-4 text-emerald-200">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500 bg-red-950/50 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Cargando...
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold">
                {editandoId ? "Editar subtema" : "Crear subtema"}
              </h2>

              <form onSubmit={guardarSubtema} className="grid gap-4">
                <select
                  value={materiaId}
                  onChange={(e) => {
                    setMateriaId(e.target.value);
                    setTemaId("");
                    setSubtemas([]);
                    limpiarFormulario();
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona materia</option>
                  {materias.map((materia) => (
                    <option key={String(materia.id)} value={String(materia.id)}>
                      {nombreDe(materia)}
                    </option>
                  ))}
                </select>

                <select
                  value={temaId}
                  onChange={(e) => {
                    setTemaId(e.target.value);
                    limpiarFormulario();
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona unidad/tema</option>
                  {temasFiltrados.map((tema) => (
                    <option key={String(tema.id)} value={String(tema.id)}>
                      {nombreDe(tema)}
                    </option>
                  ))}
                </select>

                <input
                  value={subtemaTitulo}
                  onChange={(e) => setSubtemaTitulo(e.target.value)}
                  placeholder="Ej. Idea principal"
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <textarea
                  value={subtemaDescripcion}
                  onChange={(e) => setSubtemaDescripcion(e.target.value)}
                  placeholder="Descripción breve del subtema"
                  className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <div className="flex flex-wrap gap-3">
                  <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                    {editandoId ? "Actualizar subtema" : "Guardar subtema"}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      onClick={limpiarFormulario}
                      className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold">Subtemas registrados</h2>

              {!temaId ? (
                <p className="text-slate-400">
                  Selecciona una materia y una unidad/tema para ver sus
                  subtemas.
                </p>
              ) : subtemas.length === 0 ? (
                <p className="text-slate-400">
                  Esta unidad todavía no tiene subtemas.
                </p>
              ) : (
                <div className="grid gap-4">
                  {subtemas.map((subtema, index) => (
                    <div
                      key={subtema.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <p className="text-xs font-bold uppercase text-sky-400">
                            Subtema {index + 1}
                          </p>

                          <h3 className="mt-1 text-xl font-bold">
                            {nombreDe(subtema)}
                          </h3>

                          {subtema.descripcion && (
                            <p className="mt-2 text-sm text-slate-400">
                              {subtema.descripcion}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-500">
                            Orden: {subtema.orden || index + 1}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => moverSubtema(index, "arriba")}
                            disabled={index === 0}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40 hover:bg-slate-800"
                          >
                            ↑
                          </button>

                          <button
                            onClick={() => moverSubtema(index, "abajo")}
                            disabled={index === subtemas.length - 1}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40 hover:bg-slate-800"
                          >
                            ↓
                          </button>

                          <Link
                            href={`/admin/contenido-subtemas?subtema=${subtema.id}`}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                          >
                            Contenido
                          </Link>

                          <Link
                            href={`/subtemas/${subtema.id}`}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                          >
                            Ver
                          </Link>

                          <button
                            onClick={() => editarSubtema(subtema)}
                            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => eliminarSubtema(subtema.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}