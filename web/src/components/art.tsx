import { motion, useReducedMotion } from "framer-motion";

/** Pseudo-random but fixed, so the art is identical on every load. */
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Zcash's side: a line-art sunburst (z.cash draws its privacy this way).
 * Lines draw in once, then the whole burst turns very slowly.
 */
export function Sunburst({ className = "", lines = 96, inner = 150, lit = true }: { className?: string; lines?: number; inner?: number; lit?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden="true">
      <g style={{ transformOrigin: "300px 300px", animation: reduce ? undefined : "billet-spin 240s linear infinite" }}>
        {Array.from({ length: lines }, (_, i) => {
          const a = (i / lines) * Math.PI * 2;
          const r0 = inner + rnd(i) * 26;
          const r1 = r0 + 40 + rnd(i + 99) * 110;
          const gold = i % 8 === 0;
          return (
            <motion.line
              key={i}
              x1={300 + Math.cos(a) * r0}
              y1={300 + Math.sin(a) * r0}
              x2={300 + Math.cos(a) * r1}
              y2={300 + Math.sin(a) * r1}
              stroke={gold && lit ? "var(--zec)" : "var(--ink)"}
              strokeOpacity={gold && lit ? 0.95 : 0.22}
              strokeWidth={gold ? 1.6 : 1}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.15 + rnd(i + 7) * 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** Tempo's side: wireframe orbits (tempo.xyz draws its network as rings). */
export function Orbits({ className = "", strong = false }: { className?: string; strong?: boolean }) {
  const reduce = useReducedMotion();
  const rings = [
    { rx: 250, ry: 64, rot: -18, dash: "2 7", dur: 90 },
    { rx: 236, ry: 92, rot: 22, dash: "140 14 4 14", dur: 120 },
    { rx: 262, ry: 46, rot: 64, dash: "60 10", dur: 150 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden="true">
      {rings.map((r, i) => (
        <g key={i} style={{ transformOrigin: "300px 300px", transform: `rotate(${r.rot}deg)` }}>
          <ellipse
            cx="300"
            cy="300"
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke="var(--ring)"
            strokeOpacity={strong ? 0.9 : 0.6}
            strokeWidth="1.2"
            strokeDasharray={r.dash}
            style={{ animation: reduce ? undefined : `billet-dash ${r.dur}s linear infinite` }}
          />
        </g>
      ))}
    </svg>
  );
}
