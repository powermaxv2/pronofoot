import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PronoFoot — pronostics foot entre amis",
    short_name: "PronoFoot",
    description: "Pronostics football entre amis : points virtuels, ligues privées, classements en direct.",
    lang: "fr",
    dir: "ltr",
    start_url: "/accueil",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07110b",
    theme_color: "#07110b",
    categories: ["sports", "games", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      {
        name: "Matchs",
        short_name: "Matchs",
        url: "/matchs",
        icons: [{ src: "/icons/shortcut-matchs.png", sizes: "96x96" }],
      },
      {
        name: "Classements",
        short_name: "Classements",
        url: "/classements",
        icons: [{ src: "/icons/shortcut-classement.png", sizes: "96x96" }],
      },
    ],
  };
}
