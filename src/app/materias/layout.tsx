import type { ReactNode } from "react";
import AlumnoProtegido from "@/components/AlumnoProtegido";

export default function MateriasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AlumnoProtegido>{children}</AlumnoProtegido>;
}
