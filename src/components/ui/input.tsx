import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "border-input placeholder:text-muted-foreground bg-surface h-11 w-full min-w-0 rounded-xl border px-4 text-base transition-[border-color] outline-none",
        "focus-visible:border-ring aria-invalid:border-destructive disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "border-input placeholder:text-muted-foreground bg-surface min-h-24 w-full rounded-xl border px-4 py-3 text-base outline-none",
        "focus-visible:border-ring aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
});
