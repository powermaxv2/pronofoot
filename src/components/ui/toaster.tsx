"use client";

import { useTheme } from "next-themes";
import { toast as sonner, Toaster as Sonner } from "sonner";
import { DrawIcon } from "@/components/motion/draw-icon";

/** Toasts animés (entrée en ressort, empilement, swipe) + icône dessinée. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-center"
      offset={88}
      mobileOffset={{ bottom: 88 }}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!bg-popover !text-popover-foreground !border-border !rounded-2xl !shadow-2xl !font-sans !gap-3 !items-center",
          title: "!font-condensed !text-base !font-bold !tracking-wide",
          description: "!text-muted-foreground",
          actionButton: "!bg-volt !text-volt-foreground !font-condensed !font-bold !uppercase !rounded-full",
        },
      }}
    />
  );
}

type ToastOptions = { description?: string };

export const toast = {
  success: (title: string, o?: ToastOptions) =>
    sonner.success(title, { ...o, icon: <DrawIcon name="check" className="text-grass-ink" /> }),
  error: (title: string, o?: ToastOptions) =>
    sonner.error(title, { ...o, icon: <DrawIcon name="cross" className="text-destructive" /> }),
  info: (title: string, o?: ToastOptions) =>
    sonner(title, { ...o, icon: <DrawIcon name="info" className="text-volt-ink" /> }),
  badge: (title: string, o?: ToastOptions) =>
    sonner(title, { ...o, icon: <DrawIcon name="trophy" className="text-gold" />, duration: 6000 }),
};
