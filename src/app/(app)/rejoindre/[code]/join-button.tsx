"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { joinLeagueAction } from "@/server/actions/leagues";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="volt"
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await joinLeagueAction(code);
          if (!result.ok) return void toast.error(result.error);
          router.push(`/ligues/${result.data.slug}${result.data.joined ? "?rejoint=1" : ""}`);
        })
      }
    >
      Rejoindre la ligue
    </Button>
  );
}
