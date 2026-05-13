"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

type ContenidoSubtema = {
  id: string;
  subtema_id: string;
  tipo?: string | null;
  titulo?: string | null;
  contenido?: string | null;
  url?: string | null;
  orden?: number | null;
};

type Parcial = {
  id: string | number;
  materia_id?: string | number | null;
  tema_id?: string | number | null;
  unidad_id?: string | number | null;
  id_tema?: string | number | null;
  id_unidad?: string | number | null;
  tema?: string | number | null;
  unidad?: string | number | null;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tiempo_minutos?: number | null;
  orden?: number | null;
};

type ProgresoSubtema = {
  subtema_id: string | number;
  completado?: boolean | null;
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

export default function ContenidoTemaPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const temaId = Array.isArray(params.id) ? params.id[0] : params.id;
  const subtemaInicial = searchParams.get("subtema");

  const [tema, setTema] = useState<Tema | null>(null);
  const [materia, setMateria] = useState<Materia | null>(null);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [contenidoPorSubtema, setContenidoPorSubtema] = useState<
    Record<string, string>
  >({});
  const [subtemasAbiertos, setSubtemasAbiertos] = useState<Record<string, boolean>>(
    {}
  );
  const [subtemasCompletados, setSubtemasCompletados] = useState<Set<string>>(
    new Set()
  );
  const [guardandoSubtemaId, setGuardandoSubtemaId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
  }, [temaId, subtemaInicial]);

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
    setMensaje("");
    setError("");

    const { data: temaData } = await supabase
      .from("temas")
      .select("*")
      .eq("id", temaId)
      .single();

    const temaInfo = (temaData || null) as Tema | null;
    setTema(temaInfo);

    const materiaId =
      temaInfo?.materia_id || temaInfo?.id_materia || temaInfo?.materia;

    if (materiaId) {
      const { data: materiaData } = await supabase
        .from("materias")
        .select("*")
        .eq("id", materiaId)
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

    const parcialesData = await consultarConFallback("parciales", [
      { columna: "tema_id", valor: String(temaId) },
      { columna: "unidad_id", valor: String(temaId) },
      { columna: "id_tema", valor: String(temaId) },
      { columna: "id_unidad", valor: String(temaId) },
      { columna: "tema", valor: String(temaId) },
      { columna: "unidad", valor: String(temaId) },
    ]);

    setParciales(ordenarPorOrden((parcialesData || []) as Parcial[]));

    const idsSubtemas = subtemasOrdenados.map((subtema) => String(subtema.id));

    if (idsSubtemas.length > 0) {
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

      const abiertos: Record<string, boolean> = {};

      idsSubtemas.forEach((idSubtema) => {
        if (subtemaInicial) {
          abiertos[idSubtema] = String(idSubtema) === String(subtemaInicial);
        } else {
          abiertos[idSubtema] = true;
        }
      });

      setSubtemasAbiertos(abiertos);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (user) {
        const { data: progresoData, error: progresoError } = await supabase
          .from("progreso_subtemas")
          .select("subtema_id, completado")
          .eq("user_id", user.id)
          .eq("completado", true);

        if (!progresoError) {
          const progreso = (progresoData || []) as ProgresoSubtema[];

          setSubtemasCompletados(
            new Set(progreso.map((item) => String(item.subtema_id)))
          );
        } else {
          setSubtemasCompletados(new Set());
        }
      } else {
        setSubtemasCompletados(new Set());
      }

      setTimeout(() => {
        if (subtemaInicial) {
          const elemento = document.getElementById(`subtema-${subtemaInicial}`);
          elemento?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    } else {
      setContenidoPorSubtema({});
      setSubtemasAbiertos({});
      setSubtemasCompletados(new Set());
    }

    setLoading(false);
  }

  function alternarSubtema(id: string | number) {
    const key = String(id);

    setSubtemasAbiertos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function obtenerIndiceSubtema(id: string | number) {
    return subtemas.findIndex((subtema) => String(subtema.id) === String(id));
  }

  function abrirSubtema(id: string | number) {
    const key = String(id);

    setSubtemasAbiertos((prev) => ({
      ...prev,
      [key]: true,
    }));

    setTimeout(() => {
      const elemento = document.getElementById(`subtema-${key}`);
      elemento?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function marcarComoCompletado(subtema: Subtema, irAlSiguiente = false) {
    setMensaje("");
    setError("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setError("Necesitas iniciar sesión para guardar tu avance.");
      return;
    }

    const idSubtema = String(subtema.id);
    const materiaId =
      tema?.materia_id || tema?.id_materia || tema?.materia || materia?.id || null;

    setGuardandoSubtemaId(idSubtema);

    const { error: upsertError } = await supabase
      .from("progreso_subtemas")
      .upsert(
        {
          user_id: user.id,
          materia_id: materiaId ? String(materiaId) : null,
          tema_id: String(temaId),
          subtema_id: idSubtema,
          completado: true,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,subtema_id",
        }
      );

    setGuardandoSubtemaId(null);

    if (upsertError) {
      setError("No se pudo guardar el avance. Revisa la tabla progreso_subtemas.");
      return;
    }

    setSubtemasCompletados((prev) => {
      const nuevo = new Set(prev);
      nuevo.add(idSubtema);
      return nuevo;
    });

    setMensaje("Avance guardado correctamente.");

    if (irAlSiguiente) {
      const indiceActual = obtenerIndiceSubtema(idSubtema);
      const siguiente = subtemas[indiceActual + 1];

      if (siguiente) {
        abrirSubtema(siguiente.id);
      }
    }
  }

  function irAnterior(id: string | number) {
    const indiceActual = obtenerIndiceSubtema(id);
    const anterior = subtemas[indiceActual - 1];

    if (anterior) {
      abrirSubtema(anterior.id);
    }
  }

  function irSiguiente(id: string | number) {
    const indiceActual = obtenerIndiceSubtema(id);
    const siguiente = subtemas[indiceActual + 1];

    if (siguiente) {
      abrirSubtema(siguiente.id);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-white">
        Cargando contenido...
      </main>
    );
  }

  if (!tema) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-white">
        <section className="mx-auto max-w-3xl rounded-2xl border border-red-500 bg-red-950/40 p-5">
          <h1 className="text-2xl font-bold">No se encontró la unidad</h1>

          <Link
            href="/materias"
            className="mt-5 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950"
          >
            Volver a materias
          </Link>
        </section>
      </main>
    );
  }

  const totalCompletados = subtemas.filter((subtema) =>
    subtemasCompletados.has(String(subtema.id))
  ).length;

  const porcentaje =
    subtemas.length > 0
      ? Math.round((totalCompletados / subtemas.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Volver atrás
          </button>

          {materia?.id && (
            <Link
              href={`/materias/${materia.id}`}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Ver materia
            </Link>
          )}
        </div>

        <header className="mb-5 border-b border-slate-800 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Contenido de la unidad
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            {nombreDe(tema)}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Materia: {materia ? nombreDe(materia) : "Sin materia"}
          </p>

          {tema.descripcion && (
            <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
              {tema.descripcion}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-300">
                Avance de la unidad
              </p>
              <p className="text-sm font-bold text-slate-300">{porcentaje}%</p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {totalCompletados} de {subtemas.length} publicaciones completadas
            </p>
          </div>
        </header>

        {mensaje && (
          <div className="mb-4 rounded-xl border border-green-500 bg-green-950 p-4 text-sm text-green-200">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500 bg-red-950 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {subtemas.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-slate-300">
              Esta unidad todavía no tiene publicaciones registradas.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {subtemas.map((subtema, index) => {
              const idSubtema = String(subtema.id);
              const abierto = Boolean(subtemasAbiertos[idSubtema]);
              const contenidoHtml = contenidoPorSubtema[idSubtema] || "";
              const completado = subtemasCompletados.has(idSubtema);
              const esPrimero = index === 0;
              const esUltimo = index === subtemas.length - 1;
              const guardando = guardandoSubtemaId === idSubtema;

              return (
                <article
                  key={idSubtema}
                  id={`subtema-${idSubtema}`}
                  className={`overflow-hidden rounded-2xl border bg-slate-900 ${
                    abierto ? "border-sky-700" : "border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => alternarSubtema(idSubtema)}
                    className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-slate-800/70 sm:p-5"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                        Publicación {index + 1} de {subtemas.length}
                      </p>

                      <h2 className="mt-2 text-2xl font-bold leading-tight">
                        {nombreDe(subtema)}
                      </h2>

                      {subtema.descripcion && (
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {subtema.descripcion}
                        </p>
                      )}

                      {completado && (
                        <p className="mt-2 text-sm font-semibold text-green-300">
                          ✓ Completado
                        </p>
                      )}
                    </div>

                    <span className="mt-1 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="border-t border-slate-800 bg-white">
                      {contenidoHtml ? (
                        <div
                          className="contenido-unidad px-4 py-5 text-slate-950 sm:px-6 sm:py-7"
                          dangerouslySetInnerHTML={{ __html: contenidoHtml }}
                        />
                      ) : (
                        <div className="px-4 py-5 text-slate-500 sm:px-6">
                          Este subtema todavía no tiene contenido publicado.
                        </div>
                      )}

                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => irAnterior(idSubtema)}
                            disabled={esPrimero}
                            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
                          >
                            ← Anterior
                          </button>

                          <button
                            type="button"
                            onClick={() => marcarComoCompletado(subtema, true)}
                            disabled={guardando}
                            className={`rounded-xl px-4 py-3 text-sm font-bold ${
                              completado
                                ? "bg-green-500 text-slate-950"
                                : "bg-blue-600 text-white"
                            } disabled:opacity-50`}
                          >
                            {guardando
                              ? "Guardando..."
                              : completado
                              ? "Completado ✓"
                              : "Marcar como completado"}
                          </button>

                          <button
                            type="button"
                            onClick={() => irSiguiente(idSubtema)}
                            disabled={esUltimo}
                            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {parciales.length > 0 && (
          <section className="mt-6 rounded-3xl border border-yellow-700/60 bg-yellow-950/20 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
              Parciales de esta unidad
            </p>

            <h2 className="mt-2 text-2xl font-bold">Evaluación</h2>

            <p className="mt-2 text-sm text-slate-400">
              Cuando termines de estudiar la unidad, puedes resolver el parcial
              correspondiente.
            </p>

            <div className="mt-4 space-y-3">
              {parciales.map((parcial) => (
                <Link
                  key={String(parcial.id)}
                  href={`/parciales/${parcial.id}`}
                  className="block rounded-2xl bg-slate-950 px-4 py-4 hover:bg-slate-900"
                >
                  <h3 className="text-xl font-bold text-yellow-300">
                    {nombreDe(parcial)} →
                  </h3>

                  {parcial.descripcion && (
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {parcial.descripcion}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-slate-400">
                    Tiempo asignado: {parcial.tiempo_minutos || 30} minutos
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>

      <style jsx global>{`
        .contenido-unidad {
          line-height: 1.75;
          font-size: 16px;
          overflow-wrap: anywhere;
        }

        .contenido-unidad h1,
        .contenido-unidad h2,
        .contenido-unidad h3 {
          color: #0f172a;
          font-weight: 800;
          margin: 1.25rem 0 0.75rem;
          line-height: 1.2;
        }

        .contenido-unidad h1 {
          font-size: 2rem;
        }

        .contenido-unidad h2 {
          font-size: 1.75rem;
        }

        .contenido-unidad h3 {
          font-size: 1.35rem;
        }

        .contenido-unidad p {
          margin: 0.85rem 0;
        }

        .contenido-unidad ul,
        .contenido-unidad ol {
          padding-left: 1.4rem;
          margin: 1rem 0;
        }

        .contenido-unidad li {
          margin: 0.35rem 0;
        }

        .contenido-unidad img {
          max-width: 100%;
          height: auto;
        }

        .contenido-unidad iframe {
          max-width: 100%;
        }

        .contenido-unidad video {
          max-width: 100%;
        }

        .contenido-unidad a {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 600;
        }

        .contenido-unidad figure {
          margin: 1.25rem 0;
        }

        .contenido-unidad figcaption {
          color: #64748b;
          font-size: 0.9rem;
          text-align: center;
        }

        @media (max-width: 640px) {
          .contenido-unidad {
            font-size: 15px;
          }

          .contenido-unidad h1 {
            font-size: 1.75rem;
          }

          .contenido-unidad h2 {
            font-size: 1.5rem;
          }

          .contenido-unidad h3 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </main>
  );
}