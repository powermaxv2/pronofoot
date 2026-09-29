"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { fireConfetti } from "@/components/motion/confetti";
import { toast } from "@/components/ui/toaster";

/** Confettis et toast de bienvenue après l'onboarding (?bienvenue=1). */
export function WelcomeBurst() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (params.get("bienvenue") !== "1") return;
    void fireConfetti();
    toast.success("Bienvenue dans le jeu !", {
      description: "Premier objectif : pronostiquer les matchs de ce week-end.",
    });
    router.replace("/accueil", { scroll: false });
  }, [params, router]);
  return null;
}
