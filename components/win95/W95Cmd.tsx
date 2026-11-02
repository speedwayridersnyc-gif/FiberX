"use client";
import { useEffect, useRef } from "react";
import { RetroConsole } from "../console/RetroConsole";
import { useConsole, useConsoleKeys } from "../console/useConsole";
import { createDos, DosProgram } from "@/lib/dos";

const COLORS = { fg: "#c0c0c0", bg: "#000000", border: "#000000" };
export function W95Cmd({ focused, unlock, launch, hasFloppy, onExit, onEdit }: { focused: boolean; unlock: (id: string) => void; launch: (p: DosProgram) => void; hasFloppy: () => boolean; onExit: () => void; onEdit?: (file?: string) => void }) {
  const con = useConsole(80, 25, COLORS);
  const dos = useRef<ReturnType<typeof createDos> | null>(null);
  const inputRef = useRef(con.input); inputRef.current = con.input;
  const hooks = useRef({ unlock, launch, hasFloppy, onExit, onEdit }); hooks.current = { unlock, launch, hasFloppy, onExit, onEdit };
  useEffect(() => {
    dos.current = createDos(con.api, {
      prefix: "w95", gui: true, unlock: (id) => hooks.current.unlock(id), launch: (p) => { hooks.current.launch(p); dos.current?.resume(); }, hasFloppy: () => hooks.current.hasFloppy(),
      disk: "silicon-95", edit: (f) => { hooks.current.onEdit?.(f); dos.current?.resume(); },
      exit: () => { hooks.current.unlock("w95-exit"); hooks.current.onExit(); },
    });
    con.api.print("Silicon 95. (C) Silicon Hall reconstruction 1995."); con.api.print("");
    dos.current.banner();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useConsoleKeys({
    active: focused, busy: con.busy, setInput: con.setInput, getInput: () => inputRef.current,
    onKey: (k) => !!dos.current?.key(k),
    onLine: (l) => { con.api.print(con.view.prompt + l); dos.current?.line(l); },
    onBreak: () => { if (con.isRunning()) con.api.stop(true); con.api.print("^C"); dos.current?.resume(); },
  });
  return (
    <div className="w95-cmd" style={{ width: 80 * 8 * 0.6 + 8, height: 25 * 10 + 8, position: "relative" }}>
      <RetroConsole view={con.view} cols={80} rows={25} fontSize={8} lineHeight={10} borderX={4} borderY={4} cursor="underscore" className="font-dos" />
    </div>
  );
}
