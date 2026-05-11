"use client";

import Link from "next/link";
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
    return Math.max(...lista.map((item) => Number(item.orden ?? 0))) + 1;
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
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Panel de administración
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Edita materias, temas, subtemas, parciales y simuladores. También
            puedes modificar el orden, abrir vista previa y administrar
            preguntas.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ["solicitudes", "Solicitudes alumnos"],
              ["materias", "Materias"],
              ["temas", "Temas / unidades"],
              ["subtemas", "Subtemas"],
              ["parciales", "Parciales"],
              ["simuladores", "Simuladores"],
            ].map(([id, texto]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSeccion(id as Seccion)}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  seccion === id
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </header>

        {cargando && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            Cargando...
          </div>
        )}

        {seccion === "solicitudes" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300">
              Solicitudes de alumnos
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Aprobar registros y accesos
            </h2>

            <p className="mt-3 max-w-3xl text-slate-400">
              En esta sección puedes revisar alumnos registrados, aprobar su
              acceso, suspenderlos, reactivarlos, rechazarlos, asignar sede,
              grupo y agregar observaciones internas.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/admin/registros"
                className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                Revisar solicitudes de alumnos
              </Link>

              <Link
                href="/resultados"
                className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Ver resultados
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Pendientes</p>
                <h3 className="mt-2 text-xl font-bold text-yellow-300">
                  Revisar nuevos registros
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Entra a solicitudes para validar alumnos que aún no tienen
                  acceso.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Acceso</p>
                <h3 className="mt-2 text-xl font-bold text-green-300">
                  Aprobar o suspender
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Puedes activar, suspender o reactivar el acceso sin borrar los
                  datos del alumno.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Avisos</p>
                <h3 className="mt-2 text-xl font-bold text-blue-300">
                  Mensajes por WhatsApp
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Al aprobar, suspender, reactivar o rechazar se genera el
                  mensaje para avisar al alumno.
                </p>
              </div>
            </div>
          </section>
        )}

        {seccion === "materias" && (
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {materiaEditandoId ? "Editar materia" : "Crear materia"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nombre de la materia
                  </label>
                  <input
                    value={materiaTitulo}
                    onChange={(e) => setMateriaTitulo(e.target.value)}
                    placeholder="Ejemplo: Comprensión lectora"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    value={materiaDescripcion}
                    onChange={(e) => setMateriaDescripcion(e.target.value)}
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
                    value={materiaOrden}
                    onChange={(e) => setMateriaOrden(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarMateria}
                    disabled={guardando}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
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
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-2xl font-bold">
                Materias registradas
              </h2>

              <div className="space-y-4">
                {materias.map((materia, index) => (
                  <article
                    key={materia.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Orden: {materia.orden ?? "Sin orden"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {obtenerTitulo(materia)}
                        </h3>

                        {obtenerDescripcion(materia) && (
                          <p className="mt-2 text-slate-400">
                            {obtenerDescripcion(materia)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moverOrden(
                              TABLA_MATERIAS,
                              materias,
                              index,
                              -1,
                              cargarMaterias
                            )
                          }
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moverOrden(
                              TABLA_MATERIAS,
                              materias,
                              index,
                              1,
                              cargarMaterias
                            )
                          }
                          disabled={index === materias.length - 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <Link
                          href={`/materias/${materia.id}`}
                          target="_blank"
                          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
                        >
                          Vista alumno
                        </Link>

                        <button
                          type="button"
                          onClick={() => editarMateria(materia)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarMateria(materia.id)}
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
        )}

        {seccion === "temas" && (
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {temaEditandoId ? "Editar tema/unidad" : "Crear tema/unidad"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Materia
                  </label>
                  <select
                    value={temaMateriaId}
                    onChange={(e) =>
                      seleccionarMateriaParaTemas(e.target.value)
                    }
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
                    Nombre del tema/unidad
                  </label>
                  <input
                    value={temaTitulo}
                    onChange={(e) => setTemaTitulo(e.target.value)}
                    placeholder="Ejemplo: Idea principal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    value={temaDescripcion}
                    onChange={(e) => setTemaDescripcion(e.target.value)}
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
                    value={temaOrden}
                    onChange={(e) => setTemaOrden(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarTema}
                    disabled={guardando || !temaMateriaId}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
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
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-2xl font-bold">
                Temas de la materia
              </h2>

              {!temaMateriaId && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                  Selecciona una materia para ver sus temas.
                </div>
              )}

              <div className="space-y-4">
                {temas.map((tema, index) => (
                  <article
                    key={tema.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Orden: {tema.orden ?? "Sin orden"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {obtenerTitulo(tema)}
                        </h3>

                        {obtenerDescripcion(tema) && (
                          <p className="mt-2 text-slate-400">
                            {obtenerDescripcion(tema)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
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
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
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
                          disabled={index === temas.length - 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <Link
                          href={
                            temaMateriaId
                              ? `/materias/${temaMateriaId}`
                              : "/materias"
                          }
                          target="_blank"
                          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
                        >
                          Vista alumno
                        </Link>

                        <button
                          type="button"
                          onClick={() => editarTema(tema)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarTema(tema.id)}
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
        )}

        {seccion === "subtemas" && (
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {subtemaEditandoId ? "Editar subtema" : "Crear subtema"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Materia
                  </label>
                  <select
                    value={subtemaMateriaId}
                    onChange={(e) =>
                      seleccionarMateriaParaSubtemas(e.target.value)
                    }
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
                    value={subtemaTemaId}
                    onChange={(e) =>
                      seleccionarTemaParaSubtemas(e.target.value)
                    }
                    disabled={!subtemaMateriaId}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecciona un tema/unidad</option>
                    {temasParaSubtemas.map((tema) => (
                      <option key={tema.id} value={tema.id}>
                        {obtenerTitulo(tema)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nombre del subtema
                  </label>
                  <input
                    value={subtemaTitulo}
                    onChange={(e) => setSubtemaTitulo(e.target.value)}
                    placeholder="Ejemplo: Idea principal explícita"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    value={subtemaDescripcion}
                    onChange={(e) => setSubtemaDescripcion(e.target.value)}
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
                    value={subtemaOrden}
                    onChange={(e) => setSubtemaOrden(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarSubtema}
                    disabled={guardando || !subtemaTemaId}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
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
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-2xl font-bold">
                Subtemas del tema
              </h2>

              {!subtemaTemaId && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                  Selecciona una materia y un tema para ver sus subtemas.
                </div>
              )}

              <div className="space-y-4">
                {subtemas.map((subtema, index) => (
                  <article
                    key={subtema.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Orden: {subtema.orden ?? "Sin orden"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {obtenerTitulo(subtema)}
                        </h3>

                        {obtenerDescripcion(subtema) && (
                          <p className="mt-2 text-slate-400">
                            {obtenerDescripcion(subtema)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
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
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
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
                          disabled={index === subtemas.length - 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <Link
                          href={`/admin/contenido-subtemas?materia=${subtemaMateriaId}&tema=${subtemaTemaId}&subtema=${subtema.id}`}
                          className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-950"
                        >
                          Administrar contenido
                        </Link>

                        <Link
                          href={
                            subtemaMateriaId
                              ? `/materias/${subtemaMateriaId}`
                              : "/materias"
                          }
                          target="_blank"
                          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
                        >
                          Vista alumno
                        </Link>

                        <button
                          type="button"
                          onClick={() => editarSubtema(subtema)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarSubtema(subtema.id)}
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
        )}

        {seccion === "parciales" && (
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {parcialEditandoId ? "Editar parcial" : "Crear parcial"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Materia
                  </label>
                  <select
                    value={parcialMateriaId}
                    onChange={(e) =>
                      seleccionarMateriaParaParciales(e.target.value)
                    }
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
                    value={parcialTemaId}
                    onChange={(e) =>
                      seleccionarTemaParaParciales(e.target.value)
                    }
                    disabled={!parcialMateriaId}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecciona una unidad/tema</option>
                    {temasParaParciales.map((tema) => (
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
                    value={parcialTitulo}
                    onChange={(e) => setParcialTitulo(e.target.value)}
                    placeholder="Ejemplo: Parcial de idea principal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    value={parcialDescripcion}
                    onChange={(e) => setParcialDescripcion(e.target.value)}
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
                    value={parcialOrden}
                    onChange={(e) => setParcialOrden(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarParcial}
                    disabled={guardando || !parcialTemaId}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
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
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <Link
                  href="/admin/preguntas-parciales"
                  className="inline-flex rounded-xl border border-yellow-700 px-4 py-3 font-semibold text-yellow-300 hover:bg-yellow-950"
                >
                  Administrar preguntas →
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-2xl font-bold">
                Parciales de la unidad
              </h2>

              {!parcialTemaId && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                  Selecciona una materia y unidad para ver sus parciales.
                </div>
              )}

              <div className="space-y-4">
                {parciales.map((parcial, index) => (
                  <article
                    key={parcial.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Orden: {parcial.orden ?? "Sin orden"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {obtenerTitulo(parcial)}
                        </h3>

                        {obtenerDescripcion(parcial) && (
                          <p className="mt-2 text-slate-400">
                            {obtenerDescripcion(parcial)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
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
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
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
                          disabled={index === parciales.length - 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <Link
                          href={`/parciales/${parcial.id}`}
                          target="_blank"
                          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
                        >
                          Vista alumno
                        </Link>

                        <Link
                          href="/admin/preguntas-parciales"
                          className="rounded-lg border border-yellow-700 px-3 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-950"
                        >
                          Preguntas
                        </Link>

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
        )}

        {seccion === "simuladores" && (
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-bold">
                {simuladorEditandoId
                  ? "Editar simulador"
                  : "Crear simulador"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nombre del simulador
                  </label>
                  <input
                    value={simuladorTitulo}
                    onChange={(e) => setSimuladorTitulo(e.target.value)}
                    placeholder="Ejemplo: Simulador general 1"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    value={simuladorDescripcion}
                    onChange={(e) => setSimuladorDescripcion(e.target.value)}
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
                    value={simuladorOrden}
                    onChange={(e) => setSimuladorOrden(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={guardarSimulador}
                    disabled={guardando}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
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
                      className="rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <Link
                  href="/admin/preguntas-simuladores"
                  className="inline-flex rounded-xl border border-cyan-700 px-4 py-3 font-semibold text-cyan-300 hover:bg-cyan-950"
                >
                  Administrar preguntas →
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-5 text-2xl font-bold">
                Simuladores registrados
              </h2>

              {simuladores.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                  Todavía no hay simuladores.
                </div>
              )}

              <div className="space-y-4">
                {simuladores.map((simulador, index) => (
                  <article
                    key={simulador.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Orden: {simulador.orden ?? "Sin orden"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {obtenerTitulo(simulador)}
                        </h3>

                        {obtenerDescripcion(simulador) && (
                          <p className="mt-2 text-slate-400">
                            {obtenerDescripcion(simulador)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moverOrden(
                              TABLA_SIMULADORES,
                              simuladores,
                              index,
                              -1,
                              cargarSimuladores
                            )
                          }
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moverOrden(
                              TABLA_SIMULADORES,
                              simuladores,
                              index,
                              1,
                              cargarSimuladores
                            )
                          }
                          disabled={index === simuladores.length - 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
                        >
                          ↓
                        </button>

                        <Link
                          href={`/simuladores/${simulador.id}`}
                          target="_blank"
                          className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-950"
                        >
                          Vista alumno
                        </Link>

                        <Link
                          href="/admin/preguntas-simuladores"
                          className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-950"
                        >
                          Preguntas
                        </Link>

                        <button
                          type="button"
                          onClick={() => editarSimulador(simulador)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarSimulador(simulador.id)}
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
        )}
      </div>
    </main>
  );
}