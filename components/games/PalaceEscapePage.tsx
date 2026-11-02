"use client";
import { BackToHall } from "@/components/BackToHall";
import { useState } from "react";
import { PalaceEscape, PEEvent } from "./PalaceEscape";
import { KeyBridge } from "../KeyBridge";
import { TouchPad } from "../TouchPad";
import { SecretsProvider, useSecrets } from "@/lib/secrets/SecretsProvider";
import { CLASSIC_SECRETS } from "@/lib/secrets/classic";

export function usePalaceSecrets() {
  const { unlock } = useSecrets();
  return (e: PEEvent) => {
    if (e.type === "level" && e.index === 0) unlock("pe-level1");
    if (e.type === "win") { unlock("pe-escape"); if (e.timeLeft >= 150) unlock("pe-swift"); }
    if (e.type === "parry" && e.total >= 5) unlock("pe-parry");
  };
}

function Inner() {
  const onEvent = usePalaceSecrets();
  const [mono, setMono] = useState(false);
  return (
    <main className="pe-page">
      <KeyBridge />
      <header className="exhibit-bar">
        <BackToHall />
        <div className="exhibit-bar-title">Palace Escape <span className="muted">· software annex</span></div>
        <button className="btn btn-ghost" onClick={() => setMono((m) => !m)}>{mono ? "Colour" : "1-bit"}</button>
      </header>
      <div className="pe-stage">
        <div className="pe-frame"><PalaceEscape mono={mono} active onEvent={onEvent} className="pe-big" /></div>
        <TouchPad />
      </div>
      <p className="pe-help">Keyboard: ← → run · ↑ jump (while running: running jump; facing a ledge: climb) · ↓ hang from an edge / drop · Shift careful walk (safe over spikes) · Space / X sword · ↑ in a duel parries. Escape three levels before the hourglass empties. Secrets found here count toward the Macintosh exhibit.</p>
    </main>
  );
}
export function PalaceEscapePage() { return <SecretsProvider catalog={CLASSIC_SECRETS}><Inner /></SecretsProvider>; }
