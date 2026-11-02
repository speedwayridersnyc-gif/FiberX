"use client";
import { ConsoleExhibit, ConsoleMachine } from "../console/ConsoleExhibit";
import { S800_SECRETS } from "@/lib/secrets/s800";
import { Basic, S800_DIALECT } from "@/lib/basic";
import { SNAKE_S800 } from "../games/Snake";
import type { GameId } from "../games/GameHost";

function s800Color(hue: number, lum: number) {
  const l = Math.max(0, Math.min(14, lum)) / 14;
  if (hue === 0) { const v = Math.round(20 + l * 220); return `rgb(${v},${v},${v})`; }
  const h = ((hue - 1) * 25.7 + 30) % 360;
  return `hsl(${h.toFixed(0)}, 70%, ${(12 + l * 70).toFixed(0)}%)`;
}
const CARTS: Record<string, { title: string; game?: GameId; writer?: boolean }> = {
  writer: { title: "WRITER", writer: true },
  basic: { title: "BASIC" }, jungle: { title: "JUNGLE RUN", game: "jungle" }, palace: { title: "PALACE ESCAPE", game: "palace" }, snake: { title: "SNAKE", game: "snake" }, paddle: { title: "PADDLE", game: "paddle" },
};
const BG = "#1b5aa0", FG = "#a6d3ff";
const seen = new Set<string>();

