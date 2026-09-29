import { parisDateTime } from "../../src/lib/dates";

export type Pairing<T> = { home: T; away: T };

/**
 * Tournoi toutes rondes (méthode du cercle) : n-1 journées de n/2 matchs,
 * domicile/extérieur alterné pour équilibrer.
 */
export function singleRoundRobin<T>(teams: readonly T[]): Pairing<T>[][] {
  if (teams.length % 2 !== 0) throw new Error("Nombre d'équipes pair requis");
  const n = teams.length;
  const rotating = teams.slice(1);
  const rounds: Pairing<T>[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const circle = [teams[0]!, ...rotating];
    const round: Pairing<T>[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i]!;
      const b = circle[n - 1 - i]!;
      const flip = i === 0 ? r % 2 === 1 : (r + i) % 2 === 1;
      round.push(flip ? { home: b, away: a } : { home: a, away: b });
    }
    rounds.push(round);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

/** Aller-retour : la phase retour inverse les réceptions de la phase aller. */
export function doubleRoundRobin<T>(teams: readonly T[]): Pairing<T>[][] {
  const first = singleRoundRobin(teams);
  return [...first, ...first.map((round) => round.map(({ home, away }) => ({ home: away, away: home })))];
}

type Slot = { dayOffset: number; hour: number; minute: number };
const s = (dayOffset: number, time: string): Slot => {
  const [h, m] = time.split(":").map(Number);
  return { dayOffset, hour: h!, minute: m! };
};

/** Créneaux horaires d'un week-end (décalage en jours par rapport au samedi, heure de Paris). */
export const WEEKEND_SLOTS: Record<"FL1" | "PL" | "PD" | "SA" | "BL1", Slot[]> = {
  FL1: [
    s(-1, "20:45"),
    s(0, "17:00"),
    s(0, "19:00"),
    s(0, "21:05"),
    s(1, "13:00"),
    s(1, "15:00"),
    s(1, "15:00"),
    s(1, "17:15"),
    s(1, "20:45"),
  ],
  PL: [
    s(0, "13:30"),
    s(0, "16:00"),
    s(0, "16:00"),
    s(0, "16:00"),
    s(0, "16:00"),
    s(0, "18:30"),
    s(1, "15:00"),
    s(1, "15:00"),
    s(1, "17:30"),
    s(2, "21:00"),
  ],
  PD: [
    s(-1, "21:00"),
    s(0, "14:00"),
    s(0, "16:15"),
    s(0, "18:30"),
    s(0, "21:00"),
    s(1, "14:00"),
    s(1, "16:15"),
    s(1, "18:30"),
    s(1, "21:00"),
    s(2, "21:00"),
  ],
  SA: [
    s(0, "15:00"),
    s(0, "18:00"),
    s(0, "20:45"),
    s(1, "12:30"),
    s(1, "15:00"),
    s(1, "15:00"),
    s(1, "18:00"),
    s(1, "20:45"),
    s(2, "18:30"),
    s(2, "20:45"),
  ],
  BL1: [
    s(-1, "20:30"),
    s(0, "15:30"),
    s(0, "15:30"),
    s(0, "15:30"),
    s(0, "15:30"),
    s(0, "15:30"),
    s(0, "18:30"),
    s(1, "15:30"),
    s(1, "17:30"),
  ],
};

const MIDWEEK_SLOTS = (count: number): Slot[] =>
  Array.from({ length: count }, (_, i) =>
    i < count / 2 ? s(-1, i % 3 === 0 ? "19:00" : "21:00") : s(0, i % 3 === 0 ? "19:00" : "21:00"),
  );

/** Samedis de trêve internationale (saison 2026-27, décalés d'un an pour les suivantes). */
const INTERNATIONAL_BREAKS = ["09-05", "10-10", "11-14", "03-27"];
const WINTER_BREAK: Partial<Record<keyof typeof WEEKEND_SLOTS, string[]>> = {
  FL1: ["12-26", "01-02"],
  BL1: ["12-26", "01-02", "01-09"],
  PD: ["12-26"],
};
/** Mercredis utilisés si un championnat manque de week-ends. */
const MIDWEEK_DATES = ["12-16", "01-13", "04-21", "02-24"];
const FIRST_SATURDAY: Record<keyof typeof WEEKEND_SLOTS, string> = {
  FL1: "08-15",
  PL: "08-15",
  PD: "08-15",
  SA: "08-22",
  BL1: "08-22",
};

type DateParts = { y: number; m: number; d: number };
const partsOf = (season: number, md: string): DateParts => {
  const [m, d] = md.split("-").map(Number);
  return { y: m! >= 7 ? season : season + 1, m: m!, d: d! };
};
const key = (p: DateParts) => `${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;

/** Premier samedi à partir d'une date (UTC, sans heure). */
function saturdayOnOrAfter(p: DateParts): Date {
  const date = new Date(Date.UTC(p.y, p.m - 1, p.d));
  while (date.getUTCDay() !== 6) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/** Dates des journées d'un championnat (samedis, hors trêves, complétés de mercredis si besoin). */
export function leagueRoundDates(code: keyof typeof WEEKEND_SLOTS, season: number, rounds: number) {
  const skip = new Set([...INTERNATIONAL_BREAKS, ...(WINTER_BREAK[code] ?? [])]);
  const dates: { date: Date; midweek: boolean }[] = [];
  const cursor = saturdayOnOrAfter(partsOf(season, FIRST_SATURDAY[code]));
  const end = new Date(Date.UTC(season + 1, 4, 24));
  while (cursor <= end) {
    const md = key({ y: cursor.getUTCFullYear(), m: cursor.getUTCMonth() + 1, d: cursor.getUTCDate() });
    if (!skip.has(md)) dates.push({ date: new Date(cursor), midweek: false });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  for (const md of MIDWEEK_DATES) {
    if (dates.length >= rounds) break;
    const p = partsOf(season, md);
    const wed = new Date(Date.UTC(p.y, p.m - 1, p.d));
    while (wed.getUTCDay() !== 3) wed.setUTCDate(wed.getUTCDate() + 1);
    dates.push({ date: wed, midweek: true });
  }
  if (dates.length < rounds) throw new Error(`${code} : pas assez de dates (${dates.length}/${rounds})`);
  return dates.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, rounds);
}

/** Heures de coup d'envoi (UTC) des matchs d'une journée de championnat. */
export function roundKickoffs(
  code: keyof typeof WEEKEND_SLOTS,
  anchor: { date: Date; midweek: boolean },
  matches: number,
): Date[] {
  const slots = anchor.midweek ? MIDWEEK_SLOTS(matches) : WEEKEND_SLOTS[code];
  return Array.from({ length: matches }, (_, i) => {
    const slot = slots[i % slots.length]!;
    const day = new Date(anchor.date);
    day.setUTCDate(day.getUTCDate() + slot.dayOffset);
    return parisDateTime(
      day.getUTCFullYear(),
      day.getUTCMonth() + 1,
      day.getUTCDate(),
      slot.hour,
      slot.minute,
    );
  });
}

/** Journées de la phase de ligue de C1 : [jours (mm-dd)] ; 18 matchs répartis sur ces jours. */
const CL_MATCHDAYS: string[][] = [
  ["09-15", "09-16", "09-17"],
  ["09-29", "09-30"],
  ["10-20", "10-21"],
  ["11-03", "11-04"],
  ["11-24", "11-25"],
  ["12-08", "12-09"],
  ["01-19", "01-20"],
  ["01-27"],
];

export function championsLeagueKickoffs(season: number, matchday: number, matches: number): Date[] {
  const days = CL_MATCHDAYS[matchday - 1];
  if (!days) throw new Error(`Journée de C1 inconnue : ${matchday}`);
  const perDay = Math.ceil(matches / days.length);
  return Array.from({ length: matches }, (_, i) => {
    const dayIndex = Math.min(days.length - 1, Math.floor(i / perDay));
    const p = partsOf(season, days[dayIndex]!);
    const indexInDay = i - dayIndex * perDay;
    // Dernière journée : tous les matchs à 21:00 ; sinon deux affiches à 18:45.
    const early = days.length > 1 && indexInDay < 2;
    return parisDateTime(p.y, p.m, p.d, early ? 18 : 21, early ? 45 : 0);
  });
}
