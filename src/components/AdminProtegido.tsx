"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

export default function AdminProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revisando, setRevisando] = useState(true);
  const [permitido, setPermitido] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    revisarSesion();
  }, []);

  async function revisarSesion() {
    setRevisando(true);
    setPermitido(false);
    setMensaje("");

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const emailUsuario = session?.user.email?.toLowerCase() || "";

    if (!session) {
      setMensaje(
        "Para acceder al panel administrativo primero debes iniciar sesión."
      );
      setRevisando(false);
      return;
    }

    if (emailUsuario !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setMensaje("No tienes permiso para acceder al panel administrativo.");
      setPermitido(false);
      setRevisando(false);
      return;
    }

    setPermitido(true);
    setRevisando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (revisando) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <p className="text-sm text-slate-300">
            Verificando acceso administrativo...
          </p>
        </div>
      </main>
    );
  }

  if (!permitido) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-2xl font-bold">Acceso administrativo</h1>

          <div className="mt-5 rounded-lg border border-yellow-500 bg-yellow-950 p-4 text-sm text-yellow-200">
            {mensaje}
          </div>

          <div className="mt-6 grid gap-3">
            <a
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Iniciar sesión
            </a>

            <a
              href="/"
              className="rounded-lg border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            Panel administrativo · {ADMIN_EMAIL}
          </p>

          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-lg border border-red-700 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950"
          >
            Cerrar sesión admin
          </button>
        </div>
      </div>

      {children}
    </>
  );
}