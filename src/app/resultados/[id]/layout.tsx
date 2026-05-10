import type { ReactNode } from "react";
import AlumnoProtegido from "@/components/AlumnoProtegido";

export default function ResultadoDetalleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AlumnoProtegido>{children}</AlumnoProtegido>;
}