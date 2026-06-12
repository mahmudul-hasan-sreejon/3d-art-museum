"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Timeline, { Mode } from "@/components/timeline/Timeline";
import FilterDropdown from "@/components/timeline/FilterDropdown";
import ArtistCard from "@/components/ArtistCard";
import DoorsTransition from "@/components/DoorsTransition";
import type { Artist, TimelinePayload } from "@/lib/types";

const MODES: { id: Mode; label: string }[] = [
  { id: "strata", label: "STRATA" },
  { id: "constellation", label: "CONSTELLATION" },
  { id: "corridor", label: "CORRIDOR" },
];

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<TimelinePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("strata");
  const [focusPeriod, setFocusPeriod] = useState<string | null>(null);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [entering, setEntering] = useState<Artist | null>(null);
  const [camCmd, setCamCmd] = useState<{ periodSlug?: string; artistSlug?: string; n: number } | null>(null);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  const pickPeriod = useCallback((slug: string | null) => {
    setFocusPeriod(slug);
    if (slug) setCamCmd((c) => ({ periodSlug: slug, n: (c?.n ?? 0) + 1 }));
  }, []);

  const pickArtist = useCallback((a: Artist) => {
    setCamCmd((c) => ({ artistSlug: a.slug, n: (c?.n ?? 0) + 1 }));
    setTimeout(() => setSelected(a), 650);
  }, []);

  useEffect(() => {
    if (entering) router.prefetch(`/museum/${entering.slug}`);
  }, [entering, router]);

  return (
    <main className="fixed inset-0 flex flex-col">
      {/* header */}
      <header className="z-30 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-display text-[22px] tracking-[0.34em] text-[#ece5d3]"
            style={{ textShadow: "0 0 24px rgba(201,162,39,0.35)" }}>
            MUSEA
          </h1>
          <p className="font-utility mt-0.5 text-[9px] tracking-[0.3em] text-[#9d937d]">
            A WALKABLE HISTORY OF ART · SOURCES: WIKIPEDIA & WIKIMEDIA COMMONS
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* mode switcher */}
          <div className="flex overflow-hidden"
            style={{ border: "1px solid rgba(201,162,39,0.5)", background: "rgba(14,13,11,0.55)", backdropFilter: "blur(8px)" }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="font-utility px-3.5 py-2 text-[10px] tracking-[0.22em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[--gilt]"
                style={{
                  color: mode === m.id ? "#0e0d0b" : "#9d937d",
                  background: mode === m.id ? "linear-gradient(180deg,#e8c95a,#c9a227)" : "transparent",
                }}
                aria-pressed={mode === m.id}
              >
                {m.label}
              </button>
            ))}
          </div>
          {data && (
            <FilterDropdown
              periods={data.periods}
              artists={data.artists}
              focusPeriod={focusPeriod}
              onPickPeriod={pickPeriod}
              onPickArtist={pickArtist}
            />
          )}
        </div>
      </header>

      {/* stage */}
      <div className="relative min-h-0 flex-1">
        {!data && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display animate-pulse text-[15px] tracking-[0.3em] text-[#9d937d]">
              HANGING THE COLLECTION…
            </p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="font-body text-[16px] text-[#b03a3a]">
              The collection could not be loaded: {error}
            </p>
          </div>
        )}
        {data && (
          <Timeline
            data={data}
            mode={mode}
            focusPeriod={focusPeriod}
            onSelectArtist={setSelected}
            cameraCommand={camCmd}
          />
        )}
        {/* hint */}
        <p className="font-utility pointer-events-none absolute bottom-16 left-6 text-[9.5px] tracking-[0.28em] text-[#8d8470]">
          SCROLL TO ZOOM · DRAG TO PAN · ZOOM INTO A PERIOD TO MEET ITS ARTISTS
        </p>
      </div>

      {/* artist card overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(8,7,5,0.62)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelected(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="animate-cardIn">
            <ArtistCard
              data={{
                name: selected.name,
                born: selected.born ?? 0,
                died: selected.died,
                nationality: selected.nationality || selected.movement,
                movement: selected.movement,
                portraitUrl: selected.portraitUrl,
                bio: selected.bio,
                significance: selected.significance,
                paintingCount: selected.paintingCount,
              }}
              onClose={() => setSelected(null)}
              onEnter={() => setEntering(selected)}
            />
          </div>
        </div>
      )}

      {entering && (
        <DoorsTransition
          artistName={entering.name}
          onDone={() => router.push(`/museum/${entering.slug}`)}
        />
      )}

      <style jsx global>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(26px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }
        .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </main>
  );
}
