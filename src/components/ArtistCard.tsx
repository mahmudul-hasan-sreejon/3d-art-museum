"use client";

import React from "react";

export interface ArtistCardData {
  name: string;
  born: number;
  died: number | null;
  nationality: string;
  movement: string;
  portraitUrl: string | null;
  bio: string; // 2–4 lines, from Wikipedia
  significance: string; // one line: why they mattered
  paintingCount?: number;
}

/**
 * A museum wall placard. Bone card stock, gilt hairline, engraved
 * Roman capitals — designed to read like the label beside a painting.
 */
export default function ArtistCard({
  data,
  onEnter,
  onClose,
}: {
  data: ArtistCardData;
  onEnter?: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      className="relative w-[680px] max-w-[92vw]"
      style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))" }}
    >
      {/* card stock */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #f2ecdc 0%, #ece5d3 45%, #e3d9c2 100%)",
          borderRadius: 3,
          border: "1px solid rgba(201,162,39,0.55)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 0 1px rgba(42,39,34,0.06), inset 0 -18px 40px rgba(42,39,34,0.07)",
        }}
      >
        {/* gilt hairline inset frame */}
        <div
          className="pointer-events-none absolute inset-[10px]"
          style={{
            border: "1px solid rgba(201,162,39,0.7)",
            borderRadius: 2,
          }}
        />
        {/* paper grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close artist card"
            className="font-utility absolute right-5 top-4 z-10 text-[11px] tracking-[0.18em] text-[--ink-soft] transition-colors hover:text-[--oxblood] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--gilt]"
          >
            CLOSE ✕
          </button>
        )}

        <div className="relative flex gap-7 p-9 pb-7">
          {/* portrait in a thin gilt frame */}
          <div className="shrink-0">
            <div
              className="relative h-[218px] w-[172px] overflow-hidden"
              style={{
                border: "1px solid rgba(201,162,39,0.85)",
                outline: "4px solid rgba(42,39,34,0.9)",
                outlineOffset: 3,
                boxShadow:
                  "0 10px 24px rgba(42,39,34,0.35), inset 0 0 24px rgba(42,39,34,0.35)",
                background: "#2a2722",
              }}
            >
              {data.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.portraitUrl}
                  alt={`Portrait of ${data.name}`}
                  className="h-full w-full object-cover"
                  style={{ filter: "sepia(0.12) contrast(1.04)" }}
                />
              ) : (
                <PortraitPlaceholder />
              )}
              {/* glass glare */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 28%)",
                }}
              />
            </div>
            <p className="font-utility mt-3 text-center text-[10px] tracking-[0.22em] text-[--ink-soft]">
              {data.nationality.toUpperCase()}
            </p>
          </div>

          {/* placard text */}
          <div className="min-w-0 flex-1 pt-1 text-[--graphite]">
            <p className="font-utility text-[11px] font-medium tracking-[0.3em] text-[#8a6d1c]">
              {data.movement.toUpperCase()}
            </p>
            <h2
              className="font-display mt-2 text-[34px] leading-[1.05] tracking-[0.02em]"
              style={{ color: "#221f1a", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}
            >
              {data.name}
            </h2>
            <p className="font-body mt-1 text-[17px] italic text-[--ink-soft]">
              {data.born}&thinsp;–&thinsp;{data.died ?? "present"}
            </p>

            <div
              className="my-4 h-px w-24"
              style={{ background: "linear-gradient(90deg, #c9a227, rgba(201,162,39,0))" }}
            />

            <p className="font-body text-[16px] leading-[1.55] text-[#3a352c]">
              {data.bio}
            </p>
            <p className="font-body mt-3 text-[15.5px] leading-[1.5] italic text-[#5a4a22]">
              {data.significance}
            </p>
          </div>
        </div>

        {/* footer rail */}
        <div
          className="relative flex items-center justify-between px-9 py-4"
          style={{
            borderTop: "1px solid rgba(42,39,34,0.14)",
            background: "rgba(42,39,34,0.035)",
          }}
        >
          <p className="font-utility text-[10.5px] tracking-[0.24em] text-[--ink-soft]">
            {data.paintingCount
              ? `${data.paintingCount} WORKS ON VIEW`
              : "PERMANENT COLLECTION"}
          </p>
          <button
            onClick={onEnter}
            className="font-utility group relative px-6 py-2.5 text-[12px] font-medium tracking-[0.26em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[--gilt]"
            style={{
              color: "#ece5d3",
              background: "linear-gradient(170deg, #2f2b24, #1a1814)",
              border: "1px solid rgba(201,162,39,0.8)",
              boxShadow: "0 6px 16px rgba(42,39,34,0.35)",
            }}
          >
            <span className="transition-colors group-hover:text-[--gilt-bright]">
              ENTER GALLERY →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PortraitPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#2a2722]">
      <svg viewBox="0 0 100 130" className="h-3/4 w-3/4 opacity-30">
        <circle cx="50" cy="42" r="22" fill="#c9a227" />
        <path d="M14 130 C14 92 86 92 86 130 Z" fill="#c9a227" />
      </svg>
    </div>
  );
}
