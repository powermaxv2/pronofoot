import type { CronStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<CronStatus, { label: string; variant: "success" | "danger" | "default" | "volt" }> = {
  SUCCESS: { label: "Succès", variant: "success" },
  ERROR: { label: "Erreur", variant: "danger" },
  SKIPPED: { label: "Ignoré", variant: "default" },
  RUNNING: { label: "En cours", variant: "volt" },
};

export function StatusChip({ status }: { status: CronStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