const S800: ConsoleMachine = {
  id: "silicon-800", title: "Silicon 800", subtitle: "8-bit home computer & game console · 1979", year: "1979 · 8-bit, cartridge slot", catalog: S800_SECRETS,
  screen: { cols: 40, rows: 24, fontSize: 12, lineHeight: 11, bx: 32, by: 28, colors: { fg: FG, bg: BG, border: "#0a0a0a" }, upper: true, cursor: "block", glow: "#6aa8ff", font: "s800" },
  crt: { material: "wood", variant: "tv", label: "SILICON COLOR TV" },
  keyboard: "s800", body: "s800",
  media: { kind: "cart", options: [
    { id: "basic", label: "BASIC", color: "#2b2b2b", sub: "Computing language" },
    { id: "jungle", label: "JUNGLE RUN", color: "#2e6b34", sub: "Adventure" },
    { id: "palace", label: "PALACE ESCAPE", color: "#6b2430", sub: "Action" },
    { id: "writer", label: "WRITER", color: "#5a4a8a", sub: "Word processor" },
    { id: "paddle", label: "PADDLE", color: "#22495e", sub: "Sports · 1-2P" },
    { id: "snake", label: "SNAKE", color: "#8a6a12", sub: "Arcade" },
  ] },
  snakeTheme: SNAKE_S800,
  writer: { theme: "s800", secret: "s800-write" }, bootDelay: 600,
  create: (env) => {
    const { api, unlock } = env;
    let mode: "basic" | "memo" | "game" | "crash" | "writer" = "memo";
    const ready = () => { api.fresh(); api.print(S800_DIALECT.ready); };
    const basic = new Basic({
      print: (s, nl) => api.print(s, nl), clear: () => api.clear(),
      chr: (c) => (c === 6 ? "╱" : c === 7 ? "╲" : c === 125 ? "" : c === 155 ? "\n" : String.fromCharCode(c)),
      setcolor: (r, h, l) => {
        const c = s800Color(h, l);
        if (r === 2) api.colors({ bg: c }); else if (r === 1) api.colors({ fg: s800Color(0, l) }); else if (r === 4) api.colors({ border: c });
        unlock("s800-setcolor");
      },
      graphics: () => { api.clear(); api.colors({ bg: BG, fg: FG, border: "#0a0a0a" }); },
      poke: (a, v) => { if (a === 710) { api.colors({ bg: s800Color(v >> 4, v & 15) }); unlock("s800-setcolor"); } if (a === 712) api.colors({ border: s800Color(v >> 4, v & 15) }); },
    }, S800_DIALECT);
    const runTask = (isProgram: boolean) => {
      api.run(() => {
        const ok = basic.step(24);
        if ((basic.printed.match(/[╲╱]/g) || []).length > 150) unlock("s800-maze");
        return ok;
      }, (broken) => { if (broken) { api.fresh(); api.print(`STOPPED AT LINE ${basic.lastLine ?? 0}`); unlock("s800-break"); } void isProgram; ready(); });
    };
    const bootCart = () => {
      const c = env.media();
      api.clear(); api.colors({ bg: BG, fg: FG, border: "#0a0a0a" });
      unlock("s800-boot");
      if (c) { seen.add(c); if (seen.size >= 6) unlock("s800-carts"); }
      if (!c) { mode = "memo"; api.print("SILICON 800 COMPUTER - MEMO PAD"); api.print(""); unlock("s800-memo"); return; }
      const cart = CARTS[c];
      if (cart.writer) { mode = "writer"; env.write(); return; }
      if (!cart.game) { mode = "basic"; ready(); unlock("s800-basic"); return; }
      mode = "game";
      api.print(""); api.print(`      ${cart.title}`); api.print(""); api.print("      (C) SILICON HALL SOFTWARE");
      api.after(900, () => env.launch(cart.game!));
    };
    return {
      boot: bootCart,
      line: (raw) => {
        if (mode === "memo" || mode === "crash") return;
        if (mode === "writer") { env.write(); return; }
        if (mode === "game") { const c = env.media(); if (c && CARTS[c].game) env.launch(CARTS[c].game!); return; }
        const line = raw.trim().toUpperCase();
        if (!line) return;
        if (basic.enter(line) === "stored") return;
        if (/^(PRINT|\?)\s*"HELLO/.test(line)) unlock("s800-hello");
        if (line === "LIST") { basic.list(); ready(); return; }
        if (line === "NEW") { basic.newProgram(); ready(); return; }
        if (line === "DOS") { unlock("s800-dos"); api.clear(); mode = "memo"; api.print("SILICON 800 COMPUTER - MEMO PAD"); api.print(""); api.print("(NO DISK DRIVE - PRESS SYSTEM RESET"); api.print(" OR CYCLE POWER TO RETURN)"); return; }
        if (line === "BYE") { api.clear(); mode = "memo"; api.print("SELF TEST - ALL SYSTEMS NOMINAL"); api.print(""); api.after(1500, bootCart); return; }
        if (line === "HELP") { api.print("TRY PRINT, LIST, RUN, NEW, SETCOLOR 2,4,2"); api.print("GRAPHICS 0, DOS, BYE"); ready(); return; }
        if (line === "RUN") { if (!basic.start()) { ready(); return; } if (basic.program.size >= 3) unlock("s800-program"); runTask(true); return; }
        if (basic.execDirect(line)) runTask(false); else ready();
      },
      brk: () => { basic.stop(); },
      onWriterExit: () => { api.clear(); api.print(""); api.print("  WRITER CLOSED. YOUR FILES ARE ON DISK."); api.print(""); api.print("  PRESS RETURN TO REOPEN WRITER,"); api.print("  OR SWAP THE CARTRIDGE."); },
      onGameExit: () => { api.clear(); api.print(""); api.print("  GAME PAUSED."); api.print(""); api.print("  PRESS RETURN TO PLAY AGAIN,"); api.print("  OR SWAP THE CARTRIDGE."); },
      onMedia: (m, prev) => {
        if (prev && !m) {
          unlock("s800-hotswap"); mode = "crash"; api.stop(false);
          api.clear(); api.colors({ bg: "#000", fg: "#ff5050", border: "#300" });
          for (let i = 0; i < 20; i++) api.print(Array.from({ length: 40 }, () => String.fromCharCode(33 + Math.floor(Math.random() * 90))).join(""));
          api.print("*** CARTRIDGE PULLED WHILE POWERED ***");
          return;
        }
        if (m) api.after(400, () => env.reboot());
      },
    };
  },
};
export function S800Exhibit() { return <ConsoleExhibit machine={S800} />; }
