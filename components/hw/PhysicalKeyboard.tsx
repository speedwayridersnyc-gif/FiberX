"use client";
import React, { useEffect, useRef, useState } from "react";
import { emitKey, subscribeKeys } from "@/lib/keybus";
import { LAYOUTS } from "./keyboards";

const norm = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

/** A drawn, era-style keyboard. Tapping caps emits key events; physical presses animate the matching caps. */
export function PhysicalKeyboard({ layout, onPress, integrated = false, upper = false }: { layout: keyof typeof LAYOUTS | string; onPress?: () => void; integrated?: boolean; upper?: boolean }) {
  const L = LAYOUTS[layout];
  const [down, setDown] = useState<Set<string>>(new Set());
  const [shift, setShift] = useState(false);
  const held = useRef<Map<number, string>>(new Map());
  useEffect(() => subscribeKeys((e) => {
    if (e.source !== "physical") return;
    const k = norm(e.key);
    setDown((d) => { const n = new Set(d); if (e.kind === "down") n.add(k); else n.delete(k); return n; });
  }), []);
  const press = (busKey: string, e: React.PointerEvent) => {
    e.preventDefault();
    if (!busKey) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    if (busKey === "Shift") { const n = !shift; setShift(n); emitKey({ key: "Shift", kind: n ? "down" : "up", source: "virtual" }); onPress?.(); return; }
    const key = busKey.length === 1 && (shift || upper) ? busKey.toUpperCase() : busKey;
    held.current.set(e.pointerId, key);
    setDown((d) => new Set(d).add(norm(busKey)));
    emitKey({ key, kind: "down", source: "virtual", shift });
    onPress?.();
  };
  const release = (busKey: string, e: React.PointerEvent) => {
    const key = held.current.get(e.pointerId); if (!key) return;
    held.current.delete(e.pointerId);
    setDown((d) => { const n = new Set(d); n.delete(norm(busKey)); return n; });
    emitKey({ key, kind: "up", source: "virtual" });
    if (shift && key.length === 1 && key !== " ") { setShift(false); emitKey({ key: "Shift", kind: "up", source: "virtual" }); }
  };
  return (
    <div className={`pkb caps-${L.caps} ${integrated ? "integrated" : "standalone plastic"}`} role="group" aria-label="Keyboard">
      <div className="pkb-deck">
        {L.clusters.map((c, ci) => (
          <div key={ci} className="pkb-cluster" style={{ flexGrow: c.width }}>
            {c.rows.map((row, ri) => (
              <div key={ri} className="pkb-row">
                {row.map(([label, busKey, w = 1, kind = ""], ki) => kind === "s"
                  ? <span key={ki} className="kc-spacer" style={{ width: `${(w / c.width) * 100}%`, aspectRatio: `${w} / 1` }} />
                  : (
                    <button key={ki} className={`kc ${kind === "m" ? "kc-mod" : kind === "a" ? "kc-acc" : ""} ${busKey === " " ? "kc-space" : ""} ${down.has(norm(busKey)) || (busKey === "Shift" && shift) ? "down" : ""}`}
                      style={{ width: `${(w / c.width) * 100}%`, aspectRatio: `${w} / 1` }} aria-label={busKey === " " ? "Space" : label.replace("\n", " ")}
                      onPointerDown={(e) => press(busKey, e)} onPointerUp={(e) => release(busKey, e)} onPointerCancel={(e) => release(busKey, e)} onContextMenu={(e) => e.preventDefault()}>
                      <span className="kc-top">{label.split("\n").map((p, i) => <span key={i}>{p}</span>)}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
