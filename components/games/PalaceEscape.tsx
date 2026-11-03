"use client";
import { useEffect, useRef } from "react";
import { subscribeKeys } from "@/lib/keybus";
import { LEVELS, ROWS } from "./palaceLevels";

export type PEEvent = { type: "level"; index: number } | { type: "win"; timeLeft: number } | { type: "parry"; total: number } | { type: "death"; cause: string };

const T = 32, VW = 320, VH = 192, HUD = 16, TOTAL_TIME = 300;
const GRAV = 900, RUN = 105, WALK = 40, FIGHT = 45;

interface Pal { bg: string; bgBrick: string; wall: string; mortar: string; floor: string; hero: string; heroShade: string; sash: string; guard: string; guardShade: string; steel: string; spike: string; text: string; red: string; blue: string; exit: string; hud: string }
const COLOR: Pal = { bg: "#0f1522", bgBrick: "#141c2c", wall: "#323b52", mortar: "#1b2232", floor: "#b8893b", hero: "#f3ead2", heroShade: "#9c8a66", sash: "#3fa37a", guard: "#c9694f", guardShade: "#6b2a1e", steel: "#d6dde6", spike: "#e2dccb", text: "#f3ead2", red: "#d8483c", blue: "#4e95e6", exit: "#3fa37a", hud: "#070a10" };
const MONO: Pal = { bg: "#000", bgBrick: "#000", wall: "#fff", mortar: "#000", floor: "#fff", hero: "#fff", heroShade: "#aaa", sash: "#000", guard: "#fff", guardShade: "#999", steel: "#fff", spike: "#fff", text: "#fff", red: "#fff", blue: "#fff", exit: "#fff", hud: "#000" };

interface Pose { lean: number; drop: number; f1: number; f2: number; b1: number; b2: number; af1: number; af2: number; ab1: number; ab2: number; sword: number; reach: number }
const P0: Pose = { lean: 0, drop: 0, f1: 0.06, f2: 0.05, b1: -0.06, b2: 0.05, af1: 0.1, af2: 0.2, ab1: -0.1, ab2: 0.2, sword: 0, reach: 0 };

