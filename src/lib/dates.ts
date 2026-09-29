import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";

/** Fuseau de référence de l'application. */
export const APP_TZ = "Europe/Paris";

export const inParis = (date: Date | number | string) => new TZDate(new Date(date), APP_TZ);

/** « sam. 3 oct. » */
export const formatDayShort = (d: Date) => format(inParis(d), "EEE d MMM", { locale: fr });
/** « samedi 3 octobre » */
export const formatDayLong = (d: Date) => format(inParis(d), "EEEE d MMMM", { locale: fr });
/** « 21:00 » */
export const formatTime = (d: Date) => format(inParis(d), "HH:mm", { locale: fr });
/** « sam. 3 oct. · 21:00 » */
export const formatKickoff = (d: Date) => `${formatDayShort(d)} · ${formatTime(d)}`;
/** « octobre 2026 » */
export const formatMonth = (d: Date) => format(inParis(d), "MMMM yyyy", { locale: fr });
/** « 3 oct. 2026 » */
export const formatDate = (d: Date) => format(inParis(d), "d MMM yyyy", { locale: fr });

/** Libellé relatif : « Aujourd'hui », « Demain », « Hier » ou date courte. */
export function relativeDay(d: Date, now: Date = new Date()): string {
  const day = inParis(d);
  const ref = inParis(now);
  if (isSameDay(day, ref) || isToday(day)) return "Aujourd'hui";
  if (isTomorrow(day)) return "Demain";
  if (isYesterday(day)) return "Hier";
  return formatDayShort(d);
}

/** Début (inclus) et fin (exclue) d'un jour à Paris, en UTC. */
export function parisDayRange(d: Date): { start: Date; end: Date } {
  const start = startOfDay(inParis(d));
  return { start: new Date(start.getTime()), end: new Date(addDays(start, 1).getTime()) };
}

/** Début (inclus) et fin (exclue) d'un mois à Paris, en UTC. */
export function parisMonthRange(d: Date): { start: Date; end: Date } {
  const start = startOfMonth(inParis(d));
  return { start: new Date(start.getTime()), end: new Date(addMonths(start, 1).getTime()) };
}

/** Clé « YYYY-MM-DD » du jour à Paris. */
export const parisDayKey = (d: Date) => format(inParis(d), "yyyy-MM-dd");
/** Clé « YYYY-MM » du mois à Paris. */
export const parisMonthKey = (d: Date) => format(inParis(d), "yyyy-MM");

/** Construit une date UTC depuis une heure locale de Paris. */
export function parisDateTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(new TZDate(year, month - 1, day, hour, minute, 0, APP_TZ).getTime());
}

/** Saison courante (année de début) : à partir de juillet, nouvelle saison. */
export function currentSeasonYear(now: Date = new Date()): number {
  const d = inParis(now);
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}
