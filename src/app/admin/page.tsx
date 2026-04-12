export default function AdminPage() {
  const bloques = [
    {
      titulo: "Gestionar materias",
      descripcion:
        "Agregar, modificar o reordenar Comprensión lectora, Lengua escrita y Matemáticas.",
    },
    {
      titulo: "Gestionar temas",
      descripcion:
        "Crear temas dentro de cada materia y definir su avance.",
    },
    {
      titulo: "Contenido académico",
      descripcion:
        "Subir PDFs, videos, imágenes y material demo breve para rellenar espacios.",
    },
    {
      titulo: "Exámenes parciales",
      descripcion:
        "Crear parciales dentro de cada materia y decidir cuándo se desbloquean.",
    },
    {
      titulo: "Simuladores",
      descripcion:
        "Administrar simuladores generales, duración y cantidad de preguntas.",
    },
    {
      titulo: "Resultados y alumnos",
      descripcion:
        "Consultar progreso, puntajes, actividad y desempeño de los alumnos.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Panel admin
          </p>
          <h1 className="mt-4 text-4xl font-bold">Gestión de la plataforma</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Aquí podrás administrar materias, temas, contenido académico,
            parciales, simuladores y resultados de los alumnos.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Alumnos activos</p>
            <h2 className="mt-3 text-4xl font-bold">126</h2>
            <p className="mt-3 text-slate-300">Con acceso vigente</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Materias</p>
            <h2 className="mt-3 text-4xl font-bold">3</h2>
            <p className="mt-3 text-slate-300">Editables y ampliables</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Preguntas</p>
            <h2 className="mt-3 text-4xl font-bold">942</h2>
            <p className="mt-3 text-slate-300">Banco general demo</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Simuladores</p>
            <h2 className="mt-3 text-4xl font-bold">8</h2>
            <p className="mt-3 text-slate-300">Disponibles o programados</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bloques.map((bloque) => (
            <div
              key={bloque.titulo}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-semibold">{bloque.titulo}</h2>
              <p className="mt-3 text-slate-300">{bloque.descripcion}</p>

              <button className="mt-6 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white">
                Administrar
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}