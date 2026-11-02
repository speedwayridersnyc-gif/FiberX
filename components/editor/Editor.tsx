"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { subscribeKeys } from "@/lib/keybus";
import { fileName, listFiles, readFile, writeFile, VFile } from "@/lib/vdisk";
import { cssFont, exportText, printDocument } from "@/lib/print";

export type EdTheme = "classic" | "win" | "notepad" | "s500" | "c64" | "s800" | "dos";
const B = 1, I = 2, U = 4;
const CFG: Record<EdTheme, { styled: boolean; names: "dos" | "doc" | "c64" | "free"; paper: "tractor" | "laser"; text: boolean; app: string; machine: string }> = {
  classic: { styled: true, names: "free", paper: "tractor", text: false, app: "SiliconWrite", machine: "Silicon Classic" },
  win: { styled: true, names: "doc", paper: "laser", text: false, app: "WritePad", machine: "Silicon 95" },
  notepad: { styled: false, names: "dos", paper: "laser", text: false, app: "Notepad", machine: "Silicon 95" },
  s500: { styled: false, names: "free", paper: "tractor", text: false, app: "Ed", machine: "Silicon 500" },
  c64: { styled: false, names: "c64", paper: "tractor", text: true, app: "SILICON WRITER 64", machine: "Silicon 64" },
  s800: { styled: false, names: "c64", paper: "tractor", text: true, app: "SILICON WRITER 800", machine: "Silicon 800" },
  dos: { styled: false, names: "dos", paper: "tractor", text: true, app: "EDIT", machine: "Silicon PC" },
};
const FONTS = [["serif", "Serif"], ["sans", "Sans"], ["mono", "Mono"], ["script", "Script"]];
let clipboard: { text: string; styles: number[] } = { text: "", styles: [] };

export interface EditorProps {
  theme: EdTheme; disk: string; focused: boolean;
  file?: string | null; initialText?: string;
  onExit?: () => void; onTitle?: (t: string) => void;
  unlock?: (what: "save" | "print" | "open" | "type" | "style" | "log") => void;
  /** Notepad's .LOG trick: append a timestamp when a file starting with .LOG is opened */
  logMode?: boolean;
  width?: number; height?: number;
}

