"use client";
import { useEffect, useRef, useState } from "react";
import { subscribeKeys } from "@/lib/keybus";

const HD_FILES: Record<string, string> = {
  "welcome.txt": "Welcome to Silicon Hall!\nThis compact machine is a tribute exhibit.\nTry 'help' for a list of commands.\nRumour says the terminal hides a few secrets...",
  "guestbook.txt": "Visitors:\n - Ada was here\n - a very small dog\n - 'I miss my floppies' -- anon",
  "todo.txt": "1. dust the keyboard\n2. find the missing ball of the mouse\n3. stop the guards in Palace Escape from napping",
};
const DISK_FILES: Record<string, string> = {
  "readme.txt": "MUSEUM DISK v1.0\nThanks for inserting me!\nOn this disk:\n  readme.txt   - you are here\n  palace.app   - Palace Escape, a game\nHint: some programs don't like being ejected mid-flight.",
  "palace.app": "<binary: Palace Escape>  -- type 'open palace' to run",
};
const FORTUNES = [
  "A floppy in the drive is worth two in the drawer.",
  "You will find a secret where you least expect it.",
  "Patience: the hourglass favors the careful walker.",
  "Your next window will be your best window.",
  "Beware of loose floor tiles and loose promises.",
  "Today is a good day to reboot.",
];

export interface TerminalFlavor {
  banner: string[];
  prompt: string;
  hdFiles: Record<string, string>;
  diskFiles: Record<string, string>;
  diskName: string;
  /** return lines to handle a machine-specific command, or null to fall through */
  extra?: (cmd: string, arg: string, api: { unlock: (id: string) => void; openApp: (a: string) => void; diskIn: boolean }) => string[] | null;
}
export const CLASSIC_FLAVOR: TerminalFlavor = { banner: ["Silicon Hall Shell 1.0", "Type 'help' to begin."], prompt: ">", hdFiles: HD_FILES, diskFiles: DISK_FILES, diskName: "Museum Disk" };

export interface TerminalProps {
  flavor?: TerminalFlavor;
  focused: boolean;
  diskIn: boolean;
  unlock: (id: string) => void;
  openApp: (app: string) => void;
  eject: () => void;
  foundCount: number;
  totalSecrets: number;
}

