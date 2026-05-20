"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RichExamEditor, isRichTextEmpty } from "@/components/RichExamEditor";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  tiempo_minutos?: number;
  pregunta?: string;
  imagen_pregunta?: string;
  opcion_a?: string;
  opcion_a_imagen?: string;
  opcion_b?: string;
  opcion_b_imagen?: string;
  opcion_c?: string;
  opcion_c_imagen?: string;
  opcion_d?: string;
  opcion_d_imagen?: string;
  respuesta_correcta?: string;
  explicacion?: string;
  orden?: number;
  materia_id?: string | number;
  id_materia?: string | number;
  materia?: string | number;
  tema_id?: string | number;
  unidad_id?: string | number;
  id_tema?: string | number;
  id_unidad?: string | number;
  tema?: string | number;
  unidad?: string | number;
  [key: string]: any;
};

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_PARCIALES = "parciales";
const TABLA_PREGUNTAS = "preguntas_parciales";

export default function AdminPreguntasParcialesPage() {
  const cargandoInicialRef = useRef(true);

  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [parciales, setParciales] = useState<Registro[]>([]);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);

  const [materiaId, setMateriaId] = useState("");
  const [temaId, setTemaId] = useState("");
  const [parcialId, setParcialId] = useState("");
  const [tiempoMinutos, setTiempoMinutos] = useState("0");

  const [pregunta, setPregunta] = useState("");
  const [opcionA, setOpcionA] = useState("");
  const [opcionB, setOpcionB] = useState("");
  const [opcionC, setOpcionC] = useState("");
  const [opcionD, setOpcionD] = useState("");

  const [respuestaCorrecta, setRespuestaCorrecta] = useState("A");
  const [explicacion, setExplicacion] = useState("");
  const [orden, setOrden] = useState("1");

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (cargandoInicialRef.current) return;

    if (!materiaId) {
      setTemas([]);
      setParciales([]);
      setPreguntas([]);
      setTemaId("");
      setParcialId("");
      limpiarFormulario();
      return;
    }

    cargarTemas(materiaId);
  }, [materiaId]);

  useEffect(() => {
    if (cargandoInicialRef.current) return;

    if (!temaId) {
      setParciales([]);
      setPreguntas([]);
      setParcialId("");
      limpiarFormulario();
      return;
    }

    cargarParciales(temaId);
  }, [temaId]);

  useEffect(() => {
    if (cargandoInicialRef.current) return;

    if (!parcialId) {
      setPreguntas([]);
      setTiempoMinutos("0");
      limpiarFormulario();
      return;
    }

    const parcial = parciales.find(
      (item) => String(item.id) === String(parcialId)
    );

    setTiempoMinutos(String(parcial?.tiempo_minutos ?? 0));
    cargarPreguntas(parcialId);
  }, [parcialId]);

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
      const ordenA = Number.isFinite(Number(a.orden)) ? Number(a.orden) : 0;
      const ordenB = Number.isFinite(Number(b.orden)) ? Number(b.orden) : 0;

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function siguienteOrden(lista: Registro[]) {
    const ordenesValidos = lista
      .map((item) => Number(item.orden ?? 0))
      .filter((numero) => Number.isFinite(numero));

    if (ordenesValidos.length === 0) return 1;

    return Math.max(...ordenesValidos) + 1;
  }

  function obtenerRelacion(item: Registro | null, columnas: string[]) {
    if (!item) return "";

    for (const columna of columnas) {
      const valor = item[columna];

      if (valor !== null && valor !== undefined && String(valor).trim()) {
        return String(valor);
      }
    }

    return "";
  }

  async function consultarPorId(tabla: string, id: string) {
    if (!id) return null;

    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error) {
      console.error(`Error consultando ${tabla} por id:`, error);
      return null;
    }

    return (data?.[0] ?? null) as Registro | null;
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

        if (lista.length > 0) return lista;
      }
    }

    return primeraRespuestaValida;
  }

  async function obtenerTemasDeMateria(idMateria: string) {
    if (!idMateria) return [];

    const temasData = await consultarConFallback(TABLA_TEMAS, [
      { columna: "materia_id", valor: idMateria },
      { columna: "id_materia", valor: idMateria },
      { columna: "materia", valor: idMateria },
    ]);

    return ordenarLista(temasData);
  }

  async function obtenerParcialesDeTema(idTema: string) {
    if (!idTema) return [];

    const parcialesData = await consultarConFallback(TABLA_PARCIALES, [
      { columna: "tema_id", valor: idTema },
      { columna: "unidad_id", valor: idTema },
      { columna: "id_tema", valor: idTema },
      { columna: "id_unidad", valor: idTema },
      { columna: "tema", valor: idTema },
      { columna: "unidad", valor: idTema },
    ]);

    return ordenarLista(parcialesData);
  }

  async function cargarDatosIniciales() {
    cargandoInicialRef.current = true;
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const params = new URLSearchParams(window.location.search);

      let materiaUrl = params.get("materia") || params.get("materiaId") || "";
      let temaUrl =
        params.get("tema") || params.get("temaId") || params.get("unidad") || "";
      const parcialUrl = params.get("parcial") || params.get("parcialId") || "";

      const { data: materiasData, error: materiasError } = await supabase
        .from(TABLA_MATERIAS)
        .select("*");

      if (materiasError) {
        console.error("Error cargando materias:", materiasError);
        setError("No se pudieron cargar las materias.");
        return;
      }

      setMaterias(ordenarLista(materiasData ?? []));

      let parcialDirecto: Registro | null = null;
      let temaDirecto: Registro | null = null;

      if (parcialUrl) {
        parcialDirecto = await consultarPorId(TABLA_PARCIALES, parcialUrl);

        if (!temaUrl) {
          temaUrl = obtenerRelacion(parcialDirecto, [
            "tema_id",
            "unidad_id",
            "id_tema",
            "id_unidad",
            "tema",
            "unidad",
          ]);
        }

        if (!materiaUrl) {
          materiaUrl = obtenerRelacion(parcialDirecto, [
            "materia_id",
            "id_materia",
            "materia",
          ]);
        }
      }

      if (temaUrl) {
        temaDirecto = await consultarPorId(TABLA_TEMAS, temaUrl);

        if (!materiaUrl) {
          materiaUrl = obtenerRelacion(temaDirecto, [
            "materia_id",
            "id_materia",
            "materia",
          ]);
        }
      }

      if (materiaUrl) {
        setMateriaId(materiaUrl);
        const temasLista = await obtenerTemasDeMateria(materiaUrl);

        if (
          temaDirecto &&
          !temasLista.some((item) => String(item.id) === String(temaDirecto?.id))
        ) {
          temasLista.push(temaDirecto);
        }

        setTemas(ordenarLista(temasLista));
      }

      if (temaUrl) {
        setTemaId(temaUrl);
        const parcialesLista = await obtenerParcialesDeTema(temaUrl);

        if (
          parcialDirecto &&
          !parcialesLista.some(
            (item) => String(item.id) === String(parcialDirecto?.id)
          )
        ) {
          parcialesLista.push(parcialDirecto);
        }

        setParciales(ordenarLista(parcialesLista));
      }

      if (parcialUrl) {
        setParcialId(parcialUrl);
        setTiempoMinutos(String(parcialDirecto?.tiempo_minutos ?? 0));
        await cargarPreguntas(parcialUrl);
      }
    } catch (err) {
      console.error("Error cargando datos iniciales:", err);
      setError("Ocurrió un error al cargar la pantalla de preguntas.");
    } finally {
      cargandoInicialRef.current = false;
      setCargando(false);
    }
  }

  async function cargarMaterias() {
    setCargando(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from(TABLA_MATERIAS)
      .select("*");

    if (fetchError) {
      console.error("Error cargando materias:", fetchError);
      setError("No se pudieron cargar las materias.");
      setCargando(false);
      return;
    }

    setMaterias(ordenarLista(data ?? []));
    setCargando(false);
  }

  async function cargarTemas(idMateria: string) {
    setCargando(true);
    setError("");
    setMensaje("");
    setTemaId("");
    setParcialId("");
    setParciales([]);
    setPreguntas([]);
    limpiarFormulario();

    const temasData = await obtenerTemasDeMateria(idMateria);

    setTemas(temasData);
    setCargando(false);
  }

  async function cargarParciales(idTema: string) {
    setCargando(true);
    setError("");
    setMensaje("");
    setParcialId("");
    setPreguntas([]);
    limpiarFormulario();

    const parcialesData = await obtenerParcialesDeTema(idTema);

    setParciales(parcialesData);
    setCargando(false);
  }

  async function cargarPreguntas(idParcial: string) {
    setCargando(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("parcial_id", idParcial);

    if (fetchError) {
      console.error("Error cargando preguntas:", fetchError);
      setError("No se pudieron cargar las preguntas.");
      setCargando(false);
      return;
    }

    const listaOrdenada = ordenarLista(data ?? []);
    setPreguntas(listaOrdenada);

    if (!editandoId) {
      setOrden(String(siguienteOrden(listaOrdenada)));
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setPregunta("");
    setOpcionA("");
    setOpcionB("");
    setOpcionC("");
    setOpcionD("");
    setRespuestaCorrecta("A");
    setExplicacion("");
    setOrden("1");
  }

  async function guardarTiempoParcial() {
    if (!parcialId) {
      setError("Selecciona un parcial.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const { error: updateError } = await supabase
      .from(TABLA_PARCIALES)
      .update({ tiempo_minutos: Number(tiempoMinutos) || 0 })
      .eq("id", parcialId);

    if (updateError) {
      console.error("Error guardando tiempo:", updateError);
      setError("No se pudo guardar el tiempo del parcial.");
      setGuardando(false);
      return;
    }

    setParciales((lista) =>
      lista.map((item) =>
        String(item.id) === String(parcialId)
          ? { ...item, tiempo_minutos: Number(tiempoMinutos) || 0 }
          : item
      )
    );

    setMensaje("Tiempo del parcial guardado.");
    setGuardando(false);
  }

  async function guardarPregunta() {
    if (!materiaId || !temaId || !parcialId) {
      setError("Selecciona materia, unidad y parcial.");
      return;
    }

    if (isRichTextEmpty(pregunta)) {
      setError("Escribe la pregunta o pega una imagen.");
      return;
    }

    if (isRichTextEmpty(opcionA) || isRichTextEmpty(opcionB)) {
      setError("Al menos debes llenar la opción A y la opción B.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      parcial_id: parcialId,
      pregunta,
      opcion_a: opcionA,
      opcion_b: opcionB,
      opcion_c: opcionC,
      opcion_d: opcionD,
      respuesta_correcta: respuestaCorrecta,
      explicacion: explicacion.trim(),
      orden: Number(orden) || 1,
    };

    const respuesta = editandoId
      ? await supabase.from(TABLA_PREGUNTAS).update(payload).eq("id", editandoId)
      : await supabase.from(TABLA_PREGUNTAS).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando pregunta:", respuesta.error);
      setError("No se pudo guardar la pregunta.");
      setGuardando(false);
      return;
    }

    await cargarPreguntas(parcialId);
    limpiarFormulario();
    setMensaje(editandoId ? "Pregunta actualizada." : "Pregunta agregada.");
    setGuardando(false);
  }

  function editarPregunta(item: Registro) {
    setEditandoId(item.id);
    setPregunta(String(item.pregunta ?? ""));
    setOpcionA(String(item.opcion_a ?? ""));
    setOpcionB(String(item.opcion_b ?? ""));
    setOpcionC(String(item.opcion_c ?? ""));
    setOpcionD(String(item.opcion_d ?? ""));
    setRespuestaCorrecta(String(item.respuesta_correcta ?? "A").toUpperCase());
    setExplicacion(String(item.explicacion ?? ""));
    setOrden(String(item.orden ?? 1));
    setMensaje("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarPregunta(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta pregunta?");
    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: deleteError } = await supabase
      .from(TABLA_PREGUNTAS)
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error eliminando pregunta:", deleteError);
      setError("No se pudo eliminar la pregunta.");
      return;
    }

    if (parcialId) {
      await cargarPreguntas(parcialId);
    }

    setMensaje("Pregunta eliminada.");
  }

  function VistaHtml({ html }: { html?: string }) {
    if (!html || isRichTextEmpty(html)) return null;

    return (
      <div
        className="prose-exam mt-2 text-slate-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const materiaSeleccionada = materias.find(
    (materia) => String(materia.id) === String(materiaId)
  );

  const temaSeleccionado = temas.find(
    (tema) => String(tema.id) === String(temaId)
  );

  const parcialSeleccionado = parciales.find(
    (parcial) => String(parcial.id) === String(parcialId)
  );

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white sm:p-8">
            <div className="relative z-10 max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Admin
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Preguntas de parciales
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50 sm:text-base">
                Agrega preguntas con formato, imágenes, tiempo límite y
                respuestas correctas. Si entras desde el botón “Preguntas”, el
                parcial se carga automáticamente.
              </p>
            </div>

            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-16 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
          </div>

          <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin?seccion=parciales"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                ← Volver a parciales
              </Link>

              {parcialSeleccionado && (
                <Link
                  href={`/parciales/${parcialSeleccionado.id}`}
                  target="_blank"
                  className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                >
                  Vista alumno ↗
                </Link>
              )}
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-700 shadow-sm">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {cargando && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-700 shadow-sm">
            Cargando...
          </div>
        )}

        {parcialSeleccionado ? (
          <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
                  Parcial seleccionado
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {obtenerTitulo(parcialSeleccionado)}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Materia: {obtenerTitulo(materiaSeleccionada) || "—"} · Unidad:{" "}
                  {obtenerTitulo(temaSeleccionado) || "—"} · Preguntas:{" "}
                  {preguntas.length}
                </p>

                {obtenerDescripcion(parcialSeleccionado) && (
                  <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
                    {obtenerDescripcion(parcialSeleccionado)}
                  </p>
                )}
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📝
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-amber-900">
              Selecciona un parcial
            </h2>

            <p className="mt-3 text-sm leading-6 text-amber-800">
              Puedes entrar desde el botón “Preguntas” de un parcial o elegir la
              materia, unidad y parcial manualmente.
            </p>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[520px_1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold text-blue-600">
                Editor de pregunta
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {editandoId ? "Editar pregunta" : "Agregar pregunta"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Materia
                </label>

                <select
                  value={materiaId}
                  onChange={(e) => setMateriaId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
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
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Unidad / tema
                </label>

                <select
                  value={temaId}
                  onChange={(e) => setTemaId(e.target.value)}
                  disabled={!materiaId}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Parcial
                </label>

                <select
                  value={parcialId}
                  onChange={(e) => setParcialId(e.target.value)}
                  disabled={!temaId}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecciona un parcial</option>
                  {parciales.map((parcial) => (
                    <option key={parcial.id} value={parcial.id}>
                      {obtenerTitulo(parcial)}
                    </option>
                  ))}
                </select>
              </div>

              {parcialId && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-amber-900">
                    Tiempo límite del parcial en minutos
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={tiempoMinutos}
                    onChange={(e) => setTiempoMinutos(e.target.value)}
                    className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400"
                  />

                  <p className="mt-2 text-sm text-amber-800">
                    Usa 0 para dejar el parcial sin límite.
                  </p>

                  <button
                    type="button"
                    onClick={guardarTiempoParcial}
                    disabled={guardando}
                    className="mt-3 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar tiempo
                  </button>
                </div>
              )}

              <RichExamEditor
                label="Pregunta con formato"
                value={pregunta}
                onChange={setPregunta}
                placeholder="Escribe la pregunta. También puedes pegar una imagen con Ctrl + V."
                folder="parciales"
              />

              <RichExamEditor
                label="Opción A"
                value={opcionA}
                onChange={setOpcionA}
                placeholder="Texto, fórmula o imagen de la opción A"
                folder="parciales"
              />

              <RichExamEditor
                label="Opción B"
                value={opcionB}
                onChange={setOpcionB}
                placeholder="Texto, fórmula o imagen de la opción B"
                folder="parciales"
              />

              <RichExamEditor
                label="Opción C"
                value={opcionC}
                onChange={setOpcionC}
                placeholder="Texto, fórmula o imagen de la opción C"
                folder="parciales"
              />

              <RichExamEditor
                label="Opción D"
                value={opcionD}
                onChange={setOpcionD}
                placeholder="Texto, fórmula o imagen de la opción D"
                folder="parciales"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Respuesta correcta
                  </label>

                  <select
                    value={respuestaCorrecta}
                    onChange={(e) => setRespuestaCorrecta(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Orden
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={orden}
                    onChange={(e) => setOrden(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Explicación
                </label>

                <textarea
                  value={explicacion}
                  onChange={(e) => setExplicacion(e.target.value)}
                  rows={4}
                  placeholder="Explica por qué esa es la respuesta correcta"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={guardarPregunta}
                  disabled={guardando || !parcialId}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Agregar pregunta"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Preguntas del parcial seleccionado
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {parcialSeleccionado
                    ? obtenerTitulo(parcialSeleccionado)
                    : "Selecciona un parcial"}
                </h2>

                {parcialSeleccionado && obtenerDescripcion(parcialSeleccionado) && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {obtenerDescripcion(parcialSeleccionado)}
                  </p>
                )}
              </div>

              {parcialSeleccionado && (
                <Link
                  href={`/parciales/${parcialSeleccionado.id}`}
                  target="_blank"
                  className="inline-flex rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Ver como alumno ↗
                </Link>
              )}
            </div>

            {!cargando && !parcialId && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Selecciona materia, unidad y parcial para ver sus preguntas.
              </div>
            )}

            {!cargando && parcialId && preguntas.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Este parcial todavía no tiene preguntas.
              </div>
            )}

            <div className="space-y-4">
              {preguntas.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="w-full">
                      <p className="text-sm font-medium text-slate-500">
                        Pregunta {index + 1} · Orden: {item.orden ?? "Sin orden"}
                      </p>

                      <VistaHtml html={item.pregunta} />

                      <div className="mt-4 grid gap-3 text-sm text-slate-700">
                        {[
                          ["A", item.opcion_a],
                          ["B", item.opcion_b],
                          ["C", item.opcion_c],
                          ["D", item.opcion_d],
                        ].map(([letra, html]: any) => (
                          <div
                            key={letra}
                            className={`rounded-2xl border p-3 ${
                              String(item.respuesta_correcta).toUpperCase() === letra
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <p className="mb-2 font-bold text-slate-900">
                              {letra})
                            </p>
                            <VistaHtml html={html} />
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-sm font-bold text-emerald-700">
                        Respuesta correcta: {item.respuesta_correcta}
                      </p>

                      {item.explicacion && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm font-bold text-amber-900">
                            Explicación
                          </p>
                          <p className="mt-2 text-sm leading-6 text-amber-800">
                            {item.explicacion}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editarPregunta(item)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarPregunta(item.id)}
                        className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
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

      <style jsx global>{`
        .prose-exam {
          line-height: 1.7;
        }

        .prose-exam img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #cbd5e1;
        }

        .prose-exam h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0.5rem 0;
          color: #020617;
        }

        .prose-exam ul {
          list-style: disc;
          padding-left: 1.5rem;
        }

        .prose-exam ol {
          list-style: decimal;
          padding-left: 1.5rem;
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