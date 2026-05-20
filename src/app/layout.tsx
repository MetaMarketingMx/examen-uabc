import type { Metadata } from "next";
import "./globals.css";
import HeaderPrincipal from "@/components/HeaderPrincipal";

export const metadata: Metadata = {
  title: "UNIMED",
  description: "UNIMED | Curso para examen de admisión a UABC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        <HeaderPrincipal />
        {children}
      </body>
    </html>
  );
}