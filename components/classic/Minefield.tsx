"use client";
import { useEffect, useRef, useState } from "react";

const LEVELS = {
  beginner: { label: "Beginner", w: 9, h: 9, mines: 10, cell: 16 },
  intermediate: { label: "Intermediate", w: 16, h: 16, mines: 40, cell: 14 },
  expert: { label: "Expert", w: 30, h: 16, mines: 99, cell: 12 },
} as const;
type LevelId = keyof typeof LEVELS;
interface Cell { mine: boolean; open: boolean; flag: boolean; n: number }
type Status = "ready" | "playing" | "won" | "lost";

function empty(w: number, h: number): Cell[] { return Array.from({ length: w * h }, () => ({ mine: false, open: false, flag: false, n: 0 })); }

export function Minefield({ onEvent }: { onEvent?: (e: "win" | "lose", level: LevelId) => void }) {
  const [level, setLevel] = useState<LevelId>("beginner");
  const L = LEVELS[level];
  const [cells, setCells] = useState<Cell[]>(() => empty(L.w, L.h));
  const [status, setStatus] = useState<Status>("ready");
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const press = useRef<{ t: number; i: number; timer?: ReturnType<typeof setTimeout>; long?: boolean } | null>(null);

  useEffect(() => { if (status !== "playing") return; const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000); return () => clearInterval(id); }, [status]);
  const reset = (lv: LevelId = level) => { const l = LEVELS[lv]; setLevel(lv); setCells(empty(l.w, l.h)); setStatus("ready"); setTime(0); };

  const neighbors = (i: number) => {
    const x = i % L.w, y = (i / L.w) | 0, out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < L.w && ny < L.h) out.push(ny * L.w + nx);
    }
    return out;
  };
  const plant = (safe: number) => {
    const c = empty(L.w, L.h); const forbidden = new Set([safe, ...neighbors(safe)]);
    let placed = 0;
    while (placed < L.mines) { const i = (Math.random() * c.length) | 0; if (c[i].mine || forbidden.has(i)) continue; c[i].mine = true; placed++; }
    c.forEach((cell, i) => { cell.n = neighbors(i).filter((j) => c[j].mine).length; });
    return c;
  };
  const reveal = (i: number) => {
    if (status === "won" || status === "lost") return;
    let c = cells.map((x) => ({ ...x }));
    if (status === "ready") { c = plant(i); setStatus("playing"); }
    if (c[i].flag || c[i].open) return;
    if (c[i].mine) {
      c.forEach((x) => { if (x.mine) x.open = true; }); c[i].n = -1;
      setCells(c); setStatus("lost"); onEvent?.("lose", level); return;
    }
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!; if (c[j].open || c[j].flag) continue;
      c[j].open = true; if (c[j].n === 0) stack.push(...neighbors(j));
    }
    setCells(c);
    if (c.every((x) => x.mine || x.open)) { c.forEach((x) => { if (x.mine) x.flag = true; }); setStatus("won"); onEvent?.("win", level); }
  };
  const toggleFlag = (i: number) => {
    if (status !== "playing" || cells[i].open) return;
    setCells(cells.map((x, j) => (j === i ? { ...x, flag: !x.flag } : x)));
  };
  const flags = cells.filter((c) => c.flag).length;
  const face = status === "lost" ? "x_x" : status === "won" ? "^_^" : "o_o";

  return (
    <div className="mine">
      <div className="mine-bar">
        <select value={level} onChange={(e) => reset(e.target.value as LevelId)} aria-label="Difficulty" className="classic-select">
          {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="mine-count">✱{String(L.mines - flags).padStart(3, "0")}</span>
        <button className="classic-btn" onClick={() => reset()} aria-label="New game">{face}</button>
        <span className="mine-count">⌛{String(time).padStart(3, "0")}</span>
        <button className={`classic-btn ${flagMode ? "inv" : ""}`} onClick={() => setFlagMode((f) => !f)} aria-pressed={flagMode} title="Flag mode (for touch)">⚑</button>
      </div>
      <div className="mine-grid" style={{ gridTemplateColumns: `repeat(${L.w}, ${L.cell}px)`, gridAutoRows: `${L.cell}px`, fontSize: L.cell - 4 }}
        onContextMenu={(e) => e.preventDefault()}>
        {cells.map((c, i) => (
          <button key={i} className={`mcell ${c.open ? "open" : ""} ${c.n === -1 ? "boom" : ""}`} aria-label={`cell ${i}`}
            onPointerDown={(e) => {
              if (e.button === 2) { toggleFlag(i); return; }
              const p = { t: Date.now(), i } as NonNullable<typeof press.current>;
              p.timer = setTimeout(() => { p.long = true; toggleFlag(i); }, 450);
              press.current = p;
            }}
            onPointerUp={(e) => {
              const p = press.current; press.current = null;
              if (e.button === 2 || !p || p.i !== i) return;
              clearTimeout(p.timer); if (p.long) return;
              if (flagMode) toggleFlag(i); else reveal(i);
            }}
            onPointerLeave={() => { if (press.current) { clearTimeout(press.current.timer); press.current = null; } }}>
            {c.open ? (c.mine ? "✱" : c.n > 0 ? c.n : "") : c.flag ? "⚑" : ""}
          </button>
        ))}
      </div>
      {status === "won" && <div className="mine-msg">Field cleared in {time}s!</div>}
      {status === "lost" && <div className="mine-msg">Boom. Click the face to retry.</div>}
    </div>
  );
}
