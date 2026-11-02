"use client";
import type React from "react";
import { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";

const COLORS = ["#ff5a5a", "#ff9a3c", "#ffd84a", "#6ee06e", "#4ac6ff", "#b48cff"];
export interface BrickTheme { bricks: string[]; bg1: string; bg2: string; paddle: string; text: string; copper: boolean; title?: string }
export const BRICK_S500: BrickTheme = { bricks: COLORS, bg1: "#001a44", bg2: "#05306e", paddle: "#ff8800", text: "#ffd84a", copper: true };
export const BRICK_CGA: BrickTheme = { bricks: ["#ff55ff", "#55ffff", "#ffffff", "#ff55ff", "#55ffff", "#ffffff"], bg1: "#000", bg2: "#000", paddle: "#55ffff", text: "#ff55ff", copper: false, title: "BRICKS" };
export const BRICK_WIN: BrickTheme = { bricks: ["#c00000", "#c06000", "#c0c000", "#008000", "#000080", "#800080"], bg1: "#000", bg2: "#003030", paddle: "#c0c0c0", text: "#ffff00", copper: false, title: "BRICKS" };
export function Brickwork({ active, onScore, onClear, theme = BRICK_S500 }: { active: boolean; onScore?: (s: number) => void; onClear?: () => void; theme?: BrickTheme }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const pointerX = useRef<number | null>(null);
  const cb = useRef({ onScore, onClear }); cb.current = { onScore, onClear };
  useEffect(() => {
    if (!active) { keys.current = {}; return; }
    return subscribeKeys((e) => { keys.current[e.key] = e.kind === "down"; });
  }, [active]);
  useEffect(() => {
    const W = 300, H = 200; const c = ref.current!; const ctx = c.getContext("2d")!;
    let bricks: { x: number; y: number; alive: boolean; c: string }[] = [];
    const reset = () => { bricks = []; for (let r = 0; r < 6; r++) for (let i = 0; i < 10; i++) bricks.push({ x: 6 + i * 29, y: 24 + r * 11, alive: true, c: theme.bricks[r] }); };
    reset();
    let px = W / 2, bx = W / 2, by = 160, vx = 90, vy = -120, stuck = true, lives = 3, score = 0, msg = "Press space or tap to launch", raf = 0, last = performance.now(), t = 0;
    const launch = () => { if (stuck) { stuck = false; vx = 90 * (Math.random() < 0.5 ? -1 : 1); vy = -130; msg = ""; } else if (lives <= 0 || !bricks.some((b) => b.alive)) { reset(); lives = 3; score = 0; stuck = true; msg = "Press space or tap to launch"; } };
    (c as unknown as { launch: () => void }).launch = launch;
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
      const k = keys.current;
      if (k[" "] || k.Enter) { launch(); k[" "] = false; k.Enter = false; }
      if (k.ArrowLeft || k.a) px -= 220 * dt; if (k.ArrowRight || k.d) px += 220 * dt;
      if (pointerX.current !== null) px += (pointerX.current - px) * Math.min(1, dt * 18);
      px = Math.max(24, Math.min(W - 24, px));
      if (stuck) { bx = px; by = 178; }
      else if (lives > 0) {
        bx += vx * dt; by += vy * dt;
        if (bx < 4) { bx = 4; vx = Math.abs(vx); } if (bx > W - 4) { bx = W - 4; vx = -Math.abs(vx); } if (by < 4) { by = 4; vy = Math.abs(vy); }
        if (by > 180 && by < 188 && Math.abs(bx - px) < 26 && vy > 0) { vy = -Math.abs(vy) * 1.02; vx = ((bx - px) / 26) * 160; }
        if (by > H + 6) { lives--; stuck = true; msg = lives > 0 ? "Ball lost — launch again" : "Game over — press space"; }
        for (const b of bricks) if (b.alive && bx > b.x - 3 && bx < b.x + 30 && by > b.y - 3 && by < b.y + 12) {
          b.alive = false; score += 10; cb.current.onScore?.(score);
          const fromSide = bx < b.x || bx > b.x + 27; if (fromSide) vx = -vx; else vy = -vy;
          if (!bricks.some((q) => q.alive)) { stuck = true; msg = "Wall cleared! Press space"; cb.current.onClear?.(); }
          break;
        }
      }
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, theme.bg1); grad.addColorStop(1, theme.bg2); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      if (theme.copper) for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsla(${(t * 60 + i * 30) % 360},80%,55%,.12)`; ctx.fillRect(0, 4 + i * 2, W, 2); }
      for (const b of bricks) if (b.alive) { ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, 27, 9); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(b.x, b.y, 27, 2); }
      ctx.fillStyle = theme.paddle; ctx.fillRect(px - 24, 184, 48, 6); ctx.fillStyle = "#fff"; ctx.fillRect(px - 24, 184, 48, 2);
      ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, 7); ctx.fill();
      ctx.font = "bold 10px monospace"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(`${theme.title ? theme.title + "  " : ""}SCORE ${score}`, 6, 12);
      ctx.textAlign = "right"; ctx.fillText("● ".repeat(Math.max(0, lives)), W - 6, 12);
      if (msg) { ctx.textAlign = "center"; ctx.fillStyle = theme.text; ctx.fillText(msg, W / 2, 130); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [theme]);
  const toX = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 300; };
  return (
    <canvas ref={ref} width={300} height={200} style={{ width: 300, height: 200, display: "block", touchAction: "none" }}
      onPointerMove={(e) => { pointerX.current = toX(e); }} onPointerLeave={() => { pointerX.current = null; }}
      onPointerDown={(e) => { pointerX.current = toX(e); (e.currentTarget as unknown as { launch?: () => void }).launch?.(); }} />
  );
}
