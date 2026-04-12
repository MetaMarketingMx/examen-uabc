export default function SimuladoresPage() {
  const simuladores = [
    {
      nombre: "Simulador 1",
      descripcion: "Diagnóstico general para medir el nivel inicial del alumno.",
      preguntas: 145,
      duracion: "3 h 30 min",
      estado: "Disponible",
    },
    {
      nombre: "Simulador 2",
      descripcion: "Nivel intermedio con enfoque en ritmo y control de tiempo.",
      preguntas: 145,
      duracion: "3 h 30 min",
      estado: "Disponible",
    },
    {
      nombre: "Simulador 3",
      descripcion: "Simulación completa con estructura parecida al examen real.",
      preguntas: 145,
      duracion: "3 h 30 min",
      estado: "Próximamente",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Simuladores
          </p>
          <h1 className="mt-4 text-4xl font-bold">Práctica general</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Aquí el alumno presenta simuladores completos para practicar con una
            experiencia similar al examen real.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Preguntas</p>
            <h2 className="mt-3 text-4xl font-bold">145</h2>
            <p className="mt-3 text-slate-300">
              Distribuidas por las áreas principales.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Duración</p>
            <h2 className="mt-3 text-4xl font-bold">3 h 30 m</h2>
            <p className="mt-3 text-slate-300">
              Cronómetro continuo para práctica realista.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Historial</p>
            <h2 className="mt-3 text-4xl font-bold">Guardado</h2>
            <p className="mt-3 text-slate-300">
              Cada intento puede registrarse en la cuenta del alumno.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {simuladores.map((simulador) => (
            <div
              key={simulador.nombre}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-semibold">{simulador.nombre}</h2>
              <p className="mt-3 text-slate-300">{simulador.descripcion}</p>

              <div className="mt-5 space-y-2 text-sm text-slate-300">
                <p>Preguntas: {simulador.preguntas}</p>
                <p>Duración: {simulador.duracion}</p>
                <p>
                  Estado:{" "}
                  <span
                    className={
                      simulador.estado === "Disponible"
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }
                  >
                    {simulador.estado}
                  </span>
                </p>
              </div>

              <button
                className={`mt-6 rounded-2xl px-4 py-2 text-sm font-semibold ${
                  simulador.estado === "Disponible"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {simulador.estado === "Disponible"
                  ? "Iniciar simulador"
                  : "No disponible"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}