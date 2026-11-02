"use client";
import React, { useEffect, useRef, useState } from "react";

const PATTERNS: { name: string; rows: number[] }[] = [
  { name: "Black", rows: [255, 255, 255, 255, 255, 255, 255, 255] },
  { name: "Dark", rows: [0xee, 0xbb, 0xee, 0xbb, 0xee, 0xbb, 0xee, 0xbb] },
  { name: "Gray", rows: [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55] },
  { name: "Light", rows: [0x88, 0x22, 0x88, 0x22, 0x88, 0x22, 0x88, 0x22] },
  { name: "Stripes", rows: [0xff, 0, 0xff, 0, 0xff, 0, 0xff, 0] },
  { name: "Diagonal", rows: [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01] },
  { name: "Bricks", rows: [0xff, 0x80, 0x80, 0x80, 0xff, 0x08, 0x08, 0x08] },
  { name: "Dots", rows: [0x80, 0, 0, 0, 0x08, 0, 0, 0] },
  { name: "Weave", rows: [0xf8, 0x74, 0x22, 0x47, 0x8f, 0x17, 0x22, 0x71] },
  { name: "White", rows: [0, 0, 0, 0, 0, 0, 0, 0] },
];
type Tool = "pencil" | "brush" | "eraser" | "fill" | "line" | "rect";
const TOOLS: { id: Tool; label: string; glyph: string }[] = [
  { id: "pencil", label: "Pencil", glyph: "✎" },
  { id: "brush", label: "Brush", glyph: "▪" },
  { id: "eraser", label: "Eraser", glyph: "▭" },
  { id: "fill", label: "Fill", glyph: "◩" },
  { id: "line", label: "Line", glyph: "╲" },
  { id: "rect", label: "Rectangle", glyph: "▢" },
];

export interface PaintProps {
  width?: number; height?: number;
  /** palette[0] is the background colour. Two entries = 1-bit mode with patterns. */
  palette?: string[];
  onPaint?: (info: { x: number; y: number; tool: Tool; wasBlank: boolean; filledAll?: boolean; color?: number }) => void;
  theme?: "classic" | "s500" | "win";
}

export function Paint({ width = 320, height = 200, palette = ["#ffffff", "#000000"], onPaint, theme = "classic" }: PaintProps) {
  const mono = palette.length === 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bmp = useRef<Uint8Array>(new Uint8Array(width * height));
  const snap = useRef<Uint8Array | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [pat, setPat] = useState(0);
  const [color, setColor] = useState(1);
  const rgb = useRef<number[][]>(palette.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))));

  const render = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(width, height);
    const b = bmp.current;
    for (let i = 0; i < b.length; i++) { const p = rgb.current[b[i]] || rgb.current[0]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  };
  useEffect(render); // eslint-disable-line react-hooks/exhaustive-deps

  const ink = (x: number, y: number, t: Tool = tool) => {
    if (t === "eraser") return 0;
    if (!mono) return color;
    const row = PATTERNS[pat].rows[y & 7];
    return (row >> (7 - (x & 7))) & 1;
  };
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < width && y < height) bmp.current[y * width + x] = v; };
  const stamp = (x: number, y: number, size: number, t: Tool) => {
    const h = Math.floor(size / 2);
    for (let dy = -h; dy < size - h; dy++) for (let dx = -h; dx < size - h; dx++) set(x + dx, y + dy, ink(x + dx, y + dy, t));
  };
  const line = (x0: number, y0: number, x1: number, y1: number, size: number, t: Tool) => {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      stamp(x0, y0, size, t);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  const flood = (x: number, y: number) => {
    const b = bmp.current; const target = b[y * width + x];
    const seen = new Uint8Array(width * height); const stack = [y * width + x]; let count = 0;
    while (stack.length) {
      const i = stack.pop()!; if (seen[i] || b[i] !== target) continue;
      seen[i] = 1; count++;
      const px = i % width, py = (i / width) | 0;
      if (px > 0) stack.push(i - 1); if (px < width - 1) stack.push(i + 1);
      if (py > 0) stack.push(i - width); if (py < height - 1) stack.push(i + width);
    }
    for (let i = 0; i < seen.length; i++) if (seen[i]) b[i] = ink(i % width, (i / width) | 0, "fill");
    return count;
  };
  const sizeFor = (t: Tool) => (t === "pencil" ? 1 : t === "brush" ? 5 : t === "eraser" ? 10 : 2);
  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * width), y: Math.floor(((e.clientY - r.top) / r.height) * height) };
  };
  const isBlank = () => bmp.current.every((v) => v === 0);

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    const p = pos(e); const wasBlank = isBlank();
    start.current = p; last.current = p;
    if (tool === "fill") {
      const n = flood(p.x, p.y);
      onPaint?.({ ...p, tool, wasBlank, filledAll: wasBlank && n === width * height, color: mono ? pat : color });
      start.current = null; render(); return;
    }
    if (tool === "line" || tool === "rect") { snap.current = bmp.current.slice(); return; }
    stamp(p.x, p.y, sizeFor(tool), tool); render();
    if (tool !== "eraser") onPaint?.({ ...p, tool, wasBlank, color: mono ? pat : color });
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = pos(e); const s = start.current;
    if (tool === "line" || tool === "rect") {
      bmp.current.set(snap.current!);
      if (tool === "line") line(s.x, s.y, p.x, p.y, 2, tool);
      else { line(s.x, s.y, p.x, s.y, 2, tool); line(p.x, s.y, p.x, p.y, 2, tool); line(p.x, p.y, s.x, p.y, 2, tool); line(s.x, p.y, s.x, s.y, 2, tool); }
    } else {
      const l = last.current!; line(l.x, l.y, p.x, p.y, sizeFor(tool), tool);
      if (tool !== "eraser") onPaint?.({ ...p, tool, wasBlank: false, color: mono ? pat : color });
    }
    last.current = p; render();
  };
  const up = (e: React.PointerEvent) => {
    if (start.current && (tool === "line" || tool === "rect")) { const p = pos(e); onPaint?.({ x: Math.min(p.x, start.current.x), y: Math.min(p.y, start.current.y), tool, wasBlank: false, color: mono ? pat : color }); }
    start.current = null; snap.current = null;
  };

  return (
    <div className={`paint paint-${theme}`}>
      <div className="paint-tools">
        {TOOLS.map((t) => (
          <button key={t.id} className={`ptool ${tool === t.id ? "on" : ""}`} title={t.label} aria-label={t.label} onClick={() => setTool(t.id)}>{t.glyph}</button>
        ))}
        <button className="ptool" title="Clear" aria-label="Clear canvas" onClick={() => { bmp.current.fill(0); render(); }}>✕</button>
      </div>
      <div className="paint-main">
        <canvas ref={canvasRef} width={width} height={height} className="paint-canvas" style={{ width, height }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <div className="paint-palette">
          {mono ? PATTERNS.map((p, i) => (
            <button key={p.name} title={p.name} aria-label={`Pattern ${p.name}`} className={`pat ${pat === i ? "on" : ""}`} onClick={() => setPat(i)}>
              <svg viewBox="0 0 8 8" width="16" height="16" shapeRendering="crispEdges">
                <rect width="8" height="8" fill="#fff" />
                {p.rows.map((r, y) => Array.from({ length: 8 }).map((_, x) => ((r >> (7 - x)) & 1 ? <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="#000" /> : null)))}
              </svg>
            </button>
          )) : palette.map((c, i) => (
            <button key={c + i} title={c} aria-label={`Colour ${i}`} className={`swatch ${color === i ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
