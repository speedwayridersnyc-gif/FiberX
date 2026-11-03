"use client";
import { BackToHall } from "@/components/BackToHall";
import { useState } from "react";
import { JungleRun } from "./JungleRun";
import { useGameSecrets } from "./GameHost";
import { KeyBridge } from "../KeyBridge";
import { TouchPad } from "../TouchPad";
import { SecretsProvider } from "@/lib/secrets/SecretsProvider";
import { S800_SECRETS } from "@/lib/secrets/s800";

function Inner() {
  const g = useGameSecrets();
  const [mono, setMono] = useState(false);
  return (
    <main className="pe-page">
      <KeyBridge />
      <header className="exhibit-bar">
        <BackToHall />
        <div className="exhibit-bar-title">Jungle Run <span className="muted">· software annex</span></div>
        <button className="btn btn-ghost" onClick={() => setMono((m) => !m)}>{mono ? "Colour" : "1-bit"}</button>
      </header>
      <div className="pe-stage">
        <div className="pe-frame"><JungleRun mono={mono} active onEvent={g.jungle} className="pe-big" /></div>
        <TouchPad game="jungle" />
      </div>
      <p className="pe-help">Keyboard: ← → run · ↑ / Space jump (leap into a vine to grab it) · ↓ let go of a vine. Hop the logs, leap the tar pits, time the crocodiles&apos; jaws and grab all six treasures before the timer runs out. Secrets found here count toward the Atari 800 exhibit.</p>
    </main>
  );
}
export function JungleRunPage() { return <SecretsProvider catalog={S800_SECRETS}><Inner /></SecretsProvider>; }
