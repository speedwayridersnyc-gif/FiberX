"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribeKeys } from "@/lib/keybus";

export interface ConsoleColors { fg: string; bg: string; border: string }
export interface ConsoleApi {
  print: (s: string, newline?: boolean) => void;
  newline: () => void;
  /** start a fresh line only if the current line has content */
  fresh: () => void;
  clear: () => void;
  setPrompt: (p: string) => void;
  setBusy: (b: boolean) => void;
  colors: (c: Partial<ConsoleColors>) => void;
  getColors: () => ConsoleColors;
  /** run a task every frame until it returns false (or the user breaks) */
  run: (task: () => boolean, onDone?: (broken: boolean) => void) => void;
  stop: (broken?: boolean) => void;
  after: (ms: number, fn: () => void) => void;
}
export interface ConsoleView { lines: string[]; cur: string; input: string; prompt: string; busy: boolean; colors: ConsoleColors; cursorOn: boolean }

export function useConsole(cols: number, rows: number, initial: ConsoleColors) {
  const lines = useRef<string[]>([]);
  const cur = useRef("");
  const [tick, setTick] = useState(0);
  const [input, setInput] = useState("");
  const [prompt, setPromptS] = useState("");
  const [busy, setBusyS] = useState(false);
  const [colors, setColors] = useState(initial);
  const colorsRef = useRef(initial);
  const task = useRef<{ fn: () => boolean; done?: (b: boolean) => void } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dirty = useRef(false);
  const bump = () => { dirty.current = true; };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = task.current;
      if (t) { let ok = false; try { ok = t.fn(); } catch { ok = false; } if (!ok && task.current === t) { task.current = null; setBusyS(false); t.done?.(false); } }
      if (dirty.current) { dirty.current = false; setTick((x) => x + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); timers.current.forEach(clearTimeout); };
  }, []);

  const api = useMemo<ConsoleApi>(() => {
    const pushLine = () => { lines.current.push(cur.current); cur.current = ""; if (lines.current.length > rows * 6) lines.current.splice(0, lines.current.length - rows * 6); };
    const a: ConsoleApi = {
      print: (s, newline = true) => {
        for (const ch of s) {
          if (ch === "\n") { pushLine(); continue; }
          cur.current += ch; if (cur.current.length >= cols) pushLine();
        }
        if (newline) pushLine();
        bump();
      },
      newline: () => { pushLine(); bump(); },
      fresh: () => { if (cur.current.length) { pushLine(); bump(); } },
      clear: () => { lines.current = []; cur.current = ""; bump(); },
      setPrompt: (p) => setPromptS(p),
      setBusy: (b) => setBusyS(b),
      colors: (c) => { colorsRef.current = { ...colorsRef.current, ...c }; setColors(colorsRef.current); },
      getColors: () => colorsRef.current,
      run: (fn, done) => { task.current = { fn, done }; setBusyS(true); },
      stop: (broken = true) => { const t = task.current; task.current = null; setBusyS(false); t?.done?.(broken); },
      after: (ms, fn) => { timers.current.push(setTimeout(fn, ms)); },
    };
    return a;
  }, [cols, rows]);

  const reset = useCallback(() => { task.current = null; timers.current.forEach(clearTimeout); timers.current = []; lines.current = []; cur.current = ""; setInput(""); setBusyS(false); colorsRef.current = initial; setColors(initial); bump(); }, [initial]);

  const view: ConsoleView = { lines: lines.current, cur: cur.current, input, prompt, busy, colors, cursorOn: true };
  void tick;
  return { api, view, input, setInput, busy, reset, isRunning: () => !!task.current };
}

/** Wires key bus input into a console: typing, Enter, Backspace, Esc = break. */
export function useConsoleKeys(opts: { active: boolean; busy: boolean; upper?: boolean; maxLen?: number; setInput: (f: (s: string) => string) => void; getInput: () => string; onLine: (line: string) => void; onBreak?: () => void; onKey?: (k: string) => boolean }) {
  const ref = useRef(opts); ref.current = opts;
  useEffect(() => {
    if (!opts.active) return;
    return subscribeKeys((e) => {
      const o = ref.current;
      if (e.kind !== "down") return;
      if (o.onKey && o.onKey(e.key)) return;
      if (e.key === "Escape") { o.onBreak?.(); return; }
      if (o.busy) return;
      if (e.key === "Enter") { const line = o.getInput(); o.setInput(() => ""); o.onLine(line); }
      else if (e.key === "Backspace") o.setInput((s) => s.slice(0, -1));
      else if (e.key.length === 1) { const ch = o.upper ? e.key.toUpperCase() : e.key; o.setInput((s) => (s + ch).slice(0, o.maxLen ?? 120)); }
    });
  }, [opts.active]);
}
