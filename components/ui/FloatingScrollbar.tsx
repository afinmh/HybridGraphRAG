"use client";

import { useEffect, useState } from "react";

export function FloatingScrollbar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const value = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(value);
      setVisible(scrollTop > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const barHeight = 80; // px, tinggi thumb

  const translateY = `calc(${progress * 100}% - ${barHeight / 2}px)`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed right-6 top-24 bottom-6 z-40 flex items-start justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative h-full flex items-stretch">
        {/* Track */}
        <div className="w-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner" />
        {/* Thumb */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/40 transition-transform duration-150"
          style={{ height: barHeight, transform: `translate(-50%, ${translateY})` }}
        />
      </div>
    </div>
  );
}
