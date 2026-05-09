"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  orden?: number;
  [key: string]: any;
};

const TABLA_SIMULADORES = "simuladores";

export default function SimuladorAlumnoPage() {
  const params = useParams();
  const rawId = params?.id;
  const simuladorId = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");

  const [simulador, setSimulador] = useState<Registro | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!simuladorId) return;
    cargarSimulador();
  }, [simuladorId]);

  function obtenerTitulo(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.nombre ?? item.titulo ?? item.title ?? `Registro ${item.id}`);
  }

  function obtenerDescripcion(item: Registro | null | undefined) {
    if (!item) return "";
    return String(item.descripcion ?? item.description ?? "");
  }

  async function cargarSimulador() {
    setCargando(true);

    const { data, error } = await supabase
      .from(TABLA_SIMULADORES)
      .select("*")
      .eq("id", simuladorId)
      .single();

    if (error) {
      console.error("Error cargando simulador:", error);
      setSimulador(null);
      setCargando(false);
      return;
    }

    setSimulador(data);
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">Cargando simulador...</p>
        </section>
      </main>
    );
  }

  if (!simulador) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold">Simulador no encontrado</h1>
          <p className="mt-3 text-slate-400">
            No se encontró el simulador solicitado.
          </p>

          <Link
            href="/simuladores"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Volver a simuladores
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Simulador
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {obtenerTitulo(simulador)}
          </h1>

          {obtenerDescripcion(simulador) && (
            <p className="mt-4 max-w-3xl text-slate-300">
              {obtenerDescripcion(simulador)}
            </p>
          )}
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <h2 className="text-2xl font-bold">
            Vista previa del simulador
          </h2>

          <p className="mt-3 text-slate-400">
            El simulador ya puede verse como alumno. El siguiente paso será agregar preguntas al simulador y calcular resultados.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white opacity-50"
            >
              Iniciar simulador próximamente
            </button>

            <Link
              href="/simuladores"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Volver a simuladores
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}