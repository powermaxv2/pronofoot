import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createLeague,
  deleteLeague,
  joinLeague,
  LeagueError,
  leaveLeague,
  regenerateInviteCode,
  removeMember,
  transferLeague,
} from "@/server/services/leagues";
import { createUser } from "./factories";

describe("ligues privées", () => {
  it("crée une ligue avec un code d'invitation et son créateur comme membre", async () => {
    const owner = await createUser();
    const league = await createLeague(owner.id, {
      name: "Les Ultras du Bureau",
      emoji: "📣",
      color: "#e8ff3a",
    });
    expect(league.slug).toBe("les-ultras-du-bureau");
    expect(league.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const second = await createLeague(owner.id, {
      name: "Les Ultras du Bureau",
      emoji: "⚽",
      color: "#22c55e",
    });
    expect(second.slug).toBe("les-ultras-du-bureau-2");
    expect(await prisma.leagueMember.findMany({ where: { leagueId: league.id } })).toMatchObject([
      { userId: owner.id, role: "OWNER" },
    ]);
  });

  it("rejoint par code (saisie tolérante), notifie le créateur et attribue le badge fondateur à 3 membres", async () => {
    const [owner, a, b] = await Promise.all([createUser(), createUser(), createUser()]);
    const league = await createLeague(owner.id, { name: "Coloc FC", emoji: "🛋️", color: "#38bdf8" });
    const spaced = `${league.inviteCode.slice(0, 4).toLowerCase()} ${league.inviteCode.slice(4)}`;
    expect((await joinLeague(a.id, spaced)).joined).toBe(true);
    expect((await joinLeague(a.id, league.inviteCode)).joined).toBe(false);
    await joinLeague(b.id, league.inviteCode);
    expect(await prisma.leagueMember.count({ where: { leagueId: league.id } })).toBe(3);
    expect(await prisma.notification.count({ where: { userId: owner.id, type: "LEAGUE" } })).toBe(2);
    expect(
      await prisma.userBadge.findUnique({
        where: { userId_badgeCode: { userId: owner.id, badgeCode: "FOUNDER" } },
      }),
    ).not.toBeNull();
  });

  it("refuse un code invalide ou inconnu", async () => {
    const user = await createUser();
    await expect(joinLeague(user.id, "abc")).rejects.toBeInstanceOf(LeagueError);
    await expect(joinLeague(user.id, "ZZZZZZZZ")).rejects.toThrow(/Aucune ligue/);
  });

  it("réserve la gestion au créateur", async () => {
    const [owner, member] = await Promise.all([createUser(), createUser()]);
    const league = await createLeague(owner.id, { name: "Famille", emoji: "🏡", color: "#22c55e" });
    await joinLeague(member.id, league.inviteCode);
    await expect(removeMember(member.id, league.id, owner.id)).rejects.toThrow(/créateur/);
    await expect(deleteLeague(member.id, league.id)).rejects.toThrow(/créateur/);
    await expect(leaveLeague(owner.id, league.id)).rejects.toThrow(/ne peut pas quitter/);
    const old = league.inviteCode;
    const updated = await regenerateInviteCode(owner.id, league.id);
    expect(updated.inviteCode).not.toBe(old);
    await expect(joinLeague(member.id, old)).rejects.toThrow(/Aucune ligue/);
  });

  it("transfère la présidence puis permet à l'ancien créateur de partir", async () => {
    const [owner, member] = await Promise.all([createUser(), createUser()]);
    const league = await createLeague(owner.id, { name: "Transfert", emoji: "⚽", color: "#22c55e" });
    await joinLeague(member.id, league.inviteCode);
    await transferLeague(owner.id, league.id, member.id);
    expect((await prisma.league.findUniqueOrThrow({ where: { id: league.id } })).ownerId).toBe(member.id);
    await leaveLeague(owner.id, league.id);
    expect(await prisma.leagueMember.count({ where: { leagueId: league.id } })).toBe(1);
  });
});
