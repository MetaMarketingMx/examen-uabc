"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  materia_id?: string | number;
  tema_id?: string | number;
  [key: string]: any;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_PARCIALES = "parciales";

export default function AdminParcialesPage() {
  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [parciales, setParciales] = useState<Registro[]>([]);

  const [materiaId, setMateriaId] = useState("");
  const [temaId, setTemaId] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState("1");

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarMaterias();
  }, []);

  useEffect(() => {
    if (!materiaId) {
      setTemas([]);
      setParciales([]);
      setTemaId("");
      limpiarFormulario();
      return;
    }

    cargarTemas(materiaId);
  }, [materiaId]);

  useEffect(() => {
    if (!temaId) {
      setParciales([]);
      limpiarFormulario();
      return;
    }

    cargarParciales(temaId);
  }, [temaId]);

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
    setParciales([]);
    limpiarFormulario();

    const temasData = await consultarConFallback(TABLA_TEMAS, [
      { columna: "materia_id", valor: idMateria },
      { columna: "id_materia", valor: idMateria },
      { columna: "materia", valor: idMateria },
    ]);

    setTemas(ordenarLista(temasData));
    setCargando(false);
  }

  async function cargarParciales(idTema: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_PARCIALES)
      .select("*")
      .eq("tema_id", idTema);

    if (error) {
      console.error("Error cargando parciales:", error);
      alert("No se pudieron cargar los parciales.");
      setCargando(false);
      return;
    }

    const listaOrdenada = ordenarLista(data ?? []);
    setParciales(listaOrdenada);

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
    setTitulo("");
    setDescripcion("");
    setOrden("1");
  }

  function crearPayloads() {
    const tituloFinal = titulo.trim();
    const descripcionFinal = descripcion.trim();
    const ordenFinal = Number(orden) || 1;

    return [
      {
        materia_id: materiaId,
        tema_id: temaId,
        titulo: tituloFinal,
        descripcion: descripcionFinal,
        orden: ordenFinal,
      },
      {
        materia_id: materiaId,
        tema_id: temaId,
        nombre: tituloFinal,
        descripcion: descripcionFinal,
        orden: ordenFinal,
      },
      {
        materia_id: materiaId,
        tema_id: temaId,
        title: tituloFinal,
        description: descripcionFinal,
        orden: ordenFinal,
      },
    ];
  }

  async function guardarConFallback(payloads: Record<string, any>[]) {
    let ultimoError: any = null;

    for (const payload of payloads) {
      const respuesta = editandoId
        ? await supabase.from(TABLA_PARCIALES).update(payload).eq("id", editandoId)
        : await supabase.from(TABLA_PARCIALES).insert(payload);

      if (!respuesta.error) {
        return null;
      }

      ultimoError = respuesta.error;
    }

    return ultimoError;
  }

  async function guardarParcial() {
    if (!materiaId) {
      alert("Selecciona una materia.");
      return;
    }

    if (!temaId) {
      alert("Selecciona una unidad/tema.");
      return;
    }

    if (!titulo.trim()) {
      alert("Escribe el nombre del parcial.");
      return;
    }

    setGuardando(true);

    const error = await guardarConFallback(crearPayloads());

    if (error) {
      console.error("Error guardando parcial:", error);
      alert("No se pudo guardar el parcial. Revisa la consola.");
      setGuardando(false);
      return;
    }

    await cargarParciales(temaId);
    limpiarFormulario();
    setGuardando(false);
  }

  function editarParcial(parcial: Registro) {
    setEditandoId(parcial.id);
    setTitulo(obtenerTitulo(parcial));
    setDescripcion(obtenerDescripcion(parcial));
    setOrden(String(parcial.orden ?? 1));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarParcial(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar este parcial?");

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_PARCIALES).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando parcial:", error);
      alert("No se pudo eliminar el parcial.");
      return;
    }

    if (temaId) {
      await cargarParciales(temaId);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">Parciales por unidad</h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Asigna cada parcial al final de una unidad o tema. Después podremos agregarle preguntas.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold">
              {editandoId ? "Editar parcial" : "Crear parcial"}
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
                  Unidad / tema
                </label>

                <select
                  value={temaId}
                  onChange={(e) => setTemaId(e.target.value)}
                  disabled={!materiaId}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Selecciona una unidad/tema</option>
                  {temas.map((tema) => (
                    <option key={tema.id} value={tema.id}>
                      {obtenerTitulo(tema)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Nombre del parcial
                </label>

                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ejemplo: Parcial de idea principal"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ejemplo: Responde este parcial al terminar la unidad."
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarParcial}
                  disabled={guardando || !materiaId || !temaId}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Crear parcial"}
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

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm text-slate-400">
                Parciales de la unidad seleccionada
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                {temaId
                  ? obtenerTitulo(
                      temas.find((tema) => String(tema.id) === String(temaId))
                    )
                  : "Selecciona una unidad"}
              </h2>
            </div>

            {cargando && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                Cargando...
              </div>
            )}

            {!cargando && !temaId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Selecciona una materia y una unidad/tema para ver sus parciales.
              </div>
            )}

            {!cargando && temaId && parciales.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Esta unidad todavía no tiene parciales.
              </div>
            )}

            <div className="space-y-4">
              {parciales.map((parcial) => (
                <article
                  key={parcial.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Orden: {parcial.orden ?? "Sin orden"}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        {obtenerTitulo(parcial)}
                      </h3>

                      {obtenerDescripcion(parcial) && (
                        <p className="mt-2 text-slate-400">
                          {obtenerDescripcion(parcial)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editarParcial(parcial)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarParcial(parcial.id)}
                        className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}