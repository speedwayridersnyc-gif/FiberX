"use client";
import { ConsoleExhibit, ConsoleMachine } from "../console/ConsoleExhibit";
import { PC_SECRETS } from "@/lib/secrets/spc";
import { createDos } from "@/lib/dos";
import { BRICK_CGA } from "../s500/Brickwork";
import type { GameId } from "../games/GameHost";

const PC: ConsoleMachine = {
  id: "silicon-pc", title: "Silicon PC", subtitle: "The business computer · 1981", year: "1981 · 16-bit, PC-compatible", catalog: PC_SECRETS,
  screen: { cols: 80, rows: 25, fontSize: 11, lineHeight: 15, bx: 18, by: 14, colors: { fg: "#c8c8c8", bg: "#000000", border: "#000000" }, upper: false, cursor: "underscore", glow: "#bcd6ff", font: "dos" },
  crt: { material: "beige", variant: "monitor", label: "SILICON COLOR DISPLAY" },
  keyboard: "modelm", body: "pc",
  media: { kind: "floppy", options: [{ id: "museum", label: "MUSEUM DISK 5¼\"", color: "#151515", sub: "Insert in A:" }] },
  brickTheme: BRICK_CGA, bootDelay: 200,
  writer: { theme: "dos", secret: "pc-edit" },
  create: (env) => {
    const { api, unlock } = env;
    const dos = createDos(api, {
      prefix: "pc", unlock, hasFloppy: () => !!env.media(), disk: "silicon-pc", edit: (f) => env.write(f),
      launch: (p) => { if (p === "bricks" || p === "jungle" || p === "palace" || p === "snake" || p === "paddle") env.launch(p as GameId); else { api.print("This program requires Silicon 95."); dos.resume(); } },
    });
    let booted = false;
    let ctrl = false, alt = false;
    return {
      boot: () => {
        api.setPrompt(""); api.setBusy(true);
        api.print("SILICON HALL BIOS (C) 1981-1991  Original reconstruction"); api.print("");
        let k = 0;
        api.run(() => { k += 16; api.clear(); api.print("SILICON HALL BIOS (C) 1981-1991  Original reconstruction"); api.print(""); api.print(`Memory Test: ${Math.min(k, 640)}K${k >= 640 ? " OK" : ""}`); return k < 640; }, () => {
          api.print(""); api.print("Starting SH-DOS...");
          api.after(env.media() ? 900 : 600, () => {
            if (env.media()) { api.print(""); api.print("(Booting from the museum disk in A: is disabled; using C:)"); }
            api.print(""); api.print("Welcome to the Silicon Hall PC."); api.print("Type HELP for commands. Games live in C:\\GAMES."); api.print("");
            api.setBusy(false); dos.banner(); booted = true; unlock("pc-boot");
          });
        });
      },
      line: (l) => { if (booted) dos.line(l); },
      key: (k) => {
        if (k === "Control") { ctrl = true; setTimeout(() => (ctrl = false), 1500); }
        if (k === "Alt") { alt = true; setTimeout(() => (alt = false), 1500); }
        if ((k === "Delete") && ctrl && alt) { unlock("pc-ctrlaltdel"); env.reboot(); return true; }
        return dos.key(k);
      },
      brk: () => { if (booted) { api.print("^C"); dos.resume(); } },
      onGameExit: () => { api.clear(); dos.resume(); },
      onWriterExit: () => { api.clear(); dos.resume(); },
    };
  },
};
export function PCExhibit() { return <ConsoleExhibit machine={PC} />; }