interface Actor { x: number; y: number; dir: number; pose: Pose; phase: number }
interface Player extends Actor {
  vx: number; vy: number; state: "ground" | "air" | "hang" | "climb" | "dead" | "exit";
  hp: number; maxHp: number; fallTop: number; jumpUp: boolean; hang: { c: number; r: number }; climb: { t: number; sx: number; sy: number; ex: number; ey: number };
  strikeT: number; struck: boolean; blockT: number; blockCd: number; hurtT: number; deadT: number; turnT: number; walking: boolean; spikeT: number;
}
interface Guard extends Actor { hp: number; max: number; state: "idle" | "ready" | "windup" | "strike" | "dead"; t: number; cd: number; hurtT: number; skill: number; strong: boolean; flash: number }
interface World {
  level: number; grid: string[][]; cols: number; p: Player; guards: Guard[];
  loose: Map<string, number>; debris: { x: number; y: number; vy: number; hit: boolean }[]; rubble: { x: number; y: number }[];
  gates: { c: number; r: number; open: number; timer: number }[]; plates: { c: number; r: number; down: number }[];
  spikes: Map<string, number>; msg: { text: string; sub?: string; t: number } | null; sparks: { x: number; y: number; t: number }[];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeWorld(level: number, hp: number, maxHp: number): World {
  const def = LEVELS[level];
  const grid = def.map.map((r) => r.split(""));
  const cols = grid[0].length;
  const guards: Guard[] = []; const gates: World["gates"] = []; const plates: World["plates"] = [];
  let sx = 64, sy = 160;
  for (let c = 0; c < cols; c++) for (let r = 0; r < ROWS; r++) {
    const ch = grid[r][c];
    if (ch === "S") { sx = c * T + 16; sy = (r + 1) * T; grid[r][c] = " "; }
    if (ch === "g" || ch === "w") {
      const strong = ch === "w";
      guards.push({ x: c * T + 16, y: (r + 1) * T, dir: -1, pose: { ...P0 }, phase: 0, hp: strong ? 4 : 2 + (level > 0 ? 1 : 0), max: strong ? 4 : 2 + (level > 0 ? 1 : 0), state: "idle", t: 0, cd: 1, hurtT: 0, skill: def.guardSkill + (strong ? 0.15 : 0), strong, flash: 0 });
      grid[r][c] = " ";
    }
  }
  // gates / plates in column-major reading order so plate i opens gate i
  for (let c = 0; c < cols; c++) for (let r = 0; r < ROWS; r++) {
    if (grid[r][c] === "G") gates.push({ c, r, open: 0, timer: 0 });
    if (grid[r][c] === "p") plates.push({ c, r, down: 0 });
  }
  const p: Player = { x: sx, y: sy, dir: 1, pose: { ...P0 }, phase: 0, vx: 0, vy: 0, state: "ground", hp, maxHp, fallTop: sy, jumpUp: false, hang: { c: 0, r: 0 }, climb: { t: 0, sx: 0, sy: 0, ex: 0, ey: 0 }, strikeT: 0, struck: false, blockT: 0, blockCd: 0, hurtT: 0, deadT: 0, turnT: 0, walking: false, spikeT: 0 };
  return { level, grid, cols, p, guards, loose: new Map(), debris: [], rubble: [], gates, plates, spikes: new Map(), msg: { text: def.name, sub: def.subtitle, t: 2.6 }, sparks: [] };
}

export function PalaceEscape({ mono = false, active = true, onEvent, className }: { mono?: boolean; active?: boolean; onEvent?: (e: PEEvent) => void; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const prev = useRef<Record<string, boolean>>({});
  const latch = useRef<Set<string>>(new Set());
  const evRef = useRef(onEvent); evRef.current = onEvent;
  const activeRef = useRef(active); activeRef.current = active;

  useEffect(() => {
    if (!active) { keys.current = {}; return; }
    return subscribeKeys((e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const map: Record<string, string> = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", Shift: "walk", " ": "strike", x: "strike", j: "strike", Enter: "strike" };
      const name = map[k]; if (!name) return;
      keys.current[name] = e.kind === "down";
      if (e.kind === "down") latch.current.add(name);
    });
  }, [active]);

  useEffect(() => {
    const pal = mono ? MONO : COLOR;
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    let W = makeWorld(0, 3, 3);
    let timeLeft = TOTAL_TIME, started = false, over: null | "win" | "timeout" = null, parries = 0, levelStartMax = 3;
    let raf = 0, last = performance.now(), clock = 0;

    const tile = (c: number, r: number) => (c < 0 || c >= W.cols || r < 0 ? "#" : r >= ROWS ? " " : W.grid[r][c]);
    const gateAt = (c: number, r: number) => W.gates.find((g) => g.c === c && g.r === r);
    const solid = (c: number, r: number) => { const t = tile(c, r); return t === "#" || t === "L" || (t === "G" && (gateAt(c, r)?.open ?? 0) < 0.85); };
    const col = (x: number) => Math.floor(x / T);
    const row = (y: number) => Math.floor(y / T);
    const groundUnder = (x: number, y: number) => solid(col(x - 5), row(y + 0.5)) || solid(col(x + 5), row(y + 0.5));
    const say = (text: string, sub?: string, t = 2) => { W.msg = { text, sub, t }; };

    const isDead = () => (W.p.state as string) === "dead";
    const die = (cause: string) => {
      const p = W.p; if (p.state === "dead") return;
      p.state = "dead"; p.deadT = 2.2; p.hp = 0; p.vx = 0; p.vy = 0;
      say(cause === "spikes" ? "Impaled on the spikes" : cause === "fall" ? "A fatal fall" : cause === "sword" ? "Bested by the blade" : "The end", "Rising again…", 2.2);
      evRef.current?.({ type: "death", cause });
    };
    const hurt = (n: number) => { const p = W.p; p.hp -= n; p.hurtT = 0.35; if (p.hp <= 0) die("sword"); };

    const restartLevel = () => { W = makeWorld(W.level, levelStartMax, levelStartMax); };
    const fullRestart = () => { timeLeft = TOTAL_TIME; started = false; over = null; parries = 0; levelStartMax = 3; W = makeWorld(0, 3, 3); };

    const nearestFoe = () => {
      const p = W.p; let best: Guard | null = null; let bd = 1e9;
      for (const g of W.guards) { if (g.state === "dead") continue; const d = Math.abs(g.x - p.x);
        if (Math.abs(g.y - p.y) < 8 && d < 120 && Math.floor(g.x / VW) === Math.floor(p.x / VW) && d < bd) { bd = d; best = g; } }
      return best;
    };

    const updatePlayer = (dt: number, k: Record<string, boolean>, edge: (n: string) => boolean) => {
      const p = W.p;
      p.blockT -= dt; p.blockCd -= dt; p.hurtT -= dt; p.turnT -= dt; p.spikeT -= dt;
      if (p.state === "dead") { p.deadT -= dt; if (p.deadT <= 0) restartLevel(); return; }
      if (p.state === "exit") { p.climb.t += dt; if (p.climb.t > 1.6) nextLevel(); return; }
      if (p.strikeT > 0) {
        p.strikeT -= dt;
        if (!p.struck && p.strikeT < 0.2) {
          p.struck = true;
          for (const g of W.guards) {
            if (g.state === "dead" || Math.abs(g.y - p.y) > 8) continue;
            const dx = (g.x - p.x) * p.dir;
            if (dx > 0 && dx < 46) {
              if (g.state === "ready" && Math.random() < g.skill * 0.7) { W.sparks.push({ x: (g.x + p.x) / 2, y: p.y - 20, t: 0.25 }); g.cd = Math.min(g.cd, 0.3); }
              else { g.hp--; g.hurtT = 0.35; g.flash = 0.2; g.state = g.hp <= 0 ? "dead" : "ready"; g.cd = 0.6; g.x += p.dir * 8; if (g.state === "dead") say("Guard defeated", undefined, 1.2); }
              break;
            }
          }
        }
      }
      const h = (k.left ? -1 : 0) + (k.right ? 1 : 0);
      if (p.state === "climb") {
        const c = p.climb; c.t += dt / 0.8;
        if (c.t < 0.55) { p.x = c.sx; p.y = lerp(c.sy, c.ey, c.t / 0.55); }
        else { p.y = c.ey; p.x = lerp(c.sx, c.ex, (c.t - 0.55) / 0.45); }
        if (c.t >= 1) { p.state = "ground"; p.x = c.ex; p.y = c.ey; p.vx = 0; }
        return;
      }
      if (p.state === "hang") {
        if (k.up) { p.state = "climb"; p.climb = { t: 0, sx: p.x, sy: p.y, ex: p.dir > 0 ? p.hang.c * T + 10 : p.hang.c * T + 22, ey: p.hang.r * T }; }
        else if (edge("down") || (h === -p.dir && edge(h < 0 ? "left" : "right"))) { p.state = "air"; p.fallTop = p.y; p.vx = 0; p.vy = 0; p.x -= p.dir * 3; p.jumpUp = false; }
        return;
      }
      const foe = nearestFoe();
      if (p.state === "ground") {
        p.walking = !!k.walk;
        if (foe) {
          p.dir = Math.sign(foe.x - p.x) || p.dir;
          p.vx = h * FIGHT;
          if (h === p.dir && Math.abs(foe.x - p.x) < 22) p.vx = 0;
          if (edge("strike") && p.strikeT <= 0) { p.strikeT = 0.38; p.struck = false; }
          if (edge("up") && p.blockCd <= 0) { p.blockT = 0.32; p.blockCd = 0.5; }
        } else {
          if (edge("strike") && p.strikeT <= 0) { p.strikeT = 0.38; p.struck = true; }
          if (h !== 0 && h !== p.dir && Math.abs(p.vx) < 30) { p.dir = h; p.turnT = 0.12; }
          const target = h !== 0 && p.turnT <= 0 ? h * (k.walk ? WALK : RUN) : 0;
          const acc = target === 0 ? 900 : 650;
          p.vx = p.vx < target ? Math.min(target, p.vx + acc * dt) : Math.max(target, p.vx - acc * dt);
          if (edge("up")) {
            const r = row(p.y - 1), cf = col(p.x + p.dir * 10);
            const face = p.dir > 0 ? cf * T : (cf + 1) * T;
            if (Math.abs(p.vx) > 70) { p.state = "air"; p.vy = -252; p.vx = p.dir * 190; p.fallTop = p.y; p.jumpUp = false; }
            else if (cf !== col(p.x) && solid(cf, r) && !solid(cf, r - 1) && !solid(col(p.x), r - 1) && Math.abs(face - p.x) < 28) {
              p.x = face - p.dir * 7; p.hang = { c: cf, r }; p.state = "climb";
              p.climb = { t: 0, sx: p.x, sy: p.y, ex: p.dir > 0 ? cf * T + 10 : cf * T + 22, ey: r * T };
              return;
            } else if (h !== 0) { p.state = "air"; p.vy = -215; p.vx = p.dir * 110; p.fallTop = p.y; p.jumpUp = false; }
            else { p.state = "air"; p.vy = -268; p.vx = 0; p.fallTop = p.y; p.jumpUp = true; }
          } else if (edge("down")) {
            const c = col(p.x), r = row(p.y - 1);
            for (const d of [p.dir, -p.dir]) {
              if (!solid(c + d, r) && !solid(c + d, r + 1) && solid(c, r + 1)) {
                const edgeX = d > 0 ? (c + 1) * T : c * T;
                p.dir = -d; p.x = edgeX + d * 7; p.y = (r + 1) * T + 30; p.hang = { c, r: r + 1 }; p.state = "hang"; p.vx = 0; return;
              }
            }
          }
        }
      } else if (p.state === "air") {
        p.vy += GRAV * dt;
        if ((k.up || p.jumpUp || k.walk) && p.vy > -60) {
          const cf = col(p.x + p.dir * 8), handY = p.y - 30, rh = Math.round(handY / T);
          if (Math.abs(handY - rh * T) < 7 && cf !== col(p.x) && solid(cf, rh) && !solid(cf, rh - 1) && !solid(col(p.x), rh)) {
            p.state = "hang"; p.hang = { c: cf, r: rh }; p.x = p.dir > 0 ? cf * T - 7 : (cf + 1) * T + 7; p.y = rh * T + 30; p.vx = 0; p.vy = 0; return;
          }
        }
      }
      // horizontal movement + collision
      let nx = p.x + p.vx * dt;
      for (const g of W.guards) if (g.state !== "dead" && Math.abs(g.y - p.y) < 8) { const before = g.x - p.x, after = g.x - nx; if (Math.abs(after) < 18 && Math.abs(after) < Math.abs(before)) nx = p.x; }
      const sgn = Math.sign(p.vx);
      if (sgn) {
        const lc = col(nx + sgn * 6);
        let blocked = false;
        for (let r = row(p.y - 27); r <= row(p.y - 1); r++) if (solid(lc, r)) blocked = true;
        if (blocked) { nx = sgn > 0 ? lc * T - 6.01 : (lc + 1) * T + 6.01; p.vx = 0; }
      }
      p.x = nx;
      let landed = false;
      if (p.state === "air") {
        p.fallTop = Math.min(p.fallTop, p.y);
        const ny = p.y + p.vy * dt;
        if (p.vy > 0 && (solid(col(p.x - 5), row(ny)) || solid(col(p.x + 5), row(ny))) && !(solid(col(p.x - 5), row(p.y - 1)) && solid(col(p.x + 5), row(p.y - 1)))) {
          p.y = row(ny) * T; p.vy = 0; p.state = "ground"; landed = true; p.vx *= 0.3;
          const drop = p.y - p.fallTop;
          if (drop > T * 2.6) die("fall"); else if (drop > T * 1.6) { p.hp--; p.hurtT = 0.5; say("Ouch!", undefined, 0.8); if (p.hp <= 0) die("fall"); }
        } else if (p.vy < 0 && (solid(col(p.x - 5), row(ny - 28)) || solid(col(p.x + 5), row(ny - 28)))) { p.vy = 0; p.y = (row(ny - 28) + 1) * T + 28; }
        else p.y = ny;
        if (p.y > ROWS * T + 60) die("fall");
      } else if (p.state === "ground" && !groundUnder(p.x, p.y)) { p.state = "air"; p.fallTop = p.y; p.vy = 0; p.vx *= 0.5; p.jumpUp = false; }

      if (isDead()) return;
      // tile interactions
      const fc = col(p.x), fr = row(p.y - 1), ft = tile(fc, fr);
      const inSpikes = ft === "^" && Math.abs(p.x - (fc * T + 16)) < 10;
      // only when the feet are actually on the spike floor: landing on it, or running across it on the ground
      if (inSpikes && (landed || (p.state === "ground" && Math.abs(p.vx) > 60)) && p.spikeT <= 0) {
        W.spikes.set(`${fc},${fr}`, 1); p.spikeT = 1.4; p.hp--; p.hurtT = 0.5;
        if (p.hp <= 0) { die("spikes"); return; }
        say("Ouch! Spikes", "Jump over them", 1.2);
        const back = p.vx !== 0 ? -Math.sign(p.vx) : -p.dir; p.state = "air"; p.vy = -170; p.vx = back * 90; p.fallTop = p.y; p.jumpUp = false;
      }
      if (ft === "!" || ft === "+") {
        W.grid[fr][fc] = " ";
        if (ft === "+") { p.maxHp = Math.min(6, p.maxHp + 1); levelStartMax = p.maxHp; p.hp = p.maxHp; say("Life grows stronger", undefined, 1.4); }
        else { p.hp = Math.min(p.maxHp, p.hp + 1); say("Refreshed", undefined, 1); }
      }
      if (p.state === "ground") {
        for (const x of [p.x - 5, p.x + 5]) { const c = col(x), r = row(p.y + 0.5); if (tile(c, r) === "L" && !W.loose.has(`${c},${r}`)) W.loose.set(`${c},${r}`, 0); }
        const pi = W.plates.findIndex((pl) => pl.c === fc && pl.r === fr);
        if (pi >= 0) { W.plates[pi].down = 0.3; if (W.gates[pi]) { if (W.gates[pi].timer <= 0) say("A gate grinds open…", undefined, 1.2); W.gates[pi].timer = 6.5; } }
        if (ft === "E" && Math.abs(p.x - (fc * T + 16)) < 10) { p.state = "exit"; p.climb.t = 0; p.vx = 0; say("Level complete", undefined, 1.6); }
      }
    };

    const nextLevel = () => {
      evRef.current?.({ type: "level", index: W.level });
      if (W.level + 1 >= LEVELS.length) { over = "win"; evRef.current?.({ type: "win", timeLeft }); return; }
      levelStartMax = W.p.maxHp;
      W = makeWorld(W.level + 1, W.p.maxHp, W.p.maxHp);
    };

    const updateGuards = (dt: number) => {
      const p = W.p;
      for (const g of W.guards) {
        g.flash -= dt;
        if (g.state === "dead") continue;
        if (g.hurtT > 0) { g.hurtT -= dt; continue; }
        const dx = p.x - g.x, sameRoom = Math.floor(g.x / VW) === Math.floor(p.x / VW);
        const engaged = p.state !== "dead" && sameRoom && Math.abs(p.y - g.y) < 8 && Math.abs(dx) < 140;
        if (!engaged) { if (g.state !== "idle") g.state = "idle"; continue; }
        g.dir = Math.sign(dx) || g.dir;
        if (g.state === "idle") { g.state = "ready"; g.cd = 0.8; }
        if (g.state === "windup") { g.t -= dt; if (g.t <= 0) {
          g.state = "strike"; g.t = 0.2;
          if (Math.abs(dx) < 46 && (p.state === "ground" || p.state === "air")) {
            if (p.blockT > 0 && p.dir === -g.dir) { parries++; W.sparks.push({ x: (g.x + p.x) / 2, y: p.y - 20, t: 0.3 }); g.hurtT = 0.25; evRef.current?.({ type: "parry", total: parries }); }
            else { hurt(1); if (!isDead()) { const nx = p.x + g.dir * 8; if (!solid(col(nx + g.dir * 6), row(p.y - 1))) p.x = nx; } }
          }
        } continue; }
        if (g.state === "strike") { g.t -= dt; if (g.t <= 0) { g.state = "ready"; g.cd = (0.9 + Math.random() * 0.7) * (1 - g.skill * 0.4); } continue; }
        g.cd -= dt;
        let mv = 0;
        if (Math.abs(dx) > 34) mv = g.dir; else if (Math.abs(dx) < 22) mv = -g.dir;
        const nx = g.x + mv * 40 * dt;
        if (mv && groundUnder(nx, g.y) && !solid(col(nx + mv * 6), row(g.y - 1))) g.x = nx;
        if (g.cd <= 0 && Math.abs(dx) < 50) { g.state = "windup"; g.t = 0.5 - 0.1 * g.skill; }
      }
    };

    const updateWorld = (dt: number) => {
      for (const [key, t] of W.loose) {
        const nt = t + dt; W.loose.set(key, nt);
        if (nt > 0.45) { const [c, r] = key.split(",").map(Number); W.grid[r][c] = " "; W.loose.delete(key); W.debris.push({ x: c * T, y: r * T, vy: 0, hit: false }); }
      }
      for (const d of W.debris) {
        d.vy += GRAV * dt; d.y += d.vy * dt;
        const p = W.p;
        if (!d.hit && p.state !== "dead" && p.x > d.x - 4 && p.x < d.x + 36 && p.y - 28 < d.y + 10 && p.y > d.y + 10) { d.hit = true; p.hp--; p.hurtT = 0.4; say("Crushed by falling stone", undefined, 1); if (p.hp <= 0) die("fall"); }
        const c = col(d.x + 16), r = row(d.y + 32);
        if (solid(c, r) || d.y > ROWS * T + 40) { if (d.y < ROWS * T) W.rubble.push({ x: d.x, y: r * T }); d.y = 1e9; }
      }
      W.debris = W.debris.filter((d) => d.y < 1e8);
      const p = W.p;
      for (const g of W.gates) {
        g.timer -= dt;
        const inside = Math.abs(p.x - (g.c * T + 16)) < 22 && row(p.y - 1) === g.r;
        if (g.timer > 0 || (inside && g.open > 0.3)) g.open = Math.min(1, g.open + dt * 1.6); else g.open = Math.max(0, g.open - dt * 0.45);
      }
      for (const pl of W.plates) pl.down -= dt;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < W.cols; c++) if (W.grid[r][c] === "^") {
        const key = `${c},${r}`; const near = Math.abs(p.x - (c * T + 16)) < 52 && row(p.y - 1) === r;
        const v = W.spikes.get(key) ?? 0; W.spikes.set(key, near ? Math.min(1, v + dt * 8) : Math.max(0, v - dt * 1.5));
      }
      for (const s of W.sparks) s.t -= dt;
      W.sparks = W.sparks.filter((s) => s.t > 0);
      if (W.msg) { W.msg.t -= dt; if (W.msg.t <= 0) W.msg = null; }
    };

    // ---------- animation ----------
    const approach = (a: Actor, target: Pose, dt: number) => { const k = 1 - Math.exp(-dt * 16); for (const key of Object.keys(target) as (keyof Pose)[]) a.pose[key] = lerp(a.pose[key], target[key], k); };
    const runPose = (ph: number, amp: number, lean: number): Pose => {
      const s = Math.sin(ph);
      return { lean, drop: Math.abs(Math.sin(ph)) * 1.2 * amp, f1: amp * 0.8 * s, f2: 0.25 + 1.1 * Math.max(0, Math.cos(ph)) * amp, b1: -amp * 0.8 * s, b2: 0.25 + 1.1 * Math.max(0, -Math.cos(ph)) * amp,
        af1: -0.7 * amp * s, af2: 0.9, ab1: 0.7 * amp * s, ab2: 0.9, sword: 0, reach: 0 };
    };
    const fightPose = (strikeP: number, block: boolean): Pose => ({
      lean: block ? -0.05 : 0.05 + 0.15 * Math.sin(strikeP * Math.PI), drop: 2, f1: 0.45 + 0.35 * Math.sin(strikeP * Math.PI), f2: 0.35, b1: -0.4, b2: 0.15,
      af1: block ? 2.5 : 1.15 + 0.45 * Math.sin(strikeP * Math.PI), af2: block ? -1.1 : 0.35 - 0.35 * Math.sin(strikeP * Math.PI), ab1: -1.0, ab2: 1.6, sword: block ? -0.2 : 0.25, reach: 6 * Math.sin(strikeP * Math.PI),
    });
    const animPlayer = (dt: number) => {
      const p = W.p; let t: Pose;
      const foe = nearestFoe();
      if (p.state === "hang") t = { ...P0, drop: 7, af1: 3.0, af2: 0.05, ab1: 3.0, ab2: 0.05, f1: 0.15 * Math.sin(clock * 2), f2: 0.2, b1: -0.1 * Math.sin(clock * 2), b2: 0.3 };
      else if (p.state === "climb") { const c = p.climb.t; t = c < 0.55 ? { ...P0, drop: 7 - 10 * (c / 0.55), af1: 2.6, af2: 0.6, ab1: 2.6, ab2: 0.6, f1: 0.9, f2: 1.6, b1: 0.2, b2: 1.0, lean: 0.3 } : { ...P0, drop: 6 * (1 - (c - 0.55) / 0.45), lean: 0.5 * (1 - (c - 0.55) / 0.45), f1: 1.2, f2: 2.0, b1: 0.1, b2: 1.2, af1: 1.0, af2: 0.4, ab1: 0.8, ab2: 0.6 }; }
      else if (p.state === "air") t = p.vy < 0 ? { ...P0, lean: 0.15, f1: 1.1, f2: 1.5, b1: -0.35, b2: 0.9, af1: 2.4, af2: 0.3, ab1: 1.4, ab2: 0.5 } : { ...P0, f1: 0.4 + 0.15 * Math.sin(clock * 20), f2: 0.6, b1: -0.25, b2: 0.5, af1: 2.6, af2: 0.4, ab1: 2.2, ab2: 0.6 };
      else if (p.state === "exit") t = runPose(p.phase += dt * 6, 0.35, 0.05);
      else if (foe || p.strikeT > 0) t = fightPose(p.strikeT > 0 ? 1 - p.strikeT / 0.38 : 0, p.blockT > 0);
      else if (Math.abs(p.vx) > 5) { p.phase += Math.abs(p.vx) * dt * (p.walking ? 0.16 : 0.115); t = runPose(p.phase, p.walking ? 0.4 : 1, p.walking ? 0.04 : 0.2); }
      else t = { ...P0, drop: Math.sin(clock * 2) * 0.4 };
      if (p.hurtT > 0) t = { ...t, lean: -0.35 };
      approach(p, t, dt);
    };
    const animGuard = (g: Guard, dt: number) => {
      if (g.state === "idle") { approach(g, { ...P0, af1: 0.3, af2: 0.4, sword: 0.6 }, dt); return; }
      if (g.state === "dead") return;
      const strikeP = g.state === "windup" ? -0.4 : g.state === "strike" ? 0.5 : 0;
      const t = g.state === "windup" ? { ...fightPose(0, false), af1: 2.3, af2: 0.9, lean: -0.1 } : fightPose(Math.max(0, strikeP), false);
      approach(g, t, dt);
    };

    // ---------- drawing ----------
    const drawFigure = (a: Actor, main: string, shade: string, sash: string, ox: number, guard: boolean, alpha = 1, swordOn = true) => {
      const q = a.pose, d = a.dir, x = a.x - ox + q.reach * d, y = a.y + q.drop;
      ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const hip = { x, y: y - 13 };
      const sh = { x: hip.x + Math.sin(q.lean) * 11 * d, y: hip.y - Math.cos(q.lean) * 11 };
      const limb = (o: { x: number; y: number }, a1: number, a2: number, len: number, w: number, color: string, knee = true) => {
        const j = { x: o.x + Math.sin(a1) * len * d, y: o.y + Math.cos(a1) * len };
        const a3 = knee ? a1 - a2 : a1 + a2;
        const e = { x: j.x + Math.sin(a3) * len * d, y: j.y + Math.cos(a3) * len };
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(j.x, j.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        return { e, a3 };
      };
      limb(hip, q.b1, q.b2, 7, 3, shade);
      limb(sh, q.ab1, q.ab2, 6, 2.6, shade, false);
      ctx.strokeStyle = main; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      if (mono && guard) { ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.setLineDash([1, 2]); ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = sash; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hip.x - 2.5, hip.y - 1); ctx.lineTo(hip.x + 2.5, hip.y - 1); ctx.stroke();
      limb(hip, q.f1, q.f2, 7, 3.2, main);
      const head = { x: sh.x + Math.sin(q.lean) * 4 * d, y: sh.y - 4.5 };
      ctx.fillStyle = main; ctx.beginPath(); ctx.arc(head.x, head.y, 3.4, 0, Math.PI * 2); ctx.fill();
      if (guard) { ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(head.x - 4, head.y - 1); ctx.lineTo(head.x, head.y - 8); ctx.lineTo(head.x + 4, head.y - 1); ctx.fill(); }
      else { ctx.fillStyle = sash; ctx.fillRect(head.x - 3.5, head.y - 3.5, 7, 2); }
      const arm = limb(sh, q.af1, q.af2, 6, 2.8, main, false);
      if (swordOn) {
        const sa = arm.a3 + q.sword;
        ctx.strokeStyle = pal.steel; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(arm.e.x, arm.e.y); ctx.lineTo(arm.e.x + Math.sin(sa) * 15 * d, arm.e.y + Math.cos(sa) * 15); ctx.stroke();
        ctx.strokeStyle = pal.floor; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(arm.e.x + Math.cos(sa) * 2.5 * d, arm.e.y - Math.sin(sa) * 2.5); ctx.lineTo(arm.e.x - Math.cos(sa) * 2.5 * d, arm.e.y + Math.sin(sa) * 2.5); ctx.stroke();
      }
      ctx.restore();
    };
    const drawFallen = (a: Actor, color: string, ox: number) => {
      const x = a.x - ox, y = a.y - 2;
      ctx.save(); ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 10 * a.dir, y); ctx.lineTo(x + 6 * a.dir, y); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6 * a.dir, y); ctx.lineTo(x + 14 * a.dir, y - 1); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x - 13 * a.dir, y - 1, 3.2, 0, 7); ctx.fill(); ctx.restore();
    };

    const drawTile = (c: number, r: number, ox: number) => {
      const t = tile(c, r), x = c * T - ox, y = r * T;
      if (t === "#" || t === "L") {
        let jx = 0, jy = 0;
        if (t === "L" && W.loose.has(`${c},${r}`)) { jx = Math.random() * 2 - 1; jy = Math.random() * 2 - 1; }
        ctx.fillStyle = pal.wall; ctx.fillRect(x + jx, y + jy, T, T);
        ctx.fillStyle = pal.mortar;
        for (let i = 0; i < 4; i++) { ctx.fillRect(x + jx, y + jy + i * 8 + 7, T, 1); const off = (i + r + c) % 2 ? 0 : 8; ctx.fillRect(x + jx + off + 4, y + jy + i * 8, 1, 7); ctx.fillRect(x + jx + off + 20, y + jy + i * 8, 1, 7); }
        if (!solid(c, r - 1) && tile(c, r - 1) !== "G") { ctx.fillStyle = pal.floor; ctx.fillRect(x + jx, y + jy, T, 3); }
        if (t === "L") { ctx.strokeStyle = pal.floor; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6 + jx, y + 4 + jy); ctx.lineTo(x + 14 + jx, y + 10 + jy); ctx.lineTo(x + 11 + jx, y + 16 + jy); ctx.stroke(); }
        return;
      }
      if (t === "^") {
        const v = W.spikes.get(`${c},${r}`) ?? 0; const hgt = 3 + 11 * v;
        ctx.fillStyle = pal.spike;
        for (let i = 0; i < 4; i++) { const sx = x + 3 + i * 7; ctx.beginPath(); ctx.moveTo(sx, y + T); ctx.lineTo(sx + 3, y + T - hgt); ctx.lineTo(sx + 6, y + T); ctx.fill(); }
      } else if (t === "p") {
        const pl = W.plates.find((q) => q.c === c && q.r === r); const down = (pl?.down ?? 0) > 0;
        ctx.fillStyle = pal.floor; ctx.fillRect(x + 4, y + T - (down ? 2 : 4), 24, down ? 2 : 4);
      } else if (t === "G") {
        const g = gateAt(c, r); const hgt = T * (1 - (g?.open ?? 0));
        ctx.fillStyle = pal.floor; ctx.fillRect(x + 2, y, 28, 3);
        ctx.strokeStyle = pal.steel; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 5 + i * 5.5, y + 2); ctx.lineTo(x + 5 + i * 5.5, y + hgt); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x + 4, y + hgt - 2); ctx.lineTo(x + 28, y + hgt - 2); ctx.stroke();
      } else if (t === "!" || t === "+") {
        const big = t === "+"; const cx = x + 16, by = y + T - 2 + Math.sin(clock * 3 + c) * 0.6;
        ctx.fillStyle = big ? pal.blue : pal.red; ctx.beginPath(); ctx.arc(cx, by - 5, big ? 6 : 4.5, 0, 7); ctx.fill();
        ctx.fillRect(cx - 1.5, by - (big ? 16 : 13), 3, 6);
        ctx.fillStyle = pal.text; ctx.fillRect(cx - 2, by - (big ? 17 : 14), 4, 2);
        if (!mono) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(cx - 2, by - 7, 1.5, 3); }
      } else if (t === "E") {
        ctx.fillStyle = mono ? "#000" : "#0a0e17"; ctx.fillRect(x + 4, y - 26, 24, T + 26);
        ctx.strokeStyle = pal.exit; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + T); ctx.lineTo(x + 4, y - 14); ctx.arc(x + 16, y - 14, 12, Math.PI, 0); ctx.lineTo(x + 28, y + T); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = pal.exit; ctx.globalAlpha = 0.25 + i * 0.15; ctx.fillRect(x + 6, y + T - 4 - i * 6, 20, 2); }
        ctx.globalAlpha = 1;
      }
    };

    const draw = () => {
      const p = W.p;
      const rooms = Math.ceil(W.cols / 10);
      const room = Math.max(0, Math.min(rooms - 1, Math.floor(p.x / VW)));
      const ox = room * VW;
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, VW, VH + HUD);
      if (!mono) { ctx.fillStyle = pal.bgBrick; for (let y = 0; y < VH; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < VW; x += 24) ctx.fillRect(x, y, 22, 10); }
      // torches
      for (let c = room * 10 + 2; c < room * 10 + 10; c += 5) {
        const r = 1; if (solid(c, r)) continue;
        const x = c * T - ox + 16, y = r * T + 14;
        ctx.fillStyle = pal.floor; ctx.fillRect(x - 1, y, 3, 8);
        const f = 3 + Math.sin(clock * 13 + c) * 1 + Math.random();
        ctx.fillStyle = mono ? "#fff" : "#ffb347"; ctx.beginPath(); ctx.ellipse(x + 0.5, y - 2, 2.5, f, 0, 0, 7); ctx.fill();
        if (!mono) { ctx.fillStyle = "rgba(255,180,80,.06)"; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); }
      }
      for (let r = 0; r < ROWS; r++) for (let c = room * 10 - 1; c <= room * 10 + 10; c++) drawTile(c, r, ox);
      ctx.fillStyle = pal.floor; for (const rb of W.rubble) { if (rb.x - ox < -32 || rb.x - ox > VW) continue; ctx.fillRect(rb.x - ox + 4, rb.y - 3, 6, 3); ctx.fillRect(rb.x - ox + 14, rb.y - 2, 9, 2); ctx.fillRect(rb.x - ox + 24, rb.y - 4, 4, 4); }
      for (const d of W.debris) { ctx.fillStyle = pal.wall; ctx.fillRect(d.x - ox, d.y, T, 10); ctx.fillStyle = pal.floor; ctx.fillRect(d.x - ox, d.y, T, 3); }
      for (const g of W.guards) {
        if (Math.floor(g.x / VW) !== room) continue;
        if (g.state === "dead") drawFallen(g, pal.guard, ox);
        else drawFigure(g, g.flash > 0 ? pal.text : pal.guard, pal.guardShade, g.strong ? pal.floor : pal.guardShade, ox, true, 1, true);
        if (g.state !== "dead" && g.state !== "idle") for (let i = 0; i < g.max; i++) { ctx.fillStyle = i < g.hp ? pal.guard : pal.mortar; ctx.beginPath(); const hx = VW - 10 - i * 9; ctx.moveTo(hx, VH + 4); ctx.lineTo(hx + 6, VH + 4); ctx.lineTo(hx + 3, VH + 12); ctx.fill(); }
      }
      if (p.state === "dead") drawFallen(p, pal.hero, ox);
      else drawFigure(p, p.hurtT > 0 && Math.floor(clock * 20) % 2 ? pal.red : pal.hero, pal.heroShade, pal.sash, ox, false, p.state === "exit" ? Math.max(0, 1 - p.climb.t / 1.4) : 1, !!nearestFoe() || p.strikeT > 0);
      for (const s of W.sparks) { ctx.strokeStyle = mono ? "#fff" : "#ffe08a"; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i + clock * 30; ctx.beginPath(); ctx.moveTo(s.x - ox, s.y); ctx.lineTo(s.x - ox + Math.cos(a) * 7, s.y + Math.sin(a) * 7); ctx.stroke(); } }
      // HUD
      ctx.fillStyle = pal.hud; ctx.fillRect(0, VH, VW, HUD);
      if (mono) { ctx.fillStyle = "#fff"; ctx.fillRect(0, VH, VW, 1); }
      for (let i = 0; i < p.maxHp; i++) { ctx.fillStyle = i < p.hp ? pal.red : pal.mortar; if (mono && i >= p.hp) { ctx.strokeStyle = "#fff"; } const hx = 6 + i * 9; ctx.beginPath(); ctx.moveTo(hx, VH + 4); ctx.lineTo(hx + 6, VH + 4); ctx.lineTo(hx + 3, VH + 12); ctx.closePath(); if (mono && i >= p.hp) ctx.stroke(); else ctx.fill(); }
      ctx.fillStyle = timeLeft < 60 && Math.floor(clock * 2) % 2 ? pal.red : pal.text;
      ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const mm = Math.floor(timeLeft / 60), ss = Math.floor(timeLeft % 60);
      ctx.fillText(`TIME ${mm}:${String(ss).padStart(2, "0")}`, VW / 2, VH + 8.5);
      ctx.textAlign = "left"; ctx.fillStyle = pal.floor; ctx.fillText(`LV${W.level + 1}`, 64, VH + 8.5);
      if (W.msg || over || !started) {
        const lines = over === "win" ? ["You escaped the palace!", `Time remaining ${mm}:${String(ss).padStart(2, "0")}`, "Press strike to play again"] : over === "timeout" ? ["The hourglass is empty.", "Press strike to try again"] : !started ? ["PALACE ESCAPE", "← → run · ↑ jump/climb · ↓ hang", "Space: sword · jump over the spikes"] : [W.msg!.text, W.msg!.sub ?? ""];
        ctx.fillStyle = mono ? "rgba(0,0,0,.8)" : "rgba(7,10,16,.72)"; ctx.fillRect(20, 58, VW - 40, 62);
        ctx.strokeStyle = pal.floor; ctx.lineWidth = 1; ctx.strokeRect(20.5, 58.5, VW - 41, 61);
        ctx.textAlign = "center"; ctx.fillStyle = pal.text; ctx.font = "bold 12px Georgia, serif"; ctx.fillText(lines[0], VW / 2, 76);
        ctx.font = "9px monospace"; ctx.fillStyle = pal.floor; lines.slice(1).forEach((l, i) => ctx.fillText(l, VW / 2, 94 + i * 12));
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000); last = now; clock += dt;
      const lt = latch.current;
      const k: Record<string, boolean> = activeRef.current ? { ...keys.current } : {};
      if (activeRef.current) lt.forEach((n) => { k[n] = true; });
      const pk = prev.current;
      const edge = (n: string) => (!!k[n] && !pk[n]) || lt.has(n);
      if (over) { if (edge("strike")) fullRestart(); }
      else {
        if (!started && Object.values(k).some(Boolean)) started = true;
        if (started) {
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; over = "timeout"; }
          const steps = 2;
          for (let i = 0; i < steps; i++) {
            updatePlayer(dt / steps, k, i === 0 ? edge : () => false);
            updateGuards(dt / steps);
            updateWorld(dt / steps);
          }
        }
        animPlayer(dt);
        for (const g of W.guards) animGuard(g, dt);
      }
      prev.current = activeRef.current ? { ...keys.current } : {};
      lt.clear();
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mono]);

  return <canvas ref={canvasRef} width={VW} height={VH + HUD} className={`pe-canvas ${className ?? ""}`} />;
}
