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
  id_materia?: string | number | null;
  materia?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type Subtema = {
  id: string | number;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  tema?: string | number | null;
  unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
};

type Parcial = {
  id: string | number;
  materia_id?: string | number | null;
  tema_id?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
  orden?: number | null;
};

type ContenidoSubtema = {
  id: string;
  subtema_id: string;
  tipo?: string | null;
  titulo?: string | null;
  contenido?: string | null;
  url?: string | null;
  orden?: number | null;
};

function nombreDe(item?: Materia | Tema | Subtema | Parcial | null) {
  return item?.nombre || item?.titulo || "Sin nombre";
}

function ordenarPorOrden<T extends { id: string | number; orden?: number | null }>(
  lista: T[]
) {
  return [...lista].sort((a, b) => {
    const ordenA = Number(a.orden ?? 0);
    const ordenB = Number(b.orden ?? 0);

    if (ordenA !== ordenB) return ordenA - ordenB;

    return String(a.id).localeCompare(String(b.id));
  });
}

export default function TemaDetallePage() {
  const params = useParams();
  const temaId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [tema, setTema] = useState<Tema | null>(null);
  const [materia, setMateria] = useState<Materia | null>(null);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [contenidoPorSubtema, setContenidoPorSubtema] = useState<
    Record<string, string>
  >({});
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [temaId]);

  async function consultarConFallback(
    tabla: string,
    filtros: { columna: string; valor: string }[]
  ) {
    let primeraRespuestaValida: any[] = [];

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

    const subtemasData = await consultarConFallback("subtemas", [
      { columna: "tema_id", valor: String(temaId) },
      { columna: "unidad_id", valor: String(temaId) },
      { columna: "id_tema", valor: String(temaId) },
      { columna: "id_unidad", valor: String(temaId) },
      { columna: "tema", valor: String(temaId) },
      { columna: "unidad", valor: String(temaId) },
    ]);

    const subtemasOrdenados = ordenarPorOrden((subtemasData || []) as Subtema[]);
    setSubtemas(subtemasOrdenados);

    if (subtemasOrdenados.length > 0) {
      const idsSubtemas = subtemasOrdenados.map((subtema) =>
        String(subtema.id)
      );

      const { data: contenidoData } = await supabase
        .from("contenido_subtemas")
        .select("*")
        .in("subtema_id", idsSubtemas)
        .order("orden", { ascending: true });

      const contenidoLista = (contenidoData || []) as ContenidoSubtema[];

      const mapaContenido: Record<string, string> = {};

      idsSubtemas.forEach((idSubtema) => {
        const bloques = contenidoLista
          .filter((bloque) => String(bloque.subtema_id) === String(idSubtema))
          .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));

        mapaContenido[idSubtema] = bloques
          .map((bloque) => bloque.contenido || "")
          .filter(Boolean)
          .join("");
      });

      setContenidoPorSubtema(mapaContenido);
    } else {
      setContenidoPorSubtema({});
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

          {subtemas.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-300">
                Este tema todavía no tiene subtemas registrados.
              </p>

              {tema.descripcion && (
                <p className="mt-4 rounded-xl bg-slate-900 p-4 text-slate-200">
                  {tema.descripcion}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {subtemas.map((subtema, index) => {
                const contenidoHtml =
                  contenidoPorSubtema[String(subtema.id)] || "";

                return (
                  <article
                    key={String(subtema.id)}
                    className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
                  >
                    <div className="border-b border-slate-800 bg-slate-900 p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
                        Subtema {index + 1}
                      </p>

                      <h3 className="mt-2 text-3xl font-bold">
                        {nombreDe(subtema)}
                      </h3>

                      {subtema.descripcion && (
                        <p className="mt-3 text-slate-400">
                          {subtema.descripcion}
                        </p>
                      )}
                    </div>

                    {contenidoHtml ? (
                      <div
                        className="contenido-alumno bg-white p-6 text-slate-950 md:p-8"
                        dangerouslySetInnerHTML={{ __html: contenidoHtml }}
                      />
                    ) : (
                      <div className="p-6 text-slate-400">
                        Este subtema todavía no tiene contenido publicado.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
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

      <style jsx global>{`
        .contenido-alumno {
          line-height: 1.75;
          font-size: 16px;
        }

        .contenido-alumno h1,
        .contenido-alumno h2,
        .contenido-alumno h3 {
          color: #0f172a;
          font-weight: 800;
          margin: 1.25rem 0 0.75rem;
        }

        .contenido-alumno h1 {
          font-size: 2.25rem;
        }

        .contenido-alumno h2 {
          font-size: 2rem;
        }

        .contenido-alumno h3 {
          font-size: 1.5rem;
        }

        .contenido-alumno p {
          margin: 0.85rem 0;
        }

        .contenido-alumno ul,
        .contenido-alumno ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }

        .contenido-alumno li {
          margin: 0.35rem 0;
        }

        .contenido-alumno img {
          max-width: 100%;
          height: auto;
        }

        .contenido-alumno iframe {
          max-width: 100%;
        }

        .contenido-alumno video {
          max-width: 100%;
        }

        .contenido-alumno a {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 600;
        }

        .contenido-alumno figure {
          margin: 1.5rem 0;
        }

        .contenido-alumno figcaption {
          color: #64748b;
          font-size: 0.9rem;
          text-align: center;
        }
      `}</style>
    </main>
  );
}