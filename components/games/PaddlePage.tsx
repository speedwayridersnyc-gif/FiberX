"use client";
import { BackToHall } from "@/components/BackToHall";
import { useState } from "react";
import { Paddle, PaddleStrip } from "./Paddle";
import { useGameSecrets } from "./GameHost";
import { KeyBridge } from "../KeyBridge";
import { SecretsProvider } from "@/lib/secrets/SecretsProvider";
import { S800_SECRETS } from "@/lib/secrets/s800";

function Inner() {
  const g = useGameSecrets();
  const [mono, setMono] = useState(false);
  return (
    <main className="pe-page paddle-page">
      <KeyBridge />
      <header className="exhibit-bar">
        <BackToHall />
        <div className="exhibit-bar-title">Paddle <span className="muted">· software annex</span></div>
        <button className="btn btn-ghost" onClick={() => setMono((m) => !m)}>{mono ? "Colour" : "1-bit"}</button>
      </header>
      <div className="pe-stage">
        <div className="pe-frame"><Paddle mono={mono} active onEvent={g.paddle} /></div>
        <PaddleStrip />
      </div>
      <p className="pe-help">Choose 1 player (Easy, Normal, Hard CPU) or 2 players. First to 11. Player 1: W/S (or ↑/↓ against the CPU) or drag on the court. Player 2: I/K, ↑/↓, the right half of the court, or the slider. On a dual-screen phone each player gets their own screen. Secrets found here count toward the Atari 800 exhibit.</p>
    </main>
  );
}
export function PaddlePage() { return <SecretsProvider catalog={S800_SECRETS}><Inner /></SecretsProvider>; }
