"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Artist, Painting } from "@/lib/types";

const Gallery = dynamic(() => import("@/components/gallery/Gallery"), {
  ssr: false,
  loading: () => <Veil text="LIGHTING THE GALLERY…" />,
});

interface Payload {
  artist: Artist;
  paintings: Painting[];
}

export default function MuseumPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const lite = search.get("lite") === "1";
  const still = search.get("still") === "1";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [veil, setVeil] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/artist/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [params.slug]);

  // entry fade — we arrive from the doors transition on black
  useEffect(() => {
    if (data) {
      const t = setTimeout(() => setVeil(false), 450);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (error) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-[#0e0d0b] px-8 text-center">
        <p className="font-display text-[18px] tracking-[0.18em] text-[#ece5d3]">
          THIS GALLERY COULD NOT BE OPENED
        </p>
        <p className="font-body max-w-md text-[15px] text-[#9d937d]">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="font-utility mt-2 px-5 py-2.5 text-[11px] tracking-[0.26em] text-[#d9d0b8] hover:text-[--gilt-bright]"
          style={{ border: "1px solid rgba(201,162,39,0.5)" }}
        >
          ← BACK TO THE TIMELINE
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black">
      {data && (
        <Gallery
          artist={data.artist}
          paintings={data.paintings}
          onExit={() => router.push("/")}
          lite={lite}
          still={still}
        />
      )}
      {/* black veil that lifts on arrival */}
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-black transition-opacity duration-[1200ms]"
        style={{ opacity: veil ? 1 : 0 }}
      />
      {!data && <Veil text="UNPACKING THE CRATES…" />}
    </main>
  );
}

function Veil({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black">
      <p className="font-display animate-pulse text-[14px] tracking-[0.4em] text-[#9d937d]">
        {text}
      </p>
    </div>
  );
}
