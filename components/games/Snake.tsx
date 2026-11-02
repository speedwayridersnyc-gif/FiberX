"use client";
import { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";

export interface SnakeTheme { bg: string; grid: string; snake: string; head: string; food: string; text: string }
export const SNAKE_C64: SnakeTheme = { bg: "#352879", grid: "#3e3190", snake: "#6c5eb5", head: "#d0c8ff", food: "#b8c76f", text: "#d0c8ff" };
export const SNAKE_S800: SnakeTheme = { bg: "#1a1a1a", grid: "#222", snake: "#d4a017", head: "#ffe27a", food: "#e0503a", text: "#ffe27a" };
export const SNAKE_MONO: SnakeTheme = { bg: "#000", grid: "#000", snake: "#fff", head: "#fff", food: "#fff", text: "#fff" };

export function Snake({ active, theme = SNAKE_C64, onEvent }: { active: boolean; theme?: SnakeTheme; onEvent?: (e: { type: "eat"; total: number } | { type: "crash"; score: number }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dirQ = useRef<[number, number][]>([]);
  const start = useRef(false);
  const cb = useRef(onEvent); cb.current = onEvent;
  useEffect(() => {
    if (!active) return;
    return subscribeKeys((e) => {
      if (e.kind !== "down") return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const m: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
      if (m[k]) { dirQ.current.push(m[k]); start.current = true; }
      if (k === " " || k === "Enter") start.current = true;
    });
  }, [active]);
  useEffect(() => {
    const W = 320, H = 200, C = 10, GW = 32, GH = 18, OY = 20;
    const ctx = ref.current!.getContext("2d")!;
    let snake: [number, number][] = [], dir: [number, number] = [1, 0], food: [number, number] = [20, 9], score = 0, best = 0, dead = false, acc = 0, last = performance.now(), raf = 0, speed = 0.12;
    const place = () => { do { food = [(Math.random() * GW) | 0, (Math.random() * GH) | 0]; } while (snake.some(([x, y]) => x === food[0] && y === food[1])); };
    const reset = () => { snake = [[8, 9], [7, 9], [6, 9]]; dir = [1, 0]; score = 0; dead = false; speed = 0.12; dirQ.current = []; start.current = false; place(); };
    reset();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (dead && start.current) reset();
      if (!dead && start.current) {
        acc += dt;
        while (acc > speed) {
          acc -= speed;
          const nd = dirQ.current.shift(); if (nd && !(nd[0] === -dir[0] && nd[1] === -dir[1])) dir = nd;
          const h: [number, number] = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
          if (h[0] < 0 || h[1] < 0 || h[0] >= GW || h[1] >= GH || snake.some(([x, y]) => x === h[0] && y === h[1])) { dead = true; start.current = false; best = Math.max(best, score); cb.current?.({ type: "crash", score }); break; }
          snake.unshift(h);
          if (h[0] === food[0] && h[1] === food[1]) { score++; speed = Math.max(0.05, speed * 0.95); place(); cb.current?.({ type: "eat", total: score }); } else snake.pop();
        }
      }
      ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = theme.grid; for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) if ((x + y) % 2) ctx.fillRect(x * C, OY + y * C, C, C);
      ctx.strokeStyle = theme.text; ctx.strokeRect(0.5, OY - 0.5, W - 1, GH * C + 1);
      ctx.fillStyle = theme.food; ctx.fillRect(food[0] * C + 2, OY + food[1] * C + 2, C - 4, C - 4);
      snake.forEach(([x, y], i) => { ctx.fillStyle = i === 0 ? theme.head : theme.snake; ctx.fillRect(x * C + 1, OY + y * C + 1, C - 2, C - 2); });
      ctx.fillStyle = theme.text; ctx.font = "bold 10px monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillText(`SNAKE  SCORE ${String(score).padStart(3, "0")}  BEST ${String(best).padStart(3, "0")}`, 6, 10);
      if (!start.current) { ctx.textAlign = "center"; ctx.fillText(dead ? "CRASH! PRESS AN ARROW" : "PRESS AN ARROW TO START", W / 2, OY + GH * C / 2); ctx.fillText("ESC = EXIT", W / 2, OY + GH * C / 2 + 14); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [theme]);
  return <canvas ref={ref} width={320} height={200} className="game-canvas" />;
}
