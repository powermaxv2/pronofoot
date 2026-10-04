"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeagueFormDialog } from "./league-form-dialog";

export function CreateLeagueButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="volt" onClick={() => setOpen(true)}>
        <Plus /> Créer une ligue
      </Button>
      {open && <LeagueFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
