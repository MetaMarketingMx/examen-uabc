import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALUMNO_EMAIL = "demo@uabc.com";

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

type Parcial = {
  id: number;
  nombre: string;
  materia_id: number;
};

type Materia = {
  id: number;
  nombre: string;
};

export default async function ResultadosPage() {
  const [
    { data: resultados, error: errorResultados },
    { data: parciales, error: errorParciales },
    { data: materias, error: errorMaterias },
  ] = await Promise.all([
    supabase
      .from("resultados")
      .select("*")
      .eq("alumno_email", ALUMNO_EMAIL)
      .order("created_at", { ascending: false }),
    supabase.from("parciales").select("id, nombre, materia_id"),
    supabase.from("materias").select("id, nombre"),
  ]);

  if (errorResultados || errorParciales || errorMaterias) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-500/30 bg-slate-900 p-8">
            <h1 className="text-3xl font-bold">Error al cargar resultados</h1>
            <p className="mt-4 text-slate-300">
              Revisa Supabase o las variables de entorno.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const resultadosData = (resultados ?? []) as Resultado[];
  const parcialesData = (parciales ?? []) as Parcial[];
  const materiasData = (materias ?? []) as Materia[];

  const promedio =
    resultadosData.length > 0
      ? Math.round(
          resultadosData.reduce((acc, item) => acc + Number(item.puntaje ?? 0), 0) /
            resultadosData.length
        )
      : 0;

  const mejor =
    resultadosData.length > 0
      ? Math.max(...resultadosData.map((item) => Number(item.puntaje ?? 0)))
      : 0;

  const simuladores = resultadosData.filter((item) => item.tipo === "simulador").length;
  const parcialesTomados = resultadosData.filter((item) => item.tipo === "parcial").length;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Resultados
          </p>
          <h1 className="mt-4 text-4xl font-bold">Historial del alumno</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Esta pantalla muestra parciales y simuladores guardados en Supabase.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Resultados registrados</p>
            <p className="mt-3 text-4xl font-bold">{resultadosData.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Promedio</p>
            <p className="mt-3 text-4xl font-bold">{promedio}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Mejor puntaje</p>
            <p className="mt-3 text-4xl font-bold">{mejor}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Parciales / Simuladores</p>
            <p className="mt-3 text-2xl font-bold">
              {parcialesTomados} / {simuladores}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {resultadosData.length > 0 ? (
            resultadosData.map((resultado) => {
              const parcial =
                resultado.tipo === "parcial"
                  ? parcialesData.find((item) => item.id === resultado.referencia_id)
                  : null;

              const materia = parcial
                ? materiasData.find((item) => item.id === parcial.materia_id)
                : null;

              const fecha = new Date(resultado.created_at).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={resultado.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
                        {resultado.tipo}
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold">
                        {parcial?.nombre ??
                          (resultado.tipo === "simulador"
                            ? "Simulador general"
                            : "Resultado")}
                      </h2>

                      <p className="mt-2 text-slate-300">
                        {materia?.nombre ?? "Sin materia asociada"}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">Fecha: {fecha}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-right">
                      <p className="text-sm text-slate-400">Puntaje</p>
                      <p className="text-3xl font-bold text-sky-300">
                        {resultado.puntaje ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">Aciertos</p>
                      <p className="mt-2 text-xl font-semibold">
                        {resultado.aciertos ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">Total de preguntas</p>
                      <p className="mt-2 text-xl font-semibold">
                        {resultado.total_preguntas ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">Tipo</p>
                      <p className="mt-2 text-xl font-semibold capitalize">
                        {resultado.tipo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Detalle</p>
                    <p className="mt-2 text-slate-300">
                      {resultado.detalle ?? "Sin detalle"}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-slate-400">No hay resultados registrados aún.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}