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
  descripcion: string | null;
  orden: number;
  ejercicio_final: string | null;
  activo: boolean;
};

type Parcial = {
  id: number;
  materia_id: number;
  nombre: string;
  descripcion: string | null;
  temas_cubiertos: string | null;
  puntaje_minimo: number | null;
  orden: number;
  activo: boolean;
};

export default async function MateriasPage() {
  const [
    { data: materias, error: errorMaterias },
    { data: temas, error: errorTemas },
    { data: parciales, error: errorParciales },
  ] = await Promise.all([
    supabase.from("materias").select("*").eq("activa", true).order("orden"),
    supabase.from("temas").select("*").eq("activo", true).order("orden"),
    supabase.from("parciales").select("*").eq("activo", true).order("orden"),
  ]);

  if (errorMaterias || errorTemas || errorParciales) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-500/30 bg-slate-900 p-8">
            <h1 className="text-3xl font-bold">Error al cargar materias</h1>
            <p className="mt-4 text-slate-300">
              Revisa Supabase y las variables de entorno.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const materiasData = (materias ?? []) as Materia[];
  const temasData = (temas ?? []) as Tema[];
  const parcialesData = (parciales ?? []) as Parcial[];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Materias
          </p>
          <h1 className="mt-4 text-4xl font-bold">Ruta de estudio real</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Esta pantalla ya está leyendo materias, temas y parciales desde
            Supabase.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {materiasData.map((materia) => {
            const temasFiltrados = temasData.filter(
              (tema) => tema.materia_id === materia.id
            );

            const parcialesFiltrados = parcialesData.filter(
              (parcial) => parcial.materia_id === materia.id
            );

            return (
              <div
                key={materia.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="text-3xl font-semibold">{materia.nombre}</h2>
                <p className="mt-3 text-slate-300">
                  {materia.descripcion ?? "Sin descripción"}
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-2xl font-semibold">Temas</h3>
                    <div className="mt-4 space-y-3">
                      {temasFiltrados.length > 0 ? (
                        temasFiltrados.map((tema) => (
                          <div
                            key={tema.id}
                            className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <h4 className="text-xl font-medium">{tema.nombre}</h4>
                            <p className="mt-2 text-slate-300">
                              {tema.descripcion ?? "Sin descripción"}
                            </p>
                            <p className="mt-2 text-sm text-sky-300">
                              Ejercicio final:{" "}
                              {tema.ejercicio_final ?? "No definido"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400">No hay temas aún.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold">Parciales</h3>
                    <div className="mt-4 space-y-3">
                      {parcialesFiltrados.length > 0 ? (
                        parcialesFiltrados.map((parcial) => (
                          <div
                            key={parcial.id}
                            className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <h4 className="text-xl font-medium">
                              {parcial.nombre}
                            </h4>
                            <p className="mt-2 text-slate-300">
                              {parcial.descripcion ?? "Sin descripción"}
                            </p>
                            <p className="mt-2 text-sm text-sky-300">
                              Temas cubiertos:{" "}
                              {parcial.temas_cubiertos ?? "No definidos"}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              Puntaje mínimo:{" "}
                              {parcial.puntaje_minimo ?? "No definido"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400">No hay parciales aún.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}