export function Editor({ theme, disk, focused, file, initialText, onExit, onTitle, unlock, logMode, width, height }: EditorProps) {
  const cfg = CFG[theme];
  const [text, setText] = useState(initialText ?? "");
  const [styles, setStyles] = useState<number[]>(() => Array.from(initialText ?? "", () => 0));
  const [cur, setCur] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [typing, setTyping] = useState(0);
  const [font, setFont] = useState(theme === "classic" ? "serif" : theme === "win" ? "sans" : "mono");
  const [name, setName] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<null | { kind: "save" | "open"; input: string; sel: number; files: VFile[] }>(null);
  const [status, setStatus] = useState("");
  const [help, setHelp] = useState(false);
  const shiftHeld = useRef(false);
  const undo = useRef<{ text: string; styles: number[]; cur: number }[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const typedCount = useRef(0);
  const S = useRef({ text, styles, cur, anchor, typing, font, name, dialog }); S.current = { text, styles, cur, anchor, typing, font, name, dialog };

  const flash = (m: string) => { setStatus(m); setTimeout(() => setStatus((s) => (s === m ? "" : s)), 2600); };
  const title = `${name ?? (cfg.names === "dos" || cfg.names === "doc" ? "UNTITLED" : "Untitled")}${dirty ? " *" : ""}`;
  useEffect(() => { onTitle?.(theme === "notepad" ? `${name ?? "Untitled"} - Notepad` : theme === "win" ? `${name ?? "Document"} - WritePad` : `${cfg.app} — ${title}`); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFile = useCallback((f: VFile) => {
    let t = f.text, st = f.styles && f.styles.length === f.text.length ? f.styles : Array.from(f.text, () => 0);
    if (logMode && t.startsWith(".LOG")) { const add = `\n${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ${new Date().toLocaleDateString("en-US")}\n`; t += add; st = [...st, ...Array.from(add, () => 0)]; unlock?.("log"); }
    setText(t); setStyles(st); setCur(t.length); setAnchor(null); setName(f.name); setFont(f.font ?? font); setDirty(false); unlock?.("open");
  }, [logMode, unlock, font]);
  useEffect(() => { if (file) { const f = readFile(disk, file); if (f) openFile(f); else setName(fileName(file, cfg.names)); } }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = (): [number, number] | null => { const { cur, anchor } = S.current; if (anchor === null || anchor === cur) return null; return [Math.min(cur, anchor), Math.max(cur, anchor)]; };
  const snapshot = () => { undo.current.push({ text: S.current.text, styles: S.current.styles, cur: S.current.cur }); if (undo.current.length > 50) undo.current.shift(); };
  const replace = (ins: string, insStyle?: number[]) => {
    snapshot();
    const { text, styles, cur, typing } = S.current; const r = sel() ?? [cur, cur];
    const st = insStyle ?? Array.from(ins, () => typing);
    const nt = text.slice(0, r[0]) + ins + text.slice(r[1]); const ns = [...styles.slice(0, r[0]), ...st, ...styles.slice(r[1])];
    setText(nt); setStyles(ns); setCur(r[0] + ins.length); setAnchor(null); setDirty(true);
  };
  const del = (dir: -1 | 1) => {
    const r = sel(); const { text, styles, cur } = S.current;
    if (r) { replace(""); return; }
    if (dir < 0 && cur === 0) return; if (dir > 0 && cur >= text.length) return;
    snapshot();
    const a = dir < 0 ? cur - 1 : cur;
    setText(text.slice(0, a) + text.slice(a + 1)); setStyles([...styles.slice(0, a), ...styles.slice(a + 1)]); setCur(a); setDirty(true);
  };
  const lineInfo = (t: string, i: number) => { const ls = t.lastIndexOf("\n", i - 1) + 1; let le = t.indexOf("\n", i); if (le < 0) le = t.length; return { ls, le, col: i - ls }; };
  const move = (to: number, extend: boolean) => {
    const { cur, anchor, text } = S.current; const n = Math.max(0, Math.min(text.length, to));
    if (extend) { if (anchor === null) setAnchor(cur); } else setAnchor(null);
    setCur(n);
  };
  const vert = (dir: number, n = 1) => {
    const { text, cur } = S.current; let i = cur; const { col } = lineInfo(text, cur);
    for (let k = 0; k < n; k++) {
      const { ls, le } = lineInfo(text, i);
      if (dir < 0) { if (ls === 0) { i = 0; break; } const p = lineInfo(text, ls - 1); i = Math.min(p.ls + col, p.le); }
      else { if (le >= text.length) { i = text.length; break; } const nx = lineInfo(text, le + 1); i = Math.min(nx.ls + col, nx.le); }
    }
    return i;
  };
  const toggleStyle = (bit: number) => {
    if (!cfg.styled) return;
    const r = sel(); unlock?.("style");
    if (r) { snapshot(); const { styles } = S.current; const all = styles.slice(r[0], r[1]).every((s) => s & bit); setStyles(styles.map((s, i) => (i >= r[0] && i < r[1] ? (all ? s & ~bit : s | bit) : s))); setDirty(true); }
    else setTyping((t) => t ^ bit);
  };
  const plain = () => { const r = sel(); if (r) { snapshot(); setStyles((st) => st.map((s, i) => (i >= r[0] && i < r[1] ? 0 : s))); } setTyping(0); };

  const save = (as?: string) => {
    const nm = as ?? S.current.name;
    if (!nm) { setDialog({ kind: "save", input: "", sel: 0, files: listFiles(disk) }); return; }
    const n = fileName(nm, cfg.names);
    writeFile(disk, { name: n, text: S.current.text, styles: cfg.styled ? S.current.styles : undefined, font: S.current.font, kind: cfg.app });
    setName(n); setDirty(false); flash(`Saved ${n}`); unlock?.("save");
  };
  const doOpen = () => setDialog({ kind: "open", input: "", sel: 0, files: listFiles(disk) });
  const doPrint = () => { printDocument({ title: S.current.name ?? "untitled", text: S.current.text, styles: cfg.styled ? S.current.styles : undefined, font: S.current.font, machine: cfg.machine, paper: cfg.paper }); flash("Printing… (saved as an image)"); unlock?.("print"); };
  const doNew = () => { snapshot(); setText(""); setStyles([]); setCur(0); setAnchor(null); setName(null); setDirty(false); };
  const doExport = () => { exportText(S.current.name ?? "untitled", S.current.text); flash("Exported .txt"); };
  const copy = (cut: boolean) => { const r = sel(); if (!r) return; clipboard = { text: S.current.text.slice(r[0], r[1]), styles: S.current.styles.slice(r[0], r[1]) }; try { navigator.clipboard?.writeText(clipboard.text); } catch {} if (cut) replace(""); };
  const paste = () => { if (clipboard.text) replace(clipboard.text, clipboard.styles); };
  const selectAll = () => { setAnchor(0); setCur(S.current.text.length); };
  const doUndo = () => { const u = undo.current.pop(); if (u) { setText(u.text); setStyles(u.styles); setCur(u.cur); setAnchor(null); } };

  const dialogKey = (k: string) => {
    const d = S.current.dialog!;
    if (k === "Escape") { setDialog(null); return; }
    if (k === "Enter") {
      if (d.kind === "save") { if (d.input.trim()) { setDialog(null); save(d.input); } }
      else { const f = d.input ? readFile(disk, fileName(d.input, cfg.names)) ?? d.files.find((x) => x.name.toLowerCase().startsWith(d.input.toLowerCase())) : d.files[d.sel]; if (f) { setDialog(null); openFile(f); } else flash("File not found"); }
      return;
    }
    if (k === "ArrowDown") setDialog({ ...d, sel: Math.min(d.files.length - 1, d.sel + 1) });
    else if (k === "ArrowUp") setDialog({ ...d, sel: Math.max(0, d.sel - 1) });
    else if (k === "Backspace") setDialog({ ...d, input: d.input.slice(0, -1) });
    else if (k.length === 1) setDialog({ ...d, input: (d.input + k).slice(0, 31) });
  };

  useEffect(() => {
    if (!focused) return;
    return subscribeKeys((e) => {
      if (e.key === "Shift") { shiftHeld.current = e.kind === "down"; return; }
      if (e.kind !== "down") return;
      const k = e.key; const ext = !!e.shift || shiftHeld.current;
      if (S.current.dialog) { dialogKey(k); return; }
      if (e.ctrl) {
        ({ s: () => save(), o: doOpen, p: doPrint, b: () => toggleStyle(B), i: () => toggleStyle(I), u: () => toggleStyle(U), a: selectAll, c: () => copy(false), x: () => copy(true), v: paste, n: doNew, z: doUndo } as Record<string, () => void>)[k]?.();
        return;
      }
      const { cur, text } = S.current;
      switch (k) {
        case "ArrowLeft": move(sel() && !ext ? sel()![0] : cur - 1, ext); return;
        case "ArrowRight": move(sel() && !ext ? sel()![1] : cur + 1, ext); return;
        case "ArrowUp": move(vert(-1), ext); return;
        case "ArrowDown": move(vert(1), ext); return;
        case "PageUp": move(vert(-1, 10), ext); return;
        case "PageDown": move(vert(1, 10), ext); return;
        case "Home": move(lineInfo(text, cur).ls, ext); return;
        case "End": move(lineInfo(text, cur).le, ext); return;
        case "Backspace": del(-1); return;
        case "Delete": del(1); return;
        case "Enter": replace("\n"); return;
        case "Tab": replace("    "); return;
        case "Escape": if (sel()) setAnchor(null); else if (help) setHelp(false); else onExit?.(); return;
        case "F1": setHelp((h) => !h); return;
        case "F2": save(); return;
        case "F3": doOpen(); return;
        case "F4": doPrint(); return;
        case "F7": doNew(); return;
      }
      if (k.length === 1) { replace(k); if (++typedCount.current >= 20) unlock?.("type"); }
    });
  }, [focused, help]); // eslint-disable-line react-hooks/exhaustive-deps

  // pointer: place caret / drag-select
  const idxAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null; const span = el?.closest?.("[data-i]") as HTMLElement | null;
    if (span && pageRef.current?.contains(span)) { const i = parseInt(span.dataset.i!); const r = span.getBoundingClientRect(); return x > r.left + r.width / 2 && span.textContent !== "\n" ? i + 1 : i; }
    if (el && pageRef.current?.contains(el)) return S.current.text.length;
    return null;
  };
  const dragging = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    const i = idxAt(e.clientX, e.clientY); if (i === null) return;
    e.preventDefault();
    if (e.shiftKey || shiftHeld.current) { if (S.current.anchor === null) setAnchor(S.current.cur); } else setAnchor(i);
    setCur(i); dragging.current = true;
    if (e.detail === 2) { const t = S.current.text; let a = i, b = i; while (a > 0 && /\w/.test(t[a - 1])) a--; while (b < t.length && /\w/.test(t[b])) b++; setAnchor(a); setCur(b); dragging.current = false; }
  };
  const onMove = (e: React.PointerEvent) => { if (!dragging.current || !e.buttons) return; const i = idxAt(e.clientX, e.clientY); if (i !== null) setCur(i); };
  const onUp = () => { dragging.current = false; if (S.current.anchor === S.current.cur) setAnchor(null); };

  useLayoutEffect(() => {
    const p = pageRef.current, c = caretRef.current; if (!p || !c) return;
    const top = c.offsetTop, h = c.offsetHeight || 12;
    if (top < p.scrollTop) p.scrollTop = top - 4; else if (top + h > p.scrollTop + p.clientHeight) p.scrollTop = top + h - p.clientHeight + 4;
  }, [cur, text]);

  const r = sel();
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i <= text.length; i++) {
    if (i === cur) nodes.push(<span key="caret" ref={caretRef} className={`ed-caret ${focused ? "on" : ""}`} />);
    if (i === text.length) break;
    const st = styles[i] ?? 0; const ch = text[i];
    nodes.push(<span key={i} data-i={i} className={`${st & B ? "b" : ""} ${st & I ? "i" : ""} ${st & U ? "u" : ""} ${r && i >= r[0] && i < r[1] ? "sel" : ""}`}>{ch}</span>);
  }
  const { ls } = lineInfo(text, cur); const lineNo = text.slice(0, ls).split("\n").length; const col = cur - ls + 1;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const menu = (items: [string, () => void, string?][]) => items.map(([label, fn, hint]) => <button key={label} className="ed-mi" onPointerDown={(e) => e.preventDefault()} onClick={fn} title={hint}>{label}</button>);
  const fileItems: [string, () => void, string?][] = [["New", doNew, "Ctrl+N / F7"], ["Open…", doOpen, "Ctrl+O / F3"], ["Save", () => save(), "Ctrl+S / F2"], ["Save As…", () => setDialog({ kind: "save", input: S.current.name ?? "", sel: 0, files: listFiles(disk) })], ["Print", doPrint, "Ctrl+P / F4"], ["Export .txt", doExport]];

  return (
    <div className={`ed ed-${theme} ${cfg.text ? "ed-textmode" : ""}`} style={{ width, height }}>
      {cfg.text ? (
        <div className="ed-topbar">
          {theme === "dos" ? <>{menu([["File", doOpen], ["Save", () => save()], ["Print", doPrint], ["New", doNew], ["Exit", () => onExit?.()]])}<span className="ed-tb-title">{title}</span></>
            : <><span className="ed-tb-title">{cfg.app}</span><span className="ed-tb-file">{title}</span></>}
        </div>
      ) : (
        <div className="ed-menubar">
          {menu(fileItems.slice(0, theme === "notepad" ? 5 : 6))}
          {cfg.styled && <>
            <span className="ed-sep" />
            <select className="ed-font" value={font} onChange={(e) => { setFont(e.target.value); setDirty(true); unlock?.("style"); }} aria-label="Font">{FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <button className={`ed-st b ${typing & B ? "on" : ""}`} onPointerDown={(e) => e.preventDefault()} onClick={() => toggleStyle(B)} aria-label="Bold">B</button>
            <button className={`ed-st i ${typing & I ? "on" : ""}`} onPointerDown={(e) => e.preventDefault()} onClick={() => toggleStyle(I)} aria-label="Italic">I</button>
            <button className={`ed-st u ${typing & U ? "on" : ""}`} onPointerDown={(e) => e.preventDefault()} onClick={() => toggleStyle(U)} aria-label="Underline">U</button>
            <button className="ed-st" onPointerDown={(e) => e.preventDefault()} onClick={plain} aria-label="Plain text">P</button>
          </>}
        </div>
      )}
      <div className="ed-page" ref={pageRef} style={{ fontFamily: cfg.text ? undefined : cssFont(font) }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        {nodes}
      </div>
      <div className="ed-status">
        {status || (cfg.text ? (theme === "dos" ? `F1=Help F2=Save F3=Open F4=Print F7=New Esc=Exit` : `F2 SAVE F3 LOAD F4 PRINT F7 NEW ESC QUIT`) : `${words} words`)}
        <span className="ed-pos">{cfg.text ? `${String(lineNo).padStart(5, "0")}:${String(col).padStart(3, "0")}` : `Ln ${lineNo}, Col ${col}`}</span>
      </div>
      {help && <div className="ed-dialog ed-help" onClick={() => setHelp(false)}>
        <b>{cfg.app} — keys</b><br />Arrows move · Shift+Arrows select · Home/End · PgUp/PgDn<br />Ctrl+S / F2 save · Ctrl+O / F3 open · Ctrl+P / F4 print · F7 new{cfg.styled ? " · Ctrl+B/I/U style" : ""}<br />Ctrl+A select all · Ctrl+X/C/V cut/copy/paste · Ctrl+Z undo · Esc exit<br /><i>Files are saved to this machine&apos;s disk in your browser.</i>
      </div>}
      {dialog && (
        <div className="ed-dialog">
          <div className="ed-dlg-title">{dialog.kind === "save" ? "Save document as:" : "Open document:"}</div>
          <div className="ed-dlg-input">{dialog.input}<span className="ed-caret on" /></div>
          {dialog.kind === "open" && (
            <div className="ed-files">
              {dialog.files.length === 0 && <div className="ed-file muted">(disk is empty — save something first)</div>}
              {dialog.files.map((f, i) => <button key={f.name} className={`ed-file ${i === dialog.sel ? "on" : ""}`} onPointerDown={(e) => e.preventDefault()} onClick={() => { setDialog(null); openFile(f); }}>{f.name}<span>{f.text.length}b</span></button>)}
            </div>
          )}
          <div className="ed-dlg-btns">
            <button onPointerDown={(e) => e.preventDefault()} onClick={() => dialogKey("Enter")}>{dialog.kind === "save" ? "Save" : "Open"}</button>
            <button onPointerDown={(e) => e.preventDefault()} onClick={() => setDialog(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
