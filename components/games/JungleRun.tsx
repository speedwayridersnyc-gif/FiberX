"use client";
import { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";

export type JREvent = { type: "treasure"; count: number; total: number } | { type: "vine"; total: number } | { type: "croc" } | { type: "win"; score: number; timeLeft: number } | { type: "death" };

type Kind = "logs" | "tar" | "shift" | "croc" | "water";
interface Screen { kind: Kind; vine: boolean; logs: number; treasure?: number }
const SCREENS: Screen[] = [
  { kind: "logs", vine: false, logs: 1 },
  { kind: "tar", vine: true, logs: 0 },
  { kind: "croc", vine: false, logs: 0 },
  { kind: "shift", vine: false, logs: 0, treasure: 2000 },
  { kind: "logs", vine: false, logs: 2, treasure: 3000 },
  { kind: "water", vine: true, logs: 0 },
  { kind: "croc", vine: true, logs: 0, treasure: 4000 },
  { kind: "logs", vine: false, logs: 3 },
  { kind: "tar", vine: true, logs: 0, treasure: 3000 },
  { kind: "croc", vine: false, logs: 0, treasure: 4000 },
  { kind: "shift", vine: false, logs: 1 },
  { kind: "logs", vine: false, logs: 2, treasure: 5000 },
];
const TOTAL_TREASURE = SCREENS.filter((s) => s.treasure).length;
const W = 320, H = 200, GROUND = 132, GRAV = 820, TIME = 180;
const PIVOT = { x: 160, y: 34 }, VINE_L = 80;

interface Pal { sky: string; canopy: string; leaf: string; trunk: string; ground: string; groundTop: string; under: string; tar: string; water: string; croc: string; log: string; hero: string; shirt: string; skin: string; gold: string; vine: string; text: string }
const COLOR: Pal = { sky: "#0d2a1c", canopy: "#14512f", leaf: "#2f8a4e", trunk: "#5a3a1e", ground: "#8a6a2a", groundTop: "#c6a24a", under: "#3d2a12", tar: "#0b0b0b", water: "#2a6fb0", croc: "#3fa37a", log: "#7a4a22", hero: "#f3ead2", shirt: "#3fa37a", skin: "#e6b98a", gold: "#f2c84b", vine: "#6aa84f", text: "#f3ead2" };
const MONO: Pal = { sky: "#000", canopy: "#000", leaf: "#fff", trunk: "#fff", ground: "#fff", groundTop: "#fff", under: "#000", tar: "#000", water: "#000", croc: "#fff", log: "#fff", hero: "#fff", shirt: "#fff", skin: "#fff", gold: "#fff", vine: "#fff", text: "#fff" };

export function JungleRun({ active = true, mono = false, onEvent, className }: { active?: boolean; mono?: boolean; onEvent?: (e: JREvent) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const latch = useRef<Set<string>>(new Set());
  const ev = useRef(onEvent); ev.current = onEvent;
  const act = useRef(active); act.current = active;
  useEffect(() => {
    if (!active) { keys.current = {}; return; }
    return subscribeKeys((e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const m: Record<string, string> = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "jump", w: "jump", " ": "jump", x: "jump", Enter: "jump", ArrowDown: "down", s: "down" };
      const n = m[k]; if (!n) return;
      keys.current[n] = e.kind === "down"; if (e.kind === "down") latch.current.add(n);
    });
  }, [active]);

  useEffect(() => {
    const pal = mono ? MONO : COLOR;
    const ctx = ref.current!.getContext("2d")!;
    let screen = 0, t = 0, last = performance.now(), raf = 0;
    let score = 2000, timeLeft = TIME, lives = 3, started = false, over: null | "win" | "time" | "lives" = null;
    const got = new Set<number>();
    let vines = 0, onCroc = false;
    let msg: { text: string; t: number } | null = null;
    const p = { x: 20, y: GROUND, vx: 0, vy: 0, dir: 1, state: "ground" as "ground" | "air" | "swing" | "dead" | "stumble", t: 0, phase: 0, swingT: 0, noGrab: 0 };
    let logs: number[] = [];
    const enter = (s: number, fromLeft: boolean) => {
      screen = (s + SCREENS.length) % SCREENS.length; onCroc = false;
      const sc = SCREENS[screen]; logs = Array.from({ length: sc.logs }, (_, i) => 200 + i * 70);
      p.x = fromLeft ? 4 : W - 4;
    };
    enter(0, true);
    const pitRange = (): [number, number] | null => {
      const k = SCREENS[screen].kind;
      if (k === "tar") return [112, 208];
      if (k === "water" || k === "croc") return [100, 236];
      if (k === "shift") { const w = 110 * Math.max(0, Math.sin(t * 1.1)); return w < 8 ? null : [160 - w / 2, 160 + w / 2]; }
      return null;
    };
    const crocOpen = () => (t % 2.8) < 1.1;
    const crocHeads = [128, 168, 208];
    const solidAt = (x: number) => {
      const r = pitRange(); if (!r || x < r[0] || x > r[1]) return "ground";
      if (SCREENS[screen].kind === "croc") for (const c of crocHeads) if (Math.abs(x - c) < 13) return crocOpen() ? "mouth" : "head";
      return "pit";
    };
    const vineAngle = () => 0.95 * Math.sin(t * 1.9);
    const vineTip = () => { const a = vineAngle(); return { x: PIVOT.x + Math.sin(a) * VINE_L, y: PIVOT.y + Math.cos(a) * VINE_L, a }; };
    const say = (text: string, d = 1.6) => { msg = { text, t: d }; };
    const die = (why: string) => {
      if (p.state === "dead") return;
      p.state = "dead"; p.t = 1.4; lives--; say(why); ev.current?.({ type: "death" });
      if (lives <= 0) over = "lives";
    };
    const restart = () => { score = 2000; timeLeft = TIME; lives = 3; started = false; over = null; got.clear(); vines = 0; p.state = "ground"; p.vx = p.vy = 0; p.y = GROUND; p.noGrab = 0; enter(0, true); };

    const update = (dt: number, k: Record<string, boolean>, edge: (n: string) => boolean) => {
      if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
      for (let i = 0; i < logs.length; i++) { logs[i] -= 45 * dt; if (logs[i] < -16) logs[i] = W + 16; }
      if (p.state === "dead") { p.t -= dt; if (p.t <= 0 && !over) { p.state = "ground"; p.y = GROUND; p.vx = 0; p.vy = 0; p.x = 20; onCroc = false; } return; }
      const h = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (p.state === "swing") {
        const tip = vineTip(); p.x = tip.x; p.y = tip.y + 28; p.dir = Math.cos(t * 1.9) >= 0 ? 1 : -1;
        if (edge("jump") || edge("down")) {
          const omega = 0.95 * 1.9 * Math.cos(t * 1.9);
          p.vx = Math.max(-170, Math.min(170, Math.cos(tip.a) * VINE_L * omega)); p.vy = -140; p.state = "air"; p.noGrab = 0.45;
        }
        return;
      }
      if (p.state === "stumble") { p.t -= dt; if (p.t <= 0) p.state = "ground"; }
      if (p.state === "ground") {
        p.vx = h * 82; if (h) p.dir = h;
        p.phase += Math.abs(p.vx) * dt * 0.12;
        if (edge("jump")) { p.state = "air"; p.vy = -255; }
      }
      if (p.state === "air") {
        p.vy += GRAV * dt; if (p.noGrab > 0) p.noGrab -= dt;
        if (SCREENS[screen].vine && p.vy > -200 && p.noGrab <= 0) { const tip = vineTip(); if (Math.hypot(tip.x - p.x, tip.y - (p.y - 26)) < 16) { p.state = "swing"; vines++; ev.current?.({ type: "vine", total: vines }); return; } }
      }
      p.x += p.vx * dt;
      if (p.x > W) { enter(screen + 1, true); if (SCREENS[(screen - 1 + SCREENS.length) % SCREENS.length].kind === "croc" && onCroc) ev.current?.({ type: "croc" }); }
      if (p.x < 0) { if (screen === 0 && false) p.x = 0; else enter(screen - 1, false); }
      if (p.state === "air") {
        p.y += p.vy * dt;
        if (p.y >= GROUND && p.vy > 0) {
          const s = solidAt(p.x);
          if (s === "ground" || s === "head") { p.y = GROUND; p.vy = 0; p.state = "ground"; if (s === "head") onCroc = true; }
          else if (s === "mouth") die("Snap! A crocodile got you");
          else if (p.y > GROUND + 30) die(SCREENS[screen].kind === "tar" || SCREENS[screen].kind === "shift" ? "Stuck in the tar pit" : "Splash! Into the swamp");
        }
      } else if (p.state === "ground" || p.state === "stumble") {
        const s = solidAt(p.x);
        if (s === "pit") { p.state = "air"; p.vy = 0; }
        else if (s === "mouth") die("Snap! A crocodile got you");
        else if (s === "head") onCroc = true;
        if (p.state !== "air") for (const lx of logs) if (Math.abs(lx - p.x) < 11) { score = Math.max(0, score - 4); if (p.state !== "stumble") { p.state = "stumble"; p.t = 0.25; say("Ouch — rolling log!", 0.6); } }
        const tr = SCREENS[screen].treasure;
        if (tr && !got.has(screen) && Math.abs(p.x - 276) < 12) { got.add(screen); score += tr; say(`Treasure! +${tr}`); ev.current?.({ type: "treasure", count: got.size, total: TOTAL_TREASURE }); if (got.size === TOTAL_TREASURE) { over = "win"; ev.current?.({ type: "win", score, timeLeft }); } }
      }
    };

    // ----- drawing -----
    const figure = (x: number, y: number) => {
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      const d = p.dir, run = p.state === "ground" && Math.abs(p.vx) > 1, s = Math.sin(p.phase);
      const air = p.state === "air", swing = p.state === "swing", dead = p.state === "dead";
      if (dead) { ctx.fillStyle = pal.hero; ctx.fillRect(x - 10, y - 4, 20, 4); ctx.beginPath(); ctx.arc(x + 12 * d, y - 3, 3, 0, 7); ctx.fill(); ctx.restore(); return; }
      const hip = { x, y: y - 13 - (run ? Math.abs(s) : 0) }, sh = { x: x + (run ? 2 * d : 0), y: hip.y - 10 };
      const leg = (a: number, b: number, col: string) => { const k = { x: hip.x + Math.sin(a) * 7 * d, y: hip.y + Math.cos(a) * 7 }; const f = { x: k.x + Math.sin(a - b) * 7 * d, y: k.y + Math.cos(a - b) * 7 }; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(k.x, k.y); ctx.lineTo(f.x, f.y); ctx.stroke(); };
      const arm = (a: number, b: number, col: string) => { const e = { x: sh.x + Math.sin(a) * 6 * d, y: sh.y + Math.cos(a) * 6 }; const hnd = { x: e.x + Math.sin(a + b) * 6 * d, y: e.y + Math.cos(a + b) * 6 }; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(e.x, e.y); ctx.lineTo(hnd.x, hnd.y); ctx.stroke(); };
      const back = mono ? "#999" : "#a88c63";
      if (swing) { leg(0.3, 0.4, back); arm(Math.PI - 0.1, 0, back); }
      else if (air) { leg(-0.3, 0.9, back); arm(2.2, 0.4, back); }
      else if (run) { leg(-0.8 * s, 0.3 + 0.9 * Math.max(0, -Math.cos(p.phase)), back); arm(0.7 * s, 0.8, back); }
      else { leg(-0.08, 0.05, back); arm(-0.1, 0.2, back); }
      ctx.strokeStyle = pal.shirt; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      if (swing) { leg(-0.2, 0.3, pal.hero); arm(Math.PI + 0.1, 0, pal.skin); }
      else if (air) { leg(1.0, 1.4, pal.hero); arm(2.6, 0.2, pal.skin); }
      else if (run) { leg(0.8 * s, 0.3 + 0.9 * Math.max(0, Math.cos(p.phase)), pal.hero); arm(-0.7 * s, 0.8, pal.skin); }
      else { leg(0.08, 0.05, pal.hero); arm(0.1, 0.2, pal.skin); }
      ctx.fillStyle = pal.skin; ctx.beginPath(); ctx.arc(sh.x + d, sh.y - 4.5, 3.3, 0, 7); ctx.fill();
      ctx.fillStyle = mono ? "#fff" : "#c6a24a"; ctx.fillRect(sh.x - 4 + d, sh.y - 9, 8, 2); ctx.fillRect(sh.x - 2 + d, sh.y - 11, 4, 2);
      ctx.restore();
    };
    const draw = () => {
      const sc = SCREENS[screen];
      ctx.fillStyle = pal.sky; ctx.fillRect(0, 0, W, H);
      // trunks & canopy
      for (let i = 0; i < 6; i++) { const x = 18 + i * 56 + ((screen * 13) % 20); ctx.fillStyle = pal.trunk; ctx.fillRect(x, 20, 8, GROUND - 20); if (!mono) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x + 5, 20, 3, GROUND - 20); } }
      ctx.fillStyle = pal.canopy; ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = pal.leaf; for (let i = 0; i < 24; i++) { const x = i * 14 + ((screen * 7) % 14); ctx.beginPath(); ctx.ellipse(x, 24 + (i % 3) * 3, 10, 6, 0, 0, 7); ctx.fill(); }
      // ground
      ctx.fillStyle = pal.ground; ctx.fillRect(0, GROUND, W, 18); ctx.fillStyle = pal.groundTop; ctx.fillRect(0, GROUND, W, 3);
      ctx.fillStyle = pal.under; ctx.fillRect(0, GROUND + 18, W, H - GROUND - 18);
      if (!mono) { ctx.fillStyle = "#2a1c0b"; for (let i = 0; i < 10; i++) ctx.fillRect(i * 34 + 6, GROUND + 30 + (i % 2) * 8, 16, 4); }
      const r = pitRange();
      if (r) {
        const water = sc.kind === "water" || sc.kind === "croc";
        ctx.fillStyle = water ? pal.water : pal.tar; ctx.fillRect(r[0], GROUND, r[1] - r[0], 18);
        if (mono) { ctx.strokeStyle = "#fff"; ctx.strokeRect(r[0] + 0.5, GROUND + 0.5, r[1] - r[0] - 1, 17); }
        if (water && !mono) { ctx.fillStyle = "rgba(255,255,255,.25)"; for (let i = 0; i < 6; i++) ctx.fillRect(r[0] + ((i * 23 + t * 20) % (r[1] - r[0] - 10)), GROUND + 6 + (i % 3) * 4, 8, 1); }
        if (sc.kind === "croc") for (const c of crocHeads) {
          ctx.fillStyle = pal.croc; ctx.fillRect(c - 13, GROUND, 26, 6);
          if (crocOpen()) { ctx.beginPath(); ctx.moveTo(c - 13, GROUND); ctx.lineTo(c + 13 * 1, GROUND - 12); ctx.lineTo(c + 6, GROUND); ctx.fill(); ctx.fillStyle = mono ? "#000" : "#fff"; ctx.fillRect(c - 2, GROUND - 2, 2, 2); ctx.fillRect(c + 4, GROUND - 5, 2, 2); }
          ctx.fillStyle = mono ? "#000" : "#ffd84a"; ctx.fillRect(c - 9, GROUND + 1, 2, 2);
        }
      }
      if (sc.vine) { const tip = vineTip(); ctx.strokeStyle = pal.vine; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y - 10); ctx.quadraticCurveTo((PIVOT.x + tip.x) / 2 - Math.sin(tip.a) * 6, (PIVOT.y + tip.y) / 2, tip.x, tip.y); ctx.stroke(); }
      for (const lx of logs) { ctx.save(); ctx.translate(lx, GROUND - 7); ctx.rotate(-t * 4); ctx.fillStyle = pal.log; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.strokeStyle = mono ? "#000" : "#3d2410"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 5); ctx.stroke(); ctx.restore(); }
      if (sc.treasure && !got.has(screen)) { const y = GROUND - 8 + Math.sin(t * 3) * 1.5; ctx.fillStyle = pal.gold; ctx.fillRect(270, y, 12, 7); ctx.fillStyle = mono ? "#000" : "#fff6c4"; ctx.fillRect(272, y + 1, 4, 2); if (!mono) { ctx.fillStyle = "rgba(242,200,75,.18)"; ctx.beginPath(); ctx.arc(276, y + 3, 14, 0, 7); ctx.fill(); } }
      figure(p.x, p.y);
      // HUD
      ctx.fillStyle = mono ? "#000" : "rgba(0,0,0,.55)"; ctx.fillRect(0, H - 18, W, 18);
      ctx.fillStyle = pal.text; ctx.font = "bold 10px monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      const mm = Math.floor(timeLeft / 60), ss = Math.floor(timeLeft % 60);
      ctx.fillText(`SCORE ${String(Math.round(score)).padStart(5, "0")}`, 6, H - 9);
      ctx.textAlign = "center"; ctx.fillText(`${mm}:${String(ss).padStart(2, "0")}`, W / 2, H - 9);
      ctx.textAlign = "right"; ctx.fillText(`${"♥".repeat(Math.max(0, lives))}  ◆${got.size}/${TOTAL_TREASURE}  SCR ${screen + 1}`, W - 6, H - 9);
      const banner = over === "win" ? ["ALL TREASURE FOUND!", `Score ${Math.round(score)} · press jump`] : over === "time" ? ["Out of time!", "Press jump to retry"] : over === "lives" ? ["Game over", "Press jump to retry"] : !started ? ["JUNGLE RUN", "← → run · ↑/Space jump · ↓ let go of a vine"] : msg ? [msg.text] : null;
      if (banner) { ctx.fillStyle = mono ? "rgba(0,0,0,.85)" : "rgba(5,15,10,.75)"; ctx.fillRect(30, 62, W - 60, banner.length * 16 + 12); ctx.strokeStyle = pal.gold; ctx.strokeRect(30.5, 62.5, W - 61, banner.length * 16 + 11); ctx.fillStyle = pal.text; ctx.textAlign = "center"; banner.forEach((l, i) => { ctx.font = i === 0 ? "bold 12px Georgia, serif" : "9px monospace"; ctx.fillText(l, W / 2, 76 + i * 16); }); }
    };
    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      const lt = latch.current; const k: Record<string, boolean> = act.current ? { ...keys.current } : {};
      if (act.current) lt.forEach((n) => { k[n] = true; });
      const edge = (n: string) => lt.has(n) && act.current;
      if (over) { if (edge("jump")) restart(); }
      else {
        if (!started && Object.values(k).some(Boolean)) started = true;
        if (started) { t += dt; timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; over = "time"; } update(dt / 2, k, edge); update(dt / 2, k, () => false); }
      }
      lt.clear();
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mono]);
  return <canvas ref={ref} width={W} height={H} className={`game-canvas ${className ?? ""}`} />;
}
