"use client";
import { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";
import type { SnakeTheme } from "./Snake";

export type LSEvent = { type: "wave"; wave: number } | { type: "over"; score: number; wave: number };

const W = 320, H = 200, COLS = 9, ROWS = 5, CW = 22, CH = 14;
// two animation frames per row style, 11x8 pixel glyphs
const GLYPHS: string[][] = [
  ["..XXXXXXX..", ".XXXXXXXXX.", "XX.XXXXX.XX", "XXXXXXXXXXX", "..X.....X..", ".X.XXXXX.X.", "X.........X", ".XX.....XX."],
  ["..XXXXXXX..", ".XXXXXXXXX.", "XX.XXXXX.XX", "XXXXXXXXXXX", "...X...X...", "..X.XXX.X..", ".X.......X.", "X.........X"],
  ["...X...X...", "....X.X....", "...XXXXX...", "..XX.X.XX..", ".XXXXXXXXX.", "X.XXXXXXX.X", "X.X.....X.X", "...XX.XX..."],
  ["...X...X...", "X...X.X...X", "X..XXXXX..X", "XXXX.X.XXXX", "XXXXXXXXXXX", ".XXXXXXXXX.", "..X.....X..", ".X.......X."],
];

export function LunarSiege({ active, theme, mono = false, onEvent, className }: { active: boolean; theme?: SnakeTheme; mono?: boolean; onEvent?: (e: LSEvent) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const fireEdge = useRef(false);
  const ev = useRef(onEvent); ev.current = onEvent;
  useEffect(() => {
    if (!active) { keys.current = {}; return; }
    return subscribeKeys((e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const m: Record<string, string> = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", " ": "fire", ArrowUp: "fire", w: "fire", x: "fire", Enter: "fire" };
      const n = m[k]; if (!n) return;
      if (n === "fire") { if (e.kind === "down" && !keys.current.fire) fireEdge.current = true; }
      keys.current[n] = e.kind === "down";
    });
  }, [active]);
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    const pal = mono ? { bg: "#000", fg: "#fff", alien: "#fff", player: "#fff", shield: "#fff", bomb: "#fff" }
      : { bg: theme?.bg ?? "#0b0f1e", fg: theme?.text ?? "#d0c8ff", alien: theme?.food ?? "#b8c76f", player: theme?.head ?? "#d0c8ff", shield: theme?.snake ?? "#6c5eb5", bomb: theme?.text ?? "#d0c8ff" };
    let px = W / 2, lives = 3, score = 0, best = 0, wave = 1, started = false, over = false, t = 0, raf = 0, last = performance.now();
    let aliens: { c: number; r: number; alive: boolean }[] = [], ox = 0, oy = 0, dir = 1, bullet: { x: number; y: number } | null = null;
    let bombs: { x: number; y: number }[] = [], shields: boolean[][][] = [], flash = 0, hitT = 0;
    const alive = () => aliens.filter((a) => a.alive);
    const spawn = () => {
      aliens = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) aliens.push({ c, r, alive: true });
      ox = 40; oy = 30 + Math.min(40, (wave - 1) * 8); dir = 1; bullet = null; bombs = [];
      shields = [0, 1, 2].map(() => Array.from({ length: 3 }, () => Array(7).fill(true)));
    };
    const reset = () => { lives = 3; score = 0; wave = 1; over = false; px = W / 2; spawn(); };
    reset();
    const shieldX = (i: number) => 52 + i * 90;
    const hitShield = (x: number, y: number) => {
      for (let i = 0; i < 3; i++) { const sx = shieldX(i); if (x < sx || x >= sx + 28 || y < 154 || y >= 166) continue;
        const cx = ((x - sx) / 4) | 0, cy = ((y - 154) / 4) | 0; if (shields[i][cy]?.[cx]) { shields[i][cy][cx] = false; return true; } }
      return false;
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const k = keys.current; const fire = fireEdge.current; fireEdge.current = false;
      if (!started || over) { if (fire) { if (over) reset(); started = true; } }
      else if (hitT > 0) { hitT -= dt; }
      else {
        if (k.left) px = Math.max(10, px - 120 * dt); if (k.right) px = Math.min(W - 10, px + 120 * dt);
        if (fire && !bullet) bullet = { x: px, y: 180 };
        const live = alive(); const n = live.length;
        const speed = (10 + (ROWS * COLS - n) * 1.3 + wave * 4) * (n === 1 ? 2.2 : 1);
        ox += dir * speed * dt;
        const minC = Math.min(...live.map((a) => a.c)), maxC = Math.max(...live.map((a) => a.c));
        if (ox + maxC * CW + 12 > W - 6 && dir > 0) { dir = -1; oy += 8; } else if (ox + minC * CW - 1 < 6 && dir < 0) { dir = 1; oy += 8; }
        // bombs from the lowest alien in a random column
        if (Math.random() < (0.5 + wave * 0.15) * dt) { const cols = [...new Set(live.map((a) => a.c))]; const c = cols[(Math.random() * cols.length) | 0]; const low = live.filter((a) => a.c === c).sort((a, b) => b.r - a.r)[0]; bombs.push({ x: ox + low.c * CW + 6, y: oy + low.r * CH + 8 }); }
        if (bullet) { bullet.y -= 260 * dt; if (bullet.y < 14) bullet = null; else if (hitShield(bullet.x, bullet.y)) bullet = null; else {
          const h = live.find((a) => bullet && bullet.x >= ox + a.c * CW - 1 && bullet.x <= ox + a.c * CW + 12 && bullet.y >= oy + a.r * CH && bullet.y <= oy + a.r * CH + 8);
          if (h) { h.alive = false; score += (ROWS - h.r) * 10; bullet = null; flash = 0.08; } } }
        for (const b of bombs) b.y += (90 + wave * 8) * dt;
        bombs = bombs.filter((b) => { if (b.y > H) return false; if (hitShield(b.x, b.y)) return false;
          if (b.y >= 180 && b.y <= 192 && Math.abs(b.x - px) < 8) { lives--; hitT = 0.9; bombs = []; if (lives <= 0) { over = true; best = Math.max(best, score); ev.current?.({ type: "over", score, wave }); } return false; } return true; });
        if (live.some((a) => oy + a.r * CH + 8 >= 176)) { over = true; best = Math.max(best, score); ev.current?.({ type: "over", score, wave }); }
        if (n === 0) { wave++; ev.current?.({ type: "wave", wave }); spawn(); }
      }
      // draw
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      if (!mono) { ctx.fillStyle = pal.fg; ctx.globalAlpha = 0.25; for (let i = 0; i < 40; i++) ctx.fillRect(((i * 97) % W), ((i * 53) % 150) + 14, 1, 1); ctx.globalAlpha = 1; }
      ctx.fillStyle = pal.alien;
      for (const a of alive()) { const g = GLYPHS[(a.r < 2 ? 0 : 2) + (((t * 2.5) | 0) % 2)]; const ax = (ox + a.c * CW) | 0, ay = (oy + a.r * CH) | 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 11; x++) if (g[y][x] === "X") ctx.fillRect(ax + x, ay + y, 1, 1); }
      ctx.fillStyle = pal.shield; for (let i = 0; i < 3; i++) { const sx = shieldX(i); for (let y = 0; y < 3; y++) for (let x = 0; x < 7; x++) if (shields[i][y][x]) ctx.fillRect(sx + x * 4, 154 + y * 4, 4, 4); }
      if (hitT <= 0 || ((t * 12) | 0) % 2) { ctx.fillStyle = pal.player; ctx.fillRect(px - 7, 184, 14, 6); ctx.fillRect(px - 5, 181, 10, 3); ctx.fillRect(px - 1, 178, 2, 3); }
      if (bullet) { ctx.fillStyle = pal.player; ctx.fillRect(bullet.x | 0, bullet.y | 0, 1, 5); }
      ctx.fillStyle = pal.bomb; for (const b of bombs) { ctx.fillRect(b.x | 0, b.y | 0, 2, 4); }
      ctx.fillStyle = pal.fg; ctx.fillRect(0, 195, W, 1);
      ctx.font = "bold 10px monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillText(`SCORE ${String(score).padStart(4, "0")}   WAVE ${wave}`, 6, 8); ctx.textAlign = "right"; ctx.fillText(`BEST ${String(best).padStart(4, "0")}   ${"▲".repeat(Math.max(0, lives))}`, W - 6, 8);
      if (flash > 0) { flash -= dt; }
      if (!started || over) { ctx.textAlign = "center"; ctx.fillStyle = pal.bg; ctx.fillRect(60, 84, 200, 36); ctx.strokeStyle = pal.fg; ctx.strokeRect(60.5, 84.5, 200, 36);
        ctx.fillStyle = pal.fg; ctx.fillText(over ? "THE MOON HAS FALLEN" : "LUNAR SIEGE", W / 2, 96); ctx.fillText(over ? "PRESS FIRE TO RETRY" : "← → MOVE · SPACE FIRE", W / 2, 110); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [theme, mono]);
  return <canvas ref={ref} width={W} height={H} className={`game-canvas ${className ?? ""}`} />;
}
