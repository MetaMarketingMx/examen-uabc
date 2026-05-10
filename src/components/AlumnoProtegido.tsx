"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

type AlumnoRegistro = {
  nombre_completo: string;
  estado_validacion: "pendiente" | "aprobado" | "rechazado";
  acceso_plataforma: "activo" | "suspendido";
};

export default function AlumnoProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revisando, setRevisando] = useState(true);
  const [permitido, setPermitido] = useState(false);
  const [haySesion, setHaySesion] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    revisarAcceso();
  }, []);

  async function revisarAcceso() {
    setRevisando(true);
    setPermitido(false);
    setHaySesion(false);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setHaySesion(false);
      setMensaje("Para acceder a esta sección primero debes iniciar sesión.");
      setRevisando(false);
      return;
    }

    setHaySesion(true);

    const emailUsuario = user.email?.toLowerCase() || "";

    if (emailUsuario === ADMIN_EMAIL) {
      setPermitido(true);
      setRevisando(false);
      return;
    }

    let alumno: AlumnoRegistro | null = null;

    const { data: alumnoPorUserId, error: errorUserId } = await supabase
      .from("alumnos_registro")
      .select("nombre_completo, estado_validacion, acceso_plataforma")
      .eq("user_id", user.id)
      .maybeSingle();

    if (errorUserId) {
      setMensaje("No se pudo verificar tu acceso. Intenta nuevamente.");
      setRevisando(false);
      return;
    }

    alumno = alumnoPorUserId as AlumnoRegistro | null;

    if (!alumno && emailUsuario) {
      const { data: alumnoPorCorreo, error: errorCorreo } = await supabase
        .from("alumnos_registro")
        .select("nombre_completo, estado_validacion, acceso_plataforma")
        .eq("correo_electronico", emailUsuario)
        .maybeSingle();

      if (errorCorreo) {
        setMensaje("No se pudo verificar tu acceso. Intenta nuevamente.");
        setRevisando(false);
        return;
      }

      alumno = alumnoPorCorreo as AlumnoRegistro | null;
    }

    if (!alumno) {
      setMensaje(
        "No encontramos un registro de alumno asociado a esta cuenta. Comunícate con administración."
      );
      setRevisando(false);
      return;
    }

    if (alumno.estado_validacion === "pendiente") {
      setMensaje(
        "Tu registro todavía está pendiente de validación. Administración te avisará por WhatsApp cuando tu acceso sea aprobado."
      );
      setRevisando(false);
      return;
    }

    if (alumno.estado_validacion === "rechazado") {
      setMensaje(
        "Tu registro no fue aprobado por el momento. Si consideras que hubo un error, comunícate con administración."
      );
      setRevisando(false);
      return;
    }

    if (alumno.acceso_plataforma === "suspendido") {
      setMensaje(
        "Tu acceso a la plataforma se encuentra suspendido temporalmente. Comunícate con administración para revisar tu situación."
      );
      setRevisando(false);
      return;
    }

    if (
      alumno.estado_validacion === "aprobado" &&
      alumno.acceso_plataforma === "activo"
    ) {
      setPermitido(true);
      setRevisando(false);
      return;
    }

    setMensaje("No se pudo determinar tu acceso. Comunícate con administración.");
    setRevisando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (revisando) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <p className="text-sm text-slate-300">Verificando acceso...</p>
        </div>
      </main>
    );
  }

  if (!permitido) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-2xl font-bold">Acceso no disponible</h1>

          <div className="mt-5 rounded-lg border border-yellow-500 bg-yellow-950 p-4 text-sm text-yellow-200">
            {mensaje}
          </div>

          {!haySesion ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <a
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Iniciar sesión
              </a>

              <a
                href="/registro"
                className="rounded-lg border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                Solicitar registro
              </a>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <a
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Iniciar sesión con otra cuenta
              </a>

              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-lg border border-red-700 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-950"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}