import type { ConsoleApi } from "@/components/console/useConsole";
import { listFiles } from "./vdisk";

export type DosProgram = "bricks" | "jungle" | "palace" | "snake" | "paddle" | "notepad" | "paint" | "minefield";
type Node = { dir: true; kids: Record<string, Node>; date: string } | { dir: false; text: string; size?: number; exe?: DosProgram; date: string };
const f = (text: string, date = "11-02-91"): Node => ({ dir: false, text, date });
const exe = (p: DosProgram, size: number, date = "06-14-92"): Node => ({ dir: false, text: "MZ\u0090\u0003 binary", size, exe: p, date });
const d = (kids: Record<string, Node>, date = "11-02-91"): Node => ({ dir: true, kids, date });

export interface DosHooks {
  /** secret id prefix, e.g. "pc" → pc-dir */
  prefix: string;
  unlock: (id: string) => void;
  launch: (p: DosProgram) => void;
  hasFloppy: () => boolean;
  gui?: boolean;
  exit?: () => void;
  reboot?: () => void;
  /** virtual disk id whose saved documents appear in C:\\DOCS */
  disk?: string;
  /** EDIT [file] */
  edit?: (file?: string) => void;
}

function makeFs(win: boolean) {
  const c: Record<string, Node> = {
    "COMMAND.COM": { dir: false, text: "MZ binary", size: 54645, date: "03-10-93" },
    "AUTOEXEC.BAT": f(`@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\GAMES${win ? ";C:\\SYS95" : ""}\nSET MUSEUM=SILICON HALL\nREM The curator left a note in C:\\MUSEUM\nECHO Welcome to the Silicon Hall PC.`),
    "CONFIG.SYS": f("FILES=30\nBUFFERS=20\nDEVICE=C:\\DOS\\HIMEM.SYS\nDOS=HIGH"),
    DOS: d({ "HIMEM.SYS": f("(driver)"), "EDIT.COM": f("(editor)"), "FORMAT.COM": f("(formatter)"), "MEM.EXE": f("(memory report)") }),
    GAMES: d({
      "BRICKS.EXE": exe("bricks", 38211), "JUNGLE.EXE": exe("jungle", 61440), "PALACE.EXE": exe("palace", 88064), "SNAKE.EXE": exe("snake", 12800), "PADDLE.EXE": exe("paddle", 9216),
      "README.TXT": f("SILICON HALL GAMES SHELF\n\nBRICKS   - break every brick. Arrow keys / mouse.\nJUNGLE   - Jungle Run. Swing on vines, mind the crocs.\nPALACE   - Palace Escape. Ledges, guards, potions.\nSNAKE    - eat, grow, don't bite yourself.\nPADDLE   - paddle tennis, 1P vs CPU or 2P. First to 11.\n\nType the name of a game to play. Esc returns to DOS."),
    }),
    MUSEUM: d({
      "WELCOME.TXT": f("Welcome, visitor.\n\nThis machine is a reconstruction, not an emulator: every\nprogram here is original. Try VER, MEM, DIR /W, and look\nfor a floppy in drive A:."),
      "CURATOR.TXT": f("Note to self: the shelf has 50 secrets per machine.\nHint: FORMAT C: is a terrible idea. Try it anyway."),
    }),
  };
  if (win) c.SYS95 = d({ "WIN.COM": f("(launcher)"), "NOTEPAD.EXE": exe("notepad", 34304, "07-11-95"), "PBRUSH.EXE": exe("paint", 183200, "07-11-95"), "MINEFLD.EXE": exe("minefield", 24064, "07-11-95"), "WIN.INI": f("[windows]\nload=\nrun=\n[Desktop]\nWallpaper=(None)\nTileWallpaper=0") }, "08-24-95");
  const a: Record<string, Node> = {
    "README.TXT": f("SILICON HALL BOOT FLOPPY\n\nIf you can read this, drive A: works. Well done!\nThere is a secret on this disk. TYPE it."),
    "SECRET.TXT": f("The treasure is behind the third vine in Jungle Run.\n(Collect every treasure for a museum secret.)"),
    "TREASURE.MAP": f("  X marks the spot\n  ~~~~~ /\\/\\ ~~~~ X ~~~~"),
  };
  return { C: d(c), A: d(a) } as Record<string, Node>;
}

