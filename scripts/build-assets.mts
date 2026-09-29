/**
 * Génère les assets statiques de PronoFoot (tous créés pour le projet, aucune licence tierce) :
 *  - icônes PWA (SVG + PNG via sharp)
 *  - animations Lottie : ballon qui rebondit (hero, chargements) et ballon qui roule (états vides)
 *  - galerie d'avatars « maillots »
 *
 * Usage : pnpm assets
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..", "public");

/* ------------------------------------------------------------------ */
/*                               Icônes                                */
/* ------------------------------------------------------------------ */

function pentagonPoints(cx: number, cy: number, r: number, rotation = -90): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rotation + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function ballMark(size: number, padding: number, bg: string | null) {
  const c = size / 2;
  const r = size / 2 - padding;
  const patches = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const d = r * 0.78;
    return `<polygon points="${pentagonPoints(c + d * Math.cos(a), c + d * Math.sin(a), r * 0.2, -90 + i * 72 + 180)}" fill="#07110b"/>`;
  }).join("");
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x1 = c + r * 0.3 * Math.cos(a);
    const y1 = c + r * 0.3 * Math.sin(a);
    const x2 = c + r * 0.62 * Math.cos(a);
    const y2 = c + r * 0.62 * Math.sin(a);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#07110b" stroke-width="${(r * 0.06).toFixed(2)}" stroke-linecap="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
${bg ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>` : ""}
<defs><radialGradient id="g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f6ffb0"/><stop offset="0.55" stop-color="#e8ff3a"/><stop offset="1" stop-color="#9fbf12"/></radialGradient></defs>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#g)"/>
<polygon points="${pentagonPoints(c, c, r * 0.3)}" fill="#07110b"/>
${spokes}${patches}
<circle cx="${c}" cy="${c}" r="${r - r * 0.03}" fill="none" stroke="#07110b" stroke-opacity="0.35" stroke-width="${r * 0.06}"/>
</svg>`;
}

