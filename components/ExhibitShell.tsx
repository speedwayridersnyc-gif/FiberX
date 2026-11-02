"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSecrets } from "@/lib/secrets/SecretsProvider";
import { SecretsPanel } from "./SecretsPanel";
import { Pedestal } from "./hw/Pedestal";
import { DeviceKeyboard } from "./hw/DeviceKeyboard";

/** "dual" = two-screen laptop posture (default; top screen = display, bottom = keyboard). "single" = one tall screen. */
export type LayoutMode = "dual" | "single";
const KEY = "silicon-hall:layout-v2";

type NativeFold = { orientation: "horizontal" | "vertical"; state: "flat" | "half-opened"; separating: boolean; occlusion: "full" | "none"; left: number; top: number; width: number; height: number };
type Posture = { type?: string; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };

export function ExhibitShell({ title, subtitle, machine, controls, theme, keyboard, year, wide, aspect = 1.25 }: {
  title: string; subtitle: string; machine: React.ReactNode; controls: React.ReactNode; theme: string; keyboard?: React.ReactNode; year?: string; wide?: boolean;
  /** width / height of the machine rig, used to fit it into the top screen */
  aspect?: number;
}) {
  const [layout, setLayout] = useState<LayoutMode>("dual");
  const [posture, setPosture] = useState("");
  const [panel, setPanel] = useState(false);
  const { catalog, found } = useSecrets();
  const n = Object.keys(found).filter((id) => catalog.secrets.some((s) => s.id === id)).length;
  useEffect(() => {
    const saved = localStorage.getItem(KEY); if (saved === "dual" || saved === "single") setLayout(saved);
    const dp = (navigator as unknown as { devicePosture?: Posture }).devicePosture;
    if (dp) { const u = () => setPosture(dp.type ?? ""); u(); dp.addEventListener?.("change", u); return () => dp.removeEventListener?.("change", u); }
  }, []);
  // Native foldable bridge (Android app via Jetpack WindowManager): line the halves up with the real hinge.
  const [fold, setFold] = useState<NativeFold | null>(null);
  useEffect(() => {
    const w = window as unknown as { __nativeFold?: NativeFold | null };
    const on = (e: Event) => setFold((e as CustomEvent<NativeFold | null>).detail ?? null);
    setFold(w.__nativeFold ?? null);
    window.addEventListener("nativefold", on);
    return () => window.removeEventListener("nativefold", on);
  }, []);
  useEffect(() => { if (fold?.orientation === "horizontal" && fold.state === "half-opened") setLayout("dual"); }, [fold]);
  const foldVars: Record<string, string> = fold?.orientation === "horizontal" && layout === "dual"
    ? { "--top": `${Math.max(0, fold.top)}px`, "--hinge": `${Math.max(fold.height, fold.occlusion === "full" ? 12 : 0)}px`, "--bot": "1fr" } : {};
  const toggle = () => { const v = layout === "dual" ? "single" : "dual"; setLayout(v); localStorage.setItem(KEY, v); };
  const bar = (
    <header className="exhibit-bar">
      <Link href="/" className="back-link">← Hall</Link>
      <div className="exhibit-bar-title">{title} <span className="muted">· {subtitle}</span></div>
      <div className="exhibit-bar-actions">
        <DeviceKeyboard />
        <button className="btn btn-ghost" onClick={toggle} aria-pressed={layout === "dual"} title="Dual-screen laptop posture: display on the top screen, keyboard on the bottom screen">
          {layout === "dual" ? "▭ Single screen" : "⧉ Dual screen"}
        </button>
        <button className="btn btn-brass" onClick={() => setPanel(true)}>★ {n}/{catalog.secrets.length}</button>
      </div>
    </header>
  );
  return (
    <main className={`exhibit-page theme-${theme}`} data-layout={layout} data-posture={fold?.state === "half-opened" ? "folded" : posture} data-native-fold={fold ? fold.orientation : undefined} style={{ ["--rig-aspect" as string]: aspect, ...foldVars }}>
      {layout === "single" && bar}
      <div className="exhibit-split">
        <section className="half half-machine" aria-label="Display (top screen)">
          {layout === "dual" && bar}
          <div className="machine-fit">
            <Pedestal plaque={title} year={year ?? subtitle} wide={wide} compact={layout === "dual"} keyboard={layout === "single" ? keyboard : undefined}>{machine}</Pedestal>
          </div>
        </section>
        <div className="hinge" aria-hidden><span /></div>
        <section className="half half-controls" aria-label="Keyboard and controls (bottom screen)">
          {layout === "dual" && keyboard && <div className="tabletop-kb">{keyboard}</div>}
          <div className="controls-wrap">{controls}</div>
        </section>
      </div>
      <SecretsPanel open={panel} onClose={() => setPanel(false)} machineName={title} />
    </main>
  );
}
