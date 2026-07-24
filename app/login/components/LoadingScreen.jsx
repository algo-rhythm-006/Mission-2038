"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function LoadingScreen({ onComplete }) {
  const root = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });

      tl.from(".who", {
        opacity: 0,
        y: 80,
        duration: 1,
        ease: "power4.out",
      })
        .to(".who", {
          opacity: 0,
          y: -60,
          duration: 0.7,
          delay: 0.6,
        })
        .from(".champions", {
          opacity: 0,
          y: 100,
          scale: 0.8,
          duration: 1.2,
          ease: "power4.out",
        })
        .to(".champions", {
          letterSpacing: "0.35em",
          duration: 0.8,
        })
        .to(root.current, {
          opacity: 0,
          duration: 0.9,
          delay: 0.8,
          pointerEvents: "none",
        });
    }, root);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-black"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,.08),transparent_70%)]" />

      <div className="relative text-center">
        <p className="who text-5xl md:text-7xl xl:text-8xl font-black uppercase tracking-tight text-white">
          SELECT YOUR ROLE
        </p>

        <p className="champions absolute inset-0 flex items-center justify-center text-5xl md:text-7xl xl:text-8xl font-black uppercase tracking-tight text-yellow-400 opacity-0">
          MISSION 2K38.
        </p>
      </div>
    </div>
  );
}
