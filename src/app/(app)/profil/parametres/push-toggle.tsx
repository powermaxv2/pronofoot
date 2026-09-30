"use client";

import { useEffect, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { deletePushSubscription, savePushSubscription } from "@/server/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Support = "checking" | "unsupported" | "unconfigured" | "denied" | "ready";

/** Abonnement Web Push de l'appareil courant. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [support, setSupport] = useState<Support>("checking");
  const [enabled, setEnabled] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!publicKey) return setSupport("unconfigured");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setSupport("unsupported");
    }
    if (Notification.permission === "denied") return setSupport("denied");
    setSupport("ready");
    void navigator.serviceWorker
      .getRegistration("/")
      .then(async (reg) => setEnabled(Boolean(await reg?.pushManager.getSubscription())));
  }, [publicKey]);

  const toggle = (next: boolean) =>
    startTransition(async () => {
      try {
        const reg =
          (await navigator.serviceWorker.getRegistration("/")) ??
          (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        await navigator.serviceWorker.ready;
        if (next) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setSupport(permission === "denied" ? "denied" : "ready");
            toast.error("Autorisation refusée par le navigateur.");
            return;
          }
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey!),
          });
          const result = await savePushSubscription({
            ...sub.toJSON(),
            userAgent: navigator.userAgent.slice(0, 300),
          });
          if (!result.ok) throw new Error(result.error);
          setEnabled(true);
          toast.success(result.message ?? "Activé");
        } else {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await deletePushSubscription(sub.endpoint);
            await sub.unsubscribe();
          }
          setEnabled(false);
          toast.info("Notifications push désactivées");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de modifier l'abonnement.");
      }
    });

  const hint: Record<Support, string> = {
    checking: "Vérification…",
    unsupported:
      "Votre navigateur ne gère pas les notifications push. Sur iPhone, installez d'abord l'application sur l'écran d'accueil.",
    unconfigured: "Les notifications push ne sont pas configurées sur ce serveur (clés VAPID).",
    denied: "Notifications bloquées : autorisez-les dans les réglages du navigateur.",
    ready: "Rappels et résultats même quand l'application est fermée.",
  };

  return (
    <label className="hover:bg-accent flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-3">
      <span>
        <span className="font-condensed block text-base font-bold tracking-wide uppercase">
          Notifications sur cet appareil
        </span>
        <span className="text-muted-foreground text-sm">{hint[support]}</span>
      </span>
      <Switch
        checked={enabled}
        disabled={support !== "ready" || pending}
        onCheckedChange={toggle}
        aria-label="Notifications sur cet appareil"
      />
    </label>
  );
}
