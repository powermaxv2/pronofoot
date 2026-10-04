import type { Metadata } from "next";
import { UserRowActions } from "@/components/features/admin/user-row-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/server/db";
import { avatarOf, requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Joueurs · Admin" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 60);
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatarUrl: true,
      image: true,
      createdAt: true,
      disabledAt: true,
      onboardedAt: true,
      _count: { select: { predictions: true } },
    },
  });
  const points = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _sum: { points: true },
  });
  const pointsBy = new Map(points.map((p) => [p.userId, p._sum.points ?? 0]));
  return (
    <div className="grid gap-4">
      <form className="max-w-md" role="search">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Rechercher un pseudo ou un e-mail"
          aria-label="Rechercher un joueur"
        />
      </form>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="label-caps text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Joueur</th>
              <th className="py-3 font-semibold">Inscription</th>
              <th className="py-3 text-right font-semibold">Pronos</th>
              <th className="py-3 text-right font-semibold">Points</th>
              <th className="py-3 pl-4 font-semibold">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-border border-t">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-3">
                    <Avatar name={u.username ?? u.email} src={avatarOf(u)} size={32} />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {u.username ? `@${u.username}` : "Inscription inachevée"}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">{u.email}</span>
                    </span>
                  </span>
                </td>
                <td className="text-muted-foreground py-2.5">{formatDate(u.createdAt)}</td>
                <td className="tabular py-2.5 text-right">{u._count.predictions}</td>
                <td className="tabular py-2.5 text-right font-semibold">{pointsBy.get(u.id) ?? 0}</td>
                <td className="py-2.5 pl-4">
                  <span className="flex flex-wrap gap-1">
                    {u.role === "ADMIN" && <Badge variant="volt">Admin</Badge>}
                    {u.disabledAt ? (
                      <Badge variant="danger">Désactivé</Badge>
                    ) : !u.onboardedAt ? (
                      <Badge variant="outline">En attente</Badge>
                    ) : (
                      <Badge variant="success">Actif</Badge>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <UserRowActions
                    userId={u.id}
                    role={u.role}
                    disabled={Boolean(u.disabledAt)}
                    isSelf={u.id === admin.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        100 joueurs affichés au maximum ; affinez avec la recherche.
      </p>
    </div>
  );
}
