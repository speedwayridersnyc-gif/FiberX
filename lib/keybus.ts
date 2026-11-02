"use client";
export type KeyEventKind = "down" | "up";
export interface BusKey { key: string; kind: KeyEventKind; source: "physical" | "virtual"; shift?: boolean; ctrl?: boolean }
type Listener = (e: BusKey) => void;
const listeners = new Set<Listener>();
export function emitKey(e: BusKey) { listeners.forEach((l) => l(e)); }
export function subscribeKeys(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
