import type { Metadata } from "next";
import { NotificationList } from "@/components/features/notifications/notification-list";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Rappels avant les matchs, résultats de vos pronos, badges et nouvelles de vos ligues."
        actions={
          <ButtonLink href="/profil/parametres" variant="ghost" size="sm">
            Préférences
          </ButtonLink>
        }
      />
      <NotificationList items={items} />
    </div>
  );
}
