import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { isInviteCode, normalizeInviteCode } from "@/server/domain/invite";
import { requireUser } from "@/server/session";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Invitation" };

/** Lien d'invitation : aperçu de la ligue puis confirmation (aucune adhésion sur simple visite). */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeInviteCode(raw);
  const user = await requireUser({ callbackUrl: `/rejoindre/${code}` });
  const league = isInviteCode(code)
    ? await prisma.league.findUnique({
        where: { inviteCode: code },
        include: {
          owner: { select: { username: true } },
          _count: { select: { members: true } },
          members: { where: { userId: user.id }, select: { userId: true } },
        },
      })
    : null;
  if (league?.members.length) redirect(`/ligues/${league.slug}`);
  return (
    <div className="mx-auto mt-10 grid max-w-md gap-6 text-center">
      {league ? (
        <div className="glass-strong grid justify-items-center gap-4 rounded-3xl p-8">
          <span
            className="grid size-20 place-items-center rounded-3xl text-5xl"
            style={{ background: `${league.color}33` }}
            aria-hidden
          >
            {league.emoji}
          </span>
          <div>
            <p className="label-caps text-grass-ink">Invitation de {league.owner.username}</p>
            <h1 className="font-display text-5xl leading-none tracking-wide">{league.name}</h1>
            <p className="text-muted-foreground mt-2">
              {league._count.members} membre{league._count.members > 1 ? "s" : ""}
              {league.description ? ` · ${league.description}` : ""}
            </p>
          </div>
          <JoinButton code={code} />
        </div>
      ) : (
        <div className="glass-strong grid gap-4 rounded-3xl p-8">
          <h1 className="font-display text-5xl leading-none tracking-wide">Invitation invalide</h1>
          <p className="text-muted-foreground">
            Ce code ne correspond à aucune ligue. Il a peut-être été renouvelé par son créateur.
          </p>
          <ButtonLink href="/ligues" variant="volt">
            Mes ligues
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
