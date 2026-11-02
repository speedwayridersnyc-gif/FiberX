"use client";
import { useEffect } from "react";
import { LEGACY_SLUGS } from "@/lib/machines";
const ID_FIX: [RegExp, string][] = [[/^amiga-/, "s500-"], [/^atari-/, "s800-"], [/^w95-wordpad-/, "w95-writepad-"], [/^mac-/, "classic-"]];
/** One-time move of saved secrets & virtual disks from the old exhibit ids. */
function migrate() {
  {
    try {
      if (localStorage.getItem("silicon-hall:migrated-v2")) return;
      for (const [o, n] of Object.entries(LEGACY_SLUGS)) {
        for (const kind of ["secrets", "disk"]) {
          const ok = `silicon-hall:${kind}:${o}`, nk = `silicon-hall:${kind}:${n}`;
          const v = localStorage.getItem(ok); if (!v) continue;
          let data = JSON.parse(v);
          if (kind === "secrets") data = Object.fromEntries(Object.entries(data).map(([k, x]) => [ID_FIX.reduce((s, [r, t]) => s.replace(r, t), k), x]));
          const cur = JSON.parse(localStorage.getItem(nk) || "{}");
          localStorage.setItem(nk, JSON.stringify({ ...data, ...cur })); localStorage.removeItem(ok);
        }
      }
      localStorage.setItem("silicon-hall:migrated-v2", "1");
    } catch { /* ignore */ }
  }
}
if (typeof window !== "undefined") migrate();
export function StorageMigrate() { useEffect(() => { migrate(); }, []); return null; }
