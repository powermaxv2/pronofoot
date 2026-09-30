import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "font-condensed inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs leading-none font-bold tracking-[0.1em] whitespace-nowrap uppercase",
  {
    variants: {
      variant: {
        default: "bg-surface-strong text-muted-foreground",
        success: "bg-primary text-primary-foreground",
        volt: "bg-volt text-volt-foreground",
        danger: "bg-destructive text-destructive-foreground",
        outline: "border-border text-muted-foreground border",
        gold: "bg-gold text-black",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