async function icons() {
  const dir = join(root, "icons");
  await mkdir(dir, { recursive: true });
  const svg = ballMark(512, 72, "#07110b");
  await writeFile(join(dir, "icon.svg"), svg);
  const png = (s: string, size: number, name: string) =>
    sharp(Buffer.from(s)).resize(size, size).png({ compressionLevel: 9 }).toFile(join(dir, name));
  await png(svg, 192, "icon-192.png");
  await png(svg, 512, "icon-512.png");
  await png(svg, 180, "apple-touch-icon.png");
  // Maskable : zone de sécurité de 80 % → marge plus large, fond plein.
  const maskable = ballMark(512, 120, null).replace(
    "<defs>",
    `<rect width="512" height="512" fill="#07110b"/><defs>`,
  );
  await png(maskable, 512, "icon-maskable-512.png");
  // Badge de notification Android : silhouette monochrome.
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" fill="#fff"/><polygon points="${pentagonPoints(48, 48, 13)}" fill="#000"/></svg>`;
  await png(badge, 96, "badge-96.png");
  // Raccourcis PWA
  await png(ballMark(192, 30, "#16a34a"), 96, "shortcut-matchs.png");
  await png(ballMark(192, 30, "#b7860b"), 96, "shortcut-classement.png");
  // Image Open Graph
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="bg" cx="80%" cy="0%" r="90%"><stop offset="0" stop-color="#123522"/><stop offset="1" stop-color="#07110b"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<line x1="600" y1="0" x2="600" y2="630" stroke="#ffffff" stroke-opacity="0.05" stroke-width="3"/>
<circle cx="600" cy="315" r="170" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="3"/>
<g transform="translate(820 135) scale(0.7)">${ballMark(512, 0, null).replace(/<\/?svg[^>]*>/g, "")}</g>
<text x="80" y="330" font-family="Impact, 'Arial Narrow', sans-serif" font-size="150" fill="#e8f2eb">PRONO<tspan fill="#e8ff3a">FOOT</tspan></text>
<text x="84" y="400" font-family="Arial, sans-serif" font-size="36" fill="#8da497">Pronostics foot entre amis — points virtuels</text>
</svg>`;
  await sharp(Buffer.from(og)).png().toFile(join(root, "og.png"));
}

/* ------------------------------------------------------------------ */
/*                               Lottie                                */
/* ------------------------------------------------------------------ */

type Vec = number[];
const staticProp = (k: number | Vec) => ({ a: 0, k });
const easeOut = { i: { x: [0.3], y: [1] }, o: { x: [0.7], y: [0] } };
const easeIn = { i: { x: [0.3], y: [1] }, o: { x: [0.7], y: [0] } };
const kf = (t: number, s: Vec, ease: { i: unknown; o: unknown } = easeOut) => ({ t, s, ...ease });
const animated = (frames: ReturnType<typeof kf>[], last: { t: number; s: Vec }) => ({
  a: 1,
  k: [...frames, last],
});

const transform = (extra: Record<string, unknown> = {}) => ({
  ty: "tr",
  p: staticProp([0, 0]),
  a: staticProp([0, 0]),
  s: staticProp([100, 100]),
  r: staticProp(0),
  o: staticProp(100),
  sk: staticProp(0),
  sa: staticProp(0),
  ...extra,
});

const rgba = (hex: string, a = 1): Vec => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};

function polygon(x: number, y: number, r: number, rot: number, color: string) {
  return {
    ty: "gr",
    nm: "patch",
    it: [
      {
        ty: "sr",
        sy: 2,
        d: 1,
        pt: staticProp(5),
        p: staticProp([0, 0]),
        r: staticProp(0),
        or: staticProp(r),
        os: staticProp(0),
      },
      { ty: "fl", c: staticProp(rgba(color)), o: staticProp(100), r: 1 },
      transform({ p: staticProp([x, y]), r: staticProp(rot) }),
    ],
  };
}

/** Groupe « ballon » (rayon 60) centré sur (0, 0). */
function ballShapes() {
  const r = 60;
  const patches = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return polygon(r * 0.76 * Math.cos(a), r * 0.76 * Math.sin(a), 12, i * 72 + 36, "#07110b");
  });
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return {
      ty: "gr",
      nm: "spoke",
      it: [
        {
          ty: "sh",
          ks: staticProp({
            c: false,
            v: [
              [r * 0.28 * Math.cos(a), r * 0.28 * Math.sin(a)],
              [r * 0.58 * Math.cos(a), r * 0.58 * Math.sin(a)],
            ],
            i: [
              [0, 0],
              [0, 0],
            ],
            o: [
              [0, 0],
              [0, 0],
            ],
          } as unknown as Vec),
        },
        { ty: "st", c: staticProp(rgba("#07110b")), o: staticProp(100), w: staticProp(4), lc: 2, lj: 2 },
        transform(),
      ],
    };
  });
  return [
    {
      ty: "gr",
      nm: "outline",
      it: [
        { ty: "el", p: staticProp([0, 0]), s: staticProp([r * 2, r * 2]), d: 1 },
        { ty: "st", c: staticProp(rgba("#07110b", 1)), o: staticProp(35), w: staticProp(4), lc: 2, lj: 2 },
        transform(),
      ],
    },
    ...spokes,
    ...patches,
    polygon(0, 0, 17, 0, "#07110b"),
    {
      ty: "gr",
      nm: "body",
      it: [
        { ty: "el", p: staticProp([0, 0]), s: staticProp([r * 2, r * 2]), d: 1 },
        {
          ty: "gf",
          o: staticProp(100),
          r: 1,
          t: 2,
          s: staticProp([-22, -26]),
          e: staticProp([64, 64]),
          h: staticProp(0),
          a: staticProp(0),
          g: { p: 3, k: staticProp([0, 1, 1, 0.9, 0.55, 0.91, 1, 0.23, 1, 0.62, 0.75, 0.07]) },
        },
        transform(),
      ],
    },
  ];
}

function layer(ind: number, nm: string, shapes: unknown[], ks: Record<string, unknown>, op: number) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm,
    sr: 1,
    ks: {
      o: staticProp(100),
      r: staticProp(0),
      p: staticProp([200, 200, 0]),
      a: staticProp([0, 0, 0]),
      s: staticProp([100, 100, 100]),
      ...ks,
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

function lottie(nm: string, op: number, layers: unknown[]) {
  return { v: "5.7.4", fr: 60, ip: 0, op, w: 400, h: 400, nm, ddd: 0, assets: [], layers };
}

function bouncingBall() {
  const op = 84;
  const top = 120;
  const floor = 290;
  const accel = { i: { x: [0.8], y: [1] }, o: { x: [0.6], y: [0] } };
  const decel = { i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } };
  const ball = layer(
    1,
    "ballon",
    ballShapes(),
    {
      p: {
        a: 1,
        k: [
          { t: 0, s: [200, top, 0], ...accel },
          { t: 38, s: [200, floor, 0], ...decel },
          { t: 44, s: [200, floor, 0], ...decel },
          { t: op, s: [200, top, 0] },
        ],
      },
      r: animated([kf(0, [0], { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } })], { t: op, s: [360] }),
      s: animated(
        [
          kf(0, [100, 100, 100]),
          kf(34, [96, 104, 100]),
          kf(40, [118, 84, 100]),
          kf(48, [94, 106, 100]),
          kf(58, [100, 100, 100]),
        ],
        { t: op, s: [100, 100, 100] },
      ),
    },
    op,
  );
  const shadow = layer(
    2,
    "ombre",
    [
      {
        ty: "gr",
        nm: "ombre",
        it: [
          { ty: "el", p: staticProp([0, 0]), s: staticProp([140, 22]), d: 1 },
          { ty: "fl", c: staticProp(rgba("#000000")), o: staticProp(100), r: 1 },
          transform(),
        ],
      },
    ],
    {
      p: staticProp([200, 360, 0]),
      s: animated([kf(0, [45, 45, 100], easeIn), kf(38, [100, 100, 100]), kf(44, [100, 100, 100])], {
        t: op,
        s: [45, 45, 100],
      }),
      o: animated([kf(0, [14], easeIn), kf(38, [38]), kf(44, [38])], { t: op, s: [14] }),
    },
    op,
  );
  return lottie("ballon-rebond", op, [ball, shadow]);
}

function rollingBall() {
  const op = 150;
  const linear = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
  const ball = layer(
    1,
    "ballon",
    ballShapes(),
    {
      p: {
        a: 1,
        k: [
          { t: 0, s: [-80, 290, 0], i: { x: 1, y: 1 }, o: { x: 0, y: 0 } },
          { t: op, s: [480, 290, 0] },
        ],
      },
      r: animated([kf(0, [0], linear)], { t: op, s: [535] }),
      s: staticProp([70, 70, 100]),
    },
    op,
  );
  const lines = [0, 1, 2].map((i) =>
    layer(
      2 + i,
      `trace-${i}`,
      [
        {
          ty: "gr",
          nm: "trace",
          it: [
            { ty: "rc", p: staticProp([0, 0]), s: staticProp([60 - i * 14, 5]), r: staticProp(3), d: 1 },
            { ty: "fl", c: staticProp(rgba("#e8ff3a")), o: staticProp(100), r: 1 },
            transform(),
          ],
        },
      ],
      {
        p: {
          a: 1,
          k: [
            { t: 0, s: [-150 - i * 10, 262 + i * 16, 0], i: { x: 1, y: 1 }, o: { x: 0, y: 0 } },
            { t: op, s: [410 - i * 10, 262 + i * 16, 0] },
          ],
        },
        o: staticProp(45 - i * 12),
      },
      op,
    ),
  );
  const ground = layer(
    9,
    "sol",
    [
      {
        ty: "gr",
        nm: "sol",
        it: [
          { ty: "rc", p: staticProp([0, 0]), s: staticProp([320, 3]), r: staticProp(2), d: 1 },
          { ty: "fl", c: staticProp(rgba("#22c55e")), o: staticProp(60), r: 1 },
          transform(),
        ],
      },
    ],
    { p: staticProp([200, 334, 0]) },
    op,
  );
  return lottie("ballon-roule", op, [ball, ...lines, ground]);
}

async function lotties() {
  const dir = join(root, "lottie");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "ball-bounce.json"), JSON.stringify(bouncingBall()));
  await writeFile(join(dir, "ball-roll.json"), JSON.stringify(rollingBall()));
}

/* ------------------------------------------------------------------ */
/*                           Avatars maillots                          */
/* ------------------------------------------------------------------ */

const jerseys: {
  primary: string;
  secondary: string;
  pattern: "plain" | "stripes" | "hoops" | "sash" | "half";
}[] = [
  { primary: "#16a34a", secondary: "#e8ff3a", pattern: "plain" },
  { primary: "#1d4ed8", secondary: "#ffffff", pattern: "stripes" },
  { primary: "#dc2626", secondary: "#111827", pattern: "stripes" },
  { primary: "#f8fafc", secondary: "#0ea5e9", pattern: "sash" },
  { primary: "#111827", secondary: "#e8ff3a", pattern: "hoops" },
  { primary: "#7c3aed", secondary: "#f5c542", pattern: "half" },
  { primary: "#ea580c", secondary: "#1f2937", pattern: "plain" },
  { primary: "#0d9488", secondary: "#f8fafc", pattern: "hoops" },
  { primary: "#be123c", secondary: "#fde68a", pattern: "sash" },
  { primary: "#0f172a", secondary: "#22c55e", pattern: "stripes" },
  { primary: "#facc15", secondary: "#1e3a8a", pattern: "half" },
  { primary: "#38bdf8", secondary: "#ffffff", pattern: "plain" },
];

function jerseySvg(j: (typeof jerseys)[number], n: number) {
  const body =
    "M38 22 L52 16 Q64 26 76 16 L90 22 L112 40 L100 58 L90 52 L90 112 L38 112 L38 52 L28 58 L16 40 Z";
  const patterns: Record<typeof j.pattern, string> = {
    plain: "",
    stripes: [44, 60, 76]
      .map((x) => `<rect x="${x}" y="10" width="8" height="110" fill="${j.secondary}"/>`)
      .join(""),
    hoops: [48, 70, 92]
      .map((y) => `<rect x="10" y="${y}" width="110" height="10" fill="${j.secondary}"/>`)
      .join(""),
    sash: `<polygon points="30,30 50,20 110,110 90,120" fill="${j.secondary}"/>`,
    half: `<rect x="64" y="0" width="64" height="128" fill="${j.secondary}"/>`,
  };
  const textColor = j.pattern === "half" || j.pattern === "stripes" ? "#ffffff" : j.secondary;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
<rect width="128" height="128" fill="#0c1d13"/>
<defs><clipPath id="c"><path d="${body}"/></clipPath></defs>
<g clip-path="url(#c)"><rect width="128" height="128" fill="${j.primary}"/>${patterns[j.pattern]}</g>
<path d="${body}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
<path d="M52 16 Q64 30 76 16" fill="none" stroke="${j.secondary}" stroke-width="4"/>
<text x="64" y="94" text-anchor="middle" font-family="Impact, 'Arial Narrow', sans-serif" font-size="38" fill="${textColor}" stroke="#000" stroke-opacity="0.35" stroke-width="1.5">${n}</text>
</svg>`;
}

async function avatars() {
  const dir = join(root, "avatars");
  await mkdir(dir, { recursive: true });
  const numbers = [10, 7, 9, 1, 4, 8, 11, 5, 23, 14, 17, 2];
  await Promise.all(
    jerseys.map((j, i) =>
      writeFile(join(dir, `maillot-${String(i + 1).padStart(2, "0")}.svg`), jerseySvg(j, numbers[i]!)),
    ),
  );
}

await Promise.all([icons(), lotties(), avatars()]);
console.info("Assets générés dans public/");
