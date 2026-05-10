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
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>

        <p className="mt-2 text-sm text-slate-300">
          Ingresa con tu correo electrónico o nombre de usuario para acceder a
          la plataforma.
        </p>

        {mensaje && (
          <div className="mt-5 rounded-lg border border-yellow-500 bg-yellow-950 p-4 text-sm text-yellow-200">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-500 bg-red-950 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Correo electrónico o usuario
            </label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="correo@ejemplo.com o alias"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="Tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {cargando ? "Verificando acceso..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-sm">
          <a
            href="/recuperar-contrasena"
            className="block text-center font-semibold text-blue-300 hover:text-blue-200"
          >
            ¿Olvidaste tu contraseña?
          </a>

          <a
            href="/registro"
            className="block rounded-lg border border-slate-600 px-4 py-3 text-center font-semibold text-white hover:bg-slate-800"
          >
            Solicitar registro de alumno
          </a>
        </div>
      </div>
    </main>
  );
}