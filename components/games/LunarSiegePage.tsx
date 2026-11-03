"use client";
import { BackToHall } from "@/components/BackToHall";
import { useState } from "react";
import { LunarSiege } from "./LunarSiege";
import { KeyBridge } from "../KeyBridge";
import { TouchPad } from "../TouchPad";
import { SecretsProvider } from "@/lib/secrets/SecretsProvider";
import { S800_SECRETS } from "@/lib/secrets/s800";
import { SNAKE_S800 } from "./Snake";

function Inner() {
  const [mono, setMono] = useState(false);
  return (
    <main className="pe-page">
      <KeyBridge />
      <header className="exhibit-bar">
        <BackToHall />
        <div className="exhibit-bar-title">Lunar Siege <span className="muted">· software annex</span></div>
        <button className="btn btn-ghost" onClick={() => setMono((m) => !m)}>{mono ? "Colour" : "1-bit"}</button>
      </header>
      <div className="pe-stage">
        <div className="pe-frame"><LunarSiege mono={mono} active theme={SNAKE_S800} className="pe-big" /></div>
        <TouchPad game="siege" />
      </div>
      <p className="pe-help">Keyboard: ← → move the cannon · Space / ↑ fire. Waves of invaders march down toward the moonbase; thin them out from behind the three shields, and watch the last one, it gets fast. Three lives per siege.</p>
    </main>
  );
}
export function LunarSiegePage() { return <SecretsProvider catalog={S800_SECRETS}><Inner /></SecretsProvider>; }
