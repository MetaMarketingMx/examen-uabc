"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AlumnoProtegido from "@/components/AlumnoProtegido";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

type AlumnoRegistro = {
  nombre_completo: string;
  correo_electronico: string;
  estado_validacion: "pendiente" | "aprobado" | "rechazado";
  acceso_plataforma: "activo" | "suspendido";
};

export default function PanelAlumnoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosAlumno();
  }, []);

  async function cargarDatosAlumno() {
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setCargando(false);
      return;
    }

    const emailUsuario = user.email?.toLowerCase() || "";

    if (emailUsuario === ADMIN_EMAIL) {
      setNombre("Administrador");
      setCorreo(emailUsuario);
      setCargando(false);
      return;
    }

    let alumno: AlumnoRegistro | null = null;

    const { data: alumnoPorUserId } = await supabase
      .from("alumnos_registro")
      .select(
        "nombre_completo, correo_electronico, estado_validacion, acceso_plataforma"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    alumno = alumnoPorUserId as AlumnoRegistro | null;

    if (!alumno && emailUsuario) {
      const { data: alumnoPorCorreo } = await supabase
        .from("alumnos_registro")
        .select(
          "nombre_completo, correo_electronico, estado_validacion, acceso_plataforma"
        )
        .eq("correo_electronico", emailUsuario)
        .maybeSingle();

      alumno = alumnoPorCorreo as AlumnoRegistro | null;
    }

    if (alumno) {
      setNombre(alumno.nombre_completo);
      setCorreo(alumno.correo_electronico);
    }

    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <AlumnoProtegido>
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              Panel del alumno
            </p>

            <h1 className="mt-4 text-4xl font-bold">
              Bienvenido a la plataforma
            </h1>

            {cargando ? (
              <p className="mt-4 text-slate-300">Cargando tus datos...</p>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Alumno</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {nombre || "Alumno"}
                </p>

                {correo && (
                  <p className="mt-2 text-sm text-slate-400">{correo}</p>
                )}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-green-700 bg-green-950/30 p-5">
              <p className="font-semibold text-green-200">
                Tu acceso está activo.
              </p>

              <p className="mt-2 text-sm text-green-100">
                Desde aquí podrás entrar a tus materias, simuladores y
                resultados.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <a
                href="/materias"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-sky-500 hover:bg-slate-900"
              >
                <p className="text-sm text-sky-300">Estudio</p>
                <h2 className="mt-2 text-xl font-bold">Materias</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Consulta temas, subtemas y parciales disponibles.
                </p>
              </a>

              <a
                href="/simuladores"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-cyan-500 hover:bg-slate-900"
              >
                <p className="text-sm text-cyan-300">Práctica</p>
                <h2 className="mt-2 text-xl font-bold">Simuladores</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Practica con simuladores generales del examen.
                </p>
              </a>

              <a
                href="/resultados"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-blue-500 hover:bg-slate-900"
              >
                <p className="text-sm text-blue-300">Avance</p>
                <h2 className="mt-2 text-xl font-bold">Resultados</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Revisa tus calificaciones y entregas.
                </p>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/"
                className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Volver al inicio
              </a>

              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-2xl border border-red-700 px-5 py-3 font-semibold text-red-200 hover:bg-red-950"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </section>
      </main>
    </AlumnoProtegido>
  );
}