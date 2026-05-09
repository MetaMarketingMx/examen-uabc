"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
};

type Tema = {
  id: string | number;
  materia_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
};

type Parcial = {
  id: string | number;
  materia_id?: string | number | null;
  tema_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
};

function nombreDe(item?: Materia | Tema | Parcial | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

export default function TemaDetallePage() {
  const params = useParams();
  const temaId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [tema, setTema] = useState<Tema | null>(null);
  const [materia, setMateria] = useState<Materia | null>(null);
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [temaId]);

  async function cargarDatos() {
    setLoading(true);

    const { data: temaData } = await supabase
      .from("temas")
      .select("*")
      .eq("id", temaId)
      .single();

    const temaInfo = (temaData || null) as Tema | null;
    setTema(temaInfo);

    if (temaInfo?.materia_id) {
      const { data: materiaData } = await supabase
        .from("materias")
        .select("*")
        .eq("id", temaInfo.materia_id)
        .single();

      setMateria((materiaData || null) as Materia | null);
    }

    const { data: parcialesData } = await supabase
      .from("parciales")
      .select("*")
      .eq("tema_id", temaId)
      .order("orden", { ascending: true });

    setParciales((parcialesData || []) as Parcial[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Cargando tema...
      </main>
    );
  }

  if (!tema) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500 bg-red-950/40 p-8">
          <h1 className="text-3xl font-bold">No se encontró el tema</h1>

          <Link
            href="/materias"
            className="mt-6 inline-block rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
          >
            Volver a materias
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-400">
            Tema
          </p>

          <h1 className="text-4xl font-bold">{nombreDe(tema)}</h1>

          <p className="mt-3 text-slate-400">
            Materia: {materia ? nombreDe(materia) : "Sin materia"}
          </p>

          {tema.descripcion && (
            <p className="mt-4 max-w-3xl text-slate-300">
              {tema.descripcion}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {materia?.id && (
              <Link
                href={`/materias/${materia.id}`}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
              >
                Volver a la materia
              </Link>
            )}

            <Link
              href="/materias"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
            >
              Todas las materias
            </Link>
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Contenido académico</h2>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-slate-300">
              Aquí se mostrará el contenido de estudio del tema: explicación,
              imágenes, PDF o video. Por ahora se usa la descripción del tema
              como contenido base.
            </p>

            {tema.descripcion && (
              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-slate-200">
                {tema.descripcion}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-2xl font-bold">Parciales de este tema</h2>

          {parciales.length === 0 ? (
            <p className="text-slate-400">
              Este tema todavía no tiene parciales registrados.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {parciales.map((parcial) => (
                <Link
                  key={String(parcial.id)}
                  href={`/parciales/${parcial.id}`}
                  className="rounded-3xl border border-slate-800 bg-slate-950 p-6 transition hover:border-sky-500"
                >
                  <p className="text-sm font-bold uppercase text-sky-400">
                    Parcial
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {nombreDe(parcial)}
                  </h3>

                  {parcial.descripcion && (
                    <p className="mt-3 text-sm text-slate-400">
                      {parcial.descripcion}
                    </p>
                  )}

                  <p className="mt-4 text-sm text-yellow-400">
                    Tiempo asignado: {parcial.tiempo_minutos || 30} minutos
                  </p>

                  <p className="mt-5 font-semibold text-sky-400">
                    Resolver parcial →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}