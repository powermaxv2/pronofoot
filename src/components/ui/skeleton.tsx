import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Bloc de chargement avec shimmer (translateX en boucle). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-border relative overflow-hidden rounded-md",
        "after:animate-shimmer after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
