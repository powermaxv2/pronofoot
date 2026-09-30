import Image from "next/image";
import { cn } from "@/lib/utils";

export type CrestTeam = {
  name: string;
  tla: string;
  crestUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

/** Couleur de texte lisible sur un fond donné. */
function readableOn(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#0b1a12" : "#ffffff";
}

/**
 * Blason : logo officiel fourni par l'API si disponible, sinon écusson
 * généré aux couleurs du club (aucun logo tiers embarqué dans le projet).
 */
export function TeamCrest({
  team,
  size = 40,
  className,
}: {
  team: CrestTeam;
  size?: number;
  className?: string;
}) {
  if (team.crestUrl) {
    return (
      <Image
        src={team.crestUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const fg = readableOn(team.primaryColor);
  const label = team.tla.slice(0, 4);
  return (
    <svg
      viewBox="0 0 40 46"
      width={size}
      height={size * 1.15}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill={team.primaryColor} />
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 Z" fill={team.secondaryColor} opacity="0.28" />
      <path
        d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z"
        fill="none"
        stroke="#000"
        strokeOpacity="0.2"
        strokeWidth="1.2"
      />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="var(--font-bebas), Impact, sans-serif"
        fontSize={label.length > 3 ? 11 : 14}
        letterSpacing="0.5"
        fill={fg}
      >
        {label}
      </text>
    </svg>
  );
}
