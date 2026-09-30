"use client";

import type { MatchStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { TeamCrest, type CrestTeam } from "@/components/features/match/team-crest";
import { STATUS_LABEL } from "@/components/features/match/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { formatKickoff } from "@/lib/dates";
import { releaseManualScoreAction, setManualResultAction } from "@/server/actions/admin";

type Row = {
  id: string;
  kickoffAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  manualScore: boolean;
  competition: string;
  homeTeam: CrestTeam & { shortName: string };
  awayTeam: CrestTeam & { shortName: string };
};

function ResultRow({ match }: { match: Row }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const [pending, start] = useTransition();
  const done = (r: { ok: boolean; error?: string; message?: string }) => {
    if (r.ok) toast.success(r.message ?? "Enregistré");
    else toast.error(r.error ?? "Erreur");
  };
  const save = () =>
    start(async () => {
      const h = Number(home);
      const a = Number(away);
      if (home === "" || away === "" || !Number.isInteger(h) || !Number.isInteger(a))
        return void toast.error("Saisissez deux scores entiers.");
      done(
        await setManualResultAction({ matchId: match.id, status: "FINISHED", homeScore: h, awayScore: a }),
      );
    });
  return (
    <li className="glass grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="grid gap-1">
        <span className="label-caps text-muted-foreground flex flex-wrap items-center gap-2">
          {match.competition} · {formatKickoff(match.kickoffAt)} · {STATUS_LABEL[match.status]}
          {match.manualScore && <Badge variant="volt">Saisie manuelle</Badge>}
        </span>
        <span className="font-condensed flex items-center gap-2 text-lg font-bold">
          <TeamCrest team={match.homeTeam} size={22} /> {match.homeTeam.shortName}{" "}
          <span className="text-muted-foreground">–</span> {match.awayTeam.shortName}
          <TeamCrest team={match.awayTeam} size={22} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={home}
          onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-14 text-center"
          aria-label={`Buts ${match.homeTeam.shortName}`}
        />
        <span className="font-display text-2xl">–</span>
        <Input
          value={away}
          onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-14 text-center"
          aria-label={`Buts ${match.awayTeam.shortName}`}
        />
        <Button variant="volt" size="sm" onClick={save} loading={pending}>
          Valider
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => done(await setManualResultAction({ matchId: match.id, status: "POSTPONED" })))
          }
        >
          Reporté
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => done(await setManualResultAction({ matchId: match.id, status: "CANCELLED" })))
          }
        >
          Annulé
        </Button>
        {match.manualScore && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => done(await releaseManualScoreAction(match.id)))}
          >
            Rendre à l&apos;API
          </Button>
        )}
      </div>
    </li>
  );
}

export function ManualResults({ matches }: { matches: Row[] }) {
  if (matches.length === 0)
    return (
      <p className="glass text-muted-foreground rounded-2xl p-6 text-center">
        Aucun match à traiter sur cette période.
      </p>
    );
  return (
    <ul className="grid gap-3">
      {matches.map((m) => (
        <ResultRow key={m.id} match={m} />
      ))}
    </ul>
  );
}
