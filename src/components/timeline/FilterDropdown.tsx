"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { Artist, Period } from "@/lib/types";

interface Props {
  periods: Period[];
  artists: Artist[];
  focusPeriod: string | null;
  onPickPeriod: (slug: string | null) => void;
  onPickArtist: (a: Artist) => void;
}

export default function FilterDropdown({
  periods,
  artists,
  focusPeriod,
  onPickPeriod,
  onPickArtist,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"periods" | "artists">("periods");
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // open/close choreography
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      gsap.fromTo(
        panel,
        { opacity: 0, y: -14, scaleY: 0.92, transformOrigin: "top center" },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.45, ease: "power3.out" }
      );
      animateItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // tab swap choreography
  const swapTab = (next: "periods" | "artists") => {
    if (next === tab) return;
    const list = listRef.current;
    if (!list) return setTab(next);
    gsap.to(list, {
      opacity: 0,
      x: next === "artists" ? -26 : 26,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        setTab(next);
        gsap.fromTo(
          list,
          { opacity: 0, x: next === "artists" ? 26 : -26 },
          { opacity: 1, x: 0, duration: 0.3, ease: "power2.out", onComplete: animateItems }
        );
      },
    });
  };

  const animateItems = () => {
    requestAnimationFrame(() => {
      const items = listRef.current?.querySelectorAll("[data-fitem]");
      if (items?.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.022, ease: "power2.out" }
        );
      }
    });
  };

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visibleArtists = useMemo(
    () =>
      (focusPeriod
        ? artists.filter((a) => a.periodSlug === focusPeriod)
        : artists
      ).slice()
        .sort((a, b) => (a.born ?? 0) - (b.born ?? 0)),
    [artists, focusPeriod]
  );

  const focusName = periods.find((p) => p.slug === focusPeriod)?.name;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-utility flex items-center gap-2 px-4 py-2 text-[11px] tracking-[0.26em] text-[#d9d0b8] transition-colors hover:text-[--gilt-bright] focus:outline-none focus-visible:ring-1 focus-visible:ring-[--gilt]"
        style={{
          border: "1px solid rgba(201,162,39,0.5)",
          background: "rgba(14,13,11,0.55)",
          backdropFilter: "blur(8px)",
        }}
      >
        FILTER{focusName ? ` · ${focusName.toUpperCase()}` : ""}
        <span
          className="inline-block transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+10px)] z-40 w-[340px] overflow-hidden"
          style={{
            background: "linear-gradient(170deg, rgba(24,21,16,0.97), rgba(14,13,11,0.97))",
            border: "1px solid rgba(201,162,39,0.55)",
            boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
            borderRadius: 3,
          }}
        >
          {/* tabs */}
          <div className="flex border-b border-[rgba(201,162,39,0.25)]">
            {(["periods", "artists"] as const).map((t) => (
              <button
                key={t}
                onClick={() => swapTab(t)}
                className="font-utility relative flex-1 py-3 text-[10.5px] tracking-[0.3em] transition-colors focus:outline-none"
                style={{ color: tab === t ? "#e8c95a" : "#9d937d" }}
              >
                {t.toUpperCase()}
                {tab === t && (
                  <span
                    className="absolute inset-x-6 bottom-0 h-[2px]"
                    style={{ background: "linear-gradient(90deg, transparent, #c9a227, transparent)" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
            {tab === "periods" ? (
              <>
                <button
                  data-fitem
                  onClick={() => { onPickPeriod(null); setOpen(false); }}
                  className="font-body block w-full px-3 py-2 text-left text-[14px] italic text-[#9d937d] hover:bg-[rgba(201,162,39,0.08)] hover:text-[#ece5d3]"
                >
                  All periods
                </button>
                {periods.map((p) => (
                  <button
                    key={p.slug}
                    data-fitem
                    onClick={() => { onPickPeriod(p.slug); setOpen(false); }}
                    className="group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[rgba(201,162,39,0.08)]"
                  >
                    <span
                      className="h-[10px] w-[10px] shrink-0 rotate-45"
                      style={{ background: p.color, boxShadow: `0 0 8px ${p.color}88` }}
                    />
                    <span className="font-display flex-1 text-[15px] text-[#d9d0b8] group-hover:text-[#ece5d3]">
                      {p.name}
                    </span>
                    <span className="font-utility text-[9.5px] tracking-[0.18em] text-[#8d8470]">
                      {p.startYear}–{p.endYear}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              visibleArtists.map((a) => (
                <button
                  key={a.slug}
                  data-fitem
                  onClick={() => { onPickArtist(a); setOpen(false); }}
                  className="group flex w-full items-baseline gap-3 px-3 py-2 text-left hover:bg-[rgba(201,162,39,0.08)]"
                >
                  <span className="font-body flex-1 truncate text-[15px] italic text-[#d9d0b8] group-hover:text-[--gilt-bright]">
                    {a.name}
                  </span>
                  <span className="font-utility text-[9.5px] tracking-[0.16em] text-[#8d8470]">
                    {a.born ?? "?"}–{a.died ?? "now"} · {a.movement.toUpperCase()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
