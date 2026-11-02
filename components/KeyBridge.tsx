"use client";
import { useEffect } from "react";
import { emitKey } from "@/lib/keybus";

const CHORDS = new Set(["s", "o", "p", "b", "i", "u", "a", "x", "c", "v", "n", "z"]);
const PREVENT_CHORD = new Set(["s", "o", "p", "b", "i", "u", "n"]);
const PREVENT = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Backspace", "Tab", "Home", "End", "PageUp", "PageDown", "F1", "F2", "F3", "F4", "F5", "F7"]);
/** Forwards physical keyboard events onto the key bus (ignores typing in form fields). */
export function KeyBridge({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const field = (e: KeyboardEvent) => { const t = e.target as HTMLElement; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable); };
    // editor shortcuts (Ctrl/⌘ + key) are forwarded with ctrl:true; browser save/open/print dialogs are suppressed
    const chord = (e: KeyboardEvent, kind: "down" | "up") => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.length !== 1 || field(e)) return false;
      const k = e.key.toLowerCase(); if (!CHORDS.has(k)) return false;
      if (PREVENT_CHORD.has(k)) e.preventDefault();
      emitKey({ key: k, kind, source: "physical", shift: e.shiftKey, ctrl: true }); return true;
    };
    const skip = (e: KeyboardEvent) => { const t = e.target as HTMLElement; return e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)); };
    // a focused button (e.g. Power) must not swallow Space/Enter meant for the machine
    const onBtn = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if ((e.key === " " || e.key === "Enter") && t && (t.tagName === "BUTTON" || t.tagName === "A")) e.preventDefault(); };
    const down = (e: KeyboardEvent) => { if (chord(e, "down")) return; if (skip(e)) return; onBtn(e); if (PREVENT.has(e.key)) e.preventDefault(); emitKey({ key: e.key, kind: "down", source: "physical", shift: e.shiftKey }); };
    const up = (e: KeyboardEvent) => { if (chord(e, "up")) return; if (skip(e)) return; onBtn(e); emitKey({ key: e.key, kind: "up", source: "physical", shift: e.shiftKey }); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [enabled]);
  return null;
}
