"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Two dark gilded doors slide shut over the timeline, the camera "pushes"
 * through as they part again onto black — then we navigate.
 */
export default function DoorsTransition({
  artistName,
  onDone,
}: {
  artistName: string;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);

  // keep the latest onDone without restarting the animation on parent re-renders
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const tl = gsap.timeline({ onComplete: () => onDoneRef.current() });
    tl.set(rootRef.current, { opacity: 1 })
      // doors sweep shut
      .fromTo(leftRef.current, { xPercent: -104 }, { xPercent: 0, duration: 0.65, ease: "power3.inOut" })
      .fromTo(rightRef.current, { xPercent: 104 }, { xPercent: 0, duration: 0.65, ease: "power3.inOut" }, "<")
      // name plate glows on the closed doors
      .fromTo(plateRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" })
      .to(plateRef.current, { opacity: 0, duration: 0.35, ease: "power2.in" }, "+=0.55")
      // doors part open onto darkness while we dolly forward
      .to(leftRef.current, { xPercent: -106, duration: 0.9, ease: "power3.inOut" })
      .to(rightRef.current, { xPercent: 106, duration: 0.9, ease: "power3.inOut" }, "<")
      .to(rootRef.current, { scale: 1.12, duration: 0.9, ease: "power2.in" }, "<");
    return () => {
      tl.kill();
    };
    // run once per mount; onDone is read live via onDoneRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doorFace: React.CSSProperties = {
    background:
      "linear-gradient(90deg, #171310, #221b13 30%, #171310 50%, #221b13 70%, #171310), repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 90px)",
    boxShadow: "inset 0 0 90px rgba(0,0,0,0.8)",
  };
  const panel: React.CSSProperties = {
    border: "1px solid rgba(201,162,39,0.5)",
    boxShadow: "inset 0 0 0 5px #0c0a07, inset 0 0 0 6px rgba(201,162,39,0.35), inset 0 0 40px rgba(0,0,0,0.7)",
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-[80] bg-black opacity-0">
      <div ref={leftRef} className="absolute inset-y-0 left-0 w-1/2" style={doorFace}>
        <div className="absolute inset-[5%] grid grid-rows-2 gap-[6%]">
          <div style={panel} /><div style={panel} />
        </div>
        <div className="absolute right-3 top-1/2 h-16 w-[5px] -translate-y-1/2 rounded-full"
          style={{ background: "linear-gradient(180deg,#e8c95a,#8a6d1c)" }} />
      </div>
      <div ref={rightRef} className="absolute inset-y-0 right-0 w-1/2" style={doorFace}>
        <div className="absolute inset-[5%] grid grid-rows-2 gap-[6%]">
          <div style={panel} /><div style={panel} />
        </div>
        <div className="absolute left-3 top-1/2 h-16 w-[5px] -translate-y-1/2 rounded-full"
          style={{ background: "linear-gradient(180deg,#e8c95a,#8a6d1c)" }} />
      </div>
      <div ref={plateRef} className="absolute inset-0 flex items-center justify-center opacity-0">
        <div className="px-10 py-5 text-center"
          style={{
            background: "linear-gradient(170deg, #ece5d3, #ddd3bb)",
            border: "1px solid rgba(201,162,39,0.9)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}>
          <p className="font-utility text-[10px] tracking-[0.4em] text-[#8a6d1c]">THE GALLERY OF</p>
          <p className="font-display mt-1 text-[26px] text-[#221f1a]">{artistName}</p>
        </div>
      </div>
    </div>
  );
}
