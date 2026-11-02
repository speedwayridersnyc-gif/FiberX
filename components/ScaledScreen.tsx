"use client";
import React, { useEffect, useRef, useState } from "react";
import { ScaleCtx } from "./classic/screenScale";

/** Renders children at a fixed internal resolution and scales them to fit the container width. */
export function ScaledScreen({ w, h, className, children }: { w: number; h: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w || 1));
    ro.observe(el); setScale(el.clientWidth / w || 1);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} className={`scaled-screen ${className ?? ""}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <div className="scaled-inner" style={{ width: w, height: h, transform: `scale(${scale})` }}>
        <ScaleCtx.Provider value={scale}>{children}</ScaleCtx.Provider>
      </div>
    </div>
  );
}
