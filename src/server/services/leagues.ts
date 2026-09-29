import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils";
import { leagueSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { generateInviteCode, isInviteCode, normalizeInviteCode } from "@/server/domain/invite";
import { notify } from "@/server/notifications";
import { awardFounderBadge } from "./badges";

export class LeagueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeagueError";
  }
}

/** Nombre maximal de ligues qu'un joueur peut créer. */
export const MAX_OWNED_LEAGUES = 10;
/** Nombre maximal de membres par ligue. */
export const MAX_MEMBERS = 100;

async function uniqueSlug(name: string) {
  const base = slugify(name) || "ligue";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.league.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateInviteCode();
    if (!(await prisma.league.findUnique({ where: { inviteCode: code }, select: { id: true } }))) return code;
  }
  throw new LeagueError("Impossible de générer un code d'invitation, réessayez.");
}

export async function createLeague(ownerId: string, raw: unknown) {
  const input = leagueSchema.parse(raw);
  const owned = await prisma.league.count({ where: { ownerId } });
  if (owned >= MAX_OWNED_LEAGUES) throw new LeagueError(`Vous avez déjà créé ${MAX_OWNED_LEAGUES} ligues.`);
  return prisma.league.create({
    data: {
      name: input.name,
      description: input.description || null,
      emoji: input.emoji,
      color: input.color,
      slug: await uniqueSlug(input.name),
      inviteCode: await uniqueCode(),
      ownerId,
      members: { create: { userId: ownerId, role: "OWNER" } },
    },
  });
}

export async function updateLeague(userId: string, leagueId: string, raw: unknown) {
  const input = leagueSchema.parse(raw);
  await assertOwner(userId, leagueId);
  return prisma.league.update({
    where: { id: leagueId },
    data: {
      name: input.name,
      description: input.description || null,
      emoji: input.emoji,
      color: input.color,
    },
  });
}

/** Rejoint une ligue par son code (idempotent si déjà membre). */
export async function joinLeague(userId: string, rawCode: string) {
  const code = normalizeInviteCode(rawCode);
  if (!isInviteCode(code)) throw new LeagueError("Code d'invitation invalide : 8 caractères.");
  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });
  if (!league) throw new LeagueError("Aucune ligue ne correspond à ce code.");
  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId } },
  });
  if (existing) return { league, joined: false };
  if (league._count.members >= MAX_MEMBERS) throw new LeagueError("Cette ligue est complète.");
  try {
    await prisma.leagueMember.create({ data: { leagueId: league.id, userId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { league, joined: false };
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  await notify({
    userId: league.ownerId,
    type: "LEAGUE",
    title: league.name,
    body: `${user?.username ?? "Un joueur"} a rejoint votre ligue.`,
    href: `/ligues/${league.slug}`,
    dedupeKey: `league-join:${league.id}:${userId}`,
  });
  await awardFounderBadge(league.id);
  return { league, joined: true };
}

async function assertOwner(userId: string, leagueId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) throw new LeagueError("Ligue introuvable.");
  if (league.ownerId !== userId) throw new LeagueError("Seul le créateur de la ligue peut faire cela.");
  return league;
}

export async function leaveLeague(userId: string, leagueId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) throw new LeagueError("Ligue introuvable.");
  if (league.ownerId === userId)
    throw new LeagueError("Le créateur ne peut pas quitter sa ligue : supprimez-la ou transférez-la.");
  await prisma.leagueMember.deleteMany({ where: { leagueId, userId } });
}

export async function removeMember(ownerId: string, leagueId: string, memberId: string) {
  await assertOwner(ownerId, leagueId);
  if (memberId === ownerId) throw new LeagueError("Vous ne pouvez pas vous retirer vous-même.");
  await prisma.leagueMember.deleteMany({ where: { leagueId, userId: memberId } });
}

export async function transferLeague(ownerId: string, leagueId: string, memberId: string) {
  await assertOwner(ownerId, leagueId);
  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: memberId } },
  });
  if (!member) throw new LeagueError("Ce joueur n'est pas membre de la ligue.");
  await prisma.$transaction([
    prisma.league.update({ where: { id: leagueId }, data: { ownerId: memberId } }),
    prisma.leagueMember.update({
      where: { leagueId_userId: { leagueId, userId: memberId } },
      data: { role: "OWNER" },
    }),
    prisma.leagueMember.update({
      where: { leagueId_userId: { leagueId, userId: ownerId } },
      data: { role: "MEMBER" },
    }),
  ]);
}

/** Nouveau code d'invitation (l'ancien cesse de fonctionner). */
export async function regenerateInviteCode(ownerId: string, leagueId: string) {
  await assertOwner(ownerId, leagueId);
  return prisma.league.update({ where: { id: leagueId }, data: { inviteCode: await uniqueCode() } });
}

export async function deleteLeague(ownerId: string, leagueId: string) {
  await assertOwner(ownerId, leagueId);
  await prisma.league.delete({ where: { id: leagueId } });
}
