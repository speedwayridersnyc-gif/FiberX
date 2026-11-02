import React from "react";

/** Museum plinth with a soft spotlight cone; the machine sits on top, the keyboard on the plinth's top surface. */
export function Pedestal({ children, keyboard, plaque, year, wide = false, compact = false }: { children: React.ReactNode; keyboard?: React.ReactNode; plaque: string; year: string; wide?: boolean; compact?: boolean }) {
  return (
    <div className={`pedestal ${wide ? "wide" : ""} ${compact ? "compact" : ""}`}>
      <div className="spotlight" aria-hidden />
      <div className="pedestal-stage">{children}</div>
      {keyboard && <div className="pedestal-desk">{keyboard}</div>}
      <div className="pedestal-top" aria-hidden />
      <div className="pedestal-body" aria-hidden>
        <div className="plaque"><span className="plaque-title">{plaque}</span><span className="plaque-meta">{year}</span></div>
      </div>
    </div>
  );
}
