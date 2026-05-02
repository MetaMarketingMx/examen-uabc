"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Registro = {
  id: string;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  materia_id?: string | null;
  tema_id?: string | null;
  parcial_id?: string | null;
  simulador_id?: string | null;
  texto_pregunta?: string | null;
  pregunta?: string | null;
  imagen_pregunta?: string | null;
  opcion_a?: string | null;
  opcion_b?: string | null;
  opcion_c?: string | null;
  opcion_d?: string | null;
  imagen_opcion_a?: string | null;
  imagen_opcion_b?: string | null;
  imagen_opcion_c?: string | null;
  imagen_opcion_d?: string | null;
  respuesta_correcta?: string | null;
  explicacion?: string | null;
  dificultad?: string | null;
  tiempo_minutos?: number | null;
};

type TipoDestino = "parcial" | "simulador";

const emptyFiles = {
  imagen_pregunta: null as File | null,
  imagen_opcion_a: null as File | null,
  imagen_opcion_b: null as File | null,
  imagen_opcion_c: null as File | null,
  imagen_opcion_d: null as File | null,
};

const emptyPreview = {
  imagen_pregunta: "",
  imagen_opcion_a: "",
  imagen_opcion_b: "",
  imagen_opcion_c: "",
  imagen_opcion_d: "",
};

