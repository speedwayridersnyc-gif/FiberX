"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SecretsProvider, useSecrets } from "@/lib/secrets/SecretsProvider";
import { CLASSIC_SECRETS } from "@/lib/secrets/classic";
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
import { MuseumMark } from "../MuseumMark";
import { ClassicWindow, WinState } from "./Window";
import { PixelIcon } from "./Icons";
import { Terminal } from "./Terminal";
import { Paint } from "./Paint";
import { Minefield } from "./Minefield";
import { PalaceEscape } from "../games/PalaceEscape";
import { usePalaceSecrets } from "../games/PalaceEscapePage";
import { SCREEN_H, SCREEN_W } from "./screenScale";

type Power = "off" | "booting" | "on";
type Disk = "out" | "inserting" | "in" | "ejecting";
const PROGRAMS = new Set(["write", "terminal", "paint", "minefield", "palace", "jungle", "paddle"]);
const DISK_APPS = new Set(["disk", "readme", "palace", "jungle", "paddle"]);
const TITLES: Record<string, string> = { hd: "Hard Disk", disk: "Museum Disk", trash: "Trash", terminal: "Terminal", write: "SiliconWrite", paint: "Paint", minefield: "Minefield", palace: "Palace Escape", paddle: "Paddle", readme: "Read Me", jungle: "Jungle Run", welcome: "welcome.txt", about: "About this Exhibit" };
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function useDoubleTap() {
  const last = useRef<{ id: string; t: number } | null>(null);
  return (id: string, fn: () => void) => {
    const now = Date.now();
    if (last.current && last.current.id === id && now - last.current.t < 450) { last.current = null; fn(); }
    else last.current = { id, t: now };
  };
}

function ClassicInner() {
  const { unlock, found, catalog } = useSecrets();
  const palaceSecrets = usePalaceSecrets();
  const [power, setPower] = useState<Power>("off");
  const [disk, setDisk] = useState<Disk>("out");
  const [wins, setWins] = useState<WinState[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
    const [clock, setClock] = useState("");
  const [inverted, setInverted] = useState(false);
  const z = useRef(10);
  const powerOns = useRef(0);
  const marks = useRef<number[]>([]);
  const typed = useRef(0);
  const konami = useRef<string[]>([]);
  const tap = useDoubleTap();
  const winsRef = useRef(wins); winsRef.current = wins;

  useEffect(() => { const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })); tick(); const id = setInterval(tick, 15000); return () => clearInterval(id); }, []);

  useEffect(() => subscribeKeys((e) => {
    if (e.kind !== "down" || e.key === "Shift") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konami.current = [...konami.current, k].slice(-KONAMI.length);
    if (KONAMI.every((x, i) => konami.current[i] === x)) { unlock("konami"); setInverted((v) => !v); setTimeout(() => setInverted((v) => !v), 1600); konami.current = []; }
  }), [unlock]);

  const powerOn = () => {
    if (power !== "off") return;
    powerOns.current++;
    setPower("booting"); unlock("first-boot");
    if (powerOns.current >= 4) unlock("power-cycle");
    setTimeout(() => setPower((p) => (p === "booting" ? "on" : p)), 1800);
  };
  const powerOff = () => { setPower("off"); setWins([]); setFocus(null); setMenu(null); };

  const openApp = useCallback((app: string) => {
    if (app === "palace" || app === "readme") { /* requires disk */ }
    const existing = winsRef.current.find((w) => w.app === app);
    z.current++;
    if (existing) { setWins((ws) => ws.map((w) => (w.id === existing.id ? { ...w, z: z.current } : w))); setFocus(existing.id); return; }
    const n = winsRef.current.length;
    const pos: Record<string, [number, number]> = { write: [56, 28], paint: [70, 26], minefield: [40, 30], palace: [90, 40], terminal: [24 + n * 14, 40 + n * 10], about: [120, 80] };
    const [x, y] = pos[app] ?? [30 + n * 18, 36 + n * 14];
    const w: WinState = { id: `${app}-${Date.now()}`, app, title: TITLES[app] ?? app, x, y, z: z.current };
    setWins((ws) => { const next = [...ws, w]; if (next.length >= 4) unlock("window-hoarder"); return next; });
    setFocus(w.id);
    if (app === "readme") unlock("disk-readme");
  }, [unlock]);

  const closeWin = (id: string) => { setWins((ws) => ws.filter((w) => w.id !== id)); setFocus((f) => (f === id ? null : f)); };
  const focusWin = (id: string) => { z.current++; setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: z.current } : w))); setFocus(id); setMenu(null); };

  const insertDisk = () => {
    if (disk !== "out") return;
    setDisk("inserting");
    setTimeout(() => { setDisk("in"); unlock("disk-insert"); }, 900);
  };
  const ejectDisk = useCallback(() => {
    setDisk((d) => {
      if (d !== "in") return d;
      if (winsRef.current.some((w) => PROGRAMS.has(w.app))) unlock("disk-rude-eject");
      setWins((ws) => ws.filter((w) => !DISK_APPS.has(w.app)));
      setTimeout(() => setDisk("out"), 900);
      return "ejecting";
    });
  }, [unlock]);

  const onMark = () => {
    const now = Date.now();
    marks.current = [...marks.current.filter((t) => now - t < 3000), now];
    if (marks.current.length >= 5) { unlock("curator-knock"); marks.current = []; }
  };
  const focusedApp = wins.find((w) => w.id === focus)?.app;
  const diskIn = disk === "in";
  const foundCount = Object.keys(found).length;

  const menus: Record<string, { label: string; action: () => void; disabled?: boolean }[]> = {
    mark: [{ label: "About this Exhibit…", action: () => openApp("about") }],
    File: [
      { label: "Open Terminal", action: () => openApp("terminal") },
      { label: "Open Paint", action: () => openApp("paint") },
      { label: "Open Minefield", action: () => openApp("minefield") },
      { label: "Close Window", action: () => focus && closeWin(focus), disabled: !focus },
    ],
    Special: [
      { label: "Empty Trash", action: () => unlock("empty-trash") },
      { label: diskIn ? "Eject Disk" : "Insert Disk", action: () => (diskIn ? ejectDisk() : insertDisk()), disabled: disk === "inserting" || disk === "ejecting" },
      { label: "Restart", action: () => { powerOff(); setTimeout(powerOn, 400); } },
      { label: "Shut Down", action: powerOff },
    ],
  };

  const renderApp = (w: WinState) => {
    const isFocused = focus === w.id && power === "on";
    switch (w.app) {
      case "hd": return (
        <div className="folder">
          {[["write", "SiliconWrite", "doc"], ["terminal", "Terminal", "terminal"], ["paint", "Paint", "paint"], ["minefield", "Minefield", "mine"], ["welcome", "welcome.txt", "doc"]].map(([app, label, icon]) => (
            <button key={app} className={`ficon ${selected === "hd-" + app ? "sel" : ""}`} onClick={() => { setSelected("hd-" + app); tap("hd-" + app, () => openApp(app)); }}><PixelIcon name={icon} /><span>{label}</span></button>
          ))}
        </div>);
      case "disk": return (
        <div className="folder">
          {[["readme", "Read Me", "doc"], ["palace", "Palace Escape", "palace"], ["jungle", "Jungle Run", "palace"], ["paddle", "Paddle", "palace"]].map(([app, label, icon]) => (
            <button key={app} className={`ficon ${selected === "disk-" + app ? "sel" : ""}`} onClick={() => { setSelected("disk-" + app); tap("disk-" + app, () => openApp(app)); }}><PixelIcon name={icon} /><span>{label}</span></button>
          ))}
        </div>);
      case "trash": return <div className="doc small-doc">The Trash is empty.<br />(Try Special → Empty Trash anyway.)</div>;
      case "readme": return <div className="doc">MUSEUM DISK v1.0<br /><br />Thanks for inserting me! On this disk you'll find <b>Palace Escape</b>, an original platformer by the Silicon Hall curators.<br /><br />Controls: arrows to run and climb, Shift to tiptoe past spikes, Space to swing your sword, ↑ to parry.<br /><br />P.S. Some programs really dislike being ejected mid-flight.</div>;
      case "welcome": return <div className="doc">Welcome to Silicon Hall!<br /><br />This compact machine is a tribute exhibit. Open the Terminal and type <b>help</b>. Paint something. Sweep a minefield. Insert the floppy.<br /><br />There are 50 secrets catalogued for this machine…</div>;
      case "about": return <div className="doc about-doc"><MuseumMark size={40} mono /><div><b>Silicon Hall Compact</b><br />512×342 · 1-bit<br />Exhibit build 0.1<br />Secrets: {foundCount}/{catalog.secrets.length}</div></div>;
      case "terminal": return <Terminal focused={isFocused} diskIn={diskIn} unlock={unlock} openApp={openApp} eject={ejectDisk} foundCount={foundCount} totalSecrets={catalog.secrets.length} />;
      case "paint": return <Paint onPaint={(i) => { if (i.x < 10 && i.y < 10) unlock("paint-corner"); if (i.filledAll) unlock("paint-fill"); }} />;
      case "minefield": return <Minefield onEvent={(e, lv) => { if (e === "lose") unlock("mine-boom"); else { unlock("mine-win"); if (lv === "expert") unlock("mine-expert"); } }} />;
      case "palace": return <div className="pe-in-classic"><PalaceEscape mono active={isFocused} onEvent={palaceSecrets} /></div>;
      case "jungle": return <div className="pe-in-classic"><GameHost game="jungle" mono active={isFocused} /></div>;
      case "write": return <Editor theme="classic" disk="silicon-classic" focused={isFocused} width={380} height={250} onTitle={(t) => setWins((ws) => ws.map((q) => (q.id === w.id && q.title !== t ? { ...q, title: t } : q)))} unlock={(k) => unlock(`write-${k}`)} />;
      case "paddle": return <div className="pe-in-classic"><GameHost game="paddle" mono active={isFocused} /></div>;
      default: return null;
    }
  };

  const machine = (
    <div className="classic-stage">
      <CRT variant="built-in" material="beige" on={power !== "off"} glow="#e8f0ff" chin={
        <div className="classic-chin-inner">
          <div className="classic-badge" title="Silicon Hall"><MuseumMark size={18} /></div>
          <div className={`classic-slot disk-${disk}`}>
            <div className="slot-mouth" />
            <div className="slot-disk" aria-hidden><div className="fd-shutter" /><div className="fd-label" /></div>
          </div>
        </div>}>
          <ScaledScreen w={SCREEN_W} h={SCREEN_H} className={`classic-screen ${power} ${inverted ? "inverted" : ""}`}>
            {power === "off" && <div className="screen-off" />}
            {power === "booting" && <div className="boot"><div className="boot-mark"><MuseumMark size={64} mono /></div><div className="boot-text">Welcome to Silicon Hall</div></div>}
            {power === "on" && (
              <div className="desk" onPointerDown={(e) => { if (e.target === e.currentTarget) { setMenu(null); setSelected(null); } }}>
                <div className="menubar">
                  <button className="menu-title mark" onClick={() => { onMark(); setMenu(menu === "mark" ? null : "mark"); }} aria-label="Curator menu"><MuseumMark size={14} mono /></button>
                  {["File", "Special"].map((m) => <button key={m} className={`menu-title ${menu === m ? "open" : ""}`} onClick={() => setMenu(menu === m ? null : m)}>{m}</button>)}
                  <span className="menu-clock">{clock}</span>
                  {menu && (
                    <div className={`menu-drop drop-${menu}`}>
                      {menus[menu].map((it) => <button key={it.label} disabled={it.disabled} onClick={() => { setMenu(null); it.action(); }}>{it.label}</button>)}
                    </div>
                  )}
                </div>
                <div className="desk-icons">
                  <button className={`dicon ${selected === "hd" ? "sel" : ""}`} onClick={() => { setSelected("hd"); tap("hd", () => openApp("hd")); }}><PixelIcon name="hd" /><span>Hard Disk</span></button>
                  {diskIn && <button className={`dicon appear ${selected === "disk" ? "sel" : ""}`} onClick={() => { setSelected("disk"); tap("disk", () => openApp("disk")); }}><PixelIcon name="disk" /><span>Museum Disk</span></button>}
                  <button className={`dicon trash ${selected === "trash" ? "sel" : ""}`} onClick={() => { setSelected("trash"); tap("trash", () => openApp("trash")); }}><PixelIcon name="trash" /><span>Trash</span></button>
                </div>
                {wins.map((w) => (
                  <ClassicWindow key={w.id} win={w} focused={focus === w.id} onFocus={() => focusWin(w.id)} onClose={() => closeWin(w.id)}
                    onMove={(x, y) => setWins((ws) => ws.map((q) => (q.id === w.id ? { ...q, x, y } : q)))}>
                    {renderApp(w)}
                  </ClassicWindow>
                ))}
              </div>
            )}
          </ScaledScreen>
      </CRT>
    </div>
  );

  const controls = (
    <div className="controls">
      <div className="control-row">
        <button className={`power-btn ${power !== "off" ? "on" : ""}`} onClick={() => (power === "off" ? powerOn() : powerOff())} aria-label="Power">
          <span className="power-led" /> {power === "off" ? "Power on" : "Power off"}
        </button>
        <div className="floppy-dock">
          <button className={`floppy ${disk !== "out" ? "gone" : ""}`} onClick={insertDisk} disabled={disk !== "out"} aria-label="Insert Museum Disk">
            <span className="fd-shutter" /><span className="fd-label">MUSEUM<br />DISK</span>
          </button>
          <button className="btn btn-ghost small" onClick={() => (diskIn ? ejectDisk() : insertDisk())} disabled={disk === "inserting" || disk === "ejecting"}>{diskIn ? "⏏ Eject" : disk === "out" ? "Insert" : "…"}</button>
        </div>
      </div>
      {power === "off" && <p className="hint">Press <b>Power on</b> to boot the exhibit. Double-click (or double-tap) icons to open them.</p>}
      {focusedApp === "paddle" ? <PaddleStrip /> : (focusedApp === "palace" || focusedApp === "jungle") ? <TouchPad /> : power === "on" && <Trackpad label="Mouse pad" />}
    </div>
  );

  return (
    <>
      <KeyBridge enabled={power === "on"} />
      <ExhibitShell aspect={1.2} title="Silicon Classic" subtitle="128K-style compact · 1984" year="1984 · compact all-in-one" theme="classic" machine={machine} controls={controls}
        keyboard={<div className="classic-kb-wrap"><PhysicalKeyboard layout="classic" onPress={() => { if (++typed.current >= 100) unlock("typist"); }} /></div>} />
    </>
  );
}

export function ClassicExhibit() {
  return <SecretsProvider catalog={CLASSIC_SECRETS}><ClassicInner /></SecretsProvider>;
}
