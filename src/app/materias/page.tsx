"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Materia = {
  id: string | number;
  nombre?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  orden?: number | null;
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

type ProgresoSubtema = {
  subtema_id: string | number;
  tema_id?: string | number | null;
  materia_id?: string | number | null;
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

function temaPerteneceAMateria(tema: Tema, materiaId: string | number) {
  const id = String(materiaId);

  return (
    String(tema.materia_id ?? "") === id ||
    String(tema.id_materia ?? "") === id ||
    String(tema.materia ?? "") === id
  );
}

function subtemaPerteneceATema(subtema: Subtema, temaId: string | number) {
  const id = String(temaId);

  return (
    String(subtema.tema_id ?? "") === id ||
    String(subtema.unidad_id ?? "") === id ||
    String(subtema.id_tema ?? "") === id ||
    String(subtema.id_unidad ?? "") === id ||
    String(subtema.tema ?? "") === id ||
    String(subtema.unidad ?? "") === id
  );
}

function parcialPerteneceATema(parcial: Parcial, temaId: string | number) {
  const id = String(temaId);

  return (
    String(parcial.tema_id ?? "") === id ||
    String(parcial.unidad_id ?? "") === id ||
    String(parcial.id_tema ?? "") === id ||
    String(parcial.id_unidad ?? "") === id ||
    String(parcial.tema ?? "") === id ||
    String(parcial.unidad ?? "") === id
  );
}

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [subtemasCompletados, setSubtemasCompletados] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data: materiasData, error: materiasError } = await supabase
      .from("materias")
      .select("*");

    if (materiasError) {
      console.error("Error cargando materias:", materiasError);
      setMaterias([]);
      setLoading(false);
      return;
    }

    const { data: temasData } = await supabase.from("temas").select("*");
    const { data: subtemasData } = await supabase.from("subtemas").select("*");
    const { data: parcialesData } = await supabase.from("parciales").select("*");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (user) {
      const { data: progresoData, error: progresoError } = await supabase
        .from("progreso_subtemas")
        .select("*")
        .eq("user_id", user.id)
        .eq("completado", true);

      if (!progresoError) {
        const progreso = (progresoData || []) as ProgresoSubtema[];

        setSubtemasCompletados(
          new Set(progreso.map((item) => String(item.subtema_id)))
        );
      } else {
        console.error("Error cargando progreso:", progresoError);
        setSubtemasCompletados(new Set());
      }
    } else {
      setSubtemasCompletados(new Set());
    }

    setMaterias(ordenarPorOrden((materiasData || []) as Materia[]));
    setTemas(ordenarPorOrden((temasData || []) as Tema[]));
    setSubtemas(ordenarPorOrden((subtemasData || []) as Subtema[]));
    setParciales(ordenarPorOrden((parcialesData || []) as Parcial[]));

    setLoading(false);
  }

  function obtenerTemasDeMateria(materiaId: string | number) {
    return ordenarPorOrden(
      temas.filter((tema) => temaPerteneceAMateria(tema, materiaId))
    );
  }

  function obtenerSubtemasDeTema(temaId: string | number) {
    return ordenarPorOrden(
      subtemas.filter((subtema) => subtemaPerteneceATema(subtema, temaId))
    );
  }

  function obtenerParcialesDeTema(temaId: string | number) {
    return ordenarPorOrden(
      parciales.filter((parcial) => parcialPerteneceATema(parcial, temaId))
    );
  }

  function contarCompletados(listaSubtemas: Subtema[]) {
    return listaSubtemas.filter((subtema) =>
      subtemasCompletados.has(String(subtema.id))
    ).length;
  }

  function obtenerPrimerPendiente(listaSubtemas: Subtema[]) {
    return (
      listaSubtemas.find(
        (subtema) => !subtemasCompletados.has(String(subtema.id))
      ) || listaSubtemas[0]
    );
  }

  function obtenerTextoBotonUnidad(listaSubtemas: Subtema[]) {
    if (listaSubtemas.length === 0) return "Ver unidad";

    const completados = contarCompletados(listaSubtemas);

    if (completados === 0) return "Iniciar unidad";
    if (completados >= listaSubtemas.length) return "Repasar unidad";
    return "Continuar avance";
  }

  function obtenerResumenMateria(materiaId: string | number) {
    const temasMateria = obtenerTemasDeMateria(materiaId);

    const totalSubtemas = temasMateria.reduce((total, tema) => {
      return total + obtenerSubtemasDeTema(tema.id).length;
    }, 0);

    const completados = temasMateria.reduce((total, tema) => {
      return total + contarCompletados(obtenerSubtemasDeTema(tema.id));
    }, 0);

    const totalParciales = temasMateria.reduce((total, tema) => {
      return total + obtenerParcialesDeTema(tema.id).length;
    }, 0);

    const porcentaje =
      totalSubtemas > 0 ? Math.round((completados / totalSubtemas) * 100) : 0;

    return {
      temasMateria,
      totalTemas: temasMateria.length,
      totalSubtemas,
      totalParciales,
      completados,
      porcentaje,
    };
  }

  const totalTemas = temas.length;
  const totalSubtemas = subtemas.length;
  const totalParciales = parciales.length;
  const totalCompletados = contarCompletados(subtemas);
  const porcentajeGeneral =
    totalSubtemas > 0
      ? Math.round((totalCompletados / totalSubtemas) * 100)
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-white">
        Cargando materias...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
            Plataforma académica
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Materias</h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8">
            Selecciona una materia para revisar sus unidades, subtemas,
            publicaciones de estudio y parciales disponibles.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Materias</p>
              <p className="mt-1 text-2xl font-bold">{materias.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Unidades</p>
              <p className="mt-1 text-2xl font-bold">{totalTemas}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Publicaciones</p>
              <p className="mt-1 text-2xl font-bold">{totalSubtemas}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Parciales</p>
              <p className="mt-1 text-2xl font-bold">{totalParciales}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-300">
                Avance general
              </p>
              <p className="text-sm font-bold text-slate-300">
                {porcentajeGeneral}%
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${porcentajeGeneral}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {totalCompletados} de {totalSubtemas} publicaciones completadas
            </p>
          </div>
        </header>

        {materias.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-2xl font-bold">No hay materias todavía</h2>

            <p className="mt-3 text-slate-400">
              Cuando el administrador agregue materias, aparecerán aquí.
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            {materias.map((materia) => {
              const resumen = obtenerResumenMateria(materia.id);

              return (
                <article
                  key={String(materia.id)}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">
                      Materia
                    </p>

                    <h2 className="mt-3 text-3xl font-bold leading-tight">
                      {nombreDe(materia)}
                    </h2>

                    {materia.descripcion && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {materia.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-slate-950 p-3">
                      <p className="text-xs text-slate-400">Unidades</p>
                      <p className="mt-1 text-xl font-bold">
                        {resumen.totalTemas}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-3">
                      <p className="text-xs text-slate-400">Publicaciones</p>
                      <p className="mt-1 text-xl font-bold">
                        {resumen.totalSubtemas}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-3">
                      <p className="text-xs text-slate-400">Parciales</p>
                      <p className="mt-1 text-xl font-bold">
                        {resumen.totalParciales}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-300">
                        Avance de la materia
                      </p>
                      <p className="text-sm font-bold text-slate-300">
                        {resumen.porcentaje}%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${resumen.porcentaje}%` }}
                      />
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      {resumen.completados} de {resumen.totalSubtemas}{" "}
                      publicaciones completadas
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {resumen.temasMateria.map((tema, temaIndex) => {
                      const subtemasTema = obtenerSubtemasDeTema(tema.id);
                      const parcialesTema = obtenerParcialesDeTema(tema.id);
                      const subtemasVisibles = subtemasTema.slice(0, 3);
                      const completadosTema = contarCompletados(subtemasTema);
                      const porcentajeTema =
                        subtemasTema.length > 0
                          ? Math.round(
                              (completadosTema / subtemasTema.length) * 100
                            )
                          : 0;

                      const subtemaDestino =
                        obtenerPrimerPendiente(subtemasTema);

                      const hrefContinuar = subtemaDestino
                        ? `/temas/${tema.id}/contenido?subtema=${subtemaDestino.id}`
                        : `/temas/${tema.id}/contenido`;

                      return (
                        <div
                          key={String(tema.id)}
                          className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                                Unidad {temaIndex + 1}
                              </p>

                              <h3 className="mt-2 text-xl font-bold leading-tight">
                                {nombreDe(tema)}
                              </h3>

                              {tema.descripcion && (
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {tema.descripcion}
                                </p>
                              )}
                            </div>

                            <Link
                              href={hrefContinuar}
                              className="rounded-xl bg-sky-500 px-4 py-3 text-center text-sm font-bold text-slate-950 hover:bg-sky-400"
                            >
                              {obtenerTextoBotonUnidad(subtemasTema)}
                            </Link>
                          </div>

                          <div className="mt-4 rounded-xl bg-slate-900 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm text-slate-400">
                                {completadosTema} de {subtemasTema.length}{" "}
                                completadas
                              </p>
                              <p className="text-sm font-bold text-slate-300">
                                {porcentajeTema}%
                              </p>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${porcentajeTema}%` }}
                              />
                            </div>
                          </div>

                          {subtemasTema.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {subtemasVisibles.map((subtema) => {
                                const completado = subtemasCompletados.has(
                                  String(subtema.id)
                                );

                                return (
                                  <Link
                                    key={String(subtema.id)}
                                    href={`/temas/${tema.id}/contenido?subtema=${subtema.id}`}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700"
                                  >
                                    <div>
                                      <h4 className="text-base font-semibold leading-tight">
                                        {nombreDe(subtema)}
                                      </h4>

                                      {subtema.descripcion && (
                                        <p className="mt-1 text-xs leading-5 text-slate-400">
                                          {subtema.descripcion}
                                        </p>
                                      )}
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                                        completado
                                          ? "bg-green-500 text-slate-950"
                                          : "bg-slate-700 text-slate-200"
                                      }`}
                                    >
                                      {completado ? "✓" : "→"}
                                    </span>
                                  </Link>
                                );
                              })}

                              <Link
                                href={`/temas/${tema.id}/contenido`}
                                className="mt-3 flex w-full justify-center rounded-xl border border-sky-700 px-4 py-3 text-center font-bold text-sky-300 hover:bg-sky-950"
                              >
                                Ver las {subtemasTema.length} publicaciones
                              </Link>
                            </div>
                          )}

                          {parcialesTema.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-yellow-700/60 bg-yellow-950/20 p-3">
                              <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
                                Parcial de la unidad
                              </p>

                              <div className="mt-3 space-y-2">
                                {parcialesTema.map((parcial) => (
                                  <Link
                                    key={String(parcial.id)}
                                    href={`/parciales/${parcial.id}`}
                                    className="block rounded-xl bg-slate-950 px-4 py-3 hover:bg-slate-900"
                                  >
                                    <h4 className="font-bold text-yellow-300">
                                      {nombreDe(parcial)} →
                                    </h4>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}