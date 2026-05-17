"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RichExamEditor, isRichTextEmpty } from "@/components/RichExamEditor";

type Registro = {
  id: string | number;
  titulo?: string;
  nombre?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  tiempo_minutos?: number;
  pregunta?: string;
  opcion_a?: string;
  opcion_b?: string;
  opcion_c?: string;
  opcion_d?: string;
  respuesta_correcta?: string;
  explicacion?: string;
  orden?: number;
  simulador_id?: string | number;
  seccion_id?: string | number | null;
  area?: string | null;
  orden_en_seccion?: number | null;
  [key: string]: any;
};

type SeccionSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  orden?: number | null;
};

type InstruccionSimulador = {
  id: string | number;
  simulador_id?: string | number | null;
  titulo?: string | null;
  contenido?: string | null;
  orden?: number | null;
};

type ElementoContenido =
  | {
      tipo: "instruccion";
      id: string;
      orden: number;
      instruccion: InstruccionSimulador;
    }
  | {
      tipo: "pregunta";
      id: string;
      orden: number;
      pregunta: Registro;
    };

const TABLA_SIMULADORES = "simuladores";
const TABLA_SECCIONES = "secciones_simuladores";
const TABLA_PREGUNTAS = "preguntas_simuladores";
const TABLA_INSTRUCCIONES = "instrucciones_simuladores";

