import type { Metadata } from "next";
import "./globals.css";
import HeaderPrincipal from "@/components/HeaderPrincipal";

export const metadata: Metadata = {
  title: "Examen UABC",
  description: "Plataforma académica para preparación de examen UABC",
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