"use client";

import { AnimatePresence, m } from "motion/react";
import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMotionPreset } from "@/hooks/use-motion-preset";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pronofoot:install-dismissed";

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < 14 * 86_400_000;
  } catch {
    return false;
  }
}

/** Invitation à installer la PWA (Android/desktop) ou guide iOS, en tiroir animé. */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  const { props } = useMotionPreset("drawerFromBottom");

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || dismissedRecently()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      window.setTimeout(() => setOpen(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !("standalone" in navigator && (navigator as { standalone?: boolean }).standalone);
    if (isIos) {
      setIos(true);
      const timer = window.setTimeout(() => setOpen(true), 6000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible : l'invitation réapparaîtra */
    }
  };
  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (event || ios) && (
        <m.div
          {...props}
          role="dialog"
          aria-label="Installer PronoFoot"
          className="glass-strong fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl p-4 shadow-2xl lg:bottom-6"
        >
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
            aria-label="Plus tard"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-xl" />
            <div>
              <p className="font-condensed text-lg font-bold tracking-wide uppercase">Installer PronoFoot</p>
              <p className="text-muted-foreground text-sm">
                {ios ? (
                  <>
                    Touchez <Share className="inline size-4" aria-label="Partager" /> puis « Sur l&apos;écran
                    d&apos;accueil » pour recevoir les rappels.
                  </>
                ) : (
                  "Accès en un geste et notifications avant vos matchs."
                )}
              </p>
            </div>
          </div>
          {!ios && (
            <Button variant="volt" size="sm" className="mt-3 w-full" onClick={install}>
              <Download /> Installer l&apos;application
            </Button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
