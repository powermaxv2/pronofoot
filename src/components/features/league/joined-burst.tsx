"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { fireConfetti } from "@/components/motion/confetti";

/** Confettis à l'arrivée dans une nouvelle ligue (?rejoint=1). */
export function JoinedBurst({ slug }: { slug: string }) {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (params.get("rejoint") !== "1") return;
    void fireConfetti();
    router.replace(`/ligues/${slug}`, { scroll: false });
  }, [params, router, slug]);
  return null;
}
