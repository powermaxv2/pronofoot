"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      console.warn("Service worker non enregistré :", error);
    });
  }, []);
  return null;
}
