"use client";
import React, { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";
import { paddleInput } from "@/lib/paddleInput";

export type PaddleEvent = { type: "win"; mode: "1p" | "2p"; diff: Diff; winner: 1 | 2; score: [number, number] } | { type: "rally"; hits: number };
type Diff = "easy" | "normal" | "hard";
const W = 320, H = 200, PH = 30, PW = 5, WIN = 11;
const CPU: Record<Diff, { speed: number; react: number; err: number }> = { easy: { speed: 95, react: 0.5, err: 26 }, normal: { speed: 150, react: 0.3, err: 14 }, hard: { speed: 230, react: 0.12, err: 5 } };
const MENU: { label: string; mode: "1p" | "2p"; diff: Diff }[] = [
  { label: "1 PLAYER · EASY", mode: "1p", diff: "easy" }, { label: "1 PLAYER · NORMAL", mode: "1p", diff: "normal" },
  { label: "1 PLAYER · HARD", mode: "1p", diff: "hard" }, { label: "2 PLAYERS", mode: "2p", diff: "normal" },
];

let ac: AudioContext | null = null;
function blip(freq: number, ms = 60) {
  try {
    ac = ac ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "square"; o.frequency.value = freq; g.gain.value = 0.06;
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000);
  } catch { /* audio unavailable */ }
}

