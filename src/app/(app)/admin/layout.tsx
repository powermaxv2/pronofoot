import type { ReactNode } from "react";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Réservé aux administrateurs" title="Administration" />
      <div className="grid gap-6">
        <AdminNav />
        {children}
      </div>
    </>
  );
}