function nombreDe(item?: Registro | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

export default function AdminPage() {
  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [parciales, setParciales] = useState<Registro[]>([]);
  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [preguntas, setPreguntas] = useState<Registro[]>([]);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [materiaNombre, setMateriaNombre] = useState("");
  const [materiaDescripcion, setMateriaDescripcion] = useState("");

  const [temaMateriaId, setTemaMateriaId] = useState("");
  const [temaTitulo, setTemaTitulo] = useState("");
  const [temaDescripcion, setTemaDescripcion] = useState("");

  const [parcialMateriaId, setParcialMateriaId] = useState("");
  const [parcialTemaId, setParcialTemaId] = useState("");
  const [parcialTitulo, setParcialTitulo] = useState("");
  const [parcialDescripcion, setParcialDescripcion] = useState("");
  const [parcialTiempo, setParcialTiempo] = useState("30");

  const [simuladorTitulo, setSimuladorTitulo] = useState("");
  const [simuladorDescripcion, setSimuladorDescripcion] = useState("");
  const [simuladorTiempo, setSimuladorTiempo] = useState("60");

  const [tipoDestino, setTipoDestino] = useState<TipoDestino>("parcial");
  const [preguntaMateriaId, setPreguntaMateriaId] = useState("");
  const [preguntaTemaId, setPreguntaTemaId] = useState("");
  const [preguntaParcialId, setPreguntaParcialId] = useState("");
  const [preguntaSimuladorId, setPreguntaSimuladorId] = useState("");

  const [textoPregunta, setTextoPregunta] = useState("");
  const [opcionA, setOpcionA] = useState("");
  const [opcionB, setOpcionB] = useState("");
  const [opcionC, setOpcionC] = useState("");
  const [opcionD, setOpcionD] = useState("");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("A");
  const [explicacion, setExplicacion] = useState("");
  const [dificultad, setDificultad] = useState("Media");

  const [files, setFiles] = useState(emptyFiles);
  const [previews, setPreviews] = useState(emptyPreview);

  const temasDelParcial = useMemo(() => {
    return temas.filter(
      (tema) => String(tema.materia_id) === String(parcialMateriaId)
    );
  }, [temas, parcialMateriaId]);

  const temasDePregunta = useMemo(() => {
    return temas.filter(
      (tema) => String(tema.materia_id) === String(preguntaMateriaId)
    );
  }, [temas, preguntaMateriaId]);

  const parcialesDePregunta = useMemo(() => {
    return parciales.filter(
      (parcial) => String(parcial.tema_id) === String(preguntaTemaId)
    );
  }, [parciales, preguntaTemaId]);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setLoading(true);
    setError("");
    setMensaje("");

    const [materiasRes, temasRes, parcialesRes, simuladoresRes, preguntasRes] =
      await Promise.all([
        supabase.from("materias").select("*").order("orden", { ascending: true }),
        supabase.from("temas").select("*").order("orden", { ascending: true }),
        supabase.from("parciales").select("*").order("orden", { ascending: true }),
        supabase.from("simuladores").select("*").order("orden", { ascending: true }),
        supabase.from("preguntas").select("*").order("created_at", { ascending: false }),
      ]);

    if (materiasRes.error) console.error("materias:", materiasRes.error);
    if (temasRes.error) console.error("temas:", temasRes.error);
    if (parcialesRes.error) console.error("parciales:", parcialesRes.error);
    if (simuladoresRes.error) console.error("simuladores:", simuladoresRes.error);
    if (preguntasRes.error) console.error("preguntas:", preguntasRes.error);

    setMaterias((materiasRes.data || []) as Registro[]);
    setTemas((temasRes.data || []) as Registro[]);
    setParciales((parcialesRes.data || []) as Registro[]);
    setSimuladores((simuladoresRes.data || []) as Registro[]);
    setPreguntas((preguntasRes.data || []) as Registro[]);

    setLoading(false);
  }

  function limpiarMensajes() {
    setMensaje("");
    setError("");
  }

  async function crearMateria(e: FormEvent) {
    e.preventDefault();
    limpiarMensajes();

    if (!materiaNombre.trim()) {
      setError("Escribe el nombre de la materia.");
      return;
    }

    const { error } = await supabase.from("materias").insert({
      nombre: materiaNombre.trim(),
      titulo: materiaNombre.trim(),
      descripcion: materiaDescripcion.trim(),
      activo: true,
      activa: true,
    });

    if (error) {
      console.error(error);
      setError("Error al guardar materia.");
      return;
    }

    setMateriaNombre("");
    setMateriaDescripcion("");
    setMensaje("Materia agregada correctamente.");
    cargarTodo();
  }

  async function crearTema(e: FormEvent) {
    e.preventDefault();
    limpiarMensajes();

    if (!temaMateriaId || !temaTitulo.trim()) {
      setError("Selecciona materia y escribe el título del tema.");
      return;
    }

    const { error } = await supabase.from("temas").insert({
      materia_id: temaMateriaId,
      nombre: temaTitulo.trim(),
      titulo: temaTitulo.trim(),
      descripcion: temaDescripcion.trim(),
      activo: true,
    });

    if (error) {
      console.error(error);
      setError("Error al guardar tema.");
      return;
    }

    setTemaMateriaId("");
    setTemaTitulo("");
    setTemaDescripcion("");
    setMensaje("Tema agregado correctamente.");
    cargarTodo();
  }

  async function crearParcial(e: FormEvent) {
    e.preventDefault();
    limpiarMensajes();

    if (!parcialMateriaId || !parcialTemaId || !parcialTitulo.trim()) {
      setError("Selecciona materia, tema y escribe el título del parcial.");
      return;
    }

    const { error } = await supabase.from("parciales").insert({
      materia_id: parcialMateriaId,
      tema_id: parcialTemaId,
      nombre: parcialTitulo.trim(),
      titulo: parcialTitulo.trim(),
      descripcion: parcialDescripcion.trim(),
      tiempo_minutos: Number(parcialTiempo) || 30,
      activo: true,
    });

    if (error) {
      console.error(error);
      setError("Error al guardar parcial.");
      return;
    }

    setParcialMateriaId("");
    setParcialTemaId("");
    setParcialTitulo("");
    setParcialDescripcion("");
    setParcialTiempo("30");
    setMensaje("Parcial agregado correctamente.");
    cargarTodo();
  }

  async function crearSimulador(e: FormEvent) {
    e.preventDefault();
    limpiarMensajes();

    if (!simuladorTitulo.trim()) {
      setError("Escribe el título del simulador.");
      return;
    }

    const { error } = await supabase.from("simuladores").insert({
      nombre: simuladorTitulo.trim(),
      titulo: simuladorTitulo.trim(),
      descripcion: simuladorDescripcion.trim(),
      tiempo_minutos: Number(simuladorTiempo) || 60,
      activo: true,
    });

    if (error) {
      console.error(error);
      setError("Error al guardar simulador.");
      return;
    }

    setSimuladorTitulo("");
    setSimuladorDescripcion("");
    setSimuladorTiempo("60");
    setMensaje("Simulador agregado correctamente.");
    cargarTodo();
  }

  function validarArchivo(file: File) {
    const permitidos = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!permitidos.includes(file.type)) {
      throw new Error("Solo se permiten imágenes JPG, PNG o WEBP.");
    }

    const max = 3 * 1024 * 1024;

    if (file.size > max) {
      throw new Error("La imagen no debe pesar más de 3 MB.");
    }
  }

  async function subirImagen(file: File | null, carpeta: string) {
    if (!file) return "";

    validarArchivo(file);

    const extension = file.name.split(".").pop() || "jpg";
    const nombreArchivo = `${carpeta}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("cuestionarios")
      .upload(nombreArchivo, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error(error);
      throw new Error("Error al subir imagen.");
    }

    const { data } = supabase.storage
      .from("cuestionarios")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  function seleccionarImagen(
    campo:
      | "imagen_pregunta"
      | "imagen_opcion_a"
      | "imagen_opcion_b"
      | "imagen_opcion_c"
      | "imagen_opcion_d",
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0] || null;

    setFiles((prev) => ({
      ...prev,
      [campo]: file,
    }));

    if (file) {
      setPreviews((prev) => ({
        ...prev,
        [campo]: URL.createObjectURL(file),
      }));
    } else {
      setPreviews((prev) => ({
        ...prev,
        [campo]: "",
      }));
    }
  }

  async function crearPregunta(e: FormEvent) {
    e.preventDefault();
    limpiarMensajes();

    try {
      if (tipoDestino === "parcial" && !preguntaParcialId) {
        setError("Selecciona el parcial al que pertenece la pregunta.");
        return;
      }

      if (tipoDestino === "simulador" && !preguntaSimuladorId) {
        setError("Selecciona el simulador al que pertenece la pregunta.");
        return;
      }

      if (!textoPregunta.trim() && !files.imagen_pregunta) {
        setError("La pregunta debe tener texto o imagen.");
        return;
      }

      const parcialSeleccionado = parciales.find(
        (parcial) => String(parcial.id) === String(preguntaParcialId)
      );

      const imagenPregunta = await subirImagen(files.imagen_pregunta, "preguntas");
      const imagenOpcionA = await subirImagen(files.imagen_opcion_a, "opciones");
      const imagenOpcionB = await subirImagen(files.imagen_opcion_b, "opciones");
      const imagenOpcionC = await subirImagen(files.imagen_opcion_c, "opciones");
      const imagenOpcionD = await subirImagen(files.imagen_opcion_d, "opciones");

      const payload = {
        materia_id:
          tipoDestino === "parcial"
            ? parcialSeleccionado?.materia_id || preguntaMateriaId
            : null,
        tema_id:
          tipoDestino === "parcial"
            ? parcialSeleccionado?.tema_id || preguntaTemaId
            : null,
        parcial_id: tipoDestino === "parcial" ? preguntaParcialId : null,
        simulador_id: tipoDestino === "simulador" ? preguntaSimuladorId : null,
        tipo_evaluacion: tipoDestino,

        texto_pregunta: textoPregunta.trim(),
        pregunta: textoPregunta.trim(),
        texto: textoPregunta.trim(),

        imagen_pregunta: imagenPregunta,

        opcion_a: opcionA.trim(),
        opcion_b: opcionB.trim(),
        opcion_c: opcionC.trim(),
        opcion_d: opcionD.trim(),

        imagen_opcion_a: imagenOpcionA,
        imagen_opcion_b: imagenOpcionB,
        imagen_opcion_c: imagenOpcionC,
        imagen_opcion_d: imagenOpcionD,

        respuesta_correcta: respuestaCorrecta,
        respuesta: respuestaCorrecta,

        explicacion: explicacion.trim(),
        justificacion: explicacion.trim(),
        dificultad,
        activa: true,
        activo: true,
      };

      const { error } = await supabase.from("preguntas").insert(payload);

      if (error) {
        console.error(error);
        setError("Error al guardar pregunta.");
        return;
      }

      setTextoPregunta("");
      setOpcionA("");
      setOpcionB("");
      setOpcionC("");
      setOpcionD("");
      setRespuestaCorrecta("A");
      setExplicacion("");
      setDificultad("Media");
      setFiles(emptyFiles);
      setPreviews(emptyPreview);
      setMensaje("Pregunta agregada correctamente.");
      cargarTodo();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al guardar pregunta.");
    }
  }

  async function eliminarPregunta(id: string) {
    const confirmar = confirm("¿Eliminar esta pregunta?");
    if (!confirmar) return;

    const { error } = await supabase.from("preguntas").delete().eq("id", id);

    if (error) {
      console.error(error);
      setError("Error al eliminar pregunta.");
      return;
    }

    setMensaje("Pregunta eliminada.");
    cargarTodo();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Panel Admin
          </p>

          <h1 className="text-4xl font-bold">Administrar Examen UABC</h1>

          <p className="mt-3 text-slate-300">
            Crea materias, temas, parciales, simuladores y preguntas con texto o imagen.
          </p>
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
            Cargando admin...
          </div>
        ) : (
          <div className="grid gap-8">
            <section className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={crearMateria}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="mb-4 text-2xl font-bold">1. Crear materia</h2>

                <input
                  value={materiaNombre}
                  onChange={(e) => setMateriaNombre(e.target.value)}
                  placeholder="Ej. Comprensión lectora"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <textarea
                  value={materiaDescripcion}
                  onChange={(e) => setMateriaDescripcion(e.target.value)}
                  placeholder="Descripción"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                  Guardar materia
                </button>
              </form>

              <form
                onSubmit={crearTema}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="mb-4 text-2xl font-bold">2. Crear tema</h2>

                <select
                  value={temaMateriaId}
                  onChange={(e) => setTemaMateriaId(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {nombreDe(materia)}
                    </option>
                  ))}
                </select>

                <input
                  value={temaTitulo}
                  onChange={(e) => setTemaTitulo(e.target.value)}
                  placeholder="Ej. Idea principal"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <textarea
                  value={temaDescripcion}
                  onChange={(e) => setTemaDescripcion(e.target.value)}
                  placeholder="Descripción"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                  Guardar tema
                </button>
              </form>

              <form
                onSubmit={crearParcial}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="mb-4 text-2xl font-bold">
                  3. Crear parcial dentro de un tema
                </h2>

                <select
                  value={parcialMateriaId}
                  onChange={(e) => {
                    setParcialMateriaId(e.target.value);
                    setParcialTemaId("");
                  }}
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {nombreDe(materia)}
                    </option>
                  ))}
                </select>

                <select
                  value={parcialTemaId}
                  onChange={(e) => setParcialTemaId(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona tema</option>
                  {temasDelParcial.map((tema) => (
                    <option key={tema.id} value={tema.id}>
                      {nombreDe(tema)}
                    </option>
                  ))}
                </select>

                <input
                  value={parcialTitulo}
                  onChange={(e) => setParcialTitulo(e.target.value)}
                  placeholder="Ej. Parcial 1"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <textarea
                  value={parcialDescripcion}
                  onChange={(e) => setParcialDescripcion(e.target.value)}
                  placeholder="Descripción"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <input
                  type="number"
                  min="1"
                  value={parcialTiempo}
                  onChange={(e) => setParcialTiempo(e.target.value)}
                  placeholder="Tiempo en minutos"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                  Guardar parcial
                </button>
              </form>

              <form
                onSubmit={crearSimulador}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="mb-4 text-2xl font-bold">4. Crear simulador</h2>

                <input
                  value={simuladorTitulo}
                  onChange={(e) => setSimuladorTitulo(e.target.value)}
                  placeholder="Ej. Simulador general"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <textarea
                  value={simuladorDescripcion}
                  onChange={(e) => setSimuladorDescripcion(e.target.value)}
                  placeholder="Descripción"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <input
                  type="number"
                  min="1"
                  value={simuladorTiempo}
                  onChange={(e) => setSimuladorTiempo(e.target.value)}
                  placeholder="Tiempo en minutos"
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                />

                <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                  Guardar simulador
                </button>
              </form>
            </section>

            <form
              onSubmit={crearPregunta}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="mb-4 text-2xl font-bold">5. Crear pregunta</h2>

              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <label className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <input
                    type="radio"
                    checked={tipoDestino === "parcial"}
                    onChange={() => setTipoDestino("parcial")}
                    className="mr-2"
                  />
                  Pregunta para un parcial
                </label>

                <label className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <input
                    type="radio"
                    checked={tipoDestino === "simulador"}
                    onChange={() => setTipoDestino("simulador")}
                    className="mr-2"
                  />
                  Pregunta para un simulador
                </label>
              </div>

              {tipoDestino === "parcial" ? (
                <div className="mb-5 grid gap-3 md:grid-cols-3">
                  <select
                    value={preguntaMateriaId}
                    onChange={(e) => {
                      setPreguntaMateriaId(e.target.value);
                      setPreguntaTemaId("");
                      setPreguntaParcialId("");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                  >
                    <option value="">Materia</option>
                    {materias.map((materia) => (
                      <option key={materia.id} value={materia.id}>
                        {nombreDe(materia)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={preguntaTemaId}
                    onChange={(e) => {
                      setPreguntaTemaId(e.target.value);
                      setPreguntaParcialId("");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                  >
                    <option value="">Tema</option>
                    {temasDePregunta.map((tema) => (
                      <option key={tema.id} value={tema.id}>
                        {nombreDe(tema)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={preguntaParcialId}
                    onChange={(e) => setPreguntaParcialId(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                  >
                    <option value="">Parcial</option>
                    {parcialesDePregunta.map((parcial) => (
                      <option key={parcial.id} value={parcial.id}>
                        {nombreDe(parcial)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  value={preguntaSimuladorId}
                  onChange={(e) => setPreguntaSimuladorId(e.target.value)}
                  className="mb-5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Selecciona simulador</option>
                  {simuladores.map((simulador) => (
                    <option key={simulador.id} value={simulador.id}>
                      {nombreDe(simulador)}
                    </option>
                  ))}
                </select>
              )}

              <textarea
                value={textoPregunta}
                onChange={(e) => setTextoPregunta(e.target.value)}
                placeholder="Texto de la pregunta"
                className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />

              <CampoImagen
                label="Imagen principal de la pregunta"
                preview={previews.imagen_pregunta}
                onChange={(e) => seleccionarImagen("imagen_pregunta", e)}
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Opcion
                  letra="A"
                  texto={opcionA}
                  setTexto={setOpcionA}
                  preview={previews.imagen_opcion_a}
                  onChange={(e) => seleccionarImagen("imagen_opcion_a", e)}
                />

                <Opcion
                  letra="B"
                  texto={opcionB}
                  setTexto={setOpcionB}
                  preview={previews.imagen_opcion_b}
                  onChange={(e) => seleccionarImagen("imagen_opcion_b", e)}
                />

                <Opcion
                  letra="C"
                  texto={opcionC}
                  setTexto={setOpcionC}
                  preview={previews.imagen_opcion_c}
                  onChange={(e) => seleccionarImagen("imagen_opcion_c", e)}
                />

                <Opcion
                  letra="D"
                  texto={opcionD}
                  setTexto={setOpcionD}
                  preview={previews.imagen_opcion_d}
                  onChange={(e) => seleccionarImagen("imagen_opcion_d", e)}
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <select
                  value={respuestaCorrecta}
                  onChange={(e) => setRespuestaCorrecta(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="A">Respuesta: A</option>
                  <option value="B">Respuesta: B</option>
                  <option value="C">Respuesta: C</option>
                  <option value="D">Respuesta: D</option>
                </select>

                <select
                  value={dificultad}
                  onChange={(e) => setDificultad(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <textarea
                value={explicacion}
                onChange={(e) => setExplicacion(e.target.value)}
                placeholder="Explicación o justificación de la respuesta correcta"
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />

              <button className="mt-5 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                Guardar pregunta
              </button>
            </form>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold">Resumen de contenido</h2>

              <div className="grid gap-4 md:grid-cols-5">
                <ResumenCard titulo="Materias" cantidad={materias.length} />
                <ResumenCard titulo="Temas" cantidad={temas.length} />
                <ResumenCard titulo="Parciales" cantidad={parciales.length} />
                <ResumenCard titulo="Simuladores" cantidad={simuladores.length} />
                <ResumenCard titulo="Preguntas" cantidad={preguntas.length} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold">Preguntas registradas</h2>

              {preguntas.length === 0 ? (
                <p className="text-slate-400">Todavía no hay preguntas.</p>
              ) : (
                <div className="grid gap-4">
                  {preguntas.map((pregunta) => (
                    <div
                      key={pregunta.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase text-sky-400">
                            {pregunta.parcial_id
                              ? "Parcial"
                              : pregunta.simulador_id
                                ? "Simulador"
                                : "Sin asignar"}
                          </p>

                          <h3 className="mt-1 font-semibold">
                            {pregunta.texto_pregunta ||
                              pregunta.pregunta ||
                              "Pregunta con imagen"}
                          </h3>

                          {pregunta.imagen_pregunta && (
                            <img
                              src={pregunta.imagen_pregunta}
                              alt="Imagen de pregunta"
                              className="mt-3 max-h-60 w-full rounded-xl bg-white object-contain"
                            />
                          )}

                          <p className="mt-2 text-sm text-slate-400">
                            Respuesta correcta:{" "}
                            {pregunta.respuesta_correcta || "Sin definir"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarPregunta(pregunta.id)}
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500"
                        >
                          Eliminar
                        </button>
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

function CampoImagen({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
      <label className="mb-2 block font-semibold">{label}</label>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="text-sm text-slate-300"
      />

      {preview && (
        <img
          src={preview}
          alt="Vista previa"
          className="mt-3 max-h-64 w-full rounded-xl bg-white object-contain"
        />
      )}
    </div>
  );
}

function Opcion({
  letra,
  texto,
  setTexto,
  preview,
  onChange,
}: {
  letra: string;
  texto: string;
  setTexto: (value: string) => void;
  preview: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
      <h3 className="mb-3 font-bold text-sky-400">Opción {letra}</h3>

      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={`Texto de opción ${letra}`}
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3"
      />

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="text-sm text-slate-300"
      />

      {preview && (
        <img
          src={preview}
          alt={`Imagen opción ${letra}`}
          className="mt-3 max-h-48 w-full rounded-xl bg-white object-contain"
        />
      )}
    </div>
  );
}

function ResumenCard({
  titulo,
  cantidad,
}: {
  titulo: string;
  cantidad: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 text-4xl font-bold text-sky-400">{cantidad}</p>
    </div>
  );
}