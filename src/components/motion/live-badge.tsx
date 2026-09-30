import { cn } from "@/lib/utils";

/** Badge « LIVE » : halo en keyframes CSS (transform/opacity, coût JS nul). */
export function LiveBadge({
  minute,
  className,
  label = "Live",
}: {
  minute?: number | null;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "font-condensed text-live inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase",
        className,
      )}
    >
      <span className="relative inline-flex size-2">
        <span className="bg-live animate-live-ping absolute inset-0 rounded-full" aria-hidden />
        <span className="bg-live relative inline-flex size-2 rounded-full" />
      </span>
      {label}
      {minute != null && <span className="tabular">{minute}&apos;</span>}
    </span>
  );
}
