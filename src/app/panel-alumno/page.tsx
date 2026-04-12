export default function PanelAlumnoPage() {
  const materias = [
    {
      nombre: "Comprensión lectora",
      progreso: 72,
      detalle: "3 temas completados, 1 parcial disponible",
    },
    {
      nombre: "Lengua escrita",
      progreso: 58,
      detalle: "2 temas avanzados, 1 parcial disponible",
    },
    {
      nombre: "Matemáticas",
      progreso: 41,
      detalle: "1 tema completado, 1 parcial bloqueado",
    },
  ];

  const actividadReciente = [
    "Completaste el tema: Idea principal",
    "Aprobaste el Parcial 1 de Comprensión lectora",
    "Iniciaste el tema: Coherencia",
    "Guardaste un intento de simulador",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Panel del alumno
          </p>
          <h1 className="mt-4 text-4xl font-bold">Bienvenido</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Aquí el alumno revisa su avance general, sus materias activas,
            parciales disponibles y actividad reciente.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Progreso general</p>
            <h2 className="mt-3 text-4xl font-bold">57%</h2>
            <p className="mt-3 text-slate-300">Avance total del alumno</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Temas completados</p>
            <h2 className="mt-3 text-4xl font-bold">12</h2>
            <p className="mt-3 text-slate-300">Con ejercicio final resuelto</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Parciales aprobados</p>
            <h2 className="mt-3 text-4xl font-bold">3</h2>
            <p className="mt-3 text-slate-300">Dentro de las materias</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Mejor simulador</p>
            <h2 className="mt-3 text-4xl font-bold">81/100</h2>
            <p className="mt-3 text-slate-300">Último resultado guardado</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Materias activas</h2>

            <div className="mt-5 space-y-4">
              {materias.map((materia) => (
                <div
                  key={materia.nombre}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-medium">{materia.nombre}</h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {materia.detalle}
                      </p>
                    </div>
                    <span className="text-sm text-sky-300">
                      {materia.progreso}%
                    </span>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-sky-500"
                      style={{ width: `${materia.progreso}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Actividad reciente</h2>

            <div className="mt-5 space-y-4">
              {actividadReciente.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}