"use client";

import { type FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ActualizarContrasenaPage() {
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [revisandoSesion, setRevisandoSesion] = useState(true);
  const [tieneSesion, setTieneSesion] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function revisarSesion() {
      const { data } = await supabase.auth.getSession();

      if (!activo) return;

      setTieneSesion(Boolean(data.session));
      setRevisandoSesion(false);
    }

    revisarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setTieneSesion(true);
        }

        setRevisandoSesion(false);
      }
    );

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function actualizarContrasena(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    const password = nuevaContrasena.trim();
    const confirmacion = confirmarContrasena.trim();

    if (!password || !confirmacion) {
      setError("Escribe y confirma tu nueva contraseña.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      const mensajeError = updateError.message.toLowerCase();

      if (
        mensajeError.includes("different") ||
        mensajeError.includes("same") ||
        mensajeError.includes("old password") ||
        mensajeError.includes("new password")
      ) {
        setError(
          "La nueva contraseña debe ser diferente a la anterior. Si recordaste tu contraseña anterior, puedes iniciar sesión con ella. Si deseas cambiarla, escribe una contraseña nueva."
        );
      } else {
        setError(
          "No se pudo actualizar la contraseña. Abre nuevamente el enlace de recuperación o solicita otro."
        );
      }

      setCargando(false);
      return;
    }

    setMensaje(
      "Tu contraseña fue actualizada correctamente. Ahora puedes iniciar sesión con tu correo y tu nueva contraseña."
    );

    setNuevaContrasena("");
    setConfirmarContrasena("");
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Crear nueva contraseña</h1>

        <p className="mt-2 text-sm text-slate-300">
          Escribe tu nueva contraseña para recuperar el acceso a la plataforma.
        </p>

        {revisandoSesion && (
          <div className="mt-5 rounded-lg border border-blue-500 bg-blue-950 p-4 text-sm text-blue-200">
            Verificando enlace de recuperación...
          </div>
        )}

        {!revisandoSesion && !tieneSesion && !mensaje && (
          <div className="mt-5 rounded-lg border border-yellow-500 bg-yellow-950 p-4 text-sm text-yellow-200">
            Si llegaste aquí sin abrir el enlace del correo, primero solicita la
            recuperación de contraseña.
          </div>
        )}

        {mensaje && (
          <div className="mt-5 rounded-lg border border-green-500 bg-green-950 p-4 text-sm text-green-200">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-500 bg-red-950 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!mensaje && (
          <form onSubmit={actualizarContrasena} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Repite la contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {cargando ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        )}

        {mensaje && (
          <div className="mt-6 space-y-3">
            <a
              href="/login"
              className="block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Iniciar sesión
            </a>

            <a
              href="/recuperar-contrasena"
              className="block rounded-lg border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              Solicitar otro enlace de recuperación
            </a>
          </div>
        )}
      </div>
    </main>
  );
}