"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SecretsProvider, useSecrets } from "@/lib/secrets/SecretsProvider";
import { W95_SECRETS } from "@/lib/secrets/win95";
import { subscribeKeys } from "@/lib/keybus";
import { ExhibitShell } from "../ExhibitShell";
import { ScaledScreen } from "../ScaledScreen";
import { KeyBridge } from "../KeyBridge";
import { TouchPad } from "../TouchPad";
import { Trackpad } from "../hw/Trackpad";
import { PaddleStrip } from "../games/Paddle";
import { CRT } from "../hw/CRT";
import { PhysicalKeyboard } from "../hw/PhysicalKeyboard";
import { MuseumMark } from "../MuseumMark";
import { useScreenScale } from "../classic/screenScale";
import { Paint } from "../classic/Paint";
import { Minefield } from "../classic/Minefield";
import { GameHost } from "../games/GameHost";
import { BRICK_WIN } from "../s500/Brickwork";
import { SNAKE_C64 } from "../games/Snake";
import { W95Cmd } from "./W95Cmd";
import { Editor } from "../editor/Editor";
import type { DosProgram } from "@/lib/dos";

const SW = 640, SH = 480, TASK = 28;
type App = "writepad" | "notepad" | "paint" | "mine" | "cmd" | "jungle" | "palace" | "bricks" | "snake" | "paddle" | "mycomp" | "drivea" | "drivec" | "recycle" | "msg" | "run" | "readme" | "clock";
interface Win { id: number; app: App; title: string; x: number; y: number; z: number; min: boolean; data?: string }
const META: Record<App, { title: string; icon: string; w?: number }> = {
  notepad: { title: "Untitled - Notepad", icon: "📝" }, writepad: { title: "Document - WritePad", icon: "📄" }, paint: { title: "untitled - Paint", icon: "🎨" }, mine: { title: "Minefield", icon: "💣" },
  cmd: { title: "Command Prompt", icon: "▪" }, jungle: { title: "Jungle Run", icon: "🌴" }, palace: { title: "Palace Escape", icon: "🏰" },
  bricks: { title: "Bricks", icon: "🧱" }, snake: { title: "Snake", icon: "🐍" }, paddle: { title: "Paddle", icon: "🏓" }, mycomp: { title: "My Computer", icon: "🖥" },
  drivea: { title: "3½ Floppy (A:)", icon: "💾" }, drivec: { title: "(C:)", icon: "🗄" }, recycle: { title: "Recycle Bin", icon: "🗑" },
  msg: { title: "Error", icon: "⚠" }, run: { title: "Run", icon: "▶" }, readme: { title: "README.TXT - Notepad", icon: "📝" }, clock: { title: "Date/Time Properties", icon: "🕓" },
};
const GAME_APPS: App[] = ["jungle", "palace", "bricks", "snake", "paddle"];

function Icon({ glyph, label, onOpen, small }: { glyph: string; label: string; onOpen: () => void; small?: boolean }) {
  const [sel, setSel] = useState(false);
  return (
    <button className={`w95-icon ${sel ? "sel" : ""} ${small ? "small" : ""}`} onClick={() => setSel(true)} onBlur={() => setSel(false)} onDoubleClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <span className="w95-glyph">{glyph}</span><span className="w95-label">{label}</span>
    </button>
  );
}

function W95Window({ win, focused, onFocus, onClose, onMin, onMove, children }: { win: Win; focused: boolean; onFocus: () => void; onClose: () => void; onMin: () => void; onMove: (x: number, y: number) => void; children: React.ReactNode }) {
  const scale = useScreenScale();
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);
  return (
    <div className={`w95-win ${focused ? "focused" : ""}`} style={{ left: win.x, top: win.y, zIndex: win.z, display: win.min ? "none" : undefined }} onPointerDown={onFocus} data-app={win.app}>
      <div className="w95-title"
        onPointerDown={(e) => { drag.current = { sx: e.clientX, sy: e.clientY, x: win.x, y: win.y }; try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {} }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; onMove(Math.max(-200, Math.min(SW - 60, d.x + (e.clientX - d.sx) / scale)), Math.max(0, Math.min(SH - TASK - 20, d.y + (e.clientY - d.sy) / scale))); }}
        onPointerUp={() => (drag.current = null)}>
        <span className="w95-title-icon">{META[win.app].icon}</span><span className="w95-title-text">{win.title}</span>
        <span className="w95-title-btns">
          {win.app !== "msg" && win.app !== "run" && <button className="w95-tbtn" aria-label="Minimize" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onMin(); }}>_</button>}
          <button className="w95-tbtn" aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
        </span>
      </div>
      <div className="w95-body">{children}</div>
    </div>
  );
}

function Inner() {
  const { unlock } = useSecrets();
  const [power, setPower] = useState(false);
  const [phase, setPhase] = useState<"off" | "bios" | "splash" | "desktop" | "closing" | "safe">("off");
  const [wins, setWins] = useState<Win[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [start, setStart] = useState(false);
  const [sub, setSub] = useState<"" | "programs" | "games" | "accessories">("");
  const [floppy, setFloppy] = useState(false);
  const [anim, setAnim] = useState<"" | "inserting" | "ejecting">("");
  const [shutdownDlg, setShutdownDlg] = useState(false);
  const [runText, setRunText] = useState("");
  const [now, setNow] = useState("");
  const zTop = useRef(10); const nid = useRef(1);
  const minimized = useRef(new Set<number>());
  const floppyRef = useRef(floppy); floppyRef.current = floppy;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => { const t = () => setNow(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })); t(); const i = setInterval(t, 10000); return () => clearInterval(i); }, []);

  const open = useCallback((app: App, data?: string, title?: string) => {
    setStart(false); setSub("");
    setWins((ws) => {
      const existing = ws.find((w) => w.app === app && !["msg", "readme"].includes(app) && !(app === "notepad" && data));
      if (existing) { zTop.current++; setFocus(existing.id); return ws.map((w) => (w.id === existing.id ? { ...w, min: false, z: zTop.current } : w)); }
      const id = nid.current++; zTop.current++;
      const n = ws.length;
      const nw: Win = { id, app, title: title ?? META[app].title, x: app === "msg" ? 200 : 96 + (n % 6) * 24, y: app === "msg" ? 160 : 12 + (n % 6) * 20, z: zTop.current, min: false, data };
      setFocus(id);
      const next = [...ws, nw];
      if (next.length >= 5) unlock("w95-multitask");
      return next;
    });
    if (app === "cmd") unlock("w95-cmd");
    if (app === "recycle") unlock("w95-recycle");
    if (app === "clock") unlock("w95-clock");
  }, [unlock]);
  const retitle = (id: number, t: string) => setWins((ws) => ws.map((w) => (w.id === id && w.title !== t ? { ...w, title: t } : w)));
  const close = (id: number) => setWins((ws) => ws.filter((w) => w.id !== id));
  const minimize = (id: number) => { minimized.current.add(id); setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w))); setFocus(null); };
  const raise = (id: number) => { zTop.current++; setFocus(id); setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: zTop.current, min: false } : w))); };
  const taskClick = (w: Win) => {
    if (w.min) { if (minimized.current.has(w.id)) unlock("w95-minimize"); raise(w.id); }
    else if (focus === w.id) minimize(w.id); else raise(w.id);
  };
  const errorBox = (msg: string) => open("msg", msg, "Error");

  const launchDos = (p: DosProgram) => open(p === "minefield" ? "mine" : p);
  const openDrive = (d: "a" | "c") => {
    if (d === "a" && !floppyRef.current) { unlock("w95-floppy"); errorBox("A:\\ is not accessible.\n\nThe device is not ready."); return; }
    open(d === "a" ? "drivea" : "drivec");
  };

  const powerOn = () => {
    if (power) return; setPower(true); setPhase("bios"); setWins([]);
    later(1400, () => setPhase("splash"));
    later(3600, () => { setPhase("desktop"); unlock("w95-boot"); });
  };
  const powerOff = () => { timers.current.forEach(clearTimeout); timers.current = []; setPower(false); setPhase("off"); setWins([]); setStart(false); setShutdownDlg(false); };
  const shutDown = () => { setShutdownDlg(false); setStart(false); setWins([]); setPhase("closing"); later(1800, () => { setPhase("safe"); unlock("w95-shutdown"); }); };

  useEffect(() => subscribeKeys((e) => {
    if (e.kind !== "down" || phase !== "desktop") return;
    if (e.key === "Meta") { setStart((s) => { if (!s) unlock("w95-start"); return !s; }); setSub(""); }
    if (e.key === "Escape") { setStart(false); }
  }), [phase, unlock]);

  const doRun = () => {
    const t = runText.trim().toLowerCase().replace(/\.exe$/, "");
    const map: Record<string, App> = { writepad: "writepad", write: "writepad", notepad: "notepad", edit: "notepad", pbrush: "paint", paint: "paint", command: "cmd", cmd: "cmd", minefld: "mine", minefield: "mine", winmine: "mine", jungle: "jungle", palace: "palace", bricks: "bricks", snake: "snake", paddle: "paddle", "a:": "drivea", "c:": "drivec" };
    setWins((ws) => ws.filter((w) => w.app !== "run"));
    const app = map[t];
    if (!app) { errorBox(`Cannot find the file '${runText}' (or one of its components).`); return; }
    unlock("w95-run");
    if (app === "drivea") openDrive("a"); else open(app);
    setRunText("");
  };

  const insert = () => { if (anim) return; if (floppy) { setAnim("ejecting"); setTimeout(() => { setAnim(""); setFloppy(false); }, 900); } else { setAnim("inserting"); setTimeout(() => { setAnim(""); setFloppy(true); }, 900); } };

  const gameFocused = wins.some((w) => w.id === focus && GAME_APPS.includes(w.app) && !w.min);

  const body = (w: Win) => {
    const f = focus === w.id && phase === "desktop";
    switch (w.app) {
      case "notepad": return <Editor theme="notepad" disk="silicon-95" focused={f} logMode file={w.data ?? null} width={380} height={230} onTitle={(t) => retitle(w.id, t)} unlock={(k) => unlock(k === "log" ? "w95-log" : k === "type" ? "w95-notepad" : `w95-notepad-${k}`)} />;
      case "writepad": return <Editor theme="win" disk="silicon-95" focused={f} width={440} height={270} onTitle={(t) => retitle(w.id, t)} unlock={(k) => unlock(`w95-writepad-${k}`)} />;
      case "readme": return <Editor theme="notepad" disk="silicon-95" focused={f} initialText={w.data} width={380} height={200} />;
      case "paint": return <div className="w95-paintwrap"><Paint width={360} height={220} theme="win" palette={["#ffffff", "#000000", "#808080", "#c0c0c0", "#800000", "#ff0000", "#808000", "#ffff00", "#008000", "#00ff00", "#008080", "#00ffff", "#000080", "#0000ff", "#800080", "#ff00ff"]} onPaint={(i) => { if (i.color !== undefined) { colors.current.add(i.color); if (colors.current.size >= 3) unlock("w95-paint"); } }} /></div>;
      case "mine": return <div className="w95-minewrap"><Minefield onEvent={(e) => e === "win" && unlock("w95-mine")} /></div>;
      case "cmd": return <W95Cmd focused={f} unlock={unlock} hasFloppy={() => floppyRef.current} launch={launchDos} onEdit={(file) => open("notepad", file)} onExit={() => close(w.id)} />;
      case "jungle": case "palace": case "bricks": case "snake": case "paddle":
        return <div className="w95-game"><GameHost game={w.app} active={f} brickTheme={BRICK_WIN} snakeTheme={SNAKE_C64} /></div>;
      case "mycomp": return <div className="w95-folder w95-sunken"><Icon glyph="💾" label="3½ Floppy (A:)" onOpen={() => openDrive("a")} /><Icon glyph="🗄" label="(C:)" onOpen={() => openDrive("c")} /><Icon glyph="🖨" label="Printers" onOpen={() => errorBox("No printers are installed. This is a museum.")} /><Icon glyph="⚙" label="Control Panel" onOpen={() => open("clock")} /></div>;
      case "drivea": return <div className="w95-folder w95-sunken">
        <Icon glyph="📄" label="README.TXT" onOpen={() => { unlock("w95-readme"); open("readme", "SILICON HALL MUSEUM FLOPPY\r\n\r\nIf you can read this, drive A: works.\nThe treasure is behind the third vine in Jungle Run.", "README.TXT - Notepad"); }} />
        <Icon glyph="📄" label="TREASURE.MAP" onOpen={() => { unlock("w95-readme"); open("readme", "  X marks the spot\n  ~~~~~ /\\/\\ ~~~~ X ~~~~", "TREASURE.MAP - Notepad"); }} />
      </div>;
      case "drivec": return <div className="w95-folder w95-sunken">
        <Icon glyph="📁" label="GAMES" onOpen={() => open("mycomp")} /><Icon glyph="📁" label="SYS95" onOpen={() => errorBox("Access to the system folder is closed for conservation.")} />
        <Icon glyph="🌴" label="JUNGLE.EXE" onOpen={() => open("jungle")} /><Icon glyph="🏰" label="PALACE.EXE" onOpen={() => open("palace")} /><Icon glyph="🧱" label="BRICKS.EXE" onOpen={() => open("bricks")} /><Icon glyph="🐍" label="SNAKE.EXE" onOpen={() => open("snake")} /><Icon glyph="🏓" label="PADDLE.EXE" onOpen={() => open("paddle")} />
      </div>;
      case "recycle": return <div className="w95-folder w95-sunken w95-empty">The Recycle Bin is empty.<br /><small>(Someone already threw out the floppy labels.)</small></div>;
      case "clock": return <div className="w95-clockdlg"><div className="w95-bigclock">{new Date().toLocaleTimeString("en-US")}</div><div>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div><button className="w95-btn" onClick={() => close(w.id)}>OK</button></div>;
      case "msg": return <div className="w95-msg"><span className="w95-msg-icon">✖</span><div className="w95-msg-text">{(w.data ?? "").split("\n").map((l, i) => <div key={i}>{l || "\u00a0"}</div>)}</div><button className="w95-btn" onClick={() => close(w.id)}>OK</button></div>;
      case "run": return <div className="w95-run"><p>Type the name of a program, folder, or document, and Silicon 95 will open it for you.</p><label>Open: <input className="w95-input" value={runText} onChange={(e) => setRunText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doRun()} autoFocus placeholder="notepad" /></label><div className="w95-row"><button className="w95-btn" onClick={doRun}>OK</button><button className="w95-btn" onClick={() => close(w.id)}>Cancel</button></div></div>;
    }
  };
  const colors = useRef(new Set<number>());

  const startItem = (label: string, glyph: string, onClick: () => void, arrow?: boolean, onHover?: () => void) => (
    <button className="w95-sitem" onClick={onClick} onMouseEnter={onHover}><span className="w95-sglyph">{glyph}</span><span>{label}</span>{arrow && <span className="w95-arrow">▸</span>}</button>
  );

  const screen = (
    <ScaledScreen w={SW} h={SH} className="w95-screen">
      {phase === "off" && <div className="screen-off" />}
      {phase === "bios" && <div className="w95-bios">SILICON HALL BIOS v4.51PG<br />Memory Test : 16384K OK<br /><br />Detecting IDE Primary Master ... SH-HD 850<br />Detecting Floppy A: ... 1.44M<br /><br />Starting Silicon 95...</div>}
      {phase === "splash" && <div className="w95-splash"><div className="w95-splash-mark"><MuseumMark size={96} /></div><div className="w95-splash-title">Silicon<span>95</span></div><div className="w95-splash-bar" /></div>}
      {phase === "closing" && <div className="w95-splash closing"><div className="w95-splash-mark"><MuseumMark size={80} /></div><div className="w95-splash-sub">Please wait while your computer shuts down.</div></div>}
      {phase === "safe" && <div className="w95-safe">It&apos;s now safe to turn off<br />your computer.</div>}
      {phase === "desktop" && (
        <div className="w95-desk" onPointerDown={(e) => { if (e.target === e.currentTarget) { setStart(false); setFocus(null); } }}>
          <div className="w95-desk-icons">
            <Icon glyph="🖥" label="My Computer" onOpen={() => open("mycomp")} />
            <Icon glyph="🗑" label="Recycle Bin" onOpen={() => open("recycle")} />
            <Icon glyph="📄" label="WritePad" onOpen={() => open("writepad")} />
            <Icon glyph="📝" label="Notepad" onOpen={() => open("notepad")} />
            <Icon glyph="▪" label="Command Prompt" onOpen={() => open("cmd")} />
            <Icon glyph="🌴" label="Jungle Run" onOpen={() => open("jungle")} />
            <Icon glyph="🏰" label="Palace Escape" onOpen={() => open("palace")} />
          </div>
          {wins.map((w) => (
            <W95Window key={w.id} win={w} focused={focus === w.id} onFocus={() => focus !== w.id && raise(w.id)} onClose={() => close(w.id)} onMin={() => minimize(w.id)} onMove={(x, y) => setWins((ws) => ws.map((v) => (v.id === w.id ? { ...v, x, y } : v)))}>
              {body(w)}
            </W95Window>
          ))}
          {shutdownDlg && (
            <div className="w95-modal"><div className="w95-win focused" style={{ position: "relative" }}>
              <div className="w95-title"><span className="w95-title-text">Shut Down Silicon 95</span></div>
              <div className="w95-body w95-shutdlg"><MuseumMark size={40} /><div><p>Are you sure you want to:</p><label><input type="radio" defaultChecked readOnly /> Shut down the computer?</label><div className="w95-row"><button className="w95-btn" onClick={shutDown}>Yes</button><button className="w95-btn" onClick={() => setShutdownDlg(false)}>No</button></div></div></div>
            </div></div>
          )}
          {start && (
            <div className="w95-start-menu">
              <div className="w95-start-side"><span>Silicon<b>95</b></span></div>
              <div className="w95-start-items">
                {startItem("Programs", "📂", () => setSub(sub === "programs" ? "" : "programs"), true, () => setSub("programs"))}
                {startItem("Documents", "📄", () => open("notepad"), false, () => setSub(""))}
                {startItem("Settings", "⚙", () => open("clock"), false, () => setSub(""))}
                {startItem("Find", "🔍", () => errorBox("Find is closed for restoration."), false, () => setSub(""))}
                {startItem("Help", "❓", () => open("readme", "SILICON 95 HELP\n\n- Double-click icons to open them.\n- Click a taskbar button to minimise or restore.\n- Start > Programs > Games has Jungle Run and Palace Escape.\n- Start > Run… accepts notepad, pbrush, command, minefld, jungle, palace, bricks, snake.\n- There are 50 secrets on this machine.", "Help"), false, () => setSub(""))}
                {startItem("Run…", "▶", () => open("run"), false, () => setSub(""))}
                <div className="w95-sep" />
                {startItem("Shut Down…", "⏻", () => { setStart(false); setShutdownDlg(true); }, false, () => setSub(""))}
              </div>
              {sub && (
                <div className="w95-submenu" style={{ top: 0 }}>
                  {startItem("Accessories", "📂", () => setSub("accessories"), true, () => setSub(sub === "games" || sub === "accessories" ? sub : "programs"))}
                  {startItem("Games", "📂", () => setSub("games"), true)}
                  {startItem("Command Prompt", "▪", () => open("cmd"))}
                  {startItem("Silicon Explorer", "🖥", () => open("mycomp"))}
                  {sub === "accessories" && <div className="w95-submenu nested">{startItem("WritePad", "📄", () => open("writepad"))}{startItem("Notepad", "📝", () => open("notepad"))}{startItem("Paint", "🎨", () => open("paint"))}{startItem("Clock", "🕓", () => open("clock"))}</div>}
                  {sub === "games" && <div className="w95-submenu nested" style={{ top: 22 }}>{startItem("Minefield", "💣", () => open("mine"))}{startItem("Jungle Run", "🌴", () => open("jungle"))}{startItem("Palace Escape", "🏰", () => open("palace"))}{startItem("Bricks", "🧱", () => open("bricks"))}{startItem("Snake", "🐍", () => open("snake"))}{startItem("Paddle", "🏓", () => open("paddle"))}</div>}
                </div>
              )}
            </div>
          )}
          <div className="w95-taskbar">
            <button className={`w95-startbtn ${start ? "down" : ""}`} onClick={() => { setStart((s) => { if (!s) unlock("w95-start"); return !s; }); setSub(""); }}><MuseumMark size={16} /> <b>Start</b></button>
            <div className="w95-tasks">
              {wins.filter((w) => w.app !== "msg").map((w) => <button key={w.id} className={`w95-task ${focus === w.id && !w.min ? "down" : ""}`} onClick={() => taskClick(w)}><span>{META[w.app].icon}</span> {w.title}</button>)}
            </div>
            <div className="w95-tray" onDoubleClick={() => open("clock")} title="Double-click for date and time">{floppy ? "💾 " : ""}🔊 {now}</div>
          </div>
        </div>
      )}
    </ScaledScreen>
  );

  const machine = (
    <div className="rig rig-w95" style={{ position: "relative" }}>
      <div className="w95-mini-tower" title="Tower (moved aside on small screens)"><span className="bay" /><span className="bay" /><span className={`led green ${power ? "on" : ""}`} /><span className={`led ${anim ? "on" : ""}`} /></div>
      <div className="rig-monitor w95-monitor"><CRT material="beige" variant="monitor" on={power} glow="#7fd0d0" label="SILICON 15&quot; SVGA">{screen}</CRT></div>
      <div className="w95-tower mat-beige"><div className="case plastic w95-tower-body">
        <div className="tower-bay"><div className="drive-525 cdrom"><div className="slot" /><span className="latch" /></div></div>
        <div className="tower-bay"><div className="drive-35"><div className="slot"><div className={`media-anim ${anim} media-floppy35`} /></div><button className="latch" aria-label="Eject floppy" onClick={insert} /><span className={`led ${anim ? "on" : ""}`} /></div></div>
        <div className="tower-mid"><span className="case-label">SILICON 586</span><span className={`led green ${power ? "on" : ""}`} /><span className={`led ${phase === "bios" || phase === "splash" ? "on blink" : ""}`} /></div>
        <button className={`tower-power ${power ? "on" : ""}`} aria-label="Power" onClick={() => (power ? powerOff() : powerOn())} />
        <div className="vent tower-vent" />
      </div></div>
    </div>
  );
  const keyboard = <div className="modelm-wrap"><PhysicalKeyboard layout="win95" /></div>;
  const controls = (
    <div className="controls">
      <div className="control-row">
        <button className={`power-btn ${power ? "on" : ""}`} onClick={() => (power ? powerOff() : powerOn())}><span className="power-led" /> {power ? "Power off" : "Power on"}</button>
        {phase === "safe" && <span className="hint">Now press Power off — or power on again.</span>}
      </div>
      <div className="media-shelf">
        <span className="media-shelf-label">Floppy disks</span>
        <button className={`media-item floppy ${floppy ? "in" : ""}`} style={{ ["--mc" as string]: "#1f3b8a" }} onClick={insert} disabled={!!anim}>
          <span className="media-art"><span className="media-label">MUSEUM 3½&quot;</span></span><span className="media-cap">{floppy ? "⏏ Eject" : "Insert in A:"}</span>
        </button>
      </div>
      {!power && <p className="hint">Press <b>Power on</b> (or the tower&apos;s power button). The ◆/▣ key opens Start.</p>}
      {wins.some((w) => w.id === focus && w.app === "paddle" && !w.min) ? <PaddleStrip /> : gameFocused ? <TouchPad /> : phase === "desktop" && <Trackpad label="Mouse pad" buttons={2} />}
    </div>
  );
  return (
    <>
      <KeyBridge enabled={power} />
      <ExhibitShell aspect={1.45} title="Windows 95" subtitle="Microsoft 32-bit desktop · 1995" year="1995 · 90s-class tower" theme="silicon-95" machine={machine} controls={controls} keyboard={keyboard} wide />
    </>
  );
}
export function W95Exhibit() { return <SecretsProvider catalog={W95_SECRETS}><Inner /></SecretsProvider>; }
