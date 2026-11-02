"use client";
import React, { useRef } from "react";
import { SCREEN_H, SCREEN_W, useScreenScale } from "./screenScale";

export interface WinState { id: string; app: string; title: string; x: number; y: number; z: number }

export function ClassicWindow({ win, focused, onFocus, onClose, onMove, children, bounds = { w: SCREEN_W, h: SCREEN_H }, onDepth }: {
  win: WinState; focused: boolean; onFocus: () => void; onClose: () => void; onMove: (x: number, y: number) => void; children: React.ReactNode;
  bounds?: { w: number; h: number }; onDepth?: () => void;
}) {
  const scale = useScreenScale();
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".win-close, .win-depth")) return;
    onFocus();
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onMoveEv = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const nx = Math.round(d.x + (e.clientX - d.px) / scale);
    const ny = Math.round(d.y + (e.clientY - d.py) / scale);
    onMove(Math.max(-200, Math.min(bounds.w - 40, nx)), Math.max(14, Math.min(bounds.h - 20, ny)));
  };
  const onUp = () => { drag.current = null; };
  return (
    <div className={`classic-win ${focused ? "is-focused" : ""}`} style={{ left: win.x, top: win.y, zIndex: win.z }} onPointerDown={onFocus} data-app={win.app}>
      <div className="win-title" onPointerDown={onDown} onPointerMove={onMoveEv} onPointerUp={onUp} onPointerCancel={onUp}>
        <button className="win-close" aria-label="Close window" onClick={(e) => { e.stopPropagation(); onClose(); }} />
        <span className="win-title-text">{win.title}</span>
        {onDepth && <button className="win-depth" aria-label="Send window to back" onClick={(e) => { e.stopPropagation(); onDepth(); }}><i /><i /></button>}
      </div>
      <div className="win-body">{children}</div>
    </div>
  );
}
