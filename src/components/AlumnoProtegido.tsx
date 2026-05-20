"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAILS = ["unimed.michel@gmail.com", "jaa.alejandro@gmail.com"];

type AlumnoRegistro = {
  id?: string | number;
  user_id?: string | null;
  nombre_completo?: string | null;
  correo_electronico?: string | null;
  estado_validacion?: "pendiente" | "aprobado" | "rechazado" | null;
  acceso_plataforma?: "activo" | "suspendido" | null;
  [key: string]: any;
};

export default function AlumnoProtegido({
  children,
}: {
  children: ReactNode;
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

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error obteniendo sesión:", sessionError);
      setMensaje("No se pudo verificar tu sesión. Intenta nuevamente.");
      setRevisando(false);
      return;
    }

    const user = sessionData.session?.user;

    if (!user) {
      setHaySesion(false);
      setMensaje("Para acceder a esta sección primero debes iniciar sesión.");
      setRevisando(false);
      return;
    }

    setHaySesion(true);

    const emailUsuario = String(user.email ?? "").toLowerCase();

    if (ADMIN_EMAILS.includes(emailUsuario)) {
      setPermitido(true);
      setRevisando(false);
      return;
    }

    let alumno: AlumnoRegistro | null = null;

    const { data: alumnoPorUserId, error: errorUserId } = await supabase
      .from("alumnos_registro")
      .select(
        "id, user_id, nombre_completo, correo_electronico, estado_validacion, acceso_plataforma"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (errorUserId) {
      console.error("Error verificando acceso por user_id:", errorUserId);
      setMensaje("No se pudo verificar tu acceso. Intenta nuevamente.");
      setRevisando(false);
      return;
    }

    alumno = alumnoPorUserId as AlumnoRegistro | null;

    if (!alumno && emailUsuario) {
      const { data: alumnoPorCorreo, error: errorCorreo } = await supabase
        .from("alumnos_registro")
        .select(
          "id, user_id, nombre_completo, correo_electronico, estado_validacion, acceso_plataforma"
        )
        .ilike("correo_electronico", emailUsuario)
        .maybeSingle();

      if (errorCorreo) {
        console.error("Error verificando acceso por correo:", errorCorreo);
        setMensaje("No se pudo verificar tu acceso. Intenta nuevamente.");
        setRevisando(false);
        return;
      }

      alumno = alumnoPorCorreo as AlumnoRegistro | null;
    }

    if (!alumno) {
      setMensaje(
        "No encontramos un registro de alumno asociado a esta cuenta. Comunícate con administración para revisar tu acceso."
      );
      setRevisando(false);
      return;
    }

    if (alumno.estado_validacion === "pendiente") {
      setMensaje(
        "Tu registro todavía está pendiente de validación. Administración te avisará cuando tu acceso sea aprobado."
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

    setMensaje(
      "No se pudo determinar tu acceso. Comunícate con administración para revisar tu cuenta."
    );
    setRevisando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (revisando) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-10 text-slate-900 sm:px-6">
        <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-blue-100">
                  Plataforma académica
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Validando tu acceso
                </h1>

                <p className="mt-3 text-sm leading-6 text-blue-50">
                  Estamos revisando tu sesión. Esto tomará solo unos segundos.
                </p>
              </div>

              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-64 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute right-12 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
            </div>

            <div className="p-7">
              <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                  🔐
                </div>

                <div>
                  <p className="text-sm font-bold text-blue-700">
                    Revisando permisos
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Espera un momento mientras confirmamos tu cuenta.
                  </p>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/5 animate-pulse rounded-full bg-blue-600" />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!permitido) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-10 text-slate-900 sm:px-6">
        <section className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white">
              <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-semibold text-blue-100">
                  Plataforma académica
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Acceso no disponible
                </h1>

                <p className="mt-3 text-sm leading-6 text-blue-50">
                  No pudimos habilitar esta sección con la cuenta actual.
                </p>
              </div>

              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute right-72 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
            </div>

            <div className="p-6 sm:p-7">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                    ⚠️
                  </div>

                  <div>
                    <p className="text-sm font-bold text-amber-700">
                      Aviso de acceso
                    </p>

                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      {mensaje}
                    </p>
                  </div>
                </div>
              </div>

              {!haySesion ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href="/login"
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-500"
                  >
                    Iniciar sesión
                  </a>

                  <a
                    href="/registro"
                    className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100"
                  >
                    Solicitar registro
                  </a>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href="/login"
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-500"
                  >
                    Iniciar con otra cuenta
                  </a>

                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}