"use client";

import { AnimatePresence, m } from "motion/react";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { spring } from "@/lib/motion";
import { regenerateCodeAction } from "@/server/actions/leagues";

/** Code d'invitation : copie, partage natif, renouvellement (président). */
export function InvitePanel({
  leagueId,
  name,
  code: initialCode,
  isOwner,
}: {
  leagueId: string;
  name: string;
  code: string;
  isOwner: boolean;
}) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [pending, start] = useTransition();
  const link =
    typeof window === "undefined" ? `/rejoindre/${code}` : `${window.location.origin}/rejoindre/${code}`;

  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien d'invitation copié");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible : sélectionnez le code à la main.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({
        title: `Rejoins « ${name} » sur PronoFoot`,
        text: `Code d'invitation : ${code}`,
        url: link,
      });
    } catch {
      /* partage annulé par l'utilisateur */
    }
  };
  const regenerate = () =>
    start(async () => {
      const result = await regenerateCodeAction(leagueId);
      if (result.ok) {
        setCode(result.data.code);
        toast.info(result.message ?? "Nouveau code");
      } else toast.error(result.error);
    });

  return (
    <div className="grid gap-3">
      <span className="label-caps text-muted-foreground">Code d&apos;invitation</span>
      <div className="flex gap-1" aria-label={`Code ${code}`}>
        {code.split("").map((c, i) => (
          <AnimatePresence key={i} mode="popLayout" initial={false}>
            <m.span
              key={c + i + code}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ ...spring.bouncy, delay: i * 0.04 }}
              className="bg-volt text-volt-foreground font-display grid h-12 flex-1 place-items-center rounded-lg text-3xl select-all"
            >
              {c}
            </m.span>
          </AnimatePresence>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="glass" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? "Copié" : "Copier le lien"}
        </Button>
        {canShare && (
          <Button variant="glass" size="sm" onClick={share}>
            <Share2 /> Partager
          </Button>
        )}
        {isOwner && (
          <Button variant="ghost" size="sm" onClick={regenerate} loading={pending}>
            <RefreshCw /> Nouveau code
          </Button>
        )}
      </div>
    </div>
  );
}
