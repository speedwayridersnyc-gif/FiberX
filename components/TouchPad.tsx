"use client";
import React from "react";
import { emitKey } from "@/lib/keybus";

function PadButton({ k, label, className, aria }: { k: string; label: React.ReactNode; className?: string; aria: string }) {
  const down = (e: React.PointerEvent) => { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} emitKey({ key: k, kind: "down", source: "virtual" }); };
  const up = () => emitKey({ key: k, kind: "up", source: "virtual" });
  return <button className={`pad-btn ${className ?? ""}`} aria-label={aria} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>{label}</button>;
}

/** On-screen game controls; emits the same key events as a physical keyboard. */
export function TouchPad({ extra = true }: { extra?: boolean }) {
  return (
    <div className="touchpad" role="group" aria-label="Game controls">
      <div className="dpad">
        <PadButton k="ArrowUp" label="▲" className="up" aria="Up / jump / climb / parry" />
        <PadButton k="ArrowLeft" label="◀" className="left" aria="Left" />
        <PadButton k="ArrowRight" label="▶" className="right" aria="Right" />
        <PadButton k="ArrowDown" label="▼" className="down" aria="Down / hang / drop" />
      </div>
      {extra && (
        <div className="pad-actions">
          <PadButton k="Shift" label="Walk" className="walk" aria="Careful walk (hold)" />
          <PadButton k="ArrowUp" label="Jump" className="jump" aria="Jump" />
          <PadButton k=" " label="⚔" className="strike" aria="Sword strike" />
        </div>
      )}
    </div>
  );
}
