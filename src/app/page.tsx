import Link from "next/link";

const secciones = [
  {
    titulo: "Materias",
    descripcion:
      "Accede a las materias del curso con temas organizados por avance.",
    href: "/materias",
    icono: "📚",
  },
  {
    titulo: "Simuladores",
    descripcion: "Practica con simuladores generales parecidos al examen real.",
    href: "/simuladores",
    icono: "🖥️",
  },
  {
    titulo: "Resultados",
    descripcion:
      "Consulta puntajes, avances y resultados de parciales y simuladores.",
    href: "/resultados",
    icono: "🏆",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white shadow-sm sm:p-8">
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Plataforma académica
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                UNIMED
              </h1>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-blue-50 sm:text-2xl">
                Curso para examen de admisión a UABC
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
                Plataforma para estudiar por materias, avanzar por temas,
                consultar contenido académico, resolver ejercicios, presentar
                parciales, hacer simuladores y revisar resultados.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-6 py-4 text-center text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/registro"
                className="rounded-2xl bg-slate-900 px-6 py-4 text-center text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Solicitar registro
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 right-8 hidden h-44 w-72 lg:block">
            <div className="absolute bottom-0 right-10 h-28 w-40 rounded-t-[3rem] bg-white/25 backdrop-blur" />
            <div className="absolute bottom-10 right-20 h-20 w-20 rounded-full bg-white/30" />
            <div className="absolute bottom-8 right-0 h-24 w-36 rounded-3xl bg-white/90 shadow-lg" />
            <div className="absolute bottom-16 right-7 h-3 w-24 rounded-full bg-blue-200" />
            <div className="absolute bottom-11 right-7 h-3 w-20 rounded-full bg-blue-100" />
            <div className="absolute bottom-20 right-4 text-4xl">✏️</div>
          </div>

          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute right-72 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              📘
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Todas las materias
            </p>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Contenido organizado por avance
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              El alumno estudia por materia, avanza por unidades y revisa los
              subtemas disponibles dentro de la plataforma.
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              🎬
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Contenido académico
            </p>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Texto, video, imágenes y material
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              El alumno puede consultar el material del curso y avanzar en los
              temas disponibles desde cualquier dispositivo.
            </p>
          </div>

          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              📝
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              Evaluación
            </p>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Parciales y simuladores
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Los parciales ayudan a medir el avance por unidad y los
              simuladores permiten practicar de forma general.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {secciones.map((seccion) => (
            <Link
              key={seccion.href}
              href={seccion.href}
              className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition group-hover:bg-blue-600 group-hover:text-white">
                {seccion.icono}
              </div>

              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                {seccion.titulo}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {seccion.descripcion}
              </p>

              <p className="mt-4 text-sm font-bold text-blue-600">
                Abrir sección →
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Aviso de independencia
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            UNIMED es una plataforma académica independiente. No pertenece, no
            está afiliada ni está autorizada por la Universidad Autónoma de Baja
            California. UABC es marca de su respectivo titular. El contenido se
            ofrece únicamente como preparación académica independiente para
            aspirantes.
          </p>
        </section>
      </section>
    </main>
  );
}