export default function ResultadosPage() {
  const resultadosPorMateria = [
    {
      nombre: "Comprensión lectora",
      porcentaje: 88,
      detalle: "Área más fuerte del alumno",
    },
    {
      nombre: "Lengua escrita",
      porcentaje: 79,
      detalle: "Buen avance, con algunos temas por reforzar",
    },
    {
      nombre: "Matemáticas",
      porcentaje: 62,
      detalle: "Área con mayor oportunidad de mejora",
    },
  ];

  const recomendaciones = [
    "Repasar porcentajes y ecuaciones en Matemáticas.",
    "Continuar con Cohesión y Puntuación en Lengua escrita.",
    "Presentar un nuevo simulador esta semana.",
    "Repetir el parcial pendiente al completar los temas faltantes.",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Resultados
          </p>
          <h1 className="mt-4 text-4xl font-bold">Desempeño del alumno</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Aquí se muestran los puntajes generales, el avance por materia y las
            recomendaciones para seguir estudiando.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Calificación global</p>
            <h2 className="mt-3 text-4xl font-bold">81/100</h2>
            <p className="mt-3 text-slate-300">Último simulador realizado</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Aciertos</p>
            <h2 className="mt-3 text-4xl font-bold">117</h2>
            <p className="mt-3 text-slate-300">De un total de 145 preguntas</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Área más fuerte</p>
            <h2 className="mt-3 text-3xl font-bold">Lectura</h2>
            <p className="mt-3 text-slate-300">Mayor porcentaje de aciertos</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Área a reforzar</p>
            <h2 className="mt-3 text-3xl font-bold">Matemáticas</h2>
            <p className="mt-3 text-slate-300">Conviene reforzar esta semana</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Resultados por materia</h2>

            <div className="mt-5 space-y-4">
              {resultadosPorMateria.map((materia) => (
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
                      {materia.porcentaje}%
                    </span>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-sky-500"
                      style={{ width: `${materia.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Recomendaciones</h2>

            <div className="mt-5 space-y-4">
              {recomendaciones.map((item) => (
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