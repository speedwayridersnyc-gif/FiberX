"use client";
import { useEffect, useRef } from "react";

/** Original implementation of a rotating, checkered, bouncing sphere over a perspective grid. */
export function BallDemo({ w = 320, h = 200, onBounce, onSpinChange }: { w?: number; h?: number; onBounce?: (n: number) => void; onSpinChange?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const spinDir = useRef(1);
  const ball = useRef({ x: 80, y: 40, vx: 70, vy: 0, r: 34 });
  const cb = useRef({ onBounce, onSpinChange }); cb.current = { onBounce, onSpinChange };
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const bg = document.createElement("canvas"); bg.width = w; bg.height = h; const g = bg.getContext("2d")!;
    g.fillStyle = "#a9a9b8"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#a0388f"; g.lineWidth = 1;
    const floorY = h - 40;
    for (let x = 16; x < w; x += 22) { g.beginPath(); g.moveTo(x + 0.5, 8); g.lineTo(x + 0.5, floorY); g.stroke(); }
    for (let y = 8; y <= floorY; y += 22) { g.beginPath(); g.moveTo(16, y + 0.5); g.lineTo(w - 16, y + 0.5); g.stroke(); }
    for (let i = 0; i < 6; i++) { const y = floorY + (i * i * 1.3); g.beginPath(); g.moveTo(16 - i * 3, y + 0.5); g.lineTo(w - 16 + i * 3, y + 0.5); g.stroke(); }
    for (let x = 16; x < w; x += 22) { g.beginPath(); g.moveTo(x + 0.5, floorY); g.lineTo(w / 2 + (x - w / 2) * 1.35, h); g.stroke(); }
    let raf = 0, last = performance.now(), spin = 0, bounces = 0;
    const R = ball.current.r, size = R * 2 + 2;
    const img = ctx.createImageData(size, size);
    const tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      const b = ball.current;
      b.vy += 420 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y + R > floorY) { b.y = floorY - R; b.vy = -Math.sqrt(2 * 420 * (floorY - R - 22)); bounces++; cb.current.onBounce?.(bounces); }
      if (b.x - R < 16) { b.x = 16 + R; b.vx = Math.abs(b.vx); } else if (b.x + R > w - 16) { b.x = w - 16 - R; b.vx = -Math.abs(b.vx); }
      spin += dt * 2.6 * spinDir.current * Math.sign(b.vx);
      ctx.drawImage(bg, 0, 0);
      ctx.fillStyle = "rgba(40,30,60,.45)"; ctx.beginPath(); ctx.ellipse(b.x + 14, b.y + 6, R, R, 0, 0, Math.PI * 2); ctx.fill();
      const d = img.data;
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const i = (py * size + px) * 4;
        const nx = (px - R - 0.5) / R, ny = (py - R - 0.5) / R, rr = nx * nx + ny * ny;
        if (rr > 1) { d[i + 3] = 0; continue; }
        const nz = Math.sqrt(1 - rr);
        const tx = nx * ct - ny * st, ty = nx * st + ny * ct;
        const lon = Math.atan2(tx, nz) + spin, lat = Math.asin(Math.max(-1, Math.min(1, ty)));
        const check = (Math.floor(lon / (Math.PI / 8)) + Math.floor((lat + Math.PI / 2) / (Math.PI / 8))) & 1;
        const light = 0.55 + 0.45 * Math.max(0, -nx * 0.4 - ny * 0.5 + nz * 0.75);
        const edge = rr > 0.92 ? 0.8 : 1;
        d[i] = (check ? 230 : 248) * light * edge; d[i + 1] = (check ? 30 : 248) * light * edge; d[i + 2] = (check ? 40 : 248) * light * edge; d[i + 3] = 255;
      }
      const tmp = (frame as unknown as { c?: HTMLCanvasElement }).c ?? ((frame as unknown as { c?: HTMLCanvasElement }).c = Object.assign(document.createElement("canvas"), { width: size, height: size }));
      tmp.getContext("2d")!.putImageData(img, 0, 0);
      ctx.drawImage(tmp, Math.round(b.x - R - 1), Math.round(b.y - R - 1));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);
  return (
    <canvas ref={ref} width={w} height={h} className="ball-canvas" style={{ width: w, height: h, display: "block", cursor: "pointer" }}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * w, y = ((e.clientY - r.top) / r.height) * h;
        const b = ball.current; if (Math.hypot(x - b.x, y - b.y) < b.r + 4) { spinDir.current *= -1; cb.current.onSpinChange?.(); }
      }} />
  );
}
