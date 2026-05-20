"use client";

import { type FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

type EstadoValidacion = "pendiente" | "aprobado" | "rechazado";
type AccesoPlataforma = "activo" | "suspendido";

type AlumnoRegistro = {
  id: string;
  user_id: string | null;
  nombre_completo: string;
  correo_electronico: string;
  usuario_alias: string;
  estado_validacion: EstadoValidacion;
  acceso_plataforma: AccesoPlataforma;
};

export default function LoginPage() {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function obtenerCorreoParaLogin(valor: string) {
    const texto = valor.trim();

    if (texto.includes("@")) {
      return texto.toLowerCase();
    }

    const { data, error: aliasError } = await supabase.rpc(
      "obtener_correo_por_alias",
      {
        alias_buscado: texto,
      }
    );

    if (aliasError || !data) {
      return null;
    }

    return String(data).trim().toLowerCase();
  }

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    const identificadorLimpio = identificador.trim();

    if (!identificadorLimpio || !password.trim()) {
      setError("Escribe tu correo o usuario, y tu contraseña.");
      return;
    }

    setCargando(true);

    const correoParaLogin = await obtenerCorreoParaLogin(identificadorLimpio);

    if (!correoParaLogin) {
      setError(
        "No encontramos un alumno o administrador con ese correo o usuario. Revisa tus datos o comunícate con administración."
      );
      setCargando(false);
      return;
    }

    const { data: authData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: correoParaLogin,
        password: password.trim(),
      });

    if (loginError) {
      setError(
        "No pudimos iniciar sesión. Revisa que tu correo, usuario o contraseña sean correctos."
      );
      setCargando(false);
      return;
    }

    const user = authData.user;

    if (!user) {
      await supabase.auth.signOut();
      setError("No se pudo verificar tu usuario. Intenta nuevamente.");
      setCargando(false);
      return;
    }

    const emailUsuario = user.email?.toLowerCase() || "";

    if (emailUsuario === ADMIN_EMAIL) {
      setMensaje("Acceso administrativo correcto. Redirigiendo...");
      window.location.href = "/admin";
      return;
    }

    let registro: AlumnoRegistro | null = null;

    const { data: registroPorUsuario, error: errorUsuario } = await supabase
      .from("alumnos_registro")
      .select(
        "id, user_id, nombre_completo, correo_electronico, usuario_alias, estado_validacion, acceso_plataforma"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (errorUsuario) {
      await supabase.auth.signOut();
      setError("No se pudo revisar tu acceso. Intenta nuevamente.");
      setCargando(false);
      return;
    }

    registro = registroPorUsuario as AlumnoRegistro | null;

    if (!registro) {
      const { data: registroPorCorreo, error: errorCorreo } = await supabase
        .from("alumnos_registro")
        .select(
          "id, user_id, nombre_completo, correo_electronico, usuario_alias, estado_validacion, acceso_plataforma"
        )
        .eq("correo_electronico", correoParaLogin)
        .maybeSingle();

      if (errorCorreo) {
        await supabase.auth.signOut();
        setError("No se pudo revisar tu acceso. Intenta nuevamente.");
        setCargando(false);
        return;
      }

      registro = registroPorCorreo as AlumnoRegistro | null;

      if (registro && !registro.user_id) {
        await supabase
          .from("alumnos_registro")
          .update({ user_id: user.id })
          .eq("id", registro.id);
      }
    }

    if (!registro) {
      await supabase.auth.signOut();
      setError(
        "No encontramos un registro de alumno asociado a este usuario. Si ya te registraste, comunícate con administración."
      );
      setCargando(false);
      return;
    }

    if (registro.estado_validacion === "pendiente") {
      await supabase.auth.signOut();
      setMensaje(
        "Tu registro todavía está pendiente de validación. Administración revisará tu información y te avisará por WhatsApp cuando tu acceso sea aprobado."
      );
      setCargando(false);
      return;
    }

    if (registro.estado_validacion === "rechazado") {
      await supabase.auth.signOut();
      setMensaje(
        "Tu registro no fue aprobado por el momento. Si consideras que hubo un error, comunícate con administración."
      );
      setCargando(false);
      return;
    }

    if (registro.acceso_plataforma === "suspendido") {
      await supabase.auth.signOut();
      setMensaje(
        "Tu acceso a la plataforma se encuentra suspendido temporalmente. Comunícate con administración para revisar tu situación."
      );
      setCargando(false);
      return;
    }

    if (
      registro.estado_validacion === "aprobado" &&
      registro.acceso_plataforma === "activo"
    ) {
      setMensaje("Acceso correcto. Redirigiendo a la plataforma...");
      window.location.href = "/";
      return;
    }

    await supabase.auth.signOut();
    setError("No se pudo determinar tu acceso. Comunícate con administración.");
    setCargando(false);
  }

  return (
    <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Plataforma académica
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Iniciar sesión
              </h1>

              <p className="mt-3 text-sm leading-6 text-blue-50">
                Ingresa con tu correo electrónico o nombre de usuario para
                acceder a la plataforma.
              </p>
            </div>

            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 left-64 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-12 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
          </div>

          <div className="p-6 sm:p-7">
            {mensaje && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                {mensaje}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={iniciarSesion} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Correo electrónico o usuario
                </label>

                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                  placeholder="correo@ejemplo.com o alias"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Contraseña
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                  placeholder="Tu contraseña"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando ? "Verificando acceso..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href="/recuperar-contrasena"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                ¿Olvidaste tu contraseña?
              </a>

              <a
                href="/registro"
                className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Solicitar registro
              </a>
            </div>

            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Acceso para alumnos
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Si tu registro aún no ha sido aprobado, verás un aviso y deberás
                esperar la validación de administración.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}