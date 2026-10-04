/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_LENGTH = 8;

/** Code d'invitation de ligue (8 caractères). */
export function generateInviteCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < INVITE_LENGTH; i++)
    code += INVITE_ALPHABET[Math.floor(random() * INVITE_ALPHABET.length)];
  return code;
}

/** Normalise une saisie utilisateur (espaces, minuscules, tirets). */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const isInviteCode = (code: string) =>
  code.length === INVITE_LENGTH && [...code].every((c) => INVITE_ALPHABET.includes(c));
