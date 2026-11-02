"use client";
import React, { useState } from "react";
import { emitKey } from "@/lib/keybus";

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "Backspace"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "/"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ".", "Enter"],
  ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", "'", "ArrowUp"],
  [" ", "ArrowLeft", "ArrowDown", "ArrowRight"],
];
const LABEL: Record<string, string> = { Backspace: "⌫", Enter: "Return", Shift: "Shift", " ": "", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

export function OnScreenKeyboard({ onPress, variant = "beige" }: { onPress?: () => void; variant?: "beige" | "s500" }) {
  const [shift, setShift] = useState(false);
  const press = (k: string, e: React.PointerEvent) => {
    e.preventDefault();
    if (k === "Shift") { const n = !shift; setShift(n); emitKey({ key: "Shift", kind: n ? "down" : "up", source: "virtual" }); onPress?.(); return; }
    const key = shift && k.length === 1 ? k.toUpperCase() : k;
    emitKey({ key, kind: "down", source: "virtual", shift });
    onPress?.();
    (e.currentTarget as HTMLElement).dataset.key = key;
  };
  const release = (e: React.PointerEvent) => {
    const key = (e.currentTarget as HTMLElement).dataset.key; if (!key) return;
    emitKey({ key, kind: "up", source: "virtual" }); delete (e.currentTarget as HTMLElement).dataset.key;
    if (shift && key.length === 1 && key !== " ") { setShift(false); emitKey({ key: "Shift", kind: "up", source: "virtual" }); }
  };
  return (
    <div className={`osk osk-${variant}`} role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, i) => (
        <div key={i} className="osk-row">
          {row.map((k) => (
            <button key={k} className={`osk-key k-${k === " " ? "space" : k.length > 1 ? k.toLowerCase() : "char"} ${k === "Shift" && shift ? "on" : ""}`}
              aria-label={k === " " ? "Space" : k} onPointerDown={(e) => press(k, e)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onContextMenu={(e) => e.preventDefault()}>
              {LABEL[k] ?? (shift ? k.toUpperCase() : k)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
