import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SideNav } from "@/components/layout/side-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { PageTransition } from "@/components/motion/page-transition";
import { prisma } from "@/server/db";
import { avatarOf, requireUser } from "@/server/session";

export default async function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="flex min-h-dvh">
      <SideNav isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/70 safe-top sticky top-0 z-30 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Logo href="/accueil" className="lg:invisible" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell initialUnread={unread} />
              <span className="ml-1">
                <UserMenu username={user.username!} avatar={avatarOf(user)} isAdmin={isAdmin} />
              </span>
            </div>
          </div>
        </header>
        <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-28 lg:pb-12">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav />
      {modal}
    </div>
  );
}