export function createDos(api: ConsoleApi, h: DosHooks) {
  const fs = makeFs(!!h.gui);
  let drive = "C", path: string[] = [];
  let pending: null | { kind: "arf"; target: () => void } | { kind: "yn" } = null;
  const P = (id: string) => h.unlock(`${h.prefix}-${id}`);
  const promptStr = () => `${drive}:\\${path.join("\\")}>`;
  const showPrompt = () => { api.setPrompt(promptStr()); };
  const done = () => { api.print(""); showPrompt(); };
  const resolve = (p: string[], drv = drive): Node | null => { let n: Node = fs[drv]; for (const s of p) { if (!n.dir) return null; const k = n.kids[s]; if (!k) return null; n = k; } return n; };
  const parsePath = (arg: string): { drv: string; parts: string[] } | null => {
    let drv = drive, rest = arg.toUpperCase();
    const m = rest.match(/^([A-Z]):(.*)$/); if (m) { drv = m[1]; rest = m[2]; }
    if (!fs[drv]) return null;
    let parts = rest.startsWith("\\") ? [] : drv === drive ? [...path] : [];
    for (const s of rest.split("\\").filter(Boolean)) { if (s === "..") parts.pop(); else if (s !== ".") parts.push(s); }
    return { drv, parts };
  };
  const needFloppy = (drv: string, then: () => void) => {
    if (drv !== "A" || h.hasFloppy()) { then(); return; }
    api.print(""); api.print("Not ready reading drive A"); api.print("Abort, Retry, Fail?", false); api.setPrompt("");
    pending = { kind: "arf", target: then }; P("abort");
  };
  const fmtSize = (n: number) => n.toLocaleString("en-US");
  const dir = (args: string) => {
    const wide = /\/W/i.test(args); const target = args.replace(/\/W/i, "").trim();
    const pp = target ? parsePath(target) : { drv: drive, parts: [...path] };
    if (!pp) { api.print("Invalid drive specification"); return done(); }
    needFloppy(pp.drv, () => {
      const n = resolve(pp.parts, pp.drv);
      if (!n || !n.dir) { api.print(""); api.print("File not found"); return done(); }
      api.print(""); api.print(` Volume in drive ${pp.drv} is ${pp.drv === "A" ? "MUSEUMDISK" : "SILICONHALL"}`); api.print(` Directory of ${pp.drv}:\\${pp.parts.join("\\")}`); api.print("");
      const ents = Object.entries(n.kids); let files = 0, bytes = 0;
      if (wide) {
        const names = [...(pp.parts.length ? ["[.]", "[..]"] : []), ...ents.map(([k, v]) => (v.dir ? `[${k}]` : k))];
        for (let i = 0; i < names.length; i += 5) api.print(names.slice(i, i + 5).map((x) => x.padEnd(16)).join("").trimEnd());
        P("dirw");
      } else {
        if (pp.parts.length) { api.print(".            <DIR>        11-02-91  9:00a"); api.print("..           <DIR>        11-02-91  9:00a"); }
        for (const [k, v] of ents) {
          const [base, ext = ""] = k.split(".");
          const size = v.dir ? "<DIR>     " : fmtSize(v.size ?? v.text.length).padStart(10);
          api.print(`${base.padEnd(8)} ${ext.padEnd(3)} ${size}  ${v.date}  9:00a`);
        }
      }
      for (const [, v] of ents) if (!v.dir) { files++; bytes += v.size ?? v.text.length; }
      api.print(`${String(files).padStart(9)} file(s) ${fmtSize(bytes).padStart(14)} bytes`);
      api.print(`${" ".repeat(24)}${pp.drv === "A" ? "1,421,312" : "38,912,000"} bytes free`);
      P("dir"); if (pp.drv === "A") P("floppy");
      done();
    });
  };
  const syncDocs = () => { if (!h.disk) return; const C = fs.C; if (!C.dir) return; const kids: Record<string, Node> = {}; for (const v of listFiles(h.disk)) kids[v.name.toUpperCase()] = { dir: false, text: v.text, date: new Date(v.mtime).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }).replace(/\//g, "-") }; C.kids.DOCS = d(kids); };
  const run = (raw: string) => {
    syncDocs();
    const line = raw.trim();
    if (!line) { showPrompt(); return; }
    const [cmd0, ...restA] = line.split(/\s+/); const rest = restA.join(" ");
    let cmd = cmd0.toUpperCase();
    // allow cd.. / cd\ forms
    const cdm = cmd.match(/^(CD|CHDIR)([\\.].*)$/); if (cdm) return run(`CD ${cdm[2]}`);
    if (/^[A-Z]:$/.test(cmd)) {
      const drv = cmd[0]; if (!fs[drv]) { api.print("Invalid drive specification"); return done(); }
      needFloppy(drv, () => { drive = drv; path = []; if (drv === "A") P("floppy"); showPrompt(); });
      return;
    }
    switch (cmd) {
      case "DIR": return dir(rest);
      case "CLS": api.clear(); P("cls"); return showPrompt();
      case "VER": api.print(""); api.print(h.gui ? "Silicon 95. [Version 4.00.950]" : "SH-DOS Version 6.22 (Silicon Hall reconstruction)"); P("ver"); return done();
      case "HELP": case "?":
        api.print("For more information on a command, ask the curator.");
        ["CD       Change directory", "CLS      Clear the screen", "DATE     Show the date", "DIR      List files (/W wide)", "ECHO     Print a message", "EDIT     Full-screen text editor (EDIT NOTES.TXT)", "FORMAT   Format a disk", "MEM      Show memory", "TIME     Show the time", "TYPE     Show a text file", "VER      Show the version", "A: C:    Change drive", h.gui ? "EXIT     Close this window" : "BRICKS JUNGLE PALACE SNAKE PADDLE  Play"].forEach((x) => api.print(x));
        P("help"); return done();
      case "ECHO": api.print(rest || "ECHO is on."); return done();
      case "DATE": api.print(`Current date is ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit", year: "numeric" }).replace(",", "")}`); return done();
      case "TIME": api.print(`Current time is ${new Date().toLocaleTimeString("en-US")}`); return done();
      case "MEM": api.print(""); api.print("Memory Type        Total  =   Used  +   Free"); api.print("----------------  -------   -------   -------"); api.print("Conventional         640K       45K      595K"); api.print("Upper                155K       28K      127K"); api.print(""); api.print("Largest executable program size   595K"); P("mem"); return done();
      case "CD": case "CHDIR": {
        if (!rest) { api.print(`${drive}:\\${path.join("\\")}`); return done(); }
        const pp = parsePath(rest); if (!pp) { api.print("Invalid directory"); return done(); }
        const n = resolve(pp.parts, pp.drv);
        if (!n || !n.dir) { api.print("Invalid directory"); return done(); }
        if (pp.drv === drive) path = pp.parts;
        if (path.join("\\") === "GAMES") P("games");
        return showPrompt();
      }
      case "TYPE": {
        if (!rest) { api.print("Required parameter missing"); return done(); }
        const pp = parsePath(rest); if (!pp) { api.print("Invalid drive specification"); return done(); }
        needFloppy(pp.drv, () => {
          const n = resolve(pp.parts, pp.drv);
          if (!n) api.print("File not found - " + rest.toUpperCase());
          else if (n.dir) api.print("Access denied");
          else {
            n.text.split("\n").forEach((l) => api.print(l));
            const name = pp.parts[pp.parts.length - 1];
            if (name === "AUTOEXEC.BAT") P("autoexec");
            if (pp.drv === "A" && name === "SECRET.TXT") P("secret");
          }
          done();
        });
        return;
      }
      case "FORMAT": {
        const tgt = rest.toUpperCase().trim();
        if (tgt.startsWith("A")) {
          needFloppy("A", () => { api.print("Insert new diskette for drive A:"); api.print("Checking existing disk format."); api.setBusy(true); let pct = 0; api.run(() => { pct += 1; if (pct % 10 === 0) api.print(`${pct} percent completed.`); return pct < 100; }, () => { api.print("Format complete."); api.print("(Museum magic: your files were restored.)"); P("format"); done(); }); });
          return;
        }
        if (tgt.startsWith("C")) { api.print(""); api.print("WARNING, ALL DATA ON NON-REMOVABLE DISK"); api.print("DRIVE C: WILL BE LOST!"); api.print("Proceed with Format (Y/N)?", false); api.setPrompt(""); pending = { kind: "yn" }; return; }
        api.print("Required parameter missing"); return done();
      }
      case "EDIT": if (h.edit) { const nm = rest.trim().toUpperCase().split("\\").pop() || undefined; P("edit"); h.edit(nm); return; } api.print("Bad command or file name"); return done();
      case "EXIT": if (h.exit) { h.exit(); return; } return showPrompt();
      case "WIN": if (h.gui) { api.print("Silicon 95 is already running."); return done(); } api.print("Bad command or file name"); return done();
      case "AUTOEXEC": case "AUTOEXEC.BAT": api.print("Welcome to the Silicon Hall PC."); return done();
    }
    // executables: look in cwd then PATH
    const name = cmd.replace(/\.(EXE|COM)$/, "");
    const dirs = [[...path], ["DOS"], ["GAMES"], ...(h.gui ? [["SYS95"]] : [])];
    for (const dd of dirs) {
      const n = resolve(dd, drive === "A" ? "C" : drive);
      if (n && n.dir) { const e = n.kids[`${name}.EXE`] ?? n.kids[`${name}.COM`]; if (e && !e.dir && e.exe) { P("run"); h.launch(e.exe); return; } }
    }
    api.print("Bad command or file name"); done();
  };
  return {
    banner: () => { showPrompt(); },
    prompt: promptStr,
    line: (raw: string) => {
      if (pending) return; // handled by key
      run(raw);
    },
    key: (k: string): boolean => {
      if (!pending) return false;
      const K = k.toUpperCase();
      if (pending.kind === "arf") {
        if (K === "R") { api.print("R"); const t = pending.target; if (h.hasFloppy()) { pending = null; t(); } else { api.print("Not ready reading drive A"); api.print("Abort, Retry, Fail?", false); } return true; }
        if (K === "A" || K === "F") { api.print(K); pending = null; if (K === "F" ) api.print("Current drive is no longer valid"); done(); return true; }
        return true;
      }
      if (pending.kind === "yn") {
        if (K === "Y" || K === "N") { api.print(K); pending = null; P("format"); if (K === "Y") { api.print(""); api.print("Nice try. Museum exhibits are read-only."); api.print("No data was harmed."); } done(); return true; }
        return true;
      }
      return false;
    },
    resume: () => { api.print(""); showPrompt(); },
  };
}
