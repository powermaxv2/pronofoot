import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden>
      <defs>
        <radialGradient id="pf-ball" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f6ffb0" />
          <stop offset="0.55" stopColor="#e8ff3a" />
          <stop offset="1" stopColor="#9fbf12" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#pf-ball)" />
      <polygon points="24,17.5 30.2,22 27.8,29.3 20.2,29.3 17.8,22" fill="#07110b" />
      <g stroke="#07110b" strokeWidth="1.6" strokeLinecap="round">
        <line x1="24" y1="17.5" x2="24" y2="8" />
        <line x1="30.2" y1="22" x2="39" y2="19" />
        <line x1="27.8" y1="29.3" x2="33.5" y2="37" />
        <line x1="20.2" y1="29.3" x2="14.5" y2="37" />
        <line x1="17.8" y1="22" x2="9" y2="19" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)} aria-label="PronoFoot — accueil">
      <LogoMark />
      <span className="font-display text-[28px] leading-none tracking-wide">
        Prono<span className="text-volt-ink">Foot</span>
      </span>
    </Link>
  );
}
