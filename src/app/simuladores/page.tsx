"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

type Simulador = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  tiempo_minutos?: number;
  [key: string]: any;
};

export default function SimuladoresPage() {
  const [simuladores, setSimuladores] = useState<Simulador[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  function obtenerTitulo(item: Simulador) {
    return String(
      item.nombre ?? item.titulo ?? item.title ?? `Simulador ${item.id}`
    );
  }

  function obtenerDescripcion(item: Simulador) {
    return String(item.descripcion ?? item.description ?? "");
  }

  function ordenarLista(lista: Simulador[]) {
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 0);
      const ordenB = Number(b.orden ?? 0);

      if (ordenA !== ordenB) return ordenA - ordenB;

      return String(a.id).localeCompare(String(b.id));
    });
  }

  async function cargarSimuladores() {
    setCargando(true);

    const { data, error } = await supabase.from("simuladores").select("*");

    if (error) {
      console.error("Error cargando simuladores:", error);
      alert("No se pudieron cargar los simuladores.");
      setSimuladores([]);
      setCargando(false);
      return;
    }

    setSimuladores(ordenarLista(data ?? []));
    setCargando(false);
  }

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
              Simuladores
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Simuladores disponibles
            </h1>

            <p className="mt-3 max-w-3xl text-slate-300">
              Selecciona un simulador para practicar como alumno.
            </p>
          </div>

          {cargando && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-300">
              Cargando simuladores...
            </div>
          )}

          {!cargando && simuladores.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
              <h2 className="text-2xl font-bold">
                Todavía no hay simuladores
              </h2>

              <p className="mt-3 text-slate-400">
                Cuando agregues simuladores desde el panel admin, aparecerán aquí.
              </p>

              <Link
                href="/admin"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Ir al admin
              </Link>
            </div>
          )}

          {!cargando && simuladores.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {simuladores.map((simulador) => (
                <article
                  key={simulador.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
                    Simulador
                  </p>

                  <h2 className="mt-3 text-2xl font-bold">
                    {obtenerTitulo(simulador)}
                  </h2>

                  {obtenerDescripcion(simulador) && (
                    <p className="mt-3 text-slate-400">
                      {obtenerDescripcion(simulador)}
                    </p>
                  )}

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Tiempo límite</p>

                    <p className="mt-1 text-xl font-bold text-cyan-300">
                      {Number(simulador.tiempo_minutos ?? 0) > 0
                        ? `${simulador.tiempo_minutos} minutos`
                        : "Sin límite"}
                    </p>
                  </div>

                  <Link
                    href={`/simuladores/${simulador.id}`}
                    className="mt-6 inline-flex w-full justify-center rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    Iniciar simulador
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AlumnoProtegido>
  );
}