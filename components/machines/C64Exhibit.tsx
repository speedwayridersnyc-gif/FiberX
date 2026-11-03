"use client";
import { ConsoleExhibit, ConsoleMachine } from "../console/ConsoleExhibit";
import { C64_SECRETS } from "@/lib/secrets/c64";
import { Basic, C64_DIALECT } from "@/lib/basic";
import { SNAKE_C64 } from "../games/Snake";
import type { GameId } from "../games/GameHost";
import { listFiles } from "@/lib/vdisk";

const PAL = ["#000000", "#ffffff", "#883932", "#67b6bd", "#8b3f96", "#55a049", "#40318d", "#bfce72", "#8b5429", "#574200", "#b86962", "#505050", "#787878", "#94e089", "#7869c4", "#9f9f9f"];
const DISK: { name: string; type: string; blocks: number; game?: GameId | "writer" }[] = [
  { name: "SNAKE", type: "PRG", blocks: 12, game: "snake" as GameId },
  { name: "WRITER", type: "PRG", blocks: 31, game: "writer" },
  { name: "JUNGLE RUN", type: "PRG", blocks: 48, game: "jungle" as GameId },
  { name: "PALACE ESCAPE", type: "PRG", blocks: 64, game: "palace" as GameId },
  { name: "PADDLE", type: "PRG", blocks: 9, game: "paddle" as GameId },
  { name: "LUNAR SIEGE", type: "PRG", blocks: 21, game: "siege" as GameId },
  { name: "README", type: "SEQ", blocks: 1 },
];

