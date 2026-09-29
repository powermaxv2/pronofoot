"use client";

import { AnimatePresence, m } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { useMotionPreset } from "@/hooks/use-motion-preset";
import { cn } from "@/lib/utils";

const OpenContext = createContext(false);

/** Dialogue contrôlé avec entrée en ressort (scaleIn) et sortie animée. */
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <OpenContext.Provider value={open}>{children}</OpenContext.Provider>
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: ReactNode;
  title: string;
  description?: string;
}) {
  const open = useContext(OpenContext);
  const overlay = useMotionPreset("fadeIn");
  const panel = useMotionPreset("scaleIn");
  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <m.div {...overlay.props} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount>
            <m.div
              {...panel.props}
              className={cn(
                "bg-popover text-popover-foreground border-border fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md gap-4 overflow-y-auto rounded-2xl border p-6 shadow-2xl",
                className,
              )}
              style={{ x: "-50%", y: "-50%" }}
            >
              <div className="grid gap-1 pr-8">
                <DialogPrimitive.Title className="font-display text-3xl leading-none tracking-wide">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-muted-foreground text-sm">
                    {description}
                  </DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                )}
              </div>
              {children}
              <DialogPrimitive.Close
                className="text-muted-foreground hover:text-foreground absolute top-4 right-4 rounded-full p-1"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </m.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />;
}
