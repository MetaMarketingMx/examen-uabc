import Link from "next/link";

const secciones = [
  {
    titulo: "Materias",
    descripcion:
      "Accede a Comprensión lectora, Lengua escrita y Matemáticas con temas organizados por avance.",
    href: "/materias",
  },
  {
    titulo: "Simuladores",
    descripcion:
      "Practica con simuladores generales parecidos al examen real.",
    href: "/simuladores",
  },
  {
    titulo: "Resultados",
    descripcion:
      "Consulta puntajes, avances y resultados de parciales y simuladores.",
    href: "/resultados",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
            Plataforma académica
          </p>

          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Examen UABC
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Plataforma para estudiar por materias, avanzar por temas, consultar
            contenido académico, resolver ejercicios, presentar exámenes
            parciales, hacer simuladores y revisar resultados.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-2xl font-semibold">
            Acceso a la plataforma
          </h2>

          <p className="mt-3 max-w-3xl text-slate-300">
            Si ya tienes acceso aprobado, inicia sesión con tu correo o usuario
            y contraseña. Si aún no tienes acceso, llena el formulario de
            registro para que administración revise tu solicitud.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/registro"
              className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Solicitar registro
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Materias principales</p>

            <h2 className="mt-3 text-2xl font-semibold">
              Comprensión lectora, Lengua escrita y Matemáticas
            </h2>

            <p className="mt-3 text-slate-300">
              El alumno estudia por materia y desbloquea parciales conforme
              avanza.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Contenido académico</p>

            <h2 className="mt-3 text-2xl font-semibold">
              PDF, video, imágenes y ejercicios
            </h2>

            <p className="mt-3 text-slate-300">
              El alumno puede consultar material del curso y avanzar en los
              temas disponibles.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Evaluación</p>

            <h2 className="mt-3 text-2xl font-semibold">
              Parciales y simuladores
            </h2>

            <p className="mt-3 text-slate-300">
              Los parciales viven dentro de cada materia y los simuladores están
              aparte.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {secciones.map((seccion) => (
            <Link
              key={seccion.href}
              href={seccion.href}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/40 hover:bg-slate-800"
            >
              <h3 className="text-2xl font-semibold">{seccion.titulo}</h3>
              <p className="mt-3 text-slate-300">{seccion.descripcion}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}