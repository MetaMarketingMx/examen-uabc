import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Examen UABC",
  description: "Plataforma académica para preparar el examen UABC",
};

const links = [
  { href: "/", label: "Inicio" },
  { href: "/panel-alumno", label: "Panel del alumno" },
  { href: "/materias", label: "Materias" },
  { href: "/simuladores", label: "Simuladores" },
  { href: "/resultados", label: "Resultados" },
  { href: "/admin", label: "Admin" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white flex flex-col">
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
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}