const C64: ConsoleMachine = {
  id: "silicon-64", title: "Commodore 64", subtitle: "Commodore 8-bit breadbox · 1982", year: "1982 · 8-bit home computer", catalog: C64_SECRETS,
  screen: { cols: 40, rows: 25, fontSize: 12, lineHeight: 11, bx: 40, by: 24, colors: { fg: PAL[14], bg: PAL[6], border: PAL[14] }, upper: true, cursor: "block", glow: "#7869c4", font: "c64" },
  crt: { material: "breadbox", variant: "monitor", label: "SILICON COLOR MONITOR" },
  keyboard: "c64", body: "c64",
  media: { kind: "floppy", options: [{ id: "games", label: "GAMES DISK", color: "#1d1d1f", sub: "Insert" }] },
  snakeTheme: SNAKE_C64,
  writer: { theme: "c64", secret: "c64-write" },
  create: (env) => {
    const { api, unlock } = env;
    let loaded: GameId | "writer" | null = null, dirLoaded = false;
    const ready = () => { api.fresh(); api.print(C64_DIALECT.ready); };
    const basic = new Basic({
      print: (s, nl) => api.print(s, nl), clear: () => api.clear(),
      chr: (c) => (c === 205 ? "╲" : c === 206 ? "╱" : c === 147 ? "" : c === 13 ? "\n" : String.fromCharCode(c)),
      poke: (a, v) => { if (a === 53280) { api.colors({ border: PAL[v & 15] }); unlock("c64-poke"); } if (a === 53281) { api.colors({ bg: PAL[v & 15] }); unlock("c64-poke"); } if (a === 646) api.colors({ fg: PAL[v & 15] }); },
      sys: (a) => { if (a === 64738) { unlock("c64-reset"); basic.stop(); api.stop(false); setTimeout(env.reboot, 50); } },
    }, C64_DIALECT);
    const runProgram = () => {
      if (loaded) { const g = loaded; api.print(""); if (g === "writer") env.write(); else env.launch(g); if (g === "snake") unlock("c64-load"); return; }
      if (!basic.start()) { ready(); return; }
      if (basic.program.size >= 3) unlock("c64-program");
      api.run(() => {
        const ok = basic.step(24);
        const p = basic.printed; if ((p.match(/[╲╱]/g) || []).length > 150) unlock("c64-maze");
        return ok;
      }, (broken) => { if (broken) { api.fresh(); api.print(`BREAK IN ${basic.lastLine ?? 0}`); unlock("c64-break"); } ready(); });
    };
    const load = (raw: string) => {
      const m = raw.match(/^LOAD\s*"([^"]*)"?\s*(?:,\s*(\d+))?\s*(?:,\s*(\d+))?/);
      if (!m) { api.print(C64_DIALECT.error("syntax")); ready(); return; }
      const name = m[1], dev = m[2] ? parseInt(m[2]) : 1;
      if (dev === 1) { api.print(""); api.print("PRESS PLAY ON TAPE"); api.after(1600, () => { api.print("?TAPE DECK NOT CONNECTED"); ready(); }); return; }
      if (dev !== 8) { api.print(C64_DIALECT.error("device not present")); ready(); return; }
      if (!env.media()) { api.print(""); api.print("SEARCHING FOR " + name); api.after(700, () => { api.print(C64_DIALECT.error("device not present")); unlock("c64-nodisk"); ready(); }); return; }
      api.print(""); api.print("SEARCHING FOR " + name); api.setBusy(true);
      api.after(800, () => {
        let file = name === "*" ? DISK[0] : DISK.find((f) => f.name.startsWith(name.replace("*", "")) && name !== "");
        if (name === "$") { api.print("LOADING"); api.after(500, () => { dirLoaded = true; loaded = null; basic.newProgram(); api.setBusy(false); ready(); }); return; }
        if (!file || !file.game) { api.setBusy(false); api.print(C64_DIALECT.error("file not found")); ready(); return; }
        api.print("LOADING");
        api.after(1300, () => { loaded = file!.game!; dirLoaded = false; api.setBusy(false); if (name === "*" && m[3] === "1") unlock("c64-load"); ready(); });
      });
    };
    return {
      boot: () => {
        api.clear(); api.print("");
        api.print("    **** SILICON HALL 64 BASIC V2 ****");
        api.print(""); api.print(" 64K RAM SYSTEM  38911 BASIC BYTES FREE"); api.print("");
        ready(); unlock("c64-boot");
      },
      line: (raw) => {
        const line = raw.trim().toUpperCase();
        if (!line) return;
        if (basic.enter(line) === "stored") { loaded = null; dirLoaded = false; return; }
        if (/PRINT\s*"HELLO/.test(line) || /^\?\s*"HELLO/.test(line)) unlock("c64-hello");
        if (line === "LIST") {
          if (dirLoaded) { api.print('0 "SILICON HALL    " SH 2A'); [...DISK, ...listFiles("silicon-64").map((d) => ({ name: d.name, type: "SEQ", blocks: Math.max(1, Math.ceil(d.text.length / 254)) }))].forEach((f) => api.print(`${String(f.blocks).padEnd(4)} "${f.name}"${" ".repeat(Math.max(1, 17 - f.name.length))}${f.type}`)); api.print("580 BLOCKS FREE."); unlock("c64-dir"); }
          else if (loaded) api.print(`10 SYS2061`);
          else basic.list();
          ready(); return;
        }
        if (line === "NEW") { basic.newProgram(); loaded = null; dirLoaded = false; ready(); return; }
        if (line === "RUN") { runProgram(); return; }
        if (line.startsWith("LOAD")) { load(line); return; }
        if (line === "HELP") { api.print("TRY: PRINT, LIST, RUN, NEW, POKE, SYS,"); api.print('LOAD"$",8  LOAD"*",8,1  LOAD"JUNGLE",8'); api.print('LOAD"WRITER",8 THEN RUN = WORD PROCESSOR'); ready(); return; }
        const jumped = basic.execDirect(line);
        if (jumped) {
          api.run(() => basic.step(24), (broken) => { if (broken) { api.fresh(); api.print(`BREAK IN ${basic.lastLine ?? 0}`); unlock("c64-break"); } ready(); });
        } else ready();
      },
      brk: () => { basic.stop(); },
      onGameExit: () => { api.clear(); ready(); },
      onWriterExit: () => { api.clear(); api.colors({}); ready(); },
      onMedia: (m, prev, running) => { if (!m && running) { /* yanking disk while running: harmless on C64 */ } },
    };
  },
};

export function C64Exhibit() { return <ConsoleExhibit machine={C64} />; }
