import type { Artist, Period } from "@/lib/types";

export const YEAR_MIN = 1080;
export const YEAR_MAX = 2040;

/**
 * Piecewise time warp: art history accelerates, so later centuries get
 * more pixels per year. Chronology stays truthful — the axis labels real
 * years — but Impressionism is no longer a sliver next to the Gothic.
 */
const SEGMENTS: { from: number; to: number; px: number }[] = [
  { from: 1080, to: 1500, px: 1.5 },
  { from: 1500, to: 1700, px: 2.6 },
  { from: 1700, to: 1850, px: 4.4 },
  { from: 1850, to: 1960, px: 9.0 },
  { from: 1960, to: 2040, px: 6.5 },
];

export function worldX(year: number): number {
  let x = 0;
  for (const s of SEGMENTS) {
    if (year <= s.from) break;
    const span = Math.min(year, s.to) - s.from;
    x += span * s.px;
  }
  return x;
}

export const WORLD_W = worldX(YEAR_MAX);

export interface Camera {
  x: number; // world px at left edge
  zoom: number;
}

export const screenX = (cam: Camera, wx: number) => (wx - cam.x) * cam.zoom;
export const toWorld = (cam: Camera, sx: number) => sx / cam.zoom + cam.x;

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 6.5;
export const ARTIST_REVEAL_ZOOM = 1.35;

/** Greedy lane packing so overlapping periods stack instead of colliding. */
export function packLanes(periods: Period[]): Map<string, number> {
  const lanes: number[] = []; // lane -> current end year
  const out = new Map<string, number>();
  const sorted = [...periods].sort(
    (a, b) => a.startYear - b.startYear || a.sort - b.sort
  );
  for (const p of sorted) {
    let lane = lanes.findIndex((end) => end <= p.startYear + 4);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = p.endYear;
    out.set(p.slug, lane);
  }
  return out;
}

export const careerMid = (a: Artist) => {
  const b = a.born ?? 1500;
  const d = a.died ?? Math.min(b + 60, 2026);
  return (b + d) / 2;
};

/** Deterministic pseudo-random in [0,1) from a string. */
export function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Warp-aware tick years: walk the era in 5-year steps and keep a tick
 * whenever it is at least `minGap` screen px from the previous one.
 */
export function tickYears(cam: Camera, viewW: number, minGap = 76): number[] {
  const out: number[] = [];
  let lastX = -Infinity;
  for (let y = YEAR_MIN + 20; y <= YEAR_MAX - 14; y += 5) {
    if (y % 10 !== 0) continue;
    const sx = screenX(cam, worldX(y));
    if (sx < -40 || sx > viewW + 40) continue;
    if (sx - lastX >= minGap) {
      // prefer rounder years when possible
      const isRound = y % 100 === 0 ? 2 : y % 50 === 0 ? 1 : 0;
      if (sx - lastX < minGap * 1.5 && isRound === 0 && out.length > 0) {
        // skip non-round years that barely fit; rounder ones will come
        if ((y + 10) % 50 === 0) continue;
      }
      out.push(y);
      lastX = sx;
    }
  }
  return out;
}
