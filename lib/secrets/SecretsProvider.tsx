"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MachineSecretCatalog, SecretDef } from "./types";

interface SecretsCtx {
  catalog: MachineSecretCatalog;
  found: Record<string, number>;
  unlock: (id: string) => void;
  isFound: (id: string) => boolean;
  reset: () => void;
}
const Ctx = createContext<SecretsCtx | null>(null);
export const storageKey = (machineId: string) => `silicon-hall:secrets:${machineId}`;

export function readFound(machineId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(storageKey(machineId)) || "{}"); } catch { return {}; }
}

export function SecretsProvider({ catalog, children }: { catalog: MachineSecretCatalog; children: React.ReactNode }) {
  const [found, setFound] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<{ key: number; def: SecretDef }[]>([]);
  const foundRef = useRef(found);
  foundRef.current = found;
  useEffect(() => { setFound(readFound(catalog.machineId)); }, [catalog.machineId]);

  const unlock = useCallback((id: string) => {
    const def = catalog.secrets.find((d) => d.id === id);
    if (!def || foundRef.current[id]) return;
    const next = { ...readFound(catalog.machineId), ...foundRef.current, [id]: Date.now() };
    foundRef.current = next;
    setFound(next);
    try { localStorage.setItem(storageKey(catalog.machineId), JSON.stringify(next)); } catch {}
    const key = Date.now() + Math.random();
    setToasts((t) => [...t, { key, def }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 4200);
  }, [catalog]);

  const reset = useCallback(() => {
    setFound({}); foundRef.current = {};
    try { localStorage.removeItem(storageKey(catalog.machineId)); } catch {}
  }, [catalog.machineId]);

  const value = useMemo(() => ({ catalog, found, unlock, reset, isFound: (id: string) => !!found[id] }), [catalog, found, unlock, reset]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className="toast">
            <span className="toast-badge">★</span>
            <div><div className="toast-kicker">Secret discovered</div><div className="toast-title">{t.def.title}</div></div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useSecrets() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSecrets outside SecretsProvider");
  return c;
}
/** Safe variant for components that may render outside a provider. */
export function useOptionalSecrets() { return useContext(Ctx); }
