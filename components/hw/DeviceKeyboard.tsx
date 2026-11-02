"use client";
import { useRef, useState } from "react";
import { emitKey } from "@/lib/keybus";

/**
 * Touch devices: summons the phone/tablet's own keyboard via a hidden textarea and forwards what is typed
 * onto the key bus, so typing works even when no hardware keyboard is attached. (KeyBridge ignores textarea
 * targets, so nothing is delivered twice.)
 */
export function DeviceKeyboard() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [on, setOn] = useState(false);
  const tap = (key: string) => { emitKey({ key, kind: "down", source: "virtual" }); emitKey({ key, kind: "up", source: "virtual" }); };
  const onBefore = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ie = e.nativeEvent as InputEvent; e.preventDefault();
    if (ie.inputType === "insertText" || ie.inputType === "insertCompositionText" || ie.inputType === "insertReplacementText") for (const ch of ie.data ?? "") tap(ch);
    else if (ie.inputType === "insertLineBreak" || ie.inputType === "insertParagraph") tap("Enter");
    else if (ie.inputType.startsWith("deleteContentBackward") || ie.inputType.startsWith("deleteWordBackward")) tap("Backspace");
    else if (ie.inputType.startsWith("deleteContentForward")) tap("Delete");
  };
  const onKey = (e: React.KeyboardEvent) => {
    // keys that don't produce beforeinput (arrows, Esc, Tab, F-keys) on hardware keyboards paired with a tablet
    if (e.key.length > 1 && !["Backspace", "Enter", "Unidentified", "Process", "Shift", "Dead"].includes(e.key)) { e.preventDefault(); tap(e.key); }
  };
  return (
    <>
      <button className={`btn btn-ghost devkb-btn ${on ? "on" : ""}`} aria-pressed={on} title="Use this device's own keyboard"
        onClick={() => { if (on) { ref.current?.blur(); setOn(false); } else { ref.current?.focus(); setOn(true); } }}>⌨</button>
      <textarea ref={ref} className="devkb-input" aria-label="Device keyboard input" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
        onBeforeInput={onBefore} onKeyDown={onKey} onBlur={() => setOn(false)} value="" onChange={() => {}} />
    </>
  );
}
