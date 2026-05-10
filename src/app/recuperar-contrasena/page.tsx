"use client";

import { type FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function enviarRecuperacion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado) {
      setError("Escribe el correo electrónico con el que te registraste.");
      return;
    }

    setCargando(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/actualizar-contrasena`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      correoNormalizado,
      {
        redirectTo,
      }
    );

    if (resetError) {
      if (resetError.message.toLowerCase().includes("rate limit")) {
        setError(
          "Se hicieron varios intentos seguidos. Espera unos minutos y vuelve a intentarlo."
        );
      } else {
        setError(resetError.message);
      }

      setCargando(false);
      return;
    }

    setMensaje(
      "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña. Revisa tu bandeja de entrada y también la carpeta de spam."
    );

    setCorreo("");
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>

        <p className="mt-2 text-sm text-slate-300">
          Escribe el correo electrónico con el que te registraste. Te enviaremos
          un enlace para crear una nueva contraseña.
        </p>

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

        <form onSubmit={enviarRecuperacion} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Correo electrónico
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {cargando ? "Enviando enlace..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
          <p>
            Después de abrir el enlace del correo, podrás escribir una nueva
            contraseña.
          </p>
        </div>
      </div>
    </main>
  );
}