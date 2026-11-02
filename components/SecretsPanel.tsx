"use client";
import { useSecrets } from "@/lib/secrets/SecretsProvider";

export function SecretsPanel({ open, onClose, machineName }: { open: boolean; onClose: () => void; machineName: string }) {
  const { catalog, found, reset } = useSecrets();
  const n = Object.keys(found).filter((id) => catalog.secrets.some((s) => s.id === id)).length;
  const implemented = catalog.secrets.filter((s) => s.implemented).length;
  return (
    <div className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-label="Secrets">
        <header className="drawer-head">
          <div>
            <div className="brand-kicker">{machineName} · Secrets</div>
            <h2 className="drawer-title">{n} <span className="muted">/ {catalog.secrets.length} found</span></h2>
            <div className="progress"><div style={{ width: `${(n / catalog.secrets.length) * 100}%` }} /></div>
            <div className="muted small">{implemented} discoverable in this build · the rest are catalogued for future exhibits</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close secrets">✕</button>
        </header>
        <ol className="secret-list">
          {catalog.secrets.map((s, i) => {
            const got = !!found[s.id];
            return (
              <li key={s.id} className={`secret ${got ? "got" : ""} ${s.implemented ? "" : "future"}`}>
                <span className="secret-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="secret-body">
                  <div className="secret-title">{got ? s.title : s.implemented ? "Locked secret" : "Future exhibit"} <span className="secret-cat">{s.category}</span></div>
                  <div className="secret-hint">{s.hint}</div>
                </div>
                <span className="secret-state">{got ? "★" : s.implemented ? "🔒" : "…"}</span>
              </li>
            );
          })}
        </ol>
        <footer className="drawer-foot"><button className="btn btn-ghost small" onClick={() => { if (confirm("Forget all discovered secrets for this machine?")) reset(); }}>Reset progress</button></footer>
      </aside>
    </div>
  );
}
