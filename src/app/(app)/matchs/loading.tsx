import { Skeleton } from "@/components/ui/skeleton";

/** Squelettes à la forme exacte des cartes de match. */
export default function Loading() {
  return (
    <div className="grid gap-6 pt-4" aria-busy aria-label="Chargement des matchs">
      <Skeleton className="h-14 w-48" />
      <Skeleton className="h-11 w-full max-w-md rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="glass grid gap-3 rounded-2xl p-4">
            <Skeleton className="h-3 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 flex-1" />
            </div>
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
