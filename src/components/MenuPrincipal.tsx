"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

type TipoUsuario = "publico" | "alumno" | "admin";

export default function MenuPrincipal() {
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>("publico");
  const [revisando, setRevisando] = useState(true);

  useEffect(() => {
    revisarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      revisarSesion();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function revisarSesion() {
    setRevisando(true);

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setTipoUsuario("publico");
      setRevisando(false);
      return;
    }

    const emailUsuario = session.user.email?.toLowerCase() || "";

    if (emailUsuario === ADMIN_EMAIL) {
      setTipoUsuario("admin");
      setRevisando(false);
      return;
    }

    setTipoUsuario("alumno");
    setRevisando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const linksPublicos = [
    { href: "/", label: "Inicio" },
    { href: "/login", label: "Iniciar sesión" },
    { href: "/registro", label: "Solicitar registro" },
  ];

  const linksAlumno = [
    { href: "/", label: "Inicio" },
    { href: "/panel-alumno", label: "Panel del alumno" },
    { href: "/materias", label: "Materias" },
    { href: "/simuladores", label: "Simuladores" },
    { href: "/resultados", label: "Resultados" },
  ];

  const linksAdmin = [
    { href: "/", label: "Inicio" },
    { href: "/panel-alumno", label: "Panel del alumno" },
    { href: "/materias", label: "Materias" },
    { href: "/simuladores", label: "Simuladores" },
    { href: "/resultados", label: "Resultados" },
    { href: "/admin", label: "Admin" },
  ];

  const links =
    tipoUsuario === "admin"
      ? linksAdmin
      : tipoUsuario === "alumno"
      ? linksAlumno
      : linksPublicos;

  return (
    <header className="border-b border-slate-800 bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
            Plataforma académica
          </p>
          <h1 className="text-2xl font-bold">Examen UABC</h1>
        </div>

        <nav className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          {!revisando && tipoUsuario !== "publico" && (
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-xl border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-950"
            >
              Cerrar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}