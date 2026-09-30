import { env } from "@/lib/env";
import { apiFootball } from "./api-football";
import { footballData } from "./football-data";
import { ProviderError, type FootballProvider, type ProviderName } from "./types";

export const PROVIDERS: Record<ProviderName, FootballProvider> = {
  "api-football": apiFootball,
  "football-data": footballData,
};

export type ProviderTask = "fixtures" | "standings" | "live" | "lineups" | "headToHead";

/** Ordre de préférence des fournisseurs pour une tâche. */
export function providerOrder(task: ProviderTask): FootballProvider[] {
  switch (task) {
    case "live": {
      const first = env().FOOTBALL_LIVE_PROVIDER;
      return [PROVIDERS[first], PROVIDERS[first === "api-football" ? "football-data" : "api-football"]];
    }
    case "lineups":
      return [apiFootball];
    default:
      return [apiFootball, footballData];
  }
}

export class NoProviderError extends Error {
  constructor(
    task: ProviderTask,
    readonly failures: string[],
  ) {
    super(
      failures.length
        ? `Aucun fournisseur n'a répondu pour « ${task} » : ${failures.join(" ; ")}`
        : `Aucun fournisseur configuré pour « ${task} » (API_FOOTBALL_KEY ou FOOTBALL_DATA_KEY).`,
    );
    this.name = "NoProviderError";
  }
}

/**
 * Exécute `fn` avec le premier fournisseur configuré qui répond ;
 * bascule sur le suivant en cas d'erreur (quota, réseau, réponse invalide).
 */
export async function withFallback<T>(
  task: ProviderTask,
  fn: (provider: FootballProvider) => Promise<T>,
): Promise<{ provider: ProviderName; result: T; failures: string[] }> {
  const failures: string[] = [];
  for (const provider of providerOrder(task)) {
    if (!provider.isConfigured()) continue;
    try {
      return { provider: provider.name, result: await fn(provider), failures };
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      failures.push(error.message);
    }
  }
  throw new NoProviderError(task, failures);
}

export const anyProviderConfigured = () => apiFootball.isConfigured() || footballData.isConfigured();
