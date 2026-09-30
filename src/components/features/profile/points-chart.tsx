"use client";

import { m } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatDate } from "@/lib/dates";
import { ease } from "@/lib/motion";
import type { WeeklyPoint } from "@/server/queries/profile";

const H = 220;
const PAD = { top: 16, right: 60, bottom: 28, left: 40 };

function niceMax(v: number) {
  if (v <= 0) return 10;
  const step = 10 ** Math.floor(Math.log10(v));
  const n = Math.ceil(v / step);
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * step;
}

/** Courbe des points cumulés par semaine : tracé animé, réticule et info-bulle au survol. */
export function PointsChart({ data }: { data: WeeklyPoint[] }) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Largeur réelle du conteneur : le texte garde sa taille, sans mise à l'échelle du SVG.
  const [W, setW] = useState(640);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(
      ([entry]) => entry && setW(Math.max(280, Math.round(entry.contentRect.width))),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const geom = useMemo(() => {
    const max = niceMax(Math.max(...data.map((d) => d.cumulative), 0));
    const x = (i: number) =>
      PAD.left +
      (data.length === 1
        ? (W - PAD.left - PAD.right) / 2
        : (i / (data.length - 1)) * (W - PAD.left - PAD.right));
    const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
    const points = data.map((d, i) => [x(i), y(d.cumulative)] as const);
    const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(W / 110))));
    return { max, x, y, points, line, area, ticks, labelEvery };
  }, [data, W]);

  if (data.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        La courbe apparaîtra après le premier pronostic noté.
      </p>
    );

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < geom.points.length; i++)
      if (Math.abs(geom.points[i]![0] - px) < Math.abs(geom.points[best]![0] - px)) best = i;
    setHover(best);
  }

  const last = geom.points.at(-1)!;
  const active = hover != null ? data[hover]! : null;
  const activePoint = hover != null ? geom.points[hover]! : null;

  return (
    <figure ref={box} className="relative grid gap-2">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none overflow-visible"
        style={{ height: H }}
        role="img"
        aria-label={`Points cumulés : ${data.at(-1)!.cumulative} points après ${data.length} semaines.`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-1)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {geom.ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={geom.y(t)}
              y2={geom.y(t)}
              stroke="var(--chart-grid)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={geom.y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize="11"
              fill="var(--muted-foreground)"
              className="tabular"
            >
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % geom.labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.week}
              x={geom.x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {formatDate(new Date(d.week)).replace(/ \d{4}$/, "")}
            </text>
          ) : null,
        )}
        <m.path
          d={geom.area}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.6, duration: 0.5 }}
        />
        <m.path
          d={geom.line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? { opacity: 0 } : { pathLength: 0 }}
          animate={reduced ? { opacity: 1 } : { pathLength: 1 }}
          transition={{ duration: reduced ? 0.2 : 1.2, ease: ease.out }}
        />
        <m.circle
          cx={last[0]}
          cy={last[1]}
          r="4.5"
          fill="var(--chart-1)"
          stroke="var(--card)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: reduced ? 0 : 1.1, type: "spring", stiffness: 380, damping: 14 }}
        />
        <text
          x={last[0] + 10}
          y={last[1]}
          dy="0.32em"
          fontSize="13"
          fontWeight="700"
          fill="var(--foreground)"
        >
          {data.at(-1)!.cumulative} pts
        </text>
        {activePoint && (
          <g pointerEvents="none">
            <line
              x1={activePoint[0]}
              x2={activePoint[0]}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--muted-foreground)"
              strokeWidth="1"
            />
            <circle
              cx={activePoint[0]}
              cy={activePoint[1]}
              r="5"
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      {active && activePoint && (
        <div
          className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-0 z-10 rounded-lg border px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(activePoint[0] / W) * 100}%`,
            transform: `translateX(${activePoint[0] > W * 0.6 ? "-105%" : "8px"})`,
          }}
          role="status"
        >
          <p className="font-semibold">Semaine du {formatDate(new Date(active.week))}</p>
          <p className="text-muted-foreground">
            +{active.points} pts · total{" "}
            <span className="text-foreground font-semibold">{active.cumulative}</span>
          </p>
        </div>
      )}
      <table className="sr-only">
        <caption>Points par semaine</caption>
        <thead>
          <tr>
            <th>Semaine</th>
            <th>Points</th>
            <th>Cumul</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week}>
              <td>{formatDate(new Date(d.week))}</td>
              <td>{d.points}</td>
              <td>{d.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
