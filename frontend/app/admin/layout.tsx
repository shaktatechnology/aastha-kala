import AdminLayoutClient from "@/components/layout/AdminLayoutClient";
import { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Admin Page",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLayoutClient>{children}</AdminLayoutClient>
      <Toaster richColors position="top-right" />
    </>
  );
}
