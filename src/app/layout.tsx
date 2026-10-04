import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { barlow, barlowCondensed, bebas } from "./fonts";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "PronoFoot — pronostics foot entre amis", template: "%s · PronoFoot" },
  description:
    "Pronostiquez les matchs de Ligue 1, Premier League, Liga, Serie A, Bundesliga et Ligue des Champions avec vos amis. Points virtuels, ligues privées, classements en direct.",
  applicationName: "PronoFoot",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PronoFoot", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { type: "website", locale: "fr_FR", siteName: "PronoFoot" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07110b" },
    { media: "(prefers-color-scheme: light)", color: "#f3f7f1" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${bebas.variable} ${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body>
        <a
          href="#contenu"
          className="bg-volt text-volt-foreground sr-only z-[100] rounded-full px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
