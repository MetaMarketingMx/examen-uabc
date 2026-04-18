import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALUMNO_EMAIL = "demo@uabc.com";

type Materia = {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

type Progreso = {
  id: number;
  materia_id: number | null;
  tema_id: number | null;
  estado: string;
  progreso: number;
  calificacion: number | null;
};

type Resultado = {
  id: number;
  tipo: string;
  referencia_id: number | null;
  puntaje: number | null;
  aciertos: number | null;
  total_preguntas: number | null;
  detalle: string | null;
  created_at: string;
};

export default async function PanelAlumnoPage() {
  const [
    { data: materias, error: errorMaterias },
    { data: progreso, error: errorProgreso },
    { data: resultados, error: errorResultados },
  ] = await Promise.all([
    supabase
      .from("materias")
      .select("id, nombre, descripcion, orden")
      .eq("activa", true)
      .order("orden"),
    supabase
      .from("progreso_alumno")
      .select("id, materia_id, tema_id, estado, progreso, calificacion")
      .eq("alumno_email", ALUMNO_EMAIL)
      .order("fecha_ultimo_avance", { ascending: false }),
    supabase
      .from("resultados")
      .select("id, tipo, referencia_id, puntaje, aciertos, total_preguntas, detalle, created_at")
      .eq("alumno_email", ALUMNO_EMAIL)
      .order("created_at", { ascending: false }),
  ]);

  if (errorMaterias || errorProgreso || errorResultados) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-500/30 bg-slate-900 p-8">
            <h1 className="text-3xl font-bold">Error al cargar el panel</h1>
            <p className="mt-4 text-slate-300">
              Revisa la conexión con Supabase o las variables de entorno.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const materiasData = (materias ?? []) as Materia[];
  const progresoData = (progreso ?? []) as Progreso[];
  const resultadosData = (resultados ?? []) as Resultado[];

  const temasCompletados = progresoData.filter((item) => item.estado === "completado").length;
  const temasEnCurso = progresoData.filter((item) => item.estado === "en curso").length;
  const promedio =
    resultadosData.length > 0
      ? Math.round(
          resultadosData.reduce((acc, item) => acc + Number(item.puntaje ?? 0), 0) /
            resultadosData.length
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Panel del alumno
          </p>
          <h1 className="mt-4 text-4xl font-bold">Avance general</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Vista conectada a Supabase con progreso y resultados del alumno demo.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Materias activas</p>
            <p className="mt-3 text-4xl font-bold">{materiasData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Temas completados</p>
            <p className="mt-3 text-4xl font-bold">{temasCompletados}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Temas en curso</p>
            <p className="mt-3 text-4xl font-bold">{temasEnCurso}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Promedio</p>
            <p className="mt-3 text-4xl font-bold">{promedio}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Progreso por materia</h2>
            <div className="mt-5 space-y-4">
              {materiasData.map((materia) => {
                const items = progresoData.filter((item) => item.materia_id === materia.id);
                const avance =
                  items.length > 0
                    ? Math.round(items.reduce((acc, item) => acc + item.progreso, 0) / items.length)
                    : 0;

                return (
                  <div
                    key={materia.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-medium">{materia.nombre}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {materia.descripcion ?? "Sin descripción"}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-sky-300">{avance}%</p>
                    </div>

                    <div className="mt-4 h-3 rounded-full bg-slate-800">
                      <div
                        className="h-3 rounded-full bg-sky-400"
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Resultados recientes</h2>
            <div className="mt-5 space-y-4">
              {resultadosData.length > 0 ? (
                resultadosData.map((resultado) => (
                  <div
                    key={resultado.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-lg font-medium capitalize">{resultado.tipo}</p>
                      <p className="text-lg font-semibold text-sky-300">
                        {resultado.puntaje ?? "—"}
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Aciertos: {resultado.aciertos ?? "—"} /{" "}
                      {resultado.total_preguntas ?? "—"}
                    </p>

                    <p className="mt-2 text-slate-300">
                      {resultado.detalle ?? "Sin detalle"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No hay resultados aún.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}