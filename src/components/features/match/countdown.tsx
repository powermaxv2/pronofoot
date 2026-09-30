"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "Coup d'envoi";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `dans ${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  const days = Math.floor(hours / 24);
  return `dans ${days} j`;
}

/** Compte à rebours jusqu'au coup d'envoi (rafraîchi toutes les 30 s). */
export function Countdown({ to, className }: { to: Date; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className={className} suppressHydrationWarning>
      {now == null ? "" : format(to.getTime() - now)}
    </span>
  );
}
