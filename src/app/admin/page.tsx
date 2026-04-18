import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Materia = {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
};

type Tema = {
  id: number;
  materia_id: number;
  nombre: string;
  activo: boolean;
};

type Parcial = {
  id: number;
  materia_id: number;
  nombre: string;
  activo: boolean;
};

type Progreso = {
  id: number;
  materia_id: number | null;
  estado: string;
};

type Resultado = {
  id: number;
  tipo: string;
  puntaje: number | null;
};

export default async function AdminPage() {
  const [
    { data: materias, error: errorMaterias },
    { data: temas, error: errorTemas },
    { data: parciales, error: errorParciales },
    { data: progreso, error: errorProgreso },
    { data: resultados, error: errorResultados },
  ] = await Promise.all([
    supabase.from("materias").select("*").order("orden"),
    supabase.from("temas").select("id, materia_id, nombre, activo").order("materia_id").order("orden"),
    supabase.from("parciales").select("id, materia_id, nombre, activo").order("materia_id").order("orden"),
    supabase.from("progreso_alumno").select("id, materia_id, estado"),
    supabase.from("resultados").select("id, tipo, puntaje"),
  ]);

  if (
    errorMaterias ||
    errorTemas ||
    errorParciales ||
    errorProgreso ||
    errorResultados
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-500/30 bg-slate-900 p-8">
            <h1 className="text-3xl font-bold">Error al cargar admin</h1>
            <p className="mt-4 text-slate-300">
              Revisa Supabase o las variables de entorno.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const materiasData = (materias ?? []) as Materia[];
  const temasData = (temas ?? []) as Tema[];
  const parcialesData = (parciales ?? []) as Parcial[];
  const progresoData = (progreso ?? []) as Progreso[];
  const resultadosData = (resultados ?? []) as Resultado[];

  const promedioGeneral =
    resultadosData.length > 0
      ? Math.round(
          resultadosData.reduce((acc, item) => acc + Number(item.puntaje ?? 0), 0) /
            resultadosData.length
        )
      : 0;

  const resultadosParcial = resultadosData.filter((r) => r.tipo === "parcial").length;
  const resultadosSimulador = resultadosData.filter((r) => r.tipo === "simulador").length;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Admin
          </p>
          <h1 className="mt-4 text-4xl font-bold">Panel administrativo</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Vista general de materias, temas, parciales, progreso y resultados
            almacenados en Supabase.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Materias</p>
            <p className="mt-3 text-4xl font-bold">{materiasData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Temas</p>
            <p className="mt-3 text-4xl font-bold">{temasData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Parciales</p>
            <p className="mt-3 text-4xl font-bold">{parcialesData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Progreso</p>
            <p className="mt-3 text-4xl font-bold">{progresoData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Resultados</p>
            <p className="mt-3 text-4xl font-bold">{resultadosData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Promedio</p>
            <p className="mt-3 text-4xl font-bold">{promedioGeneral}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Resumen por materia</h2>

            <div className="mt-5 space-y-4">
              {materiasData.map((materia) => {
                const temasMateria = temasData.filter((tema) => tema.materia_id === materia.id);
                const parcialesMateria = parcialesData.filter(
                  (parcial) => parcial.materia_id === materia.id
                );
                const progresoMateria = progresoData.filter(
                  (item) => item.materia_id === materia.id
                );

                const completados = progresoMateria.filter(
                  (item) => item.estado === "completado"
                ).length;

                const enCurso = progresoMateria.filter(
                  (item) => item.estado === "en curso"
                ).length;

                return (
                  <div
                    key={materia.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{materia.nombre}</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          {materia.descripcion ?? "Sin descripción"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          materia.activa
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {materia.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-800 p-3">
                        <p className="text-xs text-slate-400">Temas</p>
                        <p className="mt-1 text-lg font-semibold">{temasMateria.length}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 p-3">
                        <p className="text-xs text-slate-400">Parciales</p>
                        <p className="mt-1 text-lg font-semibold">{parcialesMateria.length}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 p-3">
                        <p className="text-xs text-slate-400">Completados</p>
                        <p className="mt-1 text-lg font-semibold">{completados}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 p-3">
                        <p className="text-xs text-slate-400">En curso</p>
                        <p className="mt-1 text-lg font-semibold">{enCurso}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-semibold">Resultados globales</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Parciales registrados</p>
                  <p className="mt-2 text-3xl font-bold">{resultadosParcial}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Simuladores registrados</p>
                  <p className="mt-2 text-3xl font-bold">{resultadosSimulador}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-semibold">Listado de materias</h2>

              <div className="mt-5 space-y-3">
                {materiasData.map((materia) => (
                  <div
                    key={materia.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <p className="text-lg font-medium">{materia.nombre}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Orden: {materia.orden}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}