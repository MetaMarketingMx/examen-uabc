"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminProtegido from "@/components/AdminProtegido";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
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

type Seccion =
  | "solicitudes"
  | "materias"
  | "temas"
  | "subtemas"
  | "parciales"
  | "simuladores";

const TABLA_MATERIAS = "materias";
const TABLA_TEMAS = "temas";
const TABLA_SUBTEMAS = "subtemas";
const TABLA_PARCIALES = "parciales";
const TABLA_SIMULADORES = "simuladores";

const secciones: { id: Seccion; texto: string }[] = [
  { id: "solicitudes", texto: "Solicitudes alumnos" },
  { id: "materias", texto: "Materias" },
  { id: "temas", texto: "Temas / unidades" },
  { id: "subtemas", texto: "Subtemas" },
  { id: "parciales", texto: "Parciales" },
  { id: "simuladores", texto: "Simuladores" },
];

export default function AdminPage() {
  const [seccion, setSeccion] = useState<Seccion>("solicitudes");

  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [temasParaSubtemas, setTemasParaSubtemas] = useState<Registro[]>([]);
  const [subtemas, setSubtemas] = useState<Registro[]>([]);
  const [temasParaParciales, setTemasParaParciales] = useState<Registro[]>([]);
  const [parciales, setParciales] = useState<Registro[]>([]);
  const [simuladores, setSimuladores] = useState<Registro[]>([]);

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [materiaEditandoId, setMateriaEditandoId] = useState<
    string | number | null
  >(null);
  const [materiaTitulo, setMateriaTitulo] = useState("");
  const [materiaDescripcion, setMateriaDescripcion] = useState("");
  const [materiaOrden, setMateriaOrden] = useState("1");

  const [temaMateriaId, setTemaMateriaId] = useState("");
  const [temaEditandoId, setTemaEditandoId] = useState<string | number | null>(
    null
  );
  const [temaTitulo, setTemaTitulo] = useState("");
  const [temaDescripcion, setTemaDescripcion] = useState("");
  const [temaOrden, setTemaOrden] = useState("1");

  const [subtemaMateriaId, setSubtemaMateriaId] = useState("");
  const [subtemaTemaId, setSubtemaTemaId] = useState("");
  const [subtemaEditandoId, setSubtemaEditandoId] = useState<
    string | number | null
  >(null);
  const [subtemaTitulo, setSubtemaTitulo] = useState("");
  const [subtemaDescripcion, setSubtemaDescripcion] = useState("");
  const [subtemaOrden, setSubtemaOrden] = useState("1");

  const [parcialMateriaId, setParcialMateriaId] = useState("");
  const [parcialTemaId, setParcialTemaId] = useState("");
  const [parcialEditandoId, setParcialEditandoId] = useState<
    string | number | null
  >(null);
  const [parcialTitulo, setParcialTitulo] = useState("");
  const [parcialDescripcion, setParcialDescripcion] = useState("");
  const [parcialOrden, setParcialOrden] = useState("1");

  const [simuladorEditandoId, setSimuladorEditandoId] = useState<
    string | number | null
  >(null);
  const [simuladorTitulo, setSimuladorTitulo] = useState("");
  const [simuladorDescripcion, setSimuladorDescripcion] = useState("");
  const [simuladorOrden, setSimuladorOrden] = useState("1");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seccionUrl = params.get("seccion");

    if (
      seccionUrl === "solicitudes" ||
      seccionUrl === "materias" ||
      seccionUrl === "temas" ||
      seccionUrl === "subtemas" ||
      seccionUrl === "parciales" ||
      seccionUrl === "simuladores"
    ) {
      setSeccion(seccionUrl);
    }

    cargarInicial();
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

  function siguienteOrden(lista: Registro[]) {
    if (lista.length === 0) return 1;

    const ordenesValidos = lista
      .map((item) => Number(item.orden ?? 0))
      .filter((numero) => Number.isFinite(numero));

    if (ordenesValidos.length === 0) return 1;

    return Math.max(...ordenesValidos) + 1;
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

  async function cargarInicial() {
    setCargando(true);
    await cargarMaterias();
    await cargarSimuladores();
    setCargando(false);
  }

  async function cargarMaterias() {
    const { data, error } = await supabase.from(TABLA_MATERIAS).select("*");

    if (error) {
      console.error("Error cargando materias:", error);
      alert("No se pudieron cargar las materias.");
      return;
    }

    const lista = ordenarLista(data ?? []);
    setMaterias(lista);

    if (!materiaEditandoId) {
      setMateriaOrden(String(siguienteOrden(lista)));
    }
  }

  async function obtenerTemasDeMateria(idMateria: string) {
    if (!idMateria) return [];

    const data = await consultarConFallback(TABLA_TEMAS, [
      { columna: "materia_id", valor: idMateria },
      { columna: "id_materia", valor: idMateria },
      { columna: "materia", valor: idMateria },
    ]);

    return ordenarLista(data);
  }

  async function obtenerSubtemasDeTema(idTema: string) {
    if (!idTema) return [];

    const data = await consultarConFallback(TABLA_SUBTEMAS, [
      { columna: "tema_id", valor: idTema },
      { columna: "unidad_id", valor: idTema },
      { columna: "id_tema", valor: idTema },
      { columna: "id_unidad", valor: idTema },
      { columna: "tema", valor: idTema },
      { columna: "unidad", valor: idTema },
    ]);

    return ordenarLista(data);
  }

  async function obtenerParcialesDeTema(idTema: string) {
    if (!idTema) return [];

    const data = await consultarConFallback(TABLA_PARCIALES, [
      { columna: "tema_id", valor: idTema },
      { columna: "unidad_id", valor: idTema },
      { columna: "id_tema", valor: idTema },
      { columna: "id_unidad", valor: idTema },
      { columna: "tema", valor: idTema },
      { columna: "unidad", valor: idTema },
    ]);

    return ordenarLista(data);
  }

  async function cargarSimuladores() {
    const { data, error } = await supabase.from(TABLA_SIMULADORES).select("*");

    if (error) {
      console.error("Error cargando simuladores:", error);
      alert("No se pudieron cargar los simuladores.");
      return;
    }

    const lista = ordenarLista(data ?? []);
    setSimuladores(lista);

    if (!simuladorEditandoId) {
      setSimuladorOrden(String(siguienteOrden(lista)));
    }
  }

  async function guardarConFallback(
    tabla: string,
    payloads: Record<string, any>[],
    editandoId: string | number | null
  ) {
    let ultimoError: any = null;

    for (const payload of payloads) {
      const respuesta = editandoId
        ? await supabase.from(tabla).update(payload).eq("id", editandoId)
        : await supabase.from(tabla).insert(payload);

      if (!respuesta.error) {
        return null;
      }

      ultimoError = respuesta.error;
    }

    return ultimoError;
  }

  function crearPayloadsTitulo(
    titulo: string,
    descripcion: string,
    orden: number,
    relaciones: Record<string, string | number>[]
  ) {
    const variantesTitulo = [
      { titulo, descripcion },
      { nombre: titulo, descripcion },
      { title: titulo, description: descripcion },
    ];

    const payloads: Record<string, any>[] = [];

    if (relaciones.length === 0) {
      for (const variante of variantesTitulo) {
        payloads.push({
          ...variante,
          orden,
        });
      }
    } else {
      for (const relacion of relaciones) {
        for (const variante of variantesTitulo) {
          payloads.push({
            ...relacion,
            ...variante,
            orden,
          });
        }
      }
    }

    return payloads;
  }

  function limpiarMateria() {
    setMateriaEditandoId(null);
    setMateriaTitulo("");
    setMateriaDescripcion("");
    setMateriaOrden("1");
  }

  function limpiarTema() {
    setTemaEditandoId(null);
    setTemaTitulo("");
    setTemaDescripcion("");
    setTemaOrden("1");
  }

  function limpiarSubtema() {
    setSubtemaEditandoId(null);
    setSubtemaTitulo("");
    setSubtemaDescripcion("");
    setSubtemaOrden("1");
  }

  function limpiarParcial() {
    setParcialEditandoId(null);
    setParcialTitulo("");
    setParcialDescripcion("");
    setParcialOrden("1");
  }

  function limpiarSimulador() {
    setSimuladorEditandoId(null);
    setSimuladorTitulo("");
    setSimuladorDescripcion("");
    setSimuladorOrden("1");
  }

  async function seleccionarMateriaParaTemas(idMateria: string) {
    setTemaMateriaId(idMateria);
    setTemas([]);
    limpiarTema();

    if (!idMateria) return;

    setCargando(true);
    const lista = await obtenerTemasDeMateria(idMateria);
    setTemas(lista);
    setTemaOrden(String(siguienteOrden(lista)));
    setCargando(false);
  }

  async function seleccionarMateriaParaSubtemas(idMateria: string) {
    setSubtemaMateriaId(idMateria);
    setSubtemaTemaId("");
    setTemasParaSubtemas([]);
    setSubtemas([]);
    limpiarSubtema();

    if (!idMateria) return;

    setCargando(true);
    const lista = await obtenerTemasDeMateria(idMateria);
    setTemasParaSubtemas(lista);
    setCargando(false);
  }

  async function seleccionarTemaParaSubtemas(idTema: string) {
    setSubtemaTemaId(idTema);
    setSubtemas([]);
    limpiarSubtema();

    if (!idTema) return;

    setCargando(true);
    const lista = await obtenerSubtemasDeTema(idTema);
    setSubtemas(lista);
    setSubtemaOrden(String(siguienteOrden(lista)));
    setCargando(false);
  }

  async function seleccionarMateriaParaParciales(idMateria: string) {
    setParcialMateriaId(idMateria);
    setParcialTemaId("");
    setTemasParaParciales([]);
    setParciales([]);
    limpiarParcial();

    if (!idMateria) return;

    setCargando(true);
    const lista = await obtenerTemasDeMateria(idMateria);
    setTemasParaParciales(lista);
    setCargando(false);
  }

  async function seleccionarTemaParaParciales(idTema: string) {
    setParcialTemaId(idTema);
    setParciales([]);
    limpiarParcial();

    if (!idTema) return;

    setCargando(true);
    const lista = await obtenerParcialesDeTema(idTema);
    setParciales(lista);
    setParcialOrden(String(siguienteOrden(lista)));
    setCargando(false);
  }

  async function guardarMateria() {
    if (!materiaTitulo.trim()) {
      alert("Escribe el nombre de la materia.");
      return;
    }

    setGuardando(true);

    const error = await guardarConFallback(
      TABLA_MATERIAS,
      crearPayloadsTitulo(
        materiaTitulo.trim(),
        materiaDescripcion.trim(),
        Number(materiaOrden) || 1,
        []
      ),
      materiaEditandoId
    );

    if (error) {
      console.error("Error guardando materia:", error);
      alert("No se pudo guardar la materia.");
      setGuardando(false);
      return;
    }

    await cargarMaterias();
    limpiarMateria();
    setGuardando(false);
  }

  function editarMateria(materia: Registro) {
    setSeccion("materias");
    setMateriaEditandoId(materia.id);
    setMateriaTitulo(obtenerTitulo(materia));
    setMateriaDescripcion(obtenerDescripcion(materia));
    setMateriaOrden(String(materia.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarMateria(id: string | number) {
    const confirmar = confirm(
      "¿Seguro que quieres eliminar esta materia? Si tiene temas relacionados, puede fallar."
    );

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_MATERIAS).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando materia:", error);
      alert("No se pudo eliminar la materia. Puede tener temas relacionados.");
      return;
    }

    await cargarMaterias();
  }

  async function guardarTema() {
    if (!temaMateriaId) {
      alert("Selecciona una materia.");
      return;
    }

    if (!temaTitulo.trim()) {
      alert("Escribe el nombre del tema/unidad.");
      return;
    }

    setGuardando(true);

    const relaciones = [
      { materia_id: temaMateriaId },
      { id_materia: temaMateriaId },
      { materia: temaMateriaId },
    ];

    const error = await guardarConFallback(
      TABLA_TEMAS,
      crearPayloadsTitulo(
        temaTitulo.trim(),
        temaDescripcion.trim(),
        Number(temaOrden) || 1,
        relaciones
      ),
      temaEditandoId
    );

    if (error) {
      console.error("Error guardando tema:", error);
      alert("No se pudo guardar el tema/unidad.");
      setGuardando(false);
      return;
    }

    const lista = await obtenerTemasDeMateria(temaMateriaId);
    setTemas(lista);
    limpiarTema();
    setTemaOrden(String(siguienteOrden(lista)));
    setGuardando(false);
  }

  function editarTema(tema: Registro) {
    setSeccion("temas");
    setTemaEditandoId(tema.id);
    setTemaTitulo(obtenerTitulo(tema));
    setTemaDescripcion(obtenerDescripcion(tema));
    setTemaOrden(String(tema.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarTema(id: string | number) {
    const confirmar = confirm(
      "¿Seguro que quieres eliminar este tema/unidad? Si tiene subtemas relacionados, puede fallar."
    );

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_TEMAS).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando tema:", error);
      alert("No se pudo eliminar el tema. Puede tener subtemas relacionados.");
      return;
    }

    if (temaMateriaId) {
      const lista = await obtenerTemasDeMateria(temaMateriaId);
      setTemas(lista);
      setTemaOrden(String(siguienteOrden(lista)));
    }
  }

  async function guardarSubtema() {
    if (!subtemaMateriaId) {
      alert("Selecciona una materia.");
      return;
    }

    if (!subtemaTemaId) {
      alert("Selecciona un tema/unidad.");
      return;
    }

    if (!subtemaTitulo.trim()) {
      alert("Escribe el nombre del subtema.");
      return;
    }

    setGuardando(true);

    const relaciones = [
      { tema_id: subtemaTemaId },
      { unidad_id: subtemaTemaId },
      { id_tema: subtemaTemaId },
      { id_unidad: subtemaTemaId },
      { tema: subtemaTemaId },
      { unidad: subtemaTemaId },
    ];

    const error = await guardarConFallback(
      TABLA_SUBTEMAS,
      crearPayloadsTitulo(
        subtemaTitulo.trim(),
        subtemaDescripcion.trim(),
        Number(subtemaOrden) || 1,
        relaciones
      ),
      subtemaEditandoId
    );

    if (error) {
      console.error("Error guardando subtema:", error);
      alert("No se pudo guardar el subtema.");
      setGuardando(false);
      return;
    }

    const lista = await obtenerSubtemasDeTema(subtemaTemaId);
    setSubtemas(lista);
    limpiarSubtema();
    setSubtemaOrden(String(siguienteOrden(lista)));
    setGuardando(false);
  }

  function editarSubtema(subtema: Registro) {
    setSeccion("subtemas");
    setSubtemaEditandoId(subtema.id);
    setSubtemaTitulo(obtenerTitulo(subtema));
    setSubtemaDescripcion(obtenerDescripcion(subtema));
    setSubtemaOrden(String(subtema.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarSubtema(id: string | number) {
    const confirmar = confirm(
      "¿Seguro que quieres eliminar este subtema? Si tiene contenido relacionado, puede fallar."
    );

    if (!confirmar) return;

    const { error } = await supabase.from(TABLA_SUBTEMAS).delete().eq("id", id);

    if (error) {
      console.error("Error eliminando subtema:", error);
      alert(
        "No se pudo eliminar el subtema. Puede tener contenido relacionado."
      );
      return;
    }

    if (subtemaTemaId) {
      const lista = await obtenerSubtemasDeTema(subtemaTemaId);
      setSubtemas(lista);
      setSubtemaOrden(String(siguienteOrden(lista)));
    }
  }

  async function guardarParcial() {
    if (!parcialMateriaId) {
      alert("Selecciona una materia.");
      return;
    }

    if (!parcialTemaId) {
      alert("Selecciona una unidad/tema.");
      return;
    }

    if (!parcialTitulo.trim()) {
      alert("Escribe el nombre del parcial.");
      return;
    }

    setGuardando(true);

    const relaciones = [
      { materia_id: parcialMateriaId, tema_id: parcialTemaId },
      { materia_id: parcialMateriaId, unidad_id: parcialTemaId },
      { materia_id: parcialMateriaId, id_tema: parcialTemaId },
      { materia_id: parcialMateriaId, id_unidad: parcialTemaId },
      { tema_id: parcialTemaId },
      { unidad_id: parcialTemaId },
      { id_tema: parcialTemaId },
      { id_unidad: parcialTemaId },
      { tema: parcialTemaId },
      { unidad: parcialTemaId },
    ];

    const error = await guardarConFallback(
      TABLA_PARCIALES,
      crearPayloadsTitulo(
        parcialTitulo.trim(),
        parcialDescripcion.trim(),
        Number(parcialOrden) || 1,
        relaciones
      ),
      parcialEditandoId
    );

    if (error) {
      console.error("Error guardando parcial:", error);
      alert("No se pudo guardar el parcial.");
      setGuardando(false);
      return;
    }

    const lista = await obtenerParcialesDeTema(parcialTemaId);
    setParciales(lista);
    limpiarParcial();
    setParcialOrden(String(siguienteOrden(lista)));
    setGuardando(false);
  }

  function editarParcial(parcial: Registro) {
    setSeccion("parciales");
    setParcialEditandoId(parcial.id);
    setParcialTitulo(obtenerTitulo(parcial));
    setParcialDescripcion(obtenerDescripcion(parcial));
    setParcialOrden(String(parcial.orden ?? 1));
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

    if (parcialTemaId) {
      const lista = await obtenerParcialesDeTema(parcialTemaId);
      setParciales(lista);
      setParcialOrden(String(siguienteOrden(lista)));
    }
  }

  async function guardarSimulador() {
    if (!simuladorTitulo.trim()) {
      alert("Escribe el nombre del simulador.");
      return;
    }

    setGuardando(true);

    const error = await guardarConFallback(
      TABLA_SIMULADORES,
      crearPayloadsTitulo(
        simuladorTitulo.trim(),
        simuladorDescripcion.trim(),
        Number(simuladorOrden) || 1,
        []
      ),
      simuladorEditandoId
    );

    if (error) {
      console.error("Error guardando simulador:", error);
      alert("No se pudo guardar el simulador.");
      setGuardando(false);
      return;
    }

    await cargarSimuladores();
    limpiarSimulador();
    setGuardando(false);
  }

  function editarSimulador(simulador: Registro) {
    setSeccion("simuladores");
    setSimuladorEditandoId(simulador.id);
    setSimuladorTitulo(obtenerTitulo(simulador));
    setSimuladorDescripcion(obtenerDescripcion(simulador));
    setSimuladorOrden(String(simulador.orden ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarSimulador(id: string | number) {
    const confirmar = confirm("¿Seguro que quieres eliminar este simulador?");

    if (!confirmar) return;

    const { error } = await supabase
      .from(TABLA_SIMULADORES)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando simulador:", error);
      alert("No se pudo eliminar el simulador.");
      return;
    }

    await cargarSimuladores();
  }

  async function moverOrden(
    tabla: string,
    lista: Registro[],
    index: number,
    direccion: -1 | 1,
    recargar: () => Promise<void>
  ) {
    const nuevoIndex = index + direccion;

    if (nuevoIndex < 0 || nuevoIndex >= lista.length) return;

    const actual = lista[index];
    const objetivo = lista[nuevoIndex];

    const ordenActual = Number(actual.orden ?? index + 1);
    const ordenObjetivo = Number(objetivo.orden ?? nuevoIndex + 1);

    const r1 = await supabase
      .from(tabla)
      .update({ orden: ordenObjetivo })
      .eq("id", actual.id);

    if (r1.error) {
      console.error("Error moviendo orden:", r1.error);
      alert("No se pudo cambiar el orden.");
      return;
    }

    const r2 = await supabase
      .from(tabla)
      .update({ orden: ordenActual })
      .eq("id", objetivo.id);

    if (r2.error) {
      console.error("Error moviendo orden:", r2.error);
      alert("No se pudo cambiar el orden.");
      return;
    }

    await recargar();
  }

  return (
    <AdminProtegido>
      <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white sm:p-8">
              <div className="relative z-10 max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                  Admin
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Panel de administración
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">
                  Edita materias, temas, subtemas, parciales y simuladores.
                  También puedes modificar el orden, abrir vista previa y
                  administrar preguntas.
                </p>
              </div>

              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute right-16 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
            </div>

            <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                {secciones.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSeccion(item.id)}
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      seccion === item.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {item.texto}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {cargando && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-700">
              Cargando...
            </div>
          )}

          {seccion === "solicitudes" && (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
                Solicitudes de alumnos
              </p>

              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                Aprobar registros y accesos
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                En esta sección puedes revisar alumnos registrados, aprobar su
                acceso, suspenderlos, reactivarlos, rechazarlos, asignar sede,
                grupo y agregar observaciones internas.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/admin/registros"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Revisar solicitudes de alumnos
                </Link>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <InfoAdminCard
                  titulo="Pendientes"
                  subtitulo="Revisar nuevos registros"
                  texto="Entra a solicitudes para validar alumnos que aún no tienen acceso."
                  color="amber"
                />

                <InfoAdminCard
                  titulo="Acceso"
                  subtitulo="Aprobar o suspender"
                  texto="Puedes activar, suspender o reactivar el acceso sin borrar los datos del alumno."
                  color="emerald"
                />

                <InfoAdminCard
                  titulo="Avisos"
                  subtitulo="Mensajes por WhatsApp"
                  texto="Al aprobar, suspender, reactivar o rechazar se genera el mensaje para avisar al alumno."
                  color="blue"
                />
              </div>
            </section>
          )}

          {seccion === "materias" && (
            <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-slate-950">
                  {materiaEditandoId ? "Editar materia" : "Crear materia"}
                </h2>

                <div className="space-y-4">
                  <CampoInput
                    label="Nombre de la materia"
                    value={materiaTitulo}
                    onChange={setMateriaTitulo}
                    placeholder="Ejemplo: Comprensión lectora"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={materiaDescripcion}
                    onChange={setMateriaDescripcion}
                  />

                  <CampoInput
                    label="Orden"
                    type="number"
                    min="1"
                    value={materiaOrden}
                    onChange={setMateriaOrden}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarMateria}
                      disabled={guardando}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : materiaEditandoId
                        ? "Guardar cambios"
                        : "Crear materia"}
                    </button>

                    {materiaEditandoId && (
                      <button
                        type="button"
                        onClick={limpiarMateria}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-semibold text-slate-950">
                  Materias registradas
                </h2>

                <div className="space-y-4">
                  {materias.map((materia, index) => (
                    <article
                      key={materia.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <RegistroHeader
                        orden={materia.orden}
                        titulo={obtenerTitulo(materia)}
                        descripcion={obtenerDescripcion(materia)}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <BotonOrden
                          texto="↑"
                          disabled={index === 0}
                          onClick={() =>
                            moverOrden(
                              TABLA_MATERIAS,
                              materias,
                              index,
                              -1,
                              cargarMaterias
                            )
                          }
                        />

                        <BotonOrden
                          texto="↓"
                          disabled={index === materias.length - 1}
                          onClick={() =>
                            moverOrden(
                              TABLA_MATERIAS,
                              materias,
                              index,
                              1,
                              cargarMaterias
                            )
                          }
                        />

                        <BotonLink href={`/materias/${materia.id}`} target>
                          Vista alumno
                        </BotonLink>

                        <BotonSecundario onClick={() => editarMateria(materia)}>
                          Editar
                        </BotonSecundario>

                        <BotonPeligro
                          onClick={() => eliminarMateria(materia.id)}
                        >
                          Eliminar
                        </BotonPeligro>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {seccion === "temas" && (
            <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-slate-950">
                  {temaEditandoId ? "Editar tema/unidad" : "Crear tema/unidad"}
                </h2>

                <div className="space-y-4">
                  <CampoSelect
                    label="Materia"
                    value={temaMateriaId}
                    onChange={seleccionarMateriaParaTemas}
                    placeholder="Selecciona una materia"
                    opciones={materias}
                    obtenerTexto={obtenerTitulo}
                  />

                  <CampoInput
                    label="Nombre del tema/unidad"
                    value={temaTitulo}
                    onChange={setTemaTitulo}
                    placeholder="Ejemplo: Idea principal"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={temaDescripcion}
                    onChange={setTemaDescripcion}
                  />

                  <CampoInput
                    label="Orden"
                    type="number"
                    min="1"
                    value={temaOrden}
                    onChange={setTemaOrden}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarTema}
                      disabled={guardando || !temaMateriaId}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : temaEditandoId
                        ? "Guardar cambios"
                        : "Crear tema"}
                    </button>

                    {temaEditandoId && (
                      <button
                        type="button"
                        onClick={limpiarTema}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-semibold text-slate-950">
                  Temas de la materia
                </h2>

                {!temaMateriaId && (
                  <AvisoVacio texto="Selecciona una materia para ver sus temas." />
                )}

                <div className="space-y-4">
                  {temas.map((tema, index) => (
                    <article
                      key={tema.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <RegistroHeader
                        orden={tema.orden}
                        titulo={obtenerTitulo(tema)}
                        descripcion={obtenerDescripcion(tema)}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <BotonOrden
                          texto="↑"
                          disabled={index === 0}
                          onClick={() =>
                            moverOrden(
                              TABLA_TEMAS,
                              temas,
                              index,
                              -1,
                              async () => {
                                if (temaMateriaId) {
                                  const lista = await obtenerTemasDeMateria(
                                    temaMateriaId
                                  );
                                  setTemas(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonOrden
                          texto="↓"
                          disabled={index === temas.length - 1}
                          onClick={() =>
                            moverOrden(
                              TABLA_TEMAS,
                              temas,
                              index,
                              1,
                              async () => {
                                if (temaMateriaId) {
                                  const lista = await obtenerTemasDeMateria(
                                    temaMateriaId
                                  );
                                  setTemas(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonLink
                          href={
                            temaMateriaId
                              ? `/materias/${temaMateriaId}`
                              : "/materias"
                          }
                          target
                        >
                          Vista alumno
                        </BotonLink>

                        <BotonSecundario onClick={() => editarTema(tema)}>
                          Editar
                        </BotonSecundario>

                        <BotonPeligro onClick={() => eliminarTema(tema.id)}>
                          Eliminar
                        </BotonPeligro>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {seccion === "subtemas" && (
            <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-slate-950">
                  {subtemaEditandoId ? "Editar subtema" : "Crear subtema"}
                </h2>

                <div className="space-y-4">
                  <CampoSelect
                    label="Materia"
                    value={subtemaMateriaId}
                    onChange={seleccionarMateriaParaSubtemas}
                    placeholder="Selecciona una materia"
                    opciones={materias}
                    obtenerTexto={obtenerTitulo}
                  />

                  <CampoSelect
                    label="Tema / unidad"
                    value={subtemaTemaId}
                    onChange={seleccionarTemaParaSubtemas}
                    placeholder="Selecciona un tema/unidad"
                    opciones={temasParaSubtemas}
                    obtenerTexto={obtenerTitulo}
                    disabled={!subtemaMateriaId}
                  />

                  <CampoInput
                    label="Nombre del subtema"
                    value={subtemaTitulo}
                    onChange={setSubtemaTitulo}
                    placeholder="Ejemplo: Idea principal explícita"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={subtemaDescripcion}
                    onChange={setSubtemaDescripcion}
                  />

                  <CampoInput
                    label="Orden"
                    type="number"
                    min="1"
                    value={subtemaOrden}
                    onChange={setSubtemaOrden}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarSubtema}
                      disabled={guardando || !subtemaTemaId}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : subtemaEditandoId
                        ? "Guardar cambios"
                        : "Crear subtema"}
                    </button>

                    {subtemaEditandoId && (
                      <button
                        type="button"
                        onClick={limpiarSubtema}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-semibold text-slate-950">
                  Subtemas del tema
                </h2>

                {!subtemaTemaId && (
                  <AvisoVacio texto="Selecciona una materia y un tema para ver sus subtemas." />
                )}

                <div className="space-y-4">
                  {subtemas.map((subtema, index) => (
                    <article
                      key={subtema.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <RegistroHeader
                        orden={subtema.orden}
                        titulo={obtenerTitulo(subtema)}
                        descripcion={obtenerDescripcion(subtema)}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <BotonOrden
                          texto="↑"
                          disabled={index === 0}
                          onClick={() =>
                            moverOrden(
                              TABLA_SUBTEMAS,
                              subtemas,
                              index,
                              -1,
                              async () => {
                                if (subtemaTemaId) {
                                  const lista = await obtenerSubtemasDeTema(
                                    subtemaTemaId
                                  );
                                  setSubtemas(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonOrden
                          texto="↓"
                          disabled={index === subtemas.length - 1}
                          onClick={() =>
                            moverOrden(
                              TABLA_SUBTEMAS,
                              subtemas,
                              index,
                              1,
                              async () => {
                                if (subtemaTemaId) {
                                  const lista = await obtenerSubtemasDeTema(
                                    subtemaTemaId
                                  );
                                  setSubtemas(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonLink
                          href={`/admin/contenido-subtemas?materia=${subtemaMateriaId}&tema=${subtemaTemaId}&subtema=${subtema.id}`}
                          color="cyan"
                        >
                          Administrar contenido
                        </BotonLink>

                        <BotonLink
                          href={
                            subtemaMateriaId
                              ? `/materias/${subtemaMateriaId}`
                              : "/materias"
                          }
                          target
                        >
                          Vista alumno
                        </BotonLink>

                        <BotonSecundario onClick={() => editarSubtema(subtema)}>
                          Editar
                        </BotonSecundario>

                        <BotonPeligro
                          onClick={() => eliminarSubtema(subtema.id)}
                        >
                          Eliminar
                        </BotonPeligro>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {seccion === "parciales" && (
            <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-slate-950">
                  {parcialEditandoId ? "Editar parcial" : "Crear parcial"}
                </h2>

                <div className="space-y-4">
                  <CampoSelect
                    label="Materia"
                    value={parcialMateriaId}
                    onChange={seleccionarMateriaParaParciales}
                    placeholder="Selecciona una materia"
                    opciones={materias}
                    obtenerTexto={obtenerTitulo}
                  />

                  <CampoSelect
                    label="Unidad / tema"
                    value={parcialTemaId}
                    onChange={seleccionarTemaParaParciales}
                    placeholder="Selecciona una unidad/tema"
                    opciones={temasParaParciales}
                    obtenerTexto={obtenerTitulo}
                    disabled={!parcialMateriaId}
                  />

                  <CampoInput
                    label="Nombre del parcial"
                    value={parcialTitulo}
                    onChange={setParcialTitulo}
                    placeholder="Ejemplo: Parcial de idea principal"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={parcialDescripcion}
                    onChange={setParcialDescripcion}
                  />

                  <CampoInput
                    label="Orden"
                    type="number"
                    min="1"
                    value={parcialOrden}
                    onChange={setParcialOrden}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarParcial}
                      disabled={guardando || !parcialTemaId}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : parcialEditandoId
                        ? "Guardar cambios"
                        : "Crear parcial"}
                    </button>

                    {parcialEditandoId && (
                      <button
                        type="button"
                        onClick={limpiarParcial}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  <BotonLink
                    href={
                      parcialMateriaId && parcialTemaId
                        ? `/admin/preguntas-parciales?materia=${parcialMateriaId}&tema=${parcialTemaId}`
                        : "/admin/preguntas-parciales"
                    }
                    color="amber"
                  >
                    Administrar preguntas →
                  </BotonLink>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-semibold text-slate-950">
                  Parciales de la unidad
                </h2>

                {!parcialTemaId && (
                  <AvisoVacio texto="Selecciona una materia y unidad para ver sus parciales." />
                )}

                <div className="space-y-4">
                  {parciales.map((parcial, index) => (
                    <article
                      key={parcial.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <RegistroHeader
                        orden={parcial.orden}
                        titulo={obtenerTitulo(parcial)}
                        descripcion={obtenerDescripcion(parcial)}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <BotonOrden
                          texto="↑"
                          disabled={index === 0}
                          onClick={() =>
                            moverOrden(
                              TABLA_PARCIALES,
                              parciales,
                              index,
                              -1,
                              async () => {
                                if (parcialTemaId) {
                                  const lista = await obtenerParcialesDeTema(
                                    parcialTemaId
                                  );
                                  setParciales(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonOrden
                          texto="↓"
                          disabled={index === parciales.length - 1}
                          onClick={() =>
                            moverOrden(
                              TABLA_PARCIALES,
                              parciales,
                              index,
                              1,
                              async () => {
                                if (parcialTemaId) {
                                  const lista = await obtenerParcialesDeTema(
                                    parcialTemaId
                                  );
                                  setParciales(lista);
                                }
                              }
                            )
                          }
                        />

                        <BotonLink href={`/parciales/${parcial.id}`} target>
                          Vista alumno
                        </BotonLink>

                        <BotonLink
                          href={`/admin/preguntas-parciales?materia=${parcialMateriaId}&tema=${parcialTemaId}&parcial=${parcial.id}`}
                          color="amber"
                        >
                          Preguntas
                        </BotonLink>

                        <BotonSecundario onClick={() => editarParcial(parcial)}>
                          Editar
                        </BotonSecundario>

                        <BotonPeligro
                          onClick={() => eliminarParcial(parcial.id)}
                        >
                          Eliminar
                        </BotonPeligro>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {seccion === "simuladores" && (
            <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-slate-950">
                  {simuladorEditandoId
                    ? "Editar simulador"
                    : "Crear simulador"}
                </h2>

                <div className="space-y-4">
                  <CampoInput
                    label="Nombre del simulador"
                    value={simuladorTitulo}
                    onChange={setSimuladorTitulo}
                    placeholder="Ejemplo: Simulador general 1"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={simuladorDescripcion}
                    onChange={setSimuladorDescripcion}
                  />

                  <CampoInput
                    label="Orden"
                    type="number"
                    min="1"
                    value={simuladorOrden}
                    onChange={setSimuladorOrden}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={guardarSimulador}
                      disabled={guardando}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : simuladorEditandoId
                        ? "Guardar cambios"
                        : "Crear simulador"}
                    </button>

                    {simuladorEditandoId && (
                      <button
                        type="button"
                        onClick={limpiarSimulador}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  <BotonLink href="/admin/preguntas-simuladores" color="cyan">
                    Administrar preguntas →
                  </BotonLink>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-semibold text-slate-950">
                  Simuladores registrados
                </h2>

                {simuladores.length === 0 && (
                  <AvisoVacio texto="Todavía no hay simuladores." />
                )}

                <div className="space-y-4">
                  {simuladores.map((simulador, index) => (
                    <article
                      key={simulador.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <RegistroHeader
                        orden={simulador.orden}
                        titulo={obtenerTitulo(simulador)}
                        descripcion={obtenerDescripcion(simulador)}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <BotonOrden
                          texto="↑"
                          disabled={index === 0}
                          onClick={() =>
                            moverOrden(
                              TABLA_SIMULADORES,
                              simuladores,
                              index,
                              -1,
                              cargarSimuladores
                            )
                          }
                        />

                        <BotonOrden
                          texto="↓"
                          disabled={index === simuladores.length - 1}
                          onClick={() =>
                            moverOrden(
                              TABLA_SIMULADORES,
                              simuladores,
                              index,
                              1,
                              cargarSimuladores
                            )
                          }
                        />

                        <BotonLink href={`/simuladores/${simulador.id}`} target>
                          Vista alumno
                        </BotonLink>

                        <BotonLink
                          href={`/admin/secciones-simuladores?simulador=${simulador.id}`}
                          color="purple"
                        >
                          Secciones
                        </BotonLink>

                        <BotonLink
                          href={`/admin/instrucciones-simuladores?simulador=${simulador.id}`}
                          color="emerald"
                        >
                          Instrucciones
                        </BotonLink>

                        <BotonLink
                          href={`/admin/preguntas-simuladores?simulador=${simulador.id}`}
                          color="cyan"
                        >
                          Preguntas
                        </BotonLink>

                        <BotonSecundario
                          onClick={() => editarSimulador(simulador)}
                        >
                          Editar
                        </BotonSecundario>

                        <BotonPeligro
                          onClick={() => eliminarSimulador(simulador.id)}
                        >
                          Eliminar
                        </BotonPeligro>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </AdminProtegido>
  );
}

function CampoInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
      />
    </div>
  );
}

function CampoTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
      />
    </div>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  placeholder,
  opciones,
  obtenerTexto,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  opciones: Registro[];
  obtenerTexto: (item: Registro | null | undefined) => string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>

        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {obtenerTexto(opcion)}
          </option>
        ))}
      </select>
    </div>
  );
}

function RegistroHeader({
  orden,
  titulo,
  descripcion,
}: {
  orden?: number;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">Orden: {orden ?? "Sin orden"}</p>

      <h3 className="mt-1 text-2xl font-semibold text-slate-950">{titulo}</h3>

      {descripcion && (
        <p className="mt-2 text-sm leading-6 text-slate-500">{descripcion}</p>
      )}
    </div>
  );
}

function BotonOrden({
  texto,
  disabled,
  onClick,
}: {
  texto: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {texto}
    </button>
  );
}

function BotonSecundario({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function BotonPeligro({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
    >
      {children}
    </button>
  );
}

function BotonLink({
  href,
  children,
  target = false,
  color = "blue",
}: {
  href: string;
  children: ReactNode;
  target?: boolean;
  color?: "blue" | "cyan" | "amber" | "purple" | "emerald";
}) {
  const colores = {
    blue: "border-blue-100 text-blue-700 hover:bg-blue-50",
    cyan: "border-cyan-100 text-cyan-700 hover:bg-cyan-50",
    amber: "border-amber-100 text-amber-700 hover:bg-amber-50",
    purple: "border-purple-100 text-purple-700 hover:bg-purple-50",
    emerald: "border-emerald-100 text-emerald-700 hover:bg-emerald-50",
  };

  return (
    <Link
      href={href}
      target={target ? "_blank" : undefined}
      rel={target ? "noopener noreferrer" : undefined}
      className={`inline-flex rounded-2xl border bg-white px-3 py-2 text-sm font-semibold ${colores[color]}`}
    >
      {children}
    </Link>
  );
}

function AvisoVacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
      {texto}
    </div>
  );
}

function InfoAdminCard({
  titulo,
  subtitulo,
  texto,
  color,
}: {
  titulo: string;
  subtitulo: string;
  texto: string;
  color: "amber" | "emerald" | "blue";
}) {
  const estilos = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`rounded-2xl border p-5 ${estilos[color]}`}>
      <p className="text-sm font-semibold">{titulo}</p>

      <h3 className="mt-2 text-xl font-semibold text-slate-950">{subtitulo}</h3>

      <p className="mt-2 text-sm leading-6">{texto}</p>
    </div>
  );
}