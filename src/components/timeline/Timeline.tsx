"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import type { Artist, Period, TimelinePayload } from "@/lib/types";
import {
  ARTIST_REVEAL_ZOOM,
  Camera,
  WORLD_W,
  ZOOM_MAX,
  ZOOM_MIN,
  careerMid,
  hash01,
  packLanes,
  screenX,
  tickYears,
  toWorld,
  worldX,
} from "./math";

export type Mode = "strata" | "constellation" | "corridor";

interface Props {
  data: TimelinePayload;
  mode: Mode;
  focusPeriod: string | null;
  onSelectArtist: (a: Artist) => void;
  cameraCommand: { periodSlug?: string; artistSlug?: string; n: number } | null;
}

export default function Timeline({
  data,
  mode,
  focusPeriod,
  onSelectArtist,
  cameraCommand,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [cam, setCam] = useState<Camera>({ x: 0, zoom: 0.4 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const drag = useRef<{ on: boolean; sx: number; cx: number }>({
    on: false,
    sx: 0,
    cx: 0,
  });

  // ---- viewport sizing & initial fit ----
  useEffect(() => {
    const el = wrapRef.current!;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      const zoom = Math.max(ZOOM_MIN, (r.width - 80) / WORLD_W);
      setCam({ x: -40 / zoom, zoom });
    };
    fit();
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- wheel zoom toward cursor ----
  useEffect(() => {
    const el = wrapRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = camRef.current;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const anchor = toWorld(c, sx);
      const factor = Math.exp(-e.deltaY * 0.0016);
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom * factor));
      setCam({ zoom, x: anchor - sx / zoom });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---- drag pan ----
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { on: true, sx: e.clientX, cx: camRef.current.x };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.sx;
    setCam((c) => ({ ...c, x: drag.current.cx - dx / c.zoom }));
  };
  const onPointerUp = () => (drag.current.on = false);

  // ---- programmatic camera flights (filters, double-click) ----
  const flyTo = useCallback(
    (x: number, zoom: number) => {
      const proxy = { x: camRef.current.x, zoom: camRef.current.zoom };
      gsap.to(proxy, {
        x,
        zoom,
        duration: 1.15,
        ease: "power3.inOut",
        onUpdate: () => setCam({ x: proxy.x, zoom: proxy.zoom }),
      });
    },
    [setCam]
  );

  const flyToPeriod = useCallback(
    (p: Period) => {
      const x0 = worldX(p.startYear);
      const x1 = worldX(p.endYear);
      const zoom = Math.min(6, (size.w * 0.84) / (x1 - x0));
      flyTo(x0 - (size.w / zoom - (x1 - x0)) / 2, zoom);
    },
    [flyTo, size.w]
  );

  useEffect(() => {
    if (!cameraCommand) return;
    if (cameraCommand.periodSlug) {
      const p = data.periods.find((q) => q.slug === cameraCommand.periodSlug);
      if (p) flyToPeriod(p);
    } else if (cameraCommand.artistSlug) {
      const a = data.artists.find((q) => q.slug === cameraCommand.artistSlug);
      if (a) {
        const wx = worldX(careerMid(a));
        const zoom = 5.5;
        flyTo(wx - size.w / 2 / zoom, zoom);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraCommand?.n]);

  // ---- layout ----
  const lanes = useMemo(() => packLanes(data.periods), [data.periods]);
  const laneCount = useMemo(
    () => Math.max(...Array.from(lanes.values())) + 1,
    [lanes]
  );

  const artistsByPeriod = useMemo(() => {
    const m = new Map<string, Artist[]>();
    for (const a of data.artists) {
      const list = m.get(a.periodSlug) ?? [];
      list.push(a);
      m.set(a.periodSlug, list);
    }
    for (const list of Array.from(m.values()))
      list.sort((a, b) => careerMid(a) - careerMid(b));
    return m;
  }, [data.artists]);

  const artistAlpha = Math.min(
    1,
    Math.max(0, (cam.zoom - ARTIST_REVEAL_ZOOM) / 0.9)
  );

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full touch-none select-none overflow-hidden ${
        mode === "strata" ? "tl-strata" : mode === "constellation" ? "tl-constellation" : "tl-corridor"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      role="application"
      aria-label="Zoomable timeline of art history. Scroll to zoom, drag to pan."
    >
      <Backdrop mode={mode} />
      {mode === "strata" && (
        <Strata
          {...{ data, cam, size, lanes, laneCount, artistsByPeriod, artistAlpha, focusPeriod }}
          onPeriod={flyToPeriod}
          onArtist={onSelectArtist}
        />
      )}
      {mode === "constellation" && (
        <Constellation
          {...{ data, cam, size, artistsByPeriod, artistAlpha, focusPeriod }}
          onPeriod={flyToPeriod}
          onArtist={onSelectArtist}
        />
      )}
      {mode === "corridor" && (
        <Corridor
          {...{ data, cam, size, artistsByPeriod, artistAlpha, focusPeriod }}
          onPeriod={flyToPeriod}
          onArtist={onSelectArtist}
        />
      )}
      <YearAxis cam={cam} size={size} mode={mode} />
    </div>
  );
}

/* ============================== backdrop ============================== */

function Backdrop({ mode }: { mode: Mode }) {
  if (mode === "strata") {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1400px 900px at 50% -10%, #f5efdf, #e9e1cb 60%, #ddd2b6)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>
    );
  }
  if (mode === "constellation") {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 30%, #17151f, #0c0b10 70%)",
        }}
      >
        <Stars />
      </div>
    );
  }
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(#121017, #0e0d0b 35%, #0e0d0b 70%, #181410)",
      }}
    >
      {/* corridor floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-[34%]"
        style={{
          background:
            "linear-gradient(rgba(201,162,39,0.10), rgba(20,16,10,0.0) 4%), repeating-linear-gradient(90deg, #1c1812 0 90px, #221c14 90px 180px)",
          maskImage: "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.25))",
          WebkitMaskImage: "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.25))",
        }}
      />
    </div>
  );
}

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 130 }, (_, i) => ({
        left: hash01("s" + i) * 100,
        top: hash01("t" + i) * 100,
        s: 1 + hash01("z" + i) * 1.6,
        o: 0.12 + hash01("o" + i) * 0.4,
      })),
    []
  );
  return (
    <div className="absolute inset-0">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#ece5d3]"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.s,
            height: s.s,
            opacity: s.o,
          }}
        />
      ))}
    </div>
  );
}

/* =============================== STRATA =============================== */

function Strata(props: ModeProps & { lanes: Map<string, number>; laneCount: number }) {
  const { data, cam, size, lanes, laneCount, artistsByPeriod, artistAlpha, focusPeriod, onPeriod, onArtist } = props;
  const bottom = 74;
  const laneH = Math.min(170, (size.h - 40 - bottom) / laneCount);
  const top = Math.max(28, (size.h - bottom - laneCount * laneH) / 2);

  return (
    <div className="absolute inset-0">
      {data.periods.map((p) => {
        const x0 = screenX(cam, worldX(p.startYear));
        const x1 = screenX(cam, worldX(p.endYear));
        if (x1 < -300 || x0 > size.w + 300) return null;
        const lane = lanes.get(p.slug) ?? 0;
        const y = top + lane * laneH;
        const dim = focusPeriod && focusPeriod !== p.slug;
        const artists = artistsByPeriod.get(p.slug) ?? [];
        const wide = x1 - x0;
        return (
          <div
            key={p.slug}
            className="absolute cursor-pointer transition-opacity duration-500"
            style={{
              left: x0,
              top: y,
              width: wide,
              height: laneH - 14,
              opacity: dim ? 0.18 : 1,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onPeriod(p);
            }}
          >
            <div
              className="absolute inset-0 rounded-[4px]"
              style={{
                background: `linear-gradient(180deg, ${p.color}48, ${p.color}1f)`,
                border: `1px solid ${p.color}88`,
                borderLeft: `3px solid ${p.color}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35)`,
              }}
            />
            {wide > 70 && (
              <div
                className="absolute top-2 overflow-hidden"
                style={{
                  // sticky: label follows the viewport while its band is on screen
                  left: Math.min(Math.max(12, -x0 + 14), Math.max(12, wide - 150)),
                  right: 10,
                }}
              >
                <p
                  className="font-display truncate text-[15px] tracking-[0.04em]"
                  style={{ color: "#2a2520" }}
                >
                  {p.name}
                </p>
                <p className="font-utility text-[10px] tracking-[0.2em] text-[#6c6353]">
                  {p.startYear}–{p.endYear}
                </p>
              </div>
            )}
            {/* artists */}
            <div
              className="absolute inset-x-2 bottom-1 top-[44px]"
              style={{ opacity: artistAlpha, pointerEvents: artistAlpha > 0.4 ? "auto" : "none" }}
            >
              {artists.map((a, i) => {
                const ax = screenX(cam, worldX(careerMid(a))) - x0;
                const rows = Math.max(1, Math.floor((laneH - 60) / 26));
                const row = i % rows;
                return (
                  <button
                    key={a.slug}
                    onClick={(e) => {
                      e.stopPropagation();
                      onArtist(a);
                    }}
                    className="group absolute flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-[--gilt]"
                    style={{ left: ax - 8, top: row * 26 }}
                    title={`${a.name} (${a.born ?? "?"}–${a.died ?? ""})`}
                  >
                    <span
                      className="block h-[9px] w-[9px] rounded-full transition-transform group-hover:scale-150"
                      style={{
                        background: p.color,
                        boxShadow: `0 0 0 2px #f0e9d8, 0 0 0 3px ${p.color}88`,
                      }}
                    />
                    <span className="font-body text-[13px] italic text-[#3c352b] transition-colors group-hover:text-[#8a6d1c]">
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ CONSTELLATION ============================ */

function Constellation(props: ModeProps) {
  const { data, cam, size, artistsByPeriod, artistAlpha, focusPeriod, onPeriod, onArtist } = props;
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 h-full w-full">
        {data.periods.map((p) => {
          const artists = artistsByPeriod.get(p.slug) ?? [];
          if (artists.length < 2 || artistAlpha < 0.1) return null;
          const pts = artists.map((a) => constellationPos(cam, size, p, a));
          const d = pts
            .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`)
            .join(" ");
          const dim = focusPeriod && focusPeriod !== p.slug;
          return (
            <path
              key={p.slug}
              d={d}
              fill="none"
              stroke={p.color}
              strokeOpacity={dim ? 0.05 : 0.34 * artistAlpha}
              strokeWidth={1}
            />
          );
        })}
      </svg>
      {data.periods.map((p) => {
        const cx = screenX(cam, worldX((p.startYear + p.endYear) / 2));
        if (cx < -500 || cx > size.w + 500) return null;
        const cy = clusterY(size, p);
        const rx = ((worldX(p.endYear) - worldX(p.startYear)) / 2) * cam.zoom;
        const dim = focusPeriod && focusPeriod !== p.slug;
        const artists = artistsByPeriod.get(p.slug) ?? [];
        return (
          <div key={p.slug} className="transition-opacity duration-500" style={{ opacity: dim ? 0.12 : 1 }}>
            {/* nebula */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: cx,
                top: cy,
                width: Math.max(140, rx * 1.7),
                height: Math.max(100, rx * 0.85),
                background: `radial-gradient(ellipse at center, ${p.color}44, ${p.color}1c 45%, transparent 72%)`,
                filter: "blur(2px)",
              }}
            />
            <button
              className="absolute -translate-x-1/2 cursor-pointer text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-[--gilt]"
              style={{ left: cx, top: cy - 14 }}
              onDoubleClick={() => onPeriod(p)}
              onClick={() => artistAlpha < 0.3 && onPeriod(p)}
            >
              <span
                className="font-display block text-[17px] tracking-[0.12em]"
                style={{ color: "#ece5d3", textShadow: `0 0 18px ${p.color}` }}
              >
                {p.name.toUpperCase()}
              </span>
              <span className="font-utility text-[10px] tracking-[0.3em] text-[#9d937d]">
                {p.startYear} – {p.endYear}
              </span>
            </button>
            {/* artist stars */}
            <div style={{ opacity: artistAlpha, pointerEvents: artistAlpha > 0.4 ? "auto" : "none" }}>
              {artists.map((a) => {
                const pt = constellationPos(cam, size, p, a);
                return (
                  <button
                    key={a.slug}
                    onClick={() => onArtist(a)}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ left: pt.x, top: pt.y }}
                    title={a.name}
                  >
                    <span
                      className="block h-[7px] w-[7px] rotate-45 transition-transform group-hover:scale-[1.7]"
                      style={{
                        background: "#e8c95a",
                        boxShadow: `0 0 10px 2px ${p.color}aa, 0 0 4px 1px #e8c95a`,
                      }}
                    />
                    <span className="font-body absolute left-3 top-[-7px] whitespace-nowrap text-[13px] italic text-[#cfc6ad] opacity-80 transition-opacity group-hover:opacity-100 group-hover:text-[--gilt-bright]">
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function clusterY(size: { h: number }, p: { slug: string; sort: number }) {
  const row = p.sort % 4; // 4 staggered rows, deterministic and collision-free
  return size.h * (0.2 + row * 0.155 + hash01(p.slug) * 0.05);
}

function constellationPos(
  cam: Camera,
  size: { w: number; h: number },
  p: Period,
  a: Artist
) {
  const x = screenX(cam, worldX(careerMid(a)));
  const cy = clusterY(size, p);
  const y = cy + (hash01(a.slug) - 0.5) * Math.min(260, size.h * 0.3) + 26;
  return { x, y };
}

/* =============================== CORRIDOR =============================== */

function Corridor(props: ModeProps) {
  const { data, cam, size, artistsByPeriod, artistAlpha, focusPeriod, onPeriod, onArtist } = props;
  return (
    <div
      className="absolute inset-0"
      style={{ perspective: 1100, perspectiveOrigin: "50% 46%" }}
    >
      {data.periods.map((p) => {
        const x0 = screenX(cam, worldX(p.startYear));
        const x1 = screenX(cam, worldX(p.endYear));
        const cx = (x0 + x1) / 2;
        if (x1 < -600 || x0 > size.w + 600) return null;
        const rawW = x1 - x0 - 26;
        const coverage = Math.min(1, rawW / (size.w * 0.86));
        const w = Math.max(180, Math.min(rawW, size.w * 0.86));
        const centerOffset = (cx - size.w / 2) / size.w; // -0.5..0.5-ish
        const flat = 1 - coverage * 0.92;
        const rot = Math.max(-38, Math.min(38, -centerOffset * 52)) * flat;
        const z = -Math.abs(centerOffset) * 330 * flat;
        const dim = focusPeriod && focusPeriod !== p.slug;
        const artists = artistsByPeriod.get(p.slug) ?? [];
        return (
          <div
            key={p.slug}
            className="absolute cursor-pointer transition-opacity duration-500"
            style={{
              left: cx,
              top: `${12 + (p.sort % 2) * 5}%`,
              width: w,
              height: "56%",
              opacity: dim ? 0.13 : 1,
              transform: `translateX(-50%) translateZ(${z}px) rotateY(${rot}deg)`,
              transformStyle: "preserve-3d",
              zIndex: 10 + (p.sort % 2),
            }}
            onDoubleClick={() => onPeriod(p)}
            onClick={() => artistAlpha < 0.3 && onPeriod(p)}
          >
            {/* gilded room frame */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[3px]"
              style={{
                background: `linear-gradient(180deg, #181510, #100e0a 55%, #141009)`,
                border: "1px solid rgba(201,162,39,0.55)",
                boxShadow: `inset 0 0 0 6px #0c0a07, inset 0 0 0 7px rgba(201,162,39,0.4), inset 0 -50px 80px rgba(0,0,0,0.6), 0 24px 60px rgba(0,0,0,0.6)`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1/2"
                style={{
                  background: `radial-gradient(60% 90% at 50% 0%, ${p.color}33, transparent 70%)`,
                }}
              />
              <div className="absolute inset-x-1 top-[7%] text-center">
                <p
                  className="font-display px-1 leading-snug"
                  style={{
                    color: "#ece5d3",
                    fontSize: w > 380 ? 19 : w > 240 ? 15 : 12.5,
                    letterSpacing: w > 240 ? "0.14em" : "0.07em",
                  }}
                >
                  {p.name.toUpperCase()}
                </p>
                {w > 200 && (
                <p className="font-utility mt-1 text-[10px] tracking-[0.32em] text-[#9d937d]">
                  {p.startYear} – {p.endYear}
                </p>
                )}
                <div
                  className="mx-auto mt-3 h-px w-16"
                  style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }}
                />
              </div>
              {/* artist name plates hung like paintings */}
              <div
                className="absolute inset-x-[9%] top-[30%] bottom-[10%] content-start gap-2 overflow-hidden"
                style={{ opacity: Math.max(artistAlpha, 0.001), display: "grid", gridTemplateColumns: "1fr 1fr", pointerEvents: artistAlpha > 0.4 ? "auto" : "none" }}
              >
                {artists.map((a) => (
                  <button
                    key={a.slug}
                    onClick={(e) => {
                      e.stopPropagation();
                      onArtist(a);
                    }}
                    className="group truncate rounded-[2px] px-2 py-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[--gilt]"
                    style={{
                      background: "rgba(236,229,211,0.06)",
                      border: "1px solid rgba(201,162,39,0.35)",
                    }}
                  >
                    <span className="font-body block truncate text-[13px] italic text-[#d9d0b8] group-hover:text-[--gilt-bright]">
                      {a.name}
                    </span>
                    <span className="font-utility text-[9px] tracking-[0.18em] text-[#8d8470]">
                      {a.born ?? "?"}–{a.died ?? "now"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =============================== axis =============================== */

function YearAxis({ cam, size, mode }: { cam: Camera; size: { w: number; h: number }; mode: Mode }) {
  const years = tickYears(cam, size.w);
  const light = mode === "strata";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: light ? "rgba(42,39,34,0.35)" : "rgba(201,162,39,0.4)" }}
      />
      {years.map((year) => {
        const sx = screenX(cam, worldX(year));
        return (
          <div key={year} className="absolute top-0" style={{ left: sx }}>
            <div
              className="h-2 w-px"
              style={{ background: light ? "rgba(42,39,34,0.5)" : "rgba(201,162,39,0.55)" }}
            />
            <p
              className="font-utility mt-1 -translate-x-1/2 text-[10px] tracking-[0.18em]"
              style={{ color: light ? "#6c6353" : "#9d937d" }}
            >
              {year}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface ModeProps {
  data: TimelinePayload;
  cam: Camera;
  size: { w: number; h: number };
  artistsByPeriod: Map<string, Artist[]>;
  artistAlpha: number;
  focusPeriod: string | null;
  onPeriod: (p: Period) => void;
  onArtist: (a: Artist) => void;
}
