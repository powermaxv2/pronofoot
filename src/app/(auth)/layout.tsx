import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pitch-lines relative flex min-h-dvh flex-col">
      <header className="safe-top mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main
        id="contenu"
        className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0"
      >
        {children}
      </main>
    </div>
  );
}