export function Terminal({ flavor = CLASSIC_FLAVOR, focused, diskIn, unlock, openApp, eject, foundCount, totalSecrets }: TerminalProps) {
  const [lines, setLines] = useState<string[]>(flavor.banner);
  const [buf, setBuf] = useState("");
  const [rain, setRain] = useState<string[] | null>(null);
  const hist = useRef<string[]>([]);
  const hIdx = useRef(-1);
  const fortunes = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const bufRef = useRef(buf); bufRef.current = buf;
  const ctx = useRef({ diskIn, foundCount, totalSecrets }); ctx.current = { diskIn, foundCount, totalSecrets };

  useEffect(() => { bodyRef.current?.scrollTo(0, 1e6); }, [lines, buf]);

  useEffect(() => {
    if (!rain) return;
    const chars = "01#$%&*+=<>/\\|";
    let n = 0;
    const id = setInterval(() => {
      n++;
      setRain(Array.from({ length: 12 }, () => Array.from({ length: 40 }, () => (Math.random() < 0.35 ? chars[(Math.random() * chars.length) | 0] : " ")).join("")));
      if (n > 30) { clearInterval(id); setRain(null); setLines((l) => [...l, "...the static clears."]); }
    }, 90);
    return () => clearInterval(id);
  }, [rain !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (raw: string) => {
    const cmdline = raw.trim();
    const out: string[] = [`${flavor.prompt} ${raw}`];
    const HD_FILES = flavor.hdFiles, DISK_FILES = flavor.diskFiles;
    const [cmd0, ...args] = cmdline.split(/\s+/);
    const cmd = (cmd0 || "").toLowerCase();
    const arg = args.join(" ");
    const { diskIn } = ctx.current;
    const files = { ...HD_FILES, ...(diskIn ? Object.fromEntries(Object.entries(DISK_FILES).map(([k, v]) => ["disk/" + k, v])) : {}) } as Record<string, string>;
    let clear = false;
    const ex = cmd ? flavor.extra?.(cmd, arg, { unlock, openApp, diskIn }) : null;
    if (ex) { out.push(...ex); hist.current.push(cmdline); setLines((l) => [...l, ...out].slice(-200)); return; }
    switch (cmd) {
      case "": break;
      case "help":
        out.push("Commands:", " help ls cat date echo about clear", " whoami fortune open eject secrets", " history uname beep hello rain", "(…and a few that aren't listed)");
        break;
      case "ls":
        out.push(Object.keys(HD_FILES).join("  "));
        out.push(diskIn ? `disk/  (${flavor.diskName})` : "(no disk inserted)");
        if (arg.startsWith("disk")) out.splice(1, 2, diskIn ? Object.keys(DISK_FILES).join("  ") : "ls: disk: no disk in drive");
        break;
      case "cat": {
        const name = arg.replace(/^\.\//, "");
        const key = files[name] !== undefined ? name : files["disk/" + name] !== undefined ? "disk/" + name : null;
        if (!name) out.push("usage: cat <file>");
        else if (key) { out.push(...files[key].split("\n")); if (key === "disk/readme.txt") unlock("disk-readme");
          if (key === "disk/startup-sequence") unlock("disk-startup"); }
        else out.push(`cat: ${name}: no such file`);
        break;
      }
      case "date": {
        const d = new Date();
        out.push(d.toString().replace(/ GMT.*$/, ""));
        if (d.getHours() === 0) { out.push("Burning the midnight oil, are we?"); unlock("term-midnight"); }
        break;
      }
      case "echo": out.push(arg); break;
      case "about": out.push("Silicon Hall compact exhibit", "512x342 one-bit display, 128K of imagination.", "Original software by the Silicon Hall curators."); break;
      case "clear": case "cls": clear = true; break;
      case "whoami": out.push("visitor (guest of the museum)"); break;
      case "uname": out.push("HallOS 1.0 compact-68k museum-edition"); break;
      case "beep": out.push("*BEEP*"); break;
      case "history": out.push(...hist.current.slice(-10).map((h, i) => ` ${i + 1}  ${h}`)); break;
      case "secrets": out.push(`You have found ${ctx.current.foundCount} of ${ctx.current.totalSecrets} secrets.`, "Open the Secrets panel for hints."); break;
      case "fortune":
        out.push(FORTUNES[(Math.random() * FORTUNES.length) | 0]);
        if (++fortunes.current >= 3) unlock("term-fortune");
        break;
      case "hello": case "hi": out.push("Well hello there, visitor! Nice to meet you."); unlock("term-hello"); break;
      case "sudo": out.push("Nice try. The curator holds the only key."); unlock("term-sudo"); break;
      case "rm":
        if (/-rf?\s+\/(\s|$)|-rf\s*\/\*?$/.test(arg) || arg.includes("-rf /")) { out.push("I'm sorry, visitor. I'm afraid I can't do that.", "(Exhibits are protected by museum glass.)"); unlock("term-rm"); }
        else out.push("rm: files in a museum are permanent collection.");
        break;
      case "xyzzy": out.push("A hollow voice says: \"Fool.\"", "...but you feel slightly luckier."); unlock("term-xyzzy"); break;
      case "rain": case "static": out.push("It's starting to rain..."); setRain([]); unlock("term-rain"); break;
      case "open": {
        const map: Record<string, string> = { paint: "paint", minefield: "minefield", mines: "minefield", terminal: "terminal", palace: "palace", "palace.app": "palace", paddle: "paddle", write: "write", siliconwrite: "write", readme: "readme", jungle: "jungle" };
        const app = map[arg.toLowerCase()];
        if (!app) out.push("usage: open write|paint|minefield|palace|jungle|paddle|readme");
        else if ((app === "palace" || app === "readme" || app === "jungle" || app === "paddle") && !diskIn) out.push("open: insert the Museum Disk first.");
        else { out.push(`Opening ${arg}...`); openApp(app); }
        break;
      }
      case "eject": out.push(diskIn ? "Ejecting disk..." : "eject: no disk in drive"); if (diskIn) setTimeout(eject, 50); break;
      case "exit": out.push("There is no exit. Only more exhibits."); break;
      default: out.push(`${cmd}: command not found. Try 'help'.`);
    }
    if (cmdline) hist.current.push(cmdline);
    hIdx.current = -1;
    setLines((l) => (clear ? [] : [...l, ...out]).slice(-200));
  };
  const runRef = useRef(run); runRef.current = run;

  useEffect(() => {
    if (!focused) return;
    return subscribeKeys((e) => {
      if (e.kind !== "down") return;
      const k = e.key;
      if (k === "Enter") { const b = bufRef.current; setBuf(""); runRef.current(b); }
      else if (k === "Backspace") setBuf((b) => b.slice(0, -1));
      else if (k === "ArrowUp") {
        const h = hist.current; if (!h.length) return;
        hIdx.current = hIdx.current < 0 ? h.length - 1 : Math.max(0, hIdx.current - 1);
        setBuf(h[hIdx.current]);
      } else if (k === "ArrowDown") {
        const h = hist.current; if (hIdx.current < 0) return;
        hIdx.current = Math.min(h.length, hIdx.current + 1);
        setBuf(h[hIdx.current] ?? "");
      } else if (k.length === 1) setBuf((b) => (b + k).slice(0, 60));
    });
  }, [focused]);

  return (
    <div className="term" ref={bodyRef}>
      {rain ? <pre className="term-rain">{rain.join("\n")}</pre> : (
        <>
          {lines.map((l, i) => <div key={i} className="term-line">{l || "\u00a0"}</div>)}
          <div className="term-line">{flavor.prompt} {buf}<span className={`term-cursor ${focused ? "on" : ""}`}>█</span></div>
        </>
      )}
    </div>
  );
}
