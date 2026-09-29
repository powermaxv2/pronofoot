import { CalendarDays, Home, ListChecks, Trophy, Users } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/matchs", label: "Matchs", icon: CalendarDays },
  { href: "/pronostics", label: "Pronos", icon: ListChecks },
  { href: "/classements", label: "Classements", icon: Trophy },
  { href: "/ligues", label: "Ligues", icon: Users },
] as const;

export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
