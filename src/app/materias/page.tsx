"use client";

import { useState } from "react";

const materias = [
  {
    id: "lectora",
    nombre: "Comprensión lectora",
    descripcion:
      "Lectura de textos, idea principal, inferencias y propósito del autor.",
    progreso: 72,
    temas: [
      { nombre: "Idea principal", estado: "Completado" },
      { nombre: "Ideas secundarias", estado: "Completado" },
      { nombre: "Inferencias", estado: "En curso" },
      { nombre: "Propósito del autor", estado: "Pendiente" },
    ],
    parciales: [
      { nombre: "Parcial 1", detalle: "Temas 1 y 2", disponible: true },
      { nombre: "Parcial 2", detalle: "Temas 1 al 4", disponible: false },
    ],
  },
  {
    id: "lengua",
    nombre: "Lengua escrita",
    descripcion:
      "Concordancia, coherencia, cohesión, ortografía y puntuación.",
    progreso: 58,
    temas: [
      { nombre: "Concordancia", estado: "Completado" },
      { nombre: "Coherencia", estado: "En curso" },
      { nombre: "Cohesión", estado: "Pendiente" },
      { nombre: "Puntuación", estado: "Pendiente" },
    ],
    parciales: [
      { nombre: "Parcial 1", detalle: "Hasta concordancia", disponible: true },
      { nombre: "Parcial 2", detalle: "Hasta cohesión", disponible: false },
    ],
  },
  {
    id: "mate",
    nombre: "Matemáticas",
    descripcion: "Fracciones, álgebra, ecuaciones, porcentajes y geometría.",
    progreso: 41,
    temas: [
      { nombre: "Fracciones", estado: "Completado" },
      { nombre: "Álgebra", estado: "En curso" },
      { nombre: "Ecuaciones", estado: "Pendiente" },
      { nombre: "Porcentajes", estado: "Pendiente" },
    ],
    parciales: [
      { nombre: "Parcial 1", detalle: "Hasta fracciones", disponible: true },
      { nombre: "Parcial 2", detalle: "Hasta ecuaciones", disponible: false },
    ],
  },
];

function colorEstado(estado: string) {
  if (estado === "Completado") {
    return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
  }

  if (estado === "En curso") {
    return "bg-sky-500/10 text-sky-300 border border-sky-500/20";
  }

  return "bg-slate-800 text-slate-300 border border-slate-700";
}

export default function MateriasPage() {
  const [abierta, setAbierta] = useState("lectora");

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Materias
          </p>
          <h1 className="mt-4 text-4xl font-bold">Ruta de estudio</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Aquí el alumno estudia por materia, avanza por temas y desbloquea
            exámenes parciales conforme progresa.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {materias.map((materia) => {
            const estaAbierta = abierta === materia.id;

            return (
              <div
                key={materia.id}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
              >
                <button
                  onClick={() =>
                    setAbierta(estaAbierta ? "" : materia.id)
                  }
                  className="w-full p-6 text-left transition hover:bg-slate-800/40"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-3xl font-semibold">
                        {materia.nombre}
                      </h2>
                      <p className="mt-2 max-w-3xl text-slate-300">
                        {materia.descripcion}
                      </p>
                    </div>

                    <div className="min-w-[180px]">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                        <span>Progreso</span>
                        <span>{materia.progreso}%</span>
                      </div>

                      <div className="h-3 w-full rounded-full bg-slate-800">
                        <div
                          className="h-3 rounded-full bg-sky-500"
                          style={{ width: `${materia.progreso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {estaAbierta && (
                  <div className="border-t border-slate-800 px-6 py-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-2xl font-semibold">Temas</h3>
                          <button className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200">
                            Agregar tema
                          </button>
                        </div>

                        <div className="space-y-4">
                          {materia.temas.map((tema) => (
                            <div
                              key={tema.nombre}
                              className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h4 className="text-xl font-medium">
                                    {tema.nombre}
                                  </h4>
                                  <p className="mt-2 text-sm text-slate-300">
                                    Lección con material académico, imágenes,
                                    video y ejercicio final.
                                  </p>
                                </div>

                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-sm ${colorEstado(
                                    tema.estado
                                  )}`}
                                >
                                  {tema.estado}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-2xl font-semibold">
                            Exámenes parciales
                          </h3>
                          <button className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200">
                            Agregar parcial
                          </button>
                        </div>

                        <div className="space-y-4">
                          {materia.parciales.map((parcial) => (
                            <div
                              key={parcial.nombre}
                              className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h4 className="text-xl font-medium">
                                    {parcial.nombre}
                                  </h4>
                                  <p className="mt-2 text-sm text-slate-300">
                                    {parcial.detalle}
                                  </p>
                                </div>

                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-sm ${
                                    parcial.disponible
                                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                      : "bg-slate-800 text-slate-300 border border-slate-700"
                                  }`}
                                >
                                  {parcial.disponible
                                    ? "Disponible"
                                    : "Bloqueado"}
                                </span>
                              </div>

                              <button
                                className={`mt-4 rounded-2xl px-4 py-2 text-sm font-semibold ${
                                  parcial.disponible
                                    ? "bg-sky-500 text-slate-950"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {parcial.disponible
                                  ? "Entrar al parcial"
                                  : "Aún no disponible"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}