import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** En-tête de page : titre condensé, sous-titre, actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 pt-4 pb-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="label-caps text-grass-ink mb-1">{eyebrow}</p>}
        <h1 className="font-display text-5xl leading-[0.9] tracking-wide sm:text-6xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 max-w-[62ch]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
