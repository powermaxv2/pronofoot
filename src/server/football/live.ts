const MINUTE = 60_000;

/** Fenêtre « live » d'un match : de H-5 min à H+150 min. */
export const LIVE_WINDOW = { before: 5 * MINUTE, after: 150 * MINUTE } as const;
