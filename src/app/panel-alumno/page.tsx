"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Registro = {
  id: string;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  materia_id?: string | null;
  tema_id?: string | null;
};

function nombreDe(item?: Registro | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

export default function PanelAlumnoPage() {
  const [materias, setMaterias] = useState<Registro[]>([]);
  const [temas, setTemas] = useState<Registro[]>([]);
  const [parciales, setParciales] = useState<Registro[]>([]);
  const [simuladores, setSimuladores] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const [materiasRes, temasRes, parcialesRes, simuladoresRes] = await Promise.all([
      supabase.from("materias").select("*").order("orden", { ascending: true }),
      supabase.from("temas").select("*").order("orden", { ascending: true }),
      supabase.from("parciales").select("*").order("orden", { ascending: true }),
      supabase.from("simuladores").select("*").order("orden", { ascending: true }),
    ]);

    setMaterias((materiasRes.data || []) as Registro[]);
    setTemas((temasRes.data || []) as Registro[]);
    setParciales((parcialesRes.data || []) as Registro[]);
    setSimuladores((simuladoresRes.data || []) as Registro[]);
    setLoading(false);
  }

  const totalParciales = parciales.length;

  const totalTemas = temas.length;

  const materiasConTemas = useMemo(() => {
    return materias.map((materia) => {
      const temasMateria = temas.filter(
        (tema) => String(tema.materia_id) === String(materia.id)
      );

      return {
        materia,
        temas: temasMateria.map((tema) => ({
          tema,
          parciales: parciales.filter(
            (parcial) => String(parcial.tema_id) === String(tema.id)
          ),
        })),
      };
    });
  }, [materias, temas, parciales]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Panel del alumno
          </p>

          <h1 className="text-4xl font-bold">Bienvenido a Examen UABC</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Selecciona una materia, entra a sus temas y responde los parciales
            disponibles. También puedes resolver simuladores generales.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#materias"
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Ver materias
            </a>

            <a
              href="#simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Ver simuladores
            </a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Cargando información...
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-5 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Materias</p>
                <p className="mt-2 text-4xl font-bold text-sky-400">
                  {materias.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Temas</p>
                <p className="mt-2 text-4xl font-bold text-emerald-400">
                  {totalTemas}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Parciales</p>
                <p className="mt-2 text-4xl font-bold text-yellow-400">
                  {totalParciales}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Simuladores</p>
                <p className="mt-2 text-4xl font-bold text-pink-400">
                  {simuladores.length}
                </p>
              </div>
            </section>

            <section id="materias" className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold">Materias, temas y parciales</h2>

              {materiasConTemas.length === 0 ? (
                <p className="text-slate-400">
                  Todavía no hay materias registradas.
                </p>
              ) : (
                <div className="grid gap-5">
                  {materiasConTemas.map(({ materia, temas }) => (
                    <div
                      key={materia.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <h3 className="text-xl font-bold text-sky-300">
                        {nombreDe(materia)}
                      </h3>

                      {materia.descripcion && (
                        <p className="mt-1 text-sm text-slate-400">
                          {materia.descripcion}
                        </p>
                      )}

                      {temas.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">
                          Esta materia todavía no tiene temas.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-4">
                          {temas.map(({ tema, parciales }) => (
                            <div
                              key={tema.id}
                              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                            >
                              <h4 className="font-semibold text-white">
                                {nombreDe(tema)}
                              </h4>

                              {tema.descripcion && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {tema.descripcion}
                                </p>
                              )}

                              {parciales.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">
                                  Este tema todavía no tiene parciales.
                                </p>
                              ) : (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  {parciales.map((parcial) => (
                                    <Link
                                      key={parcial.id}
                                      href={`/parciales/${parcial.id}`}
                                      className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                                    >
                                      {nombreDe(parcial)}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              id="simuladores"
              className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="mb-5 text-2xl font-bold">Simuladores</h2>

              {simuladores.length === 0 ? (
                <p className="text-slate-400">
                  Todavía no hay simuladores registrados.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {simuladores.map((simulador) => (
                    <Link
                      key={simulador.id}
                      href={`/simuladores/${simulador.id}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5 hover:border-pink-500"
                    >
                      <h3 className="text-lg font-bold text-pink-300">
                        {nombreDe(simulador)}
                      </h3>

                      {simulador.descripcion && (
                        <p className="mt-2 text-sm text-slate-400">
                          {simulador.descripcion}
                        </p>
                      )}

                      <p className="mt-4 text-sm font-semibold text-sky-400">
                        Resolver simulador →
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}