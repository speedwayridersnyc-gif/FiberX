"use client";
import React from "react";
import { emitKey } from "@/lib/keybus";

function PadButton({ k, label, className, aria }: { k: string; label: React.ReactNode; className?: string; aria: string }) {
  const down = (e: React.PointerEvent) => { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} emitKey({ key: k, kind: "down", source: "virtual" }); };
  const up = () => emitKey({ key: k, kind: "up", source: "virtual" });
  return <button className={`pad-btn ${className ?? ""}`} aria-label={aria} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>{label}</button>;
}

export type PadGame = "palace" | "jungle" | "snake" | "bricks" | "siege" | "paddle";
/** On-screen game controls; emits the same key events as a physical keyboard. The action buttons follow the game:
 *  palace = Walk / Jump / Sword · jungle = Jump (also lets go of a vine) · bricks = Launch · siege = Fire · snake = d-pad only. */
export function TouchPad({ extra = true, game = "palace" }: { extra?: boolean; game?: PadGame }) {
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
          {game === "palace" && <PadButton k="Shift" label="Walk" className="walk" aria="Careful walk (hold)" />}
          {(game === "palace" || game === "jungle") && <PadButton k="ArrowUp" label="Jump" className="jump" aria="Jump / let go of a vine" />}
          {game === "palace" && <PadButton k=" " label="⚔" className="strike" aria="Sword strike" />}
          {game === "bricks" && <PadButton k=" " label="Launch" className="jump" aria="Launch the ball" />}
          {game === "siege" && <PadButton k=" " label="Fire" className="jump fire" aria="Fire" />}
        </div>
      )}
    </div>
  );
}