export default function AdminPreguntasSimuladoresPage() {
  const searchParams = useSearchParams();
  const simuladorUrl = searchParams.get("simulador") || "";

  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [secciones, setSecciones] = useState<SeccionSimulador[]>([]);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);
  const [instrucciones, setInstrucciones] = useState<InstruccionSimulador[]>(
    []
  );

  const [simuladorId, setSimuladorId] = useState(simuladorUrl);
  const [tiempoMinutos, setTiempoMinutos] = useState("0");

  const [seccionId, setSeccionId] = useState("");
  const [ordenEnSeccion, setOrdenEnSeccion] = useState("1");

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

  const [editandoInstruccionId, setEditandoInstruccionId] = useState<
    string | number | null
  >(null);
  const [tituloInstruccion, setTituloInstruccion] = useState("");
  const [contenidoInstruccion, setContenidoInstruccion] = useState("");
  const [guardandoInstruccion, setGuardandoInstruccion] = useState(false);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  useEffect(() => {
    if (simuladorUrl) {
      setSimuladorId(simuladorUrl);
    }
  }, [simuladorUrl]);

  useEffect(() => {
    if (!simuladorId) {
      setPreguntas([]);
      setSecciones([]);
      setInstrucciones([]);
      setTiempoMinutos("0");
      limpiarFormularioPregunta(false);
      limpiarFormularioInstruccion();
      return;
    }

    const simulador = simuladores.find(
      (item) => String(item.id) === String(simuladorId)
    );

    setTiempoMinutos(String(simulador?.tiempo_minutos ?? 0));
    cargarSecciones(simuladorId);
    cargarInstrucciones(simuladorId);
    cargarPreguntas(simuladorId);
  }, [simuladorId, simuladores]);

  useEffect(() => {
    if (secciones.length > 0 && !seccionId && !editandoId) {
      setSeccionId(String(secciones[0].id));
    }
  }, [secciones, seccionId, editandoId]);

  useEffect(() => {
    if (!editandoId) {
      const siguienteGeneral = obtenerSiguienteOrdenGeneral();
      const siguienteSeccion = obtenerSiguienteOrdenSeccion(seccionId);

      setOrden(String(siguienteGeneral));
      setOrdenEnSeccion(String(siguienteSeccion));
    }
  }, [preguntas, instrucciones, seccionId, editandoId]);

  function obtenerTitulo(
    item: Registro | SeccionSimulador | InstruccionSimulador | null | undefined
  ) {
    if (!item) return "";

    const anyItem = item as any;

    return String(
      anyItem.nombre ??
        anyItem.titulo ??
        anyItem.title ??
        `Registro ${anyItem.id}`
    );
  }

  function obtenerDescripcion(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.descripcion ?? item.description ?? "");
  }

  function ordenarRegistros<
    T extends { id: string | number; orden?: number | null }
  >(lista: T[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function ordenarPreguntasPorSeccion(lista: Registro[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden_en_seccion ?? a.orden ?? 0);
      const ordenB = Number(b.orden_en_seccion ?? b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  function obtenerSiguienteOrdenGeneral(
    preguntasLista: Registro[] = preguntas,
    instruccionesLista: InstruccionSimulador[] = instrucciones
  ) {
    const ordenes = [
      ...preguntasLista.map((item) => Number(item.orden ?? 0)),
      ...instruccionesLista.map((item) => Number(item.orden ?? 0)),
    ];

    if (ordenes.length === 0) return 1;

    return Math.max(...ordenes) + 1;
  }

  function obtenerSiguienteOrdenSeccion(idSeccion: string) {
    const preguntasDeSeccion = preguntas.filter((item) => {
      if (!idSeccion) return !item.seccion_id;
      return String(item.seccion_id ?? "") === String(idSeccion);
    });

    const ordenes = preguntasDeSeccion.map((item) =>
      Number(item.orden_en_seccion ?? item.orden ?? 0)
    );

    if (ordenes.length === 0) return 1;

    return Math.max(...ordenes) + 1;
  }

  function construirContenidoOrdenado(): ElementoContenido[] {
    const elementos: ElementoContenido[] = [
      ...instrucciones.map((item) => ({
        tipo: "instruccion" as const,
        id: `instruccion-${item.id}`,
        orden: Number(item.orden ?? 0),
        instruccion: item,
      })),
      ...preguntas.map((item) => ({
        tipo: "pregunta" as const,
        id: `pregunta-${item.id}`,
        orden: Number(item.orden ?? 0),
        pregunta: item,
      })),
    ];

    return elementos.sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;

      if (a.tipo !== b.tipo) {
        return a.tipo === "instruccion" ? -1 : 1;
      }

      return a.id.localeCompare(b.id);
    });
  }

  function preguntasMismaSeccion(preguntaBase: Registro) {
    return ordenarPreguntasPorSeccion(
      preguntas.filter((item) => {
        const base = String(preguntaBase.seccion_id ?? "");
        const actual = String(item.seccion_id ?? "");

        if (base || actual) return base === actual;

        return (item.area || "General") === (preguntaBase.area || "General");
      })
    );
  }

  async function cargarSimuladores() {
    setCargando(true);

    const { data, error } = await supabase.from(TABLA_SIMULADORES).select("*");

    if (error) {
      console.error("Error cargando simuladores:", error);
      alert("No se pudieron cargar los simuladores.");
      setCargando(false);
      return;
    }

    setSimuladores(ordenarRegistros((data ?? []) as Registro[]));
    setCargando(false);
  }

  async function cargarSecciones(idSimulador: string) {
    const { data, error } = await supabase
      .from(TABLA_SECCIONES)
      .select("*")
      .eq("simulador_id", String(idSimulador));

    if (error) {
      console.warn("No se pudieron cargar secciones_simuladores.", error);
      setSecciones([]);
      return;
    }

    setSecciones(ordenarRegistros((data ?? []) as SeccionSimulador[]));
  }

  async function cargarInstrucciones(idSimulador: string) {
    const { data, error } = await supabase
      .from(TABLA_INSTRUCCIONES)
      .select("*")
      .eq("simulador_id", String(idSimulador));

    if (error) {
      console.warn(
        "No se pudieron cargar instrucciones_simuladores. Revisa que exista la tabla.",
        error
      );
      setInstrucciones([]);
      return;
    }

    setInstrucciones(
      ordenarRegistros((data ?? []) as InstruccionSimulador[])
    );
  }

  async function cargarPreguntas(idSimulador: string) {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_PREGUNTAS)
      .select("*")
      .eq("simulador_id", idSimulador);

    if (error) {
      console.error("Error cargando preguntas:", error);
      alert("No se pudieron cargar las preguntas.");
      setCargando(false);
      return;
    }

    setPreguntas(ordenarRegistros((data ?? []) as Registro[]));
    setCargando(false);
  }

  function limpiarFormularioPregunta(mantenerSeccion = true) {
    const seccionActual = mantenerSeccion ? seccionId : "";

    setEditandoId(null);
    setPregunta("");
    setOpcionA("");
    setOpcionB("");
    setOpcionC("");
    setOpcionD("");
    setRespuestaCorrecta("A");
    setExplicacion("");

    if (!mantenerSeccion) {
      setSeccionId("");
    } else {
      setSeccionId(seccionActual);
    }

    const siguienteGeneral = obtenerSiguienteOrdenGeneral();
    const siguienteSeccion = obtenerSiguienteOrdenSeccion(seccionActual);

    setOrden(String(siguienteGeneral));
    setOrdenEnSeccion(String(siguienteSeccion));
  }

  function limpiarFormularioInstruccion() {
    setEditandoInstruccionId(null);
    setTituloInstruccion("");
    setContenidoInstruccion("");
  }

  async function guardarTiempoSimulador() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    const { error } = await supabase
      .from(TABLA_SIMULADORES)
      .update({ tiempo_minutos: Number(tiempoMinutos) || 0 })
      .eq("id", simuladorId);

    if (error) {
      console.error("Error guardando tiempo:", error);
      alert("No se pudo guardar el tiempo del simulador.");
      return;
    }

    alert("Tiempo del simulador guardado.");
    await cargarSimuladores();
  }

  function obtenerNombreSeccionSeleccionada() {
    const seccion = secciones.find(
      (item) => String(item.id) === String(seccionId)
    );

    return seccion ? obtenerTitulo(seccion) : "";
  }

  async function guardarInstruccion() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    if (!contenidoInstruccion.trim()) {
      alert("Escribe el texto de la instrucción.");
      return;
    }

    setGuardandoInstruccion(true);

    const siguienteOrden = obtenerSiguienteOrdenGeneral();

    const payload: any = {
      simulador_id: String(simuladorId),
      titulo: tituloInstruccion.trim() || null,
      contenido: contenidoInstruccion.trim(),
      updated_at: new Date().toISOString(),
    };

    if (!editandoInstruccionId) {
      payload.orden = siguienteOrden;
    }

    const respuesta = editandoInstruccionId
      ? await supabase
          .from(TABLA_INSTRUCCIONES)
          .update(payload)
          .eq("id", editandoInstruccionId)
      : await supabase.from(TABLA_INSTRUCCIONES).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando instrucción:", respuesta.error);
      alert(
        "No se pudo guardar la instrucción. Revisa que exista la tabla instrucciones_simuladores."
      );
      setGuardandoInstruccion(false);
      return;
    }

    await cargarInstrucciones(simuladorId);
    limpiarFormularioInstruccion();
    setGuardandoInstruccion(false);
  }

  function editarInstruccion(item: InstruccionSimulador) {
    setEditandoInstruccionId(item.id);
    setTituloInstruccion(String(item.titulo ?? ""));
    setContenidoInstruccion(String(item.contenido ?? ""));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarInstruccion(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta instrucción?");
    if (!confirmar) return;

    const { error } = await supabase
      .from(TABLA_INSTRUCCIONES)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando instrucción:", error);
      alert("No se pudo eliminar la instrucción.");
      return;
    }

    if (simuladorId) {
      await cargarInstrucciones(simuladorId);
    }
  }

  async function guardarPregunta() {
    if (!simuladorId) {
      alert("Selecciona un simulador.");
      return;
    }

    if (!seccionId && secciones.length > 0) {
      alert("Selecciona una sección para la pregunta.");
      return;
    }

    if (isRichTextEmpty(pregunta)) {
      alert("Escribe la pregunta o pega una imagen.");
      return;
    }

    if (isRichTextEmpty(opcionA) || isRichTextEmpty(opcionB)) {
      alert("Al menos debes llenar la opción A y la opción B.");
      return;
    }

    setGuardando(true);

    const nombreSeccion = obtenerNombreSeccionSeleccionada();

    const payload = {
      simulador_id: simuladorId,
      seccion_id: seccionId || null,
      area: seccionId ? nombreSeccion : null,
      orden_en_seccion: Number(ordenEnSeccion) || Number(orden) || 1,
      pregunta,
      opcion_a: opcionA,
      opcion_b: opcionB,
      opcion_c: opcionC,
      opcion_d: opcionD,
      respuesta_correcta: respuestaCorrecta,
      explicacion: explicacion.trim(),
      orden: Number(orden) || obtenerSiguienteOrdenGeneral(),
    };

    const respuesta = editandoId
      ? await supabase.from(TABLA_PREGUNTAS).update(payload).eq("id", editandoId)
      : await supabase.from(TABLA_PREGUNTAS).insert(payload);

    if (respuesta.error) {
      console.error("Error guardando pregunta:", respuesta.error);
      alert(
        "No se pudo guardar la pregunta. Revisa que existan las columnas seccion_id, area y orden_en_seccion."
      );
      setGuardando(false);
      return;
    }

    await cargarPreguntas(simuladorId);
    limpiarFormularioPregunta(true);
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
    setOrdenEnSeccion(String(item.orden_en_seccion ?? item.orden ?? 1));
    setSeccionId(item.seccion_id ? String(item.seccion_id) : "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarPregunta(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta pregunta?");
    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_PREGUNTAS).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando pregunta:", error);
      alert("No se pudo eliminar la pregunta.");
      return;
    }

    if (simuladorId) {
      await cargarPreguntas(simuladorId);
    }
  }

  async function moverPreguntaEnArea(preguntaBase: Registro, direccion: -1 | 1) {
    const listaArea = preguntasMismaSeccion(preguntaBase);
    const index = listaArea.findIndex(
      (item) => String(item.id) === String(preguntaBase.id)
    );

    const nuevoIndex = index + direccion;

    if (index === -1 || nuevoIndex < 0 || nuevoIndex >= listaArea.length) {
      return;
    }

    const preguntaActual = listaArea[index];
    const preguntaObjetivo = listaArea[nuevoIndex];

    const ordenGeneralActual = Number(preguntaActual.orden ?? 0);
    const ordenGeneralObjetivo = Number(preguntaObjetivo.orden ?? 0);

    const nuevaListaArea = [...listaArea];
    nuevaListaArea[index] = preguntaObjetivo;
    nuevaListaArea[nuevoIndex] = preguntaActual;

    const actualizacionesOrdenArea = nuevaListaArea.map((item, i) =>
      supabase
        .from(TABLA_PREGUNTAS)
        .update({ orden_en_seccion: i + 1 })
        .eq("id", item.id)
    );

    const intercambioOrdenGeneral = [
      supabase
        .from(TABLA_PREGUNTAS)
        .update({ orden: ordenGeneralObjetivo })
        .eq("id", preguntaActual.id),
      supabase
        .from(TABLA_PREGUNTAS)
        .update({ orden: ordenGeneralActual })
        .eq("id", preguntaObjetivo.id),
    ];

    const resultados = await Promise.all([
      ...actualizacionesOrdenArea,
      ...intercambioOrdenGeneral,
    ]);

    const error = resultados.find((resultado) => resultado.error)?.error;

    if (error) {
      console.error("Error moviendo pregunta:", error);
      alert("No se pudo mover la pregunta.");
      return;
    }

    if (simuladorId) {
      await cargarPreguntas(simuladorId);
    }
  }

  function puedeSubirPregunta(item: Registro) {
    const lista = preguntasMismaSeccion(item);
    return lista.findIndex((p) => String(p.id) === String(item.id)) > 0;
  }

  function puedeBajarPregunta(item: Registro) {
    const lista = preguntasMismaSeccion(item);
    const index = lista.findIndex((p) => String(p.id) === String(item.id));
    return index !== -1 && index < lista.length - 1;
  }

  function tablaDeElemento(elemento: ElementoContenido) {
    return elemento.tipo === "instruccion"
      ? TABLA_INSTRUCCIONES
      : TABLA_PREGUNTAS;
  }

  function idRealDeElemento(elemento: ElementoContenido) {
    return elemento.tipo === "instruccion"
      ? elemento.instruccion.id
      : elemento.pregunta.id;
  }

  async function actualizarOrdenGeneralCompleto(listaOrdenada: ElementoContenido[]) {
    const actualizaciones = listaOrdenada.map((elemento, index) =>
      supabase
        .from(tablaDeElemento(elemento))
        .update({ orden: index + 1 })
        .eq("id", idRealDeElemento(elemento))
    );

    const resultados = await Promise.all(actualizaciones);
    const error = resultados.find((resultado) => resultado.error)?.error;

    if (error) {
      console.error("Error actualizando orden general:", error);
      alert("No se pudo actualizar el orden.");
      return false;
    }

    return true;
  }

  async function moverElementoGeneral(
    elemento: ElementoContenido,
    direccion: -1 | 1
  ) {
    const lista = construirContenidoOrdenado();
    const index = lista.findIndex((item) => item.id === elemento.id);
    const nuevoIndex = index + direccion;

    if (index === -1 || nuevoIndex < 0 || nuevoIndex >= lista.length) return;

    const nuevaLista = [...lista];
    const temporal = nuevaLista[index];
    nuevaLista[index] = nuevaLista[nuevoIndex];
    nuevaLista[nuevoIndex] = temporal;

    const ok = await actualizarOrdenGeneralCompleto(nuevaLista);

    if (ok && simuladorId) {
      await cargarInstrucciones(simuladorId);
      await cargarPreguntas(simuladorId);
    }
  }

  function puedeSubirElemento(elemento: ElementoContenido) {
    const lista = construirContenidoOrdenado();
    const index = lista.findIndex((item) => item.id === elemento.id);
    return index > 0;
  }

  function puedeBajarElemento(elemento: ElementoContenido) {
    const lista = construirContenidoOrdenado();
    const index = lista.findIndex((item) => item.id === elemento.id);
    return index !== -1 && index < lista.length - 1;
  }

  function VistaHtml({ html }: { html?: string }) {
    if (!html || isRichTextEmpty(html)) return null;

    return (
      <div
        className="prose-exam mt-2 text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  function nombreAreaDePregunta(item: Registro) {
    if (item.seccion_id) {
      const seccion = secciones.find(
        (sec) => String(sec.id) === String(item.seccion_id)
      );

      if (seccion) return obtenerTitulo(seccion);
    }

    return item.area || "General";
  }

  const simuladorSeleccionado = simuladores.find(
    (simulador) => String(simulador.id) === String(simuladorId)
  );

  const contenidoOrdenado = construirContenidoOrdenado();
  const siguienteOrden = obtenerSiguienteOrdenGeneral();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Preguntas de simuladores
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Administra secciones, instrucciones simples y preguntas del
            simulador en una sola pantalla.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin?seccion=simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Volver al admin
            </Link>

            {simuladorId && (
              <Link
                href={`/admin/secciones-simuladores?simulador=${simuladorId}`}
                className="rounded-xl border border-purple-700 px-5 py-3 font-semibold text-purple-300 hover:bg-purple-950"
              >
                Administrar secciones
              </Link>
            )}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[520px_1fr]">
          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                Simulador y configuración
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Simulador
                  </label>

                  <select
                    value={simuladorId}
                    onChange={(e) => setSimuladorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Selecciona un simulador</option>
                    {simuladores.map((simulador) => (
                      <option key={simulador.id} value={simulador.id}>
                        {obtenerTitulo(simulador)}
                      </option>
                    ))}
                  </select>
                </div>

                {simuladorId && (
                  <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/20 p-4">
                    <label className="mb-2 block text-sm font-medium text-cyan-200">
                      Tiempo límite del simulador en minutos
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={tiempoMinutos}
                      onChange={(e) => setTiempoMinutos(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />

                    <p className="mt-2 text-sm text-slate-400">
                      Usa 0 para dejar el simulador sin límite.
                    </p>

                    <button
                      type="button"
                      onClick={guardarTiempoSimulador}
                      className="mt-3 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                    >
                      Guardar tiempo
                    </button>
                  </div>
                )}
              </div>
            </section>

            {simuladorId && (
              <section className="rounded-3xl border border-purple-800 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Secciones</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Las secciones sirven para clasificar las preguntas y sacar
                      resultados por área.
                    </p>
                  </div>

                  <Link
                    href={`/admin/secciones-simuladores?simulador=${simuladorId}`}
                    className="rounded-xl border border-purple-700 px-4 py-3 text-center text-sm font-semibold text-purple-300 hover:bg-purple-950"
                  >
                    Administrar secciones
                  </Link>
                </div>

                {secciones.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                    Todavía no hay secciones. Puedes agregarlas desde
                    “Administrar secciones”.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {secciones.map((seccion) => (
                      <span
                        key={seccion.id}
                        className="rounded-full border border-purple-700 bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-200"
                      >
                        {obtenerTitulo(seccion)}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {simuladorId && (
              <section className="rounded-3xl border border-emerald-800 bg-slate-900/80 p-6 shadow-xl">
                <h2 className="mb-2 text-xl font-bold">
                  {editandoInstruccionId
                    ? "Editar instrucción"
                    : "Agregar instrucción"}
                </h2>

                <p className="mb-5 text-sm leading-6 text-slate-400">
                  La instrucción es solo un texto sencillo. Se agregará
                  automáticamente después del último contenido del simulador.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Título opcional
                    </label>

                    <input
                      value={tituloInstruccion}
                      onChange={(e) => setTituloInstruccion(e.target.value)}
                      placeholder="Ejemplo: Lectura 1"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Texto de la instrucción
                    </label>

                    <textarea
                      value={contenidoInstruccion}
                      onChange={(e) => setContenidoInstruccion(e.target.value)}
                      rows={6}
                      placeholder="Ejemplo: Lee el siguiente texto y responde las preguntas que aparecen a continuación..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  {!editandoInstruccionId && (
                    <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                      Se agregará como contenido número {siguienteOrden}, justo
                      después del último contenido.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarInstruccion}
                      disabled={guardandoInstruccion}
                      className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {guardandoInstruccion
                        ? "Guardando..."
                        : editandoInstruccionId
                        ? "Guardar cambios"
                        : "Agregar instrucción"}
                    </button>

                    {editandoInstruccionId && (
                      <button
                        type="button"
                        onClick={limpiarFormularioInstruccion}
                        className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {editandoId ? "Editar pregunta" : "Agregar pregunta"}
              </h2>

              <div className="space-y-4">
                {simuladorId && (
                  <div className="rounded-2xl border border-purple-700/40 bg-purple-950/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-200">
                          Sección / área
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Elige la sección a la que pertenece esta pregunta.
                        </p>
                      </div>

                      <Link
                        href={`/admin/secciones-simuladores?simulador=${simuladorId}`}
                        className="rounded-xl border border-purple-700 px-4 py-2 text-center text-sm font-semibold text-purple-300 hover:bg-purple-950"
                      >
                        Administrar secciones
                      </Link>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Sección creada
                        </label>

                        <select
                          value={seccionId}
                          onChange={(e) => setSeccionId(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                        >
                          {secciones.length === 0 && (
                            <option value="">Sin secciones creadas</option>
                          )}

                          {secciones.map((seccion) => (
                            <option key={seccion.id} value={seccion.id}>
                              {obtenerTitulo(seccion)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Orden dentro de la sección
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={ordenEnSeccion}
                          onChange={(e) => setOrdenEnSeccion(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <RichExamEditor
                  label="Pregunta con formato"
                  value={pregunta}
                  onChange={setPregunta}
                  placeholder="Escribe la pregunta. También puedes pegar una imagen con Ctrl + V."
                  folder="simuladores"
                />

                <RichExamEditor
                  label="Opción A"
                  value={opcionA}
                  onChange={setOpcionA}
                  placeholder="Texto, fórmula o imagen de la opción A"
                  folder="simuladores"
                />

                <RichExamEditor
                  label="Opción B"
                  value={opcionB}
                  onChange={setOpcionB}
                  placeholder="Texto, fórmula o imagen de la opción B"
                  folder="simuladores"
                />

                <RichExamEditor
                  label="Opción C"
                  value={opcionC}
                  onChange={setOpcionC}
                  placeholder="Texto, fórmula o imagen de la opción C"
                  folder="simuladores"
                />

                <RichExamEditor
                  label="Opción D"
                  value={opcionD}
                  onChange={setOpcionD}
                  placeholder="Texto, fórmula o imagen de la opción D"
                  folder="simuladores"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Respuesta correcta
                    </label>

                    <select
                      value={respuestaCorrecta}
                      onChange={(e) => setRespuestaCorrecta(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Orden general dentro del simulador
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={orden}
                      onChange={(e) => setOrden(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Este orden decide dónde aparece la pregunta respecto a las
                      instrucciones.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Explicación
                  </label>

                  <textarea
                    value={explicacion}
                    onChange={(e) => setExplicacion(e.target.value)}
                    rows={4}
                    placeholder="Explica por qué esa es la respuesta correcta"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarPregunta}
                    disabled={guardando || !simuladorId}
                    className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                      onClick={() => limpiarFormularioPregunta(true)}
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm text-slate-400">
                Vista ordenada del simulador
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                {simuladorSeleccionado
                  ? obtenerTitulo(simuladorSeleccionado)
                  : "Selecciona un simulador"}
              </h2>

              {simuladorSeleccionado &&
                obtenerDescripcion(simuladorSeleccionado) && (
                  <p className="mt-2 text-slate-400">
                    {obtenerDescripcion(simuladorSeleccionado)}
                  </p>
                )}

              {simuladorSeleccionado && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/simuladores/${simuladorSeleccionado.id}`}
                    target="_blank"
                    className="inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    Ver como alumno →
                  </Link>

                  <Link
                    href={`/admin/secciones-simuladores?simulador=${simuladorSeleccionado.id}`}
                    className="inline-flex rounded-xl border border-purple-700 px-5 py-3 font-bold text-purple-300 hover:bg-purple-950"
                  >
                    Administrar secciones
                  </Link>
                </div>
              )}
            </div>

            {cargando && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                Cargando...
              </div>
            )}

            {!cargando && !simuladorId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Selecciona un simulador para ver su contenido.
              </div>
            )}

            {!cargando && simuladorId && contenidoOrdenado.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                Este simulador todavía no tiene instrucciones ni preguntas.
              </div>
            )}

            <div className="space-y-4">
              {contenidoOrdenado.map((elemento, index) => {
                if (elemento.tipo === "instruccion") {
                  const item = elemento.instruccion;

                  return (
                    <article
                      key={elemento.id}
                      className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="text-sm text-emerald-300">
                            Contenido {index + 1} · Instrucción · Orden{" "}
                            {item.orden ?? "Sin orden"}
                          </p>

                          {item.titulo && (
                            <h3 className="mt-2 text-xl font-bold">
                              {item.titulo}
                            </h3>
                          )}

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {item.contenido}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moverElementoGeneral(elemento, -1)}
                            disabled={!puedeSubirElemento(elemento)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() => moverElementoGeneral(elemento, 1)}
                            disabled={!puedeBajarElemento(elemento)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() => editarInstruccion(item)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarInstruccion(item.id)}
                            className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                const item = elemento.pregunta;

                return (
                  <article
                    key={elemento.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="w-full">
                        <p className="text-sm text-slate-500">
                          Contenido {index + 1} · Pregunta · Orden general:{" "}
                          {item.orden ?? "Sin orden"} · Orden sección:{" "}
                          {item.orden_en_seccion ?? item.orden ?? "Sin orden"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-purple-700 bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-200">
                            {nombreAreaDePregunta(item)}
                          </span>
                        </div>

                        <VistaHtml html={item.pregunta} />

                        <div className="mt-4 grid gap-3 text-sm text-slate-300">
                          {[
                            ["A", item.opcion_a],
                            ["B", item.opcion_b],
                            ["C", item.opcion_c],
                            ["D", item.opcion_d],
                          ].map(([letra, html]: any) => (
                            <div
                              key={letra}
                              className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                            >
                              <p className="mb-2 font-bold">{letra})</p>
                              <VistaHtml html={html} />
                            </div>
                          ))}
                        </div>

                        <p className="mt-4 text-sm font-bold text-green-300">
                          Respuesta correcta: {item.respuesta_correcta}
                        </p>

                        {item.explicacion && (
                          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-sm font-bold text-yellow-300">
                              Explicación
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              {item.explicacion}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moverPreguntaEnArea(item, -1)}
                          disabled={!puedeSubirPregunta(item)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() => moverPreguntaEnArea(item, 1)}
                          disabled={!puedeBajarPregunta(item)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => editarPregunta(item)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarPregunta(item.id)}
                          className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .prose-exam img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid #334155;
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