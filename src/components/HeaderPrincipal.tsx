"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SessionUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
};

const ADMIN_EMAILS = ["jaa.alejandro@gmail.com", "unimed.michel@gmail.com"];

const rutasBase = [
  { href: "/", label: "Inicio" },
  { href: "/panel-alumno", label: "Panel del alumno" },
  { href: "/materias", label: "Materias" },
  { href: "/simuladores", label: "Simuladores" },
  { href: "/resultados", label: "Resultados" },
];

export default function HeaderPrincipal() {
  const pathname = usePathname();

  const [usuario, setUsuario] = useState<SessionUser | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarSesion() {
      const { data } = await supabase.auth.getSession();

      if (!activo) return;

      setUsuario((data.session?.user as SessionUser) ?? null);
      setCargandoSesion(false);
    }

    cargarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario((session?.user as SessionUser) ?? null);
        setCargandoSesion(false);
      }
    );

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const esAdmin = useMemo(() => {
    if (!usuario) return false;

    const email = String(usuario.email ?? "").toLowerCase();
    const metadata = usuario.user_metadata ?? {};
    const appMetadata = usuario.app_metadata ?? {};

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

    return (
      ADMIN_EMAILS.includes(email) ||
      valores.includes("admin") ||
      valores.includes("administrador") ||
      metadata.es_admin === true ||
      metadata.admin === true ||
      appMetadata.es_admin === true ||
      appMetadata.admin === true
    );
  }, [usuario]);

  const rutas = useMemo(() => {
    if (esAdmin) {
      return [...rutasBase, { href: "/admin", label: "Admin" }];
    }

    return rutasBase;
  }, [esAdmin]);

  function rutaActiva(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setUsuario(null);
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group block">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">
            Plataforma académica
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 transition group-hover:text-blue-700">
            UNIMED
          </h1>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {rutas.map((ruta) => {
            const activa = rutaActiva(ruta.href);

            return (
              <Link
                key={ruta.href}
                href={ruta.href}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  activa
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {ruta.label}
              </Link>
            );
          })}

          {!cargandoSesion && usuario && (
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Cerrar sesión
            </button>
          )}

          {!cargandoSesion && !usuario && (
            <Link
              href="/login"
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}