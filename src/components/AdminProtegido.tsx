"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAILS = ["unimed.michel@gmail.com", "jaa.alejandro@gmail.com"];

export default function AdminProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const [revisando, setRevisando] = useState(true);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    revisarAdmin();
  }, []);

  async function revisarAdmin() {
    setRevisando(true);

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      setPermitido(false);
      setRevisando(false);
      return;
    }

    const email = String(user.email ?? "").toLowerCase();
    const metadata = user.user_metadata ?? {};
    const appMetadata = user.app_metadata ?? {};

    const valores = [
      metadata.rol,
      metadata.role,
      metadata.tipo,
      metadata.tipo_usuario,
      metadata.perfil,
      metadata.usuario_rol,
      metadata.user_role,
      metadata.rol_usuario,
      appMetadata.rol,
      appMetadata.role,
      appMetadata.tipo,
      appMetadata.perfil,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const esAdmin =
      ADMIN_EMAILS.includes(email) ||
      valores.includes("admin") ||
      valores.includes("administrador") ||
      metadata.es_admin === true ||
      metadata.admin === true ||
      appMetadata.es_admin === true ||
      appMetadata.admin === true;

    setPermitido(esAdmin);
    setRevisando(false);
  }

  if (revisando) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-10 text-slate-900 sm:px-6">
        <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white">
              <div className="relative z-10">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                  Admin
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Validando acceso
                </h1>

                <p className="mt-3 text-sm leading-6 text-blue-50">
                  Estamos revisando tus permisos de administrador.
                </p>
              </div>

              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-64 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute right-12 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
            </div>

            <div className="p-7">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
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
        <section className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white">
              <div className="relative z-10">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                  Admin
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Acceso no disponible
                </h1>

                <p className="mt-3 text-sm leading-6 text-blue-50">
                  Esta sección solo está disponible para administración.
                </p>
              </div>

              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-64 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute right-12 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
            </div>

            <div className="p-7">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                No pudimos habilitar el panel administrativo con la cuenta
                actual.
              </div>

              <a
                href="/login"
                className="mt-6 inline-flex w-full justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}