"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * A laptop-style trackpad for the bottom screen. Moves a cursor over the machine's display (top screen)
 * and turns taps into clicks / double-clicks; hold the button (or long-press the pad) and slide to drag.
 */
export function Trackpad({ label = "Trackpad", buttons = 1 }: { label?: string; buttons?: 1 | 2 }) {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const posRef = useRef(pos); posRef.current = pos;
  const last = useRef<{ x: number; y: number; t: number; moved: number } | null>(null);
  const lastTap = useRef(0);
  const dragTarget = useRef<Element | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screen = () => document.querySelector(".half-machine .scaled-screen") as HTMLElement | null;
  useEffect(() => {
    const upd = () => { const s = screen(); setRect(s ? s.getBoundingClientRect() : null); };
    upd(); const i = setInterval(upd, 500); window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { clearInterval(i); window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, []);
  const at = () => { const s = screen(); if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.left + posRef.current.x * r.width, y: r.top + posRef.current.y * r.height }; };
  const fire = (type: string, el: Element, x: number, y: number, extra: Partial<MouseEventInit> = {}) => {
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: type.endsWith("down") || type.endsWith("move") ? 1 : 0, ...extra };
    if (type.startsWith("pointer")) el.dispatchEvent(new PointerEvent(type, { ...init, pointerId: 77, isPrimary: true, pointerType: "mouse" }));
    else el.dispatchEvent(new MouseEvent(type, init));
  };
  const target = () => { const p = at(); if (!p) return null; const el = document.elementFromPoint(p.x, p.y); return el && screen()?.contains(el) ? { el, ...p } : null; };
  const click = (dbl: boolean) => {
    const t = target(); if (!t) return;
    fire("pointerdown", t.el, t.x, t.y); fire("mousedown", t.el, t.x, t.y); fire("pointerup", t.el, t.x, t.y); fire("mouseup", t.el, t.x, t.y); fire("click", t.el, t.x, t.y, { detail: dbl ? 2 : 1 });
    if (dbl) fire("dblclick", t.el, t.x, t.y, { detail: 2 });
  };
  const press = () => { const t = target(); if (!t) return; dragTarget.current = t.el; fire("pointerdown", t.el, t.x, t.y); fire("mousedown", t.el, t.x, t.y); };
  const release = () => { const el = dragTarget.current; if (!el) return; const p = at()!; dragTarget.current = null; fire("pointerup", el, p.x, p.y); fire("mouseup", el, p.x, p.y); const t = target(); if (t && (t.el === el || el.contains(t.el))) fire("click", t.el, p.x, p.y); };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    last.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: 0 };
    longPress.current = setTimeout(() => { if (last.current && last.current.moved < 6) press(); }, 450);
  };
  const onMove = (e: React.PointerEvent) => {
    const l = last.current; if (!l) return;
    const pad = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = (e.clientX - l.x) / pad.width * 1.5, dy = (e.clientY - l.y) / pad.height * 1.5;
    l.moved += Math.abs(e.clientX - l.x) + Math.abs(e.clientY - l.y); l.x = e.clientX; l.y = e.clientY;
    setPos((p) => ({ x: Math.min(0.995, Math.max(0, p.x + dx)), y: Math.min(0.995, Math.max(0, p.y + dy)) }));
    if (dragTarget.current) { const p = at(); if (p) { fire("pointermove", dragTarget.current, p.x, p.y); fire("mousemove", dragTarget.current, p.x, p.y); } }
  };
  const onUp = () => {
    if (longPress.current) clearTimeout(longPress.current);
    const l = last.current; last.current = null; if (!l) return;
    if (dragTarget.current) { release(); return; }
    if (l.moved < 8 && Date.now() - l.t < 300) { const now = Date.now(); const dbl = now - lastTap.current < 380; lastTap.current = dbl ? 0 : now; click(dbl); }
  };
  // keep a drag going while the pointer moves (cursor follows)
  useEffect(() => { if (!dragTarget.current) return; const p = at(); if (p) { fire("pointermove", dragTarget.current, p.x, p.y); } }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="trackpad-wrap">
      {rect && <div className="vcursor" aria-hidden style={{ left: rect.left + pos.x * rect.width, top: rect.top + pos.y * rect.height }} />}
      <div className="trackpad" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label={`${label}: slide to move the pointer, tap to click, double-tap to open, long-press to drag`}>
        <span className="trackpad-hint">{label}</span>
      </div>
      <div className={`trackpad-btns b${buttons}`}>
        {Array.from({ length: buttons }).map((_, i) => (
          <button key={i} className="trackpad-btn" aria-label={i === 0 ? "Mouse button" : "Right button"}
            onPointerDown={(e) => { e.preventDefault(); if (i === 0) press(); }} onPointerUp={() => i === 0 && release()} onPointerLeave={() => i === 0 && dragTarget.current && release()} />
        ))}
      </div>
    </div>
  );
}
