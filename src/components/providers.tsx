"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ServiceWorkerRegister } from "@/components/layout/service-worker";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </MotionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
