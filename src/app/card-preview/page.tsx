"use client";
import ArtistCard from "@/components/ArtistCard";

export default function CardPreview() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0d0b] p-10"
      style={{ background: "radial-gradient(1200px 700px at 50% 20%, #1d1a14, #0e0d0b 70%)" }}>
      <ArtistCard
        data={{
          name: "Michelangelo Merisi da Caravaggio",
          born: 1571,
          died: 1610,
          nationality: "Italian",
          movement: "Baroque",
          portraitUrl: null,
          bio: "Italian painter active in Rome, Naples, Malta and Sicily, whose violent life ran parallel to a violent style: figures lit by a single raking light against near-total darkness, sacred scenes cast with people from the street.",
          significance: "His chiaroscuro became the grammar of Baroque painting — Rubens, Rembrandt and Velázquez are unthinkable without him.",
          paintingCount: 10,
        }}
        onEnter={() => {}}
        onClose={() => {}}
      />
    </main>
  );
}
