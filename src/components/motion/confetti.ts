"use client";

/** Lance des confettis vert pelouse / jaune électrique depuis un élément (chargé à la demande). */
export async function fireConfetti(origin?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  let x = 0.5;
  let y = 0.5;
  if (origin) {
    const r = origin.getBoundingClientRect();
    x = (r.left + r.width / 2) / window.innerWidth;
    y = (r.top + r.height / 2) / window.innerHeight;
  }
  const styles = getComputedStyle(document.documentElement);
  const colors = [
    styles.getPropertyValue("--primary").trim() || "#22c55e",
    styles.getPropertyValue("--volt").trim() || "#e8ff3a",
    "#ffffff",
    styles.getPropertyValue("--gold").trim() || "#f5c542",
  ];
  const base = { origin: { x, y }, colors, disableForReducedMotion: true, zIndex: 80 };
  void confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 38, scalar: 0.9 });
  window.setTimeout(
    () => void confetti({ ...base, particleCount: 50, spread: 120, startVelocity: 25, decay: 0.92 }),
    160,
  );
}
