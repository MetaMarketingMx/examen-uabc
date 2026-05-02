"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Simulador = {
  id: string;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
};

function nombreDe(item: Simulador) {
  return item.nombre || item.titulo || "Simulador sin nombre";
}

export default function SimuladoresPage() {
  const [simuladores, setSimuladores] = useState<Simulador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSimuladores();
  }, []);

  async function cargarSimuladores() {
    setLoading(true);

    const { data } = await supabase
      .from("simuladores")
      .select("*")
      .order("orden", { ascending: true });

    setSimuladores((data || []) as Simulador[]);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Simuladores
          </p>

          <h1 className="text-4xl font-bold">Exámenes simuladores</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Selecciona un simulador para responder sus preguntas y obtener un
            resultado al finalizar.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Cargando simuladores...
          </div>
        ) : simuladores.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Todavía no hay simuladores registrados.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {simuladores.map((simulador) => (
              <Link
                key={simulador.id}
                href={`/simuladores/${simulador.id}`}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500"
              >
                <h2 className="text-2xl font-bold text-sky-300">
                  {nombreDe(simulador)}
                </h2>

                {simulador.descripcion && (
                  <p className="mt-3 text-slate-400">
                    {simulador.descripcion}
                  </p>
                )}

                <p className="mt-5 font-semibold text-sky-400">
                  Resolver ahora →
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}