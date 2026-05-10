import AdminProtegido from "@/components/AdminProtegido";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminProtegido>{children}</AdminProtegido>;
}