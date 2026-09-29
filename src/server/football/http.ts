import { ProviderError, type ProviderName } from "./types";
import { reserveCall } from "./quota";

/** GET JSON avec délai d'expiration, réservation de quota et erreurs typées. */
export async function getJson(
  provider: ProviderName,
  url: string,
  headers: Record<string, string>,
  { timeoutMs = 15_000 }: { timeoutMs?: number } = {},
): Promise<unknown> {
  await reserveCall(provider);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    throw new ProviderError(provider, `réseau indisponible (${(error as Error).message})`, true);
  }
  if (response.status === 429) throw new ProviderError(provider, "trop de requêtes (429)", true);
  if (response.status === 401 || response.status === 403)
    throw new ProviderError(provider, `clé refusée (${response.status})`);
  if (!response.ok)
    throw new ProviderError(provider, `réponse HTTP ${response.status}`, response.status >= 500);
  try {
    return await response.json();
  } catch {
    throw new ProviderError(provider, "réponse JSON invalide");
  }
}
