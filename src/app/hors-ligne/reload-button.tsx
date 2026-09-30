"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReloadButton() {
  return (
    <Button variant="volt" onClick={() => window.location.reload()}>
      <RefreshCw /> Réessayer
    </Button>
  );
}
