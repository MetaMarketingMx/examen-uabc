import type { ReactNode } from "react";
import AlumnoProtegido from "@/components/AlumnoProtegido";

export default function ParcialesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AlumnoProtegido>{children}</AlumnoProtegido>;
}
