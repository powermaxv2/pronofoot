import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: ComponentProps<"hr">) {
  return <hr className={cn("border-border my-0 border-t", className)} {...props} />;
}