/** Paddle — an original two-paddle tennis game. P1: W/S, ↑/↓ or drag on the court. P2: I/K or the bottom-screen strip. */
export function Paddle({ active = true, mono = false, onEvent, colors }: { active?: boolean; mono?: boolean; onEvent?: (e: PaddleEvent) => void; colors?: { bg: string; fg: string; accent: string } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ev = useRef(onEvent); ev.current = onEvent;
  const act = useRef(active); act.current = active;
  useEffect(() => {
    const c = ref.current!; const g = c.getContext("2d")!;
    const C = colors ?? (mono ? { bg: "#000", fg: "#fff", accent: "#fff" } : { bg: "#0f1522", fg: "#f2ead6", accent: "#3fa37a" });
    const keys = new Set<string>();
    let phase: "menu" | "play" | "over" = "menu", sel = 0, mode: "1p" | "2p" = "1p", diff: Diff = "normal";
    let p1 = H / 2, p2 = H / 2, bx = W / 2, by = H / 2, vx = 0, vy = 0, s1 = 0, s2 = 0, serveT = 1, hits = 0, cpuAim = H / 2, cpuT = 0, winner: 1 | 2 = 1;
    let drag1: number | null = null;
    const serve = (dir: number) => { bx = W / 2; by = H / 2; const a = (Math.random() - 0.5) * 0.9; vx = Math.cos(a) * 130 * dir; vy = Math.sin(a) * 130; serveT = 0.9; hits = 0; };
    const start = (i: number) => { sel = i; mode = MENU[i].mode; diff = MENU[i].diff; s1 = s2 = 0; p1 = p2 = H / 2; phase = "play"; serve(Math.random() < 0.5 ? 1 : -1); blip(660, 90); paddleInput.p2 = null; };
    const unsub = subscribeKeys((e) => {
      if (!act.current) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.kind === "up") { keys.delete(k); return; }
      keys.add(k);
      if (phase !== "play") {
        if (k === "ArrowUp" || k === "w") sel = (sel + 3) % 4;
        else if (k === "ArrowDown" || k === "s") sel = (sel + 1) % 4;
        else if (k === "Enter" || k === " ") start(sel);
        else if (["1", "2", "3", "4"].includes(k)) start(parseInt(k) - 1);
      }
    });
    const toY = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    const pd = (e: PointerEvent) => {
      const { x, y } = toY(e);
      if (phase !== "play") { const i = Math.floor((y - 96) / 20); if (i >= 0 && i < 4) start(i); return; }
      if (mode === "2p" && x > W / 2) { paddleInput.p2 = y / H; } else drag1 = y;
      try { c.setPointerCapture(e.pointerId); } catch {}
    };
    const pm = (e: PointerEvent) => { if (e.buttons === 0 && e.pointerType === "mouse") return; const { x, y } = toY(e); if (mode === "2p" && x > W / 2 && drag1 === null) paddleInput.p2 = y / H; else if (drag1 !== null || x <= W / 2 || mode === "1p") drag1 = y; };
    const pu = () => { drag1 = null; };
    c.addEventListener("pointerdown", pd); c.addEventListener("pointermove", pm); c.addEventListener("pointerup", pu);
    let last = performance.now(), raf = 0;
    const clamp = (y: number) => Math.max(PH / 2 + 2, Math.min(H - PH / 2 - 2, y));
    const step = (dt: number) => {
      const sp = 190 * dt;
      if (keys.has("w") || (mode === "1p" && keys.has("ArrowUp"))) p1 -= sp;
      if (keys.has("s") || (mode === "1p" && keys.has("ArrowDown"))) p1 += sp;
      if (drag1 !== null) p1 += (drag1 - p1) * Math.min(1, dt * 18);
      if (paddleInput.p1 !== null) p1 += (paddleInput.p1 * H - p1) * Math.min(1, dt * 18);
      if (mode === "2p") {
        if (keys.has("i") || keys.has("ArrowUp")) p2 -= sp;
        if (keys.has("k") || keys.has("ArrowDown")) p2 += sp;
        if (paddleInput.p2 !== null) p2 += (paddleInput.p2 * H - p2) * Math.min(1, dt * 18);
      } else {
        const ai = CPU[diff]; cpuT -= dt;
        if (cpuT <= 0) { cpuT = ai.react; cpuAim = vx > 0 ? by + (Math.random() - 0.5) * ai.err * 2 : H / 2; }
        const d = cpuAim - p2; p2 += Math.sign(d) * Math.min(Math.abs(d), ai.speed * dt);
      }
      p1 = clamp(p1); p2 = clamp(p2);
      if (serveT > 0) { serveT -= dt; return; }
      bx += vx * dt; by += vy * dt;
      if (by < 3) { by = 3; vy = Math.abs(vy); blip(220, 30); }
      if (by > H - 3) { by = H - 3; vy = -Math.abs(vy); blip(220, 30); }
      const hit = (px: number, py: number, dir: number) => {
        if (Math.abs(by - py) <= PH / 2 + 3 && (dir > 0 ? bx <= px + PW && bx >= px - 2 : bx >= px - PW && bx <= px + 2) && Math.sign(vx) !== dir) {
          const off = (by - py) / (PH / 2); const speed = Math.min(330, Math.hypot(vx, vy) * 1.06 + 4);
          const ang = off * 1.0; vx = Math.cos(ang) * speed * dir; vy = Math.sin(ang) * speed; bx = px + dir * (PW + 1);
          hits++; blip(440, 50); ev.current?.({ type: "rally", hits });
        }
      };
      hit(12, p1, 1); hit(W - 12, p2, -1);
      if (bx < -6 || bx > W + 6) {
        if (bx < 0) s2++; else s1++;
        blip(110, 220);
        if (s1 >= WIN || s2 >= WIN) { phase = "over"; winner = s1 > s2 ? 1 : 2; ev.current?.({ type: "win", mode, diff, winner, score: [s1, s2] }); }
        else serve(bx < 0 ? -1 : 1);
      }
    };
    const draw = () => {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.fg;
      for (let y = 4; y < H; y += 12) g.fillRect(W / 2 - 1, y, 2, 6);
      g.font = "bold 24px monospace"; g.textAlign = "center";
      g.fillText(String(s1), W / 2 - 40, 28); g.fillText(String(s2), W / 2 + 40, 28);
      g.fillRect(12 - PW, p1 - PH / 2, PW, PH); g.fillRect(W - 12, p2 - PH / 2, PW, PH);
      if (phase === "play" && (serveT <= 0 || Math.floor(serveT * 8) % 2 === 0)) g.fillRect(bx - 2.5, by - 2.5, 5, 5);
      if (phase !== "play") {
        g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(40, 44, W - 80, 140);
        g.fillStyle = C.fg; g.font = "bold 20px monospace"; g.fillText(phase === "over" ? (mode === "2p" ? `PLAYER ${winner} WINS` : winner === 1 ? "YOU WIN!" : "CPU WINS") : "PADDLE", W / 2, 70);
        g.font = "9px monospace"; g.fillText(phase === "over" ? `${s1} – ${s2} · play again?` : "first to 11 · W/S or drag · P2: I/K or bottom strip", W / 2, 86);
        g.font = "bold 11px monospace";
        MENU.forEach((m, i) => { const y = 106 + i * 20; if (i === sel) { g.fillStyle = C.accent; g.fillRect(70, y - 12, W - 140, 17); g.fillStyle = C.bg; } else g.fillStyle = C.fg; g.fillText(`${i + 1}  ${m.label}`, W / 2, y); });
      }
    };
    const loop = (t: number) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (act.current && phase === "play") step(dt); draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); unsub(); c.removeEventListener("pointerdown", pd); c.removeEventListener("pointermove", pm); c.removeEventListener("pointerup", pu); paddleInput.p2 = null; };
  }, [mono, colors]);
  return <canvas ref={ref} width={W} height={H} className="game-canvas paddle-canvas" style={{ touchAction: "none" }} />;
}

/** Bottom-screen control for Paddle: player 2 (or player 1 on CPU games) drags here. */
export function PaddleStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = React.useState(0.5);
  const set = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); const v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); setY(v); paddleInput.p2 = v; };
  return (
    <div className="paddle-strip-wrap">
      <div className="paddle-strip" ref={ref} onPointerDown={(e) => { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} set(e); }} onPointerMove={(e) => e.buttons && set(e)} role="slider" aria-label="Player 2 paddle: slide left/right to move up/down" aria-valuenow={Math.round(y * 100)}>
        <span className="paddle-knob" style={{ left: `${y * 100}%` }} />
        <span className="paddle-strip-label">PLAYER 2 · slide ◀ up / down ▶</span>
      </div>
    </div>
  );
}
