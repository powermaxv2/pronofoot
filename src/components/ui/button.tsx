"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { m, type HTMLMotionProps } from "motion/react";
import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "font-condensed inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold tracking-[0.06em] whitespace-nowrap uppercase outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-primary/60 shadow-[0_8px_24px_-12px]",
        volt: "bg-volt text-volt-foreground shadow-volt/60 shadow-[0_8px_24px_-12px]",
        glass: "glass-strong text-foreground",
        outline: "border-border text-foreground hover:bg-accent border bg-transparent",
        ghost: "text-foreground hover:bg-accent bg-transparent",
        destructive: "bg-destructive text-destructive-foreground",
        link: "text-grass-ink h-auto rounded-none px-0 tracking-normal normal-case underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        default: "h-11 px-5 text-[15px]",
        lg: "h-13 px-7 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean; children?: React.ReactNode };

/** Bouton avec ressort au press (`spring.snappy`). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  const reduced = useReducedMotion();
  return (
    <m.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(reduced || variant === "link" ? {} : { whileTap: press.whileTap, transition: press.transition })}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </m.button>
  );
});

const MotionLink = m.create(Link);

type ButtonLinkProps = Omit<ComponentProps<typeof MotionLink>, "children"> &
  VariantProps<typeof buttonVariants> & { children?: React.ReactNode };

/** Lien stylé comme un bouton, avec le même ressort. */
export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  const reduced = useReducedMotion();
  return (
    <MotionLink
      {...(reduced ? {} : { whileTap: press.whileTap, transition: press.transition })}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
