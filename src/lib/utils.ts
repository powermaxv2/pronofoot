import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initiales d'un nom (2 lettres max). */
export function initials(name: string): string {
  const parts = name
    .replace(/[_\-.]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Formatage français des nombres. */
export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

export const formatPercent = (ratio: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: digits }).format(ratio);

/** Pluriel simple : plural(3, "point") → "3 points". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(n)} ${Math.abs(n) >= 2 ? pluralForm : singular}`;
}

/** Slug ASCII (ligues, pseudos). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function assertNever(value: never): never {
  throw new Error(`Valeur inattendue : ${String(value)}`);
}
