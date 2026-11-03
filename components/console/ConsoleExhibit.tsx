"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SecretsProvider, useSecrets } from "@/lib/secrets/SecretsProvider";
import type { MachineSecretCatalog } from "@/lib/secrets/types";
import { subscribeKeys } from "@/lib/keybus";
import { ExhibitShell } from "../ExhibitShell";
import { ScaledScreen } from "../ScaledScreen";
import { KeyBridge } from "../KeyBridge";
import { TouchPad } from "../TouchPad";
import { CRT, Material } from "../hw/CRT";
import { PhysicalKeyboard } from "../hw/PhysicalKeyboard";
import { GameHost, GameId, GAME_TITLES } from "../games/GameHost";
import type { SnakeTheme } from "../games/Snake";
import type { BrickTheme } from "../s500/Brickwork";
import { RetroConsole } from "./RetroConsole";
import { PaddleStrip } from "../games/Paddle";
import { Editor, EdTheme } from "../editor/Editor";
import { ConsoleApi, ConsoleColors, useConsole, useConsoleKeys } from "./useConsole";

export interface ConsoleEnv {
  api: ConsoleApi;
  unlock: (id: string) => void;
  launch: (g: GameId) => void;
  /** open the machine's word processor / editor full-screen, optionally on a file */
  write: (file?: string) => void;
  media: () => string | null;
  reboot: () => void;
  setUpper: (u: boolean) => void;
}
export interface ConsoleHandler {
  boot: () => void;
  line: (s: string) => void;
  brk?: () => void;
  onMedia?: (m: string | null, prev: string | null, running: boolean) => void;
  onGameExit?: (g: GameId) => void;
  key?: (k: string) => boolean;
  onWriterExit?: () => void;
}
export interface MediaOption { id: string; label: string; color: string; sub?: string }
export interface ConsoleMachine {
  id: string; title: string; subtitle: string; year: string; catalog: MachineSecretCatalog;
  screen: { cols: number; rows: number; fontSize: number; lineHeight: number; bx: number; by: number; colors: ConsoleColors; upper: boolean; cursor: "block" | "underscore"; glow: string; font: string };
  crt: { material: Material; variant: "monitor" | "tv"; label: string };
  keyboard: string;
  body: "c64" | "s800" | "pc";
  media: { kind: "floppy" | "cart"; options: MediaOption[] };
  create: (env: ConsoleEnv) => ConsoleHandler;
  writer: { theme: EdTheme; secret: string };
  snakeTheme?: SnakeTheme; brickTheme?: BrickTheme;
  bootDelay?: number;
}

