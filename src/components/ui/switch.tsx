"use client";

import { m } from "motion/react";
import { Switch as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Interrupteur dont la pastille glisse avec un ressort. */
export function Switch({ className, checked, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      checked={checked}
      className={cn(
        "border-border data-[state=checked]:bg-primary bg-surface-strong relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb asChild>
        <m.span
          layout
          transition={spring.snappy}
          className={cn("block size-6 rounded-full bg-white shadow", checked ? "ml-auto" : "ml-0")}
        />
      </Primitive.Thumb>
    </Primitive.Root>
  );
}
