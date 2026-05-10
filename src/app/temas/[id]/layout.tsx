import type { ReactNode } from "react";
import AlumnoProtegido from "@/components/AlumnoProtegido";

export default function TemaDetalleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AlumnoProtegido>{children}</AlumnoProtegido>;
}