function Inner({ m }: { m: ConsoleMachine }) {
  const { unlock } = useSecrets();
  const S = m.screen;
  const con = useConsole(S.cols, S.rows, S.colors);
  const [power, setPower] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [anim, setAnim] = useState<"" | "inserting" | "ejecting">("");
  const [game, setGame] = useState<GameId | null>(null);
  const [upper, setUpper] = useState(S.upper);
  const [writer, setWriter] = useState<{ file?: string; n: number } | null>(null);
  const writerRef = useRef(writer); writerRef.current = writer;
  const mediaRef = useRef(media); mediaRef.current = media;
  const gameRef = useRef(game); gameRef.current = game;
  const handler = useRef<ConsoleHandler | null>(null);
  const inputRef = useRef(con.input); inputRef.current = con.input;
  const W = Math.round(S.cols * S.fontSize * 0.6 + S.bx * 2), H = Math.round(S.rows * S.lineHeight + S.by * 2);

  const boot = useCallback(() => {
    con.reset(); setGame(null); setWriter(null);
    const env: ConsoleEnv = { api: con.api, unlock, launch: (g) => setGame(g), write: (file) => setWriter({ file, n: Date.now() }), media: () => mediaRef.current, reboot: () => boot(), setUpper };
    handler.current = m.create(env);
    con.api.after(m.bootDelay ?? 300, () => handler.current?.boot());
  }, [con, unlock, m]);

  const powerOn = () => { if (power) return; setPower(true); boot(); };
  const powerOff = () => { setPower(false); con.reset(); setGame(null); setWriter(null); handler.current = null; };

  useConsoleKeys({
    active: power && !game && !writer, busy: con.busy, upper, setInput: con.setInput, getInput: () => inputRef.current,
    onLine: (l) => { con.api.print(con.view.prompt + l); handler.current?.line(l); },
    onKey: (k) => !!handler.current?.key?.(k),
    onBreak: () => { if (con.isRunning()) { con.api.stop(true); handler.current?.brk?.(); } else handler.current?.brk?.(); },
  });
  useEffect(() => subscribeKeys((e) => {
    if (e.kind === "down" && e.key === "Escape" && gameRef.current) { const g = gameRef.current; setGame(null); handler.current?.onGameExit?.(g); }
  }), []);

  const insert = (id: string) => {
    if (anim) return;
    const prev = mediaRef.current;
    const doInsert = () => { setAnim("inserting"); setTimeout(() => { setAnim(""); setMedia(id); handler.current?.onMedia?.(id, prev, con.isRunning() || !!gameRef.current); }, 900); };
    if (prev) { setAnim("ejecting"); setTimeout(() => { setMedia(null); const r = con.isRunning() || !!gameRef.current; if (m.media.kind === "cart") setGame(null); handler.current?.onMedia?.(null, prev, r); doInsert(); }, 900); }
    else doInsert();
  };
  const eject = () => {
    if (!mediaRef.current || anim) return;
    const prev = mediaRef.current; setAnim("ejecting");
    setTimeout(() => { setAnim(""); setMedia(null); const r = con.isRunning() || !!gameRef.current; if (m.media.kind === "cart") setGame(null); handler.current?.onMedia?.(null, prev, r); }, 900);
  };

  const opt = m.media.options.find((o) => o.id === media);
  const screen = (
    <ScaledScreen w={W} h={H} className={`con-screen font-${S.font}`}>
      {power ? (
        <>
          <RetroConsole view={con.view} cols={S.cols} rows={S.rows} fontSize={S.fontSize} lineHeight={S.lineHeight} borderX={S.bx} borderY={S.by} cursor={S.cursor} />
          {writer && !game && (
            <div className="game-overlay writer-overlay" style={{ background: con.view.colors.border, padding: `${Math.round(S.by / 2)}px ${Math.round(S.bx / 2)}px` }}>
              <Editor key={writer.n} theme={m.writer.theme} disk={m.id} focused={power && !game} file={writer.file ?? null} width={W - S.bx} height={H - S.by}
                unlock={(k) => unlock(`${m.writer.secret}-${k}`)} onExit={() => { setWriter(null); handler.current?.onWriterExit?.(); }} />
            </div>
          )}
          {game && (
            <div className="game-overlay" style={{ padding: `${S.by}px ${S.bx}px`, background: con.view.colors.border }}>
              <GameHost game={game} active snakeTheme={m.snakeTheme} brickTheme={m.brickTheme} />
            </div>
          )}
        </>
      ) : <div className="screen-off" />}
    </ScaledScreen>
  );
  const mediaAnim = <div className={`media-anim ${anim} media-${m.media.kind}`} style={{ background: opt?.color ?? m.media.options[0]?.color }} aria-hidden />;

  let machine: React.ReactNode, keyboard: React.ReactNode;
  if (m.body === "c64") {
    machine = (
      <div className="rig rig-c64">
        <div className="rig-monitor"><CRT material={m.crt.material} variant={m.crt.variant} on={power} glow={S.glow} label={m.crt.label}>{screen}</CRT></div>
        <div className="rig-drive mat-ivory">
          <div className="case plastic drive-floppy">
            <div className="drive-face"><div className="drive-slot-wide">{mediaAnim}</div><button className="drive-lever" aria-label="Eject floppy" onClick={eject} /></div>
            <div className="drive-foot"><span className="case-label">DRIVE 8</span><span className={`led green ${power ? "on" : ""}`} /><span className={`led ${anim ? "on" : ""}`} /></div>
          </div>
        </div>
      </div>
    );
    keyboard = (
      <div className="c64-case mat-breadbox"><div className="case plastic c64-body">
        <div className="c64-top"><span className="case-label light">SILICON 64 · PERSONAL COMPUTER</span><span className={`led ${power ? "on" : ""}`} style={{ marginLeft: "auto" }} /></div>
        <PhysicalKeyboard layout={m.keyboard} integrated upper={upper} />
        <div className="rainbow-stripe" aria-hidden />
      </div></div>
    );
  } else if (m.body === "s800") {
    machine = (
      <div className="rig rig-s800"><div className="rig-monitor"><CRT material={m.crt.material} variant="tv" on={power} glow={S.glow} label={m.crt.label}>{screen}</CRT></div></div>
    );
    keyboard = (
      <div className="s800-case mat-ivory"><div className="case plastic s800-body">
        <div className="s800-lid">
          <div className="cart-door"><div className="cart-slot">{mediaAnim}{media && !anim && <div className="cart-in" style={{ background: opt?.color }}><span>{opt?.label}</span></div>}</div></div>
          <span className="case-label">SILICON 800</span><span className={`led ${power ? "on" : ""}`} />
        </div>
        <div className="s800-kb-panel"><PhysicalKeyboard layout={m.keyboard} integrated upper={upper} /></div>
      </div></div>
    );
  } else {
    machine = (
      <div className="rig rig-pc">
        <div className="rig-monitor pc-monitor"><CRT material={m.crt.material} variant="monitor" on={power} glow={S.glow} label={m.crt.label}>{screen}</CRT></div>
        <div className="pc-unit mat-platinum"><div className="case plastic pc-unit-body">
          <span className="case-label">SILICON PC</span>
          <div className="pc-drives">
            <div className="drive-525"><span className="drive-tag">A:</span><div className="slot">{mediaAnim}</div><button className="latch" aria-label="Eject floppy" onClick={eject} /><span className={`led ${anim ? "on" : ""}`} /></div>
            <div className="drive-525"><span className="drive-tag">B:</span><div className="slot" /><span className="latch" /></div>
          </div>
          <div className="pc-badges"><span className={`led green ${power ? "on" : ""}`} /><div className="vent" style={{ width: 80 }} /></div>
        </div></div>
      </div>
    );
    keyboard = <div className="modelm-wrap"><PhysicalKeyboard layout={m.keyboard} upper={upper} /></div>;
  }

  const controls = (
    <div className="controls">
      <div className="control-row">
        <button className={`power-btn ${power ? "on" : ""}`} onClick={() => (power ? powerOff() : powerOn())}><span className="power-led" /> {power ? "Power off" : "Power on"}</button>
        {game && <button className="btn btn-ghost small" onClick={() => { const g = game; setGame(null); handler.current?.onGameExit?.(g); }}>Exit {GAME_TITLES[game]} (Esc)</button>}
        {con.busy && !game && <button className="btn btn-ghost small" onClick={() => { con.api.stop(true); handler.current?.brk?.(); }}>Break (Esc)</button>}
      </div>
      {game === "paddle" ? <PaddleStrip /> : game && <TouchPad game={game} />}
      <div className="media-shelf">
        <span className="media-shelf-label">{m.media.kind === "cart" ? "Cartridges" : "Floppy disks"}</span>
        {m.media.options.map((o) => (
          <button key={o.id} className={`media-item ${m.media.kind} ${media === o.id ? "in" : ""}`} style={{ ["--mc" as string]: o.color }} onClick={() => (media === o.id ? eject() : insert(o.id))} disabled={!!anim}>
            <span className="media-art"><span className="media-label">{o.label}</span></span>
            <span className="media-cap">{media === o.id ? "⏏ Eject" : o.sub ?? "Insert"}</span>
          </button>
        ))}
      </div>
      {!power && <p className="hint">Press <b>Power on</b>. Type on the drawn keyboard or your own. Esc = break / leave a game.</p>}
    </div>
  );
  return (
    <>
      <KeyBridge enabled={power} />
      <ExhibitShell aspect={m.body === "c64" ? 1.44 : m.body === "s800" ? 1.03 : 1.2} title={m.title} subtitle={m.subtitle} year={m.year} theme={m.id} machine={machine} controls={controls} keyboard={keyboard} wide={m.body !== "s800"} />
    </>
  );
}

export function ConsoleExhibit({ machine }: { machine: ConsoleMachine }) {
  const m = useMemo(() => machine, [machine]);
  return <SecretsProvider catalog={m.catalog}><Inner m={m} /></SecretsProvider>;
}
