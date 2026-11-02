"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SecretsProvider, useSecrets } from "@/lib/secrets/SecretsProvider";
import { S500_SECRETS } from "@/lib/secrets/s500";
import { subscribeKeys } from "@/lib/keybus";
import { ExhibitShell } from "../ExhibitShell";
import { ScaledScreen } from "../ScaledScreen";
import { KeyBridge } from "../KeyBridge";
import { PhysicalKeyboard } from "../hw/PhysicalKeyboard";
import { CRT } from "../hw/CRT";
import { GameHost } from "../games/GameHost";
import { TouchPad } from "../TouchPad";
import { Trackpad } from "../hw/Trackpad";
import { Editor } from "../editor/Editor";
import { PaddleStrip } from "../games/Paddle";
import { ClassicWindow, WinState } from "../classic/Window";
import { Terminal, TerminalFlavor } from "../classic/Terminal";
import { Paint } from "../classic/Paint";
import { BallDemo } from "./BallDemo";
import { Brickwork } from "./Brickwork";
import { S500Icon } from "./S500Icons";

const SW = 640, SH = 400;
type Phase = "off" | "rom" | "loading" | "desk";
const PROGRAMS = new Set(["ed", "shell", "paint", "ball", "brick", "palace", "jungle", "paddle"]);
const TITLES: Record<string, string> = { ed: "Ed", paddle: "Paddle", benchtop: "Benchtop", ram: "RAM Disk", shell: "Shell", paint: "Pixel Parade", ball: "Checker Ball", brick: "Brickwork", readme: "Read Me", palace: "Palace Escape", jungle: "Jungle Run", about: "About" };
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const PALETTE = ["#0b0b1e", "#ffffff", "#ff8800", "#0055aa", "#ff3b3b", "#ffd84a", "#6ee06e", "#4ac6ff", "#b48cff", "#ff7ad9", "#8a5a2b", "#9aa0a6", "#1f8a5a", "#c0c0ff", "#ffb3a7", "#444466"];

function makeFlavor(triggerGuru: () => void): TerminalFlavor {
  return {
    banner: ["Silicon Hall Shell · Benchtop 1.3", "Type 'help' or 'dir'."],
    prompt: "1>",
    diskName: "Benchtop",
    hdFiles: { "readme": "Benchtop 1.3 museum edition.\nTry: dir, avail, version, info, guru…", "startup-sequence": "; runs at boot\necho \"Welcome to Benchtop\"\nloadbt\nendcli" },
    diskFiles: {},
    extra: (cmd, arg, api) => {
      switch (cmd) {
        case "help": return ["Commands:", " dir list avail version info cd echo", " cat date about clear whoami fortune", " run <shell|paint|ball|brick> loadbt guru"];
        case "dir": case "list": api.unlock("s500-dir"); return ["  c (dir)        devs (dir)", "  libs (dir)     s (dir)", "  Shell          Pixel Parade", "  Checker Ball   Brickwork", "  readme         startup-sequence"];
        case "avail": api.unlock("s500-avail"); return ["Type   Available    In-Use   Maximum", "chip      412,880   111,408   524,288", "fast            0         0         0", "total     412,880   111,408   524,288"];
        case "version": return ["Bootstrap ROM 1.3 (museum), Benchtop 1.3"];
        case "info": return ["Unit  Size   Used  Free  Full  Name", "DF0:  880K   702K  178K   79%  Benchtop", "RAM:    2K     2K     0  100%  RAM Disk"];
        case "cd": return [arg ? `cd: ${arg} — nothing to see here, it's a museum` : "DF0:"];
        case "loadbt": case "loadwb": return ["Benchtop is already running."];
        case "run": {
          const map: Record<string, string> = { shell: "shell", paint: "paint", ball: "ball", brick: "brick", brickwork: "brick", palace: "palace", jungle: "jungle", paddle: "paddle", ed: "ed" };
          const a = map[arg.toLowerCase()]; if (!a) return ["usage: run shell|paint|ball|brick"];
          api.openApp(a); return [`[CLI 2] ${arg}`];
        }
        case "guru": case "meditate": api.unlock("s500-guru"); setTimeout(triggerGuru, 200); return ["Consulting the guru…"];
        default: return null;
      }
    },
  };
}

function useDoubleTap() {
  const last = useRef<{ id: string; t: number } | null>(null);
  return (id: string, fn: () => void) => { const now = Date.now(); if (last.current?.id === id && now - last.current.t < 450) { last.current = null; fn(); } else last.current = { id, t: now }; };
}

function S500Inner() {
  const { unlock, catalog, found } = useSecrets();
  const [phase, setPhase] = useState<Phase>("off");
  const [diskIn, setDiskIn] = useState(false);
  const [diskAnim, setDiskAnim] = useState<"" | "inserting" | "ejecting">("");
  const [wins, setWins] = useState<WinState[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [requester, setRequester] = useState(false);
  const [guru, setGuru] = useState(false);
  
  const [copper, setCopper] = useState(false);
  const z = useRef(10); const depthCount = useRef(0); const colors = useRef(new Set<number>()); const konami = useRef<string[]>([]);
  const winsRef = useRef(wins); winsRef.current = wins;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const tap = useDoubleTap();
  const flavor = useRef(makeFlavor(() => setGuru(true))).current;

  useEffect(() => subscribeKeys((e) => {
    if (e.kind !== "down" || e.key === "Shift") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konami.current = [...konami.current, k].slice(-10);
    if (KONAMI.every((x, i) => konami.current[i] === x)) { unlock("konami"); setCopper(true); setTimeout(() => setCopper(false), 2500); konami.current = []; }
  }), [unlock]);

  const powerOn = () => { if (phase !== "off") return; setPhase("rom"); if (diskIn) setTimeout(() => boot(), 600); };
  const powerOff = () => { setPhase("off"); setWins([]); setFocus(null); setRequester(false); setGuru(false); };
  const boot = () => { setPhase("loading"); unlock("s500-boot"); setTimeout(() => setPhase((p) => (p === "loading" ? "desk" : p)), 1500); };

  const insert = () => {
    if (diskIn || diskAnim) return;
    setDiskAnim("inserting");
    setTimeout(() => { setDiskAnim(""); setDiskIn(true); setRequester(false); if (phaseRef.current === "rom") boot(); }, 900);
  };
  const eject = useCallback(() => {
    if (!diskIn || diskAnim) return;
    setDiskAnim("ejecting");
    if (winsRef.current.some((w) => PROGRAMS.has(w.app))) { setRequester(true); unlock("s500-requester"); }
    setWins((ws) => ws.filter((w) => w.app !== "benchtop" && w.app !== "readme"));
    setTimeout(() => { setDiskAnim(""); setDiskIn(false); }, 900);
  }, [diskIn, diskAnim, unlock]);

  const openApp = useCallback((app: string) => {
    const ex = winsRef.current.find((w) => w.app === app); z.current++;
    if (ex) { setWins((ws) => ws.map((w) => (w.id === ex.id ? { ...w, z: z.current } : w))); setFocus(ex.id); return; }
    const n = winsRef.current.length;
    const pos: Record<string, [number, number]> = { ed: [150, 30], benchtop: [20, 40], ram: [60, 200], shell: [40, 150], paint: [250, 30], ball: [300, 60], brick: [180, 120], readme: [200, 80], about: [220, 140] };
    const [x, y] = pos[app] ?? [40 + n * 20, 40 + n * 16];
    const w: WinState = { id: `${app}-${Date.now()}`, app, title: TITLES[app] ?? app, x, y, z: z.current };
    setWins((ws) => { const next = [...ws, w]; if (next.length >= 4) unlock("window-hoarder"); return next; });
    setFocus(w.id);
  }, [unlock]);
  const closeWin = (id: string) => { setWins((ws) => ws.filter((w) => w.id !== id)); setFocus((f) => (f === id ? null : f)); };
  const focusWin = (id: string) => { z.current++; setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: z.current } : w))); setFocus(id); };
  const depth = (id: string) => {
    setWins((ws) => { const min = Math.min(...ws.map((w) => w.z)); return ws.map((w) => (w.id === id ? { ...w, z: min - 1 } : w)); });
    if (++depthCount.current >= 5) unlock("s500-depth");
  };

  const renderApp = (w: WinState) => {
    const isFocused = focus === w.id && phase === "desk";
    switch (w.app) {
      case "benchtop": return (
        <div className="folder s500-folder">
          {[["shell", "Shell", "shell"], ["paint", "Pixel Parade", "paint"], ["ball", "Checker Ball", "ball"], ["brick", "Brickwork", "brick"], ["palace", "Palace Escape", "doc"], ["jungle", "Jungle Run", "ball"], ["paddle", "Paddle", "brick"], ["ed", "Ed", "doc"], ["readme", "Read Me", "doc"]].map(([app, label, icon]) => (
            <button key={app} className={`ficon ${selected === "f-" + app ? "sel" : ""}`} onClick={() => { setSelected("f-" + app); tap("f-" + app, () => openApp(app)); }}><S500Icon name={icon} /><span>{label}</span></button>
          ))}
        </div>);
      case "ram": return <div className="doc">RAM Disk is empty.<br />(Anything here vanishes on reboot.)</div>;
      case "readme": return <div className="doc">BENCHTOP 1.3 · museum edition<br /><br />Double-click a tool to run it. Drag windows by their title bars; the gadget on the right sends a window to the back.<br /><br />Shell: try <b>dir</b>, <b>avail</b>, <b>run ball</b>. Some say a guru lives inside.<br /><br />Never pull the disk while the drive light is busy…</div>;
      case "about": return <div className="doc">Silicon Hall 500 exhibit<br />512K chip RAM (imaginary)<br />Secrets: {Object.keys(found).length}/{catalog.secrets.length}</div>;
      case "shell": return <div className="s500-term"><Terminal flavor={flavor} focused={isFocused} diskIn={false} unlock={unlock} openApp={openApp} eject={eject} foundCount={Object.keys(found).length} totalSecrets={catalog.secrets.length} /></div>;
      case "paint": return <Paint theme="s500" palette={PALETTE} onPaint={(i) => { if (i.x < 10 && i.y < 10) unlock("paint-corner"); if (i.color !== undefined) { colors.current.add(i.color); if (colors.current.size >= 8) unlock("s500-rainbow"); } }} />;
      case "ball": return <BallDemo onBounce={(n) => { if (n >= 20) unlock("s500-ball-bounces"); }} onSpinChange={() => unlock("s500-ball-spin")} />;
      case "brick": return <Brickwork active={isFocused} onScore={(s) => { if (s >= 500) unlock("s500-brick-score"); }} onClear={() => unlock("s500-brick-clear")} />;
      case "palace": return <div className="pe-in-classic"><GameHost game="palace" active={isFocused} /></div>;
      case "jungle": return <div className="pe-in-classic"><GameHost game="jungle" active={isFocused} /></div>;
      case "ed": return <Editor theme="s500" disk="silicon-500" focused={isFocused} width={420} height={220} onTitle={(t) => setWins((ws) => ws.map((q) => (q.id === w.id && q.title !== t ? { ...q, title: t } : q)))} unlock={(k) => unlock(`ed-${k}`)} />;
      case "paddle": return <div className="pe-in-classic"><GameHost game="paddle" active={isFocused} /></div>;
      default: return null;
    }
  };
  const focusApp = wins.find((w) => w.id === focus)?.app;

  const machine = (
    <div className="s500-stage">
      <CRT material="platinum" on={phase !== "off"} glow="#4a8fff" label="SILICON HALL RGB">
          <ScaledScreen w={SW} h={SH} className={`s500-screen ph-${phase}`}>
            {phase === "off" && <div className="screen-off" />}
            {phase === "rom" && (
              <div className="rom" onClick={insert}>
                <svg viewBox="0 0 200 140" className="rom-art" aria-hidden>
                  <rect x="40" y="96" width="120" height="26" rx="3" fill="#d9d4c4" stroke="#222" strokeWidth="2" />
                  <rect x="70" y="104" width="60" height="5" rx="2" fill="#222" />
                  <g className="rom-disk"><rect x="72" y="20" width="56" height="60" rx="3" fill="#0055aa" stroke="#111" strokeWidth="2" />
                    <rect x="86" y="20" width="28" height="18" fill="#cfd3da" stroke="#111" /><rect x="80" y="50" width="40" height="26" fill="#fff" stroke="#111" />
                    <rect x="84" y="56" width="32" height="3" fill="#ff8800" /><rect x="84" y="63" width="22" height="2" fill="#111" /></g>
                  <path d="M100 84 v8 m-5 -5 l5 5 l5 -5" stroke="#ff8800" strokeWidth="3" fill="none" className="rom-arrow" />
                </svg>
                <div className="rom-text">Bootstrap ROM 1.3</div>
                <div className="rom-sub">Insert the <b>Benchtop</b> disk to begin</div>
              </div>
            )}
            {phase === "loading" && <div className="s500-loading"><div>Loading Benchtop…</div><div className="load-bar"><i /></div></div>}
            {phase === "desk" && (
              <div className={`bench ${copper ? "copper" : ""}`} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
                <div className="bench-bar"><span>Benchtop 1.3 · Silicon Hall · 412,880 free memory</span><button className="bench-bar-btn" onClick={() => openApp("about")}>?</button></div>
                <div className="bench-icons">
                  {diskIn && <button className={`dicon ${selected === "benchtop" ? "sel" : ""}`} onClick={() => { setSelected("benchtop"); tap("benchtop", () => openApp("benchtop")); }}><S500Icon name="disk" /><span>Benchtop</span></button>}
                  <button className={`dicon ${selected === "ram" ? "sel" : ""}`} onClick={() => { setSelected("ram"); tap("ram", () => openApp("ram")); }}><S500Icon name="ram" /><span>RAM Disk</span></button>
                </div>
                {wins.map((w) => (
                  <ClassicWindow key={w.id} win={w} focused={focus === w.id} bounds={{ w: SW, h: SH }} onDepth={() => depth(w.id)} onFocus={() => focusWin(w.id)} onClose={() => closeWin(w.id)}
                    onMove={(x, y) => setWins((ws) => ws.map((q) => (q.id === w.id ? { ...q, x, y } : q)))}>
                    {renderApp(w)}
                  </ClassicWindow>
                ))}
                {requester && (
                  <div className="requester">
                    <div className="req-title">System Request</div>
                    <div className="req-body">Please insert volume<br /><b>Benchtop</b><br />in any drive</div>
                    <div className="req-btns"><button onClick={() => { if (diskIn) setRequester(false); else insert(); }}>Retry</button><button onClick={() => setRequester(false)}>Cancel</button></div>
                  </div>
                )}
                {guru && (
                  <div className="guru" onClick={() => setGuru(false)}>
                    <div>Software Meditation. &nbsp; Press the mouse button to continue.</div>
                    <div>Curator Meditation #00000500.0000CAFE</div>
                  </div>
                )}
              </div>
            )}
          </ScaledScreen>
      </CRT>
    </div>
  );
  const wedge = (
    <div className="s500-wedge-case mat-ivory">
      <div className="case plastic wedge-body">
        <div className="wedge-kb"><PhysicalKeyboard layout="s500" integrated /></div>
        <div className="wedge-side">
          <span className="case-label">SILICON HALL 500</span>
          <span className="wedge-leds"><span className={`led green ${phase !== "off" ? "on" : ""}`} /><span className={`led ${diskAnim || phase === "loading" ? "on" : ""}`} /></span>
        </div>
        <div className={`wedge-drive ${diskAnim}`}><div className="drive-mouth" /><div className="drive-disk" /><button className="drive-eject" aria-label="Eject disk" onClick={eject} /></div>
      </div>
    </div>
  );

  const controls = (
    <div className="controls">
      <div className="control-row">
        <button className={`power-btn ${phase !== "off" ? "on" : ""}`} onClick={() => (phase === "off" ? powerOn() : powerOff())}><span className="power-led" /> {phase === "off" ? "Power on" : "Power off"}</button>
        <div className="floppy-dock">
          <button className={`floppy s500-floppy ${diskIn || diskAnim ? "gone" : ""}`} onClick={insert} disabled={diskIn || !!diskAnim} aria-label="Insert Benchtop disk"><span className="fd-shutter" /><span className="fd-label">BENCH<br />TOP 1.3</span></button>
          <button className="btn btn-ghost small" onClick={() => (diskIn ? eject() : insert())} disabled={!!diskAnim}>{diskIn ? "⏏ Eject" : "Insert"}</button>
        </div>
      </div>
      {phase === "off" && <p className="hint">Power on, then insert the Benchtop disk when the ROM asks for it. Double-click (or double-tap) icons to open them.</p>}
      {focusApp === "paddle" ? <PaddleStrip /> : (focusApp === "jungle" || focusApp === "palace") ? <TouchPad /> : phase !== "off" && <Trackpad label="Mouse pad" buttons={2} />}
    </div>
  );

  return (
    <>
      <KeyBridge enabled={phase !== "off"} />
      <ExhibitShell aspect={1.24} title="Silicon 500" subtitle="16-bit wedge · 1987" year="1987 · 16-bit home computer" theme="s500" machine={machine} controls={controls} keyboard={wedge} wide />
    </>
  );
}

export function S500Exhibit() { return <SecretsProvider catalog={S500_SECRETS}><S500Inner /></SecretsProvider>; }
