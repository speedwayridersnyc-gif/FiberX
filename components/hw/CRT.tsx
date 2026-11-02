import React from "react";

export type Material = "beige" | "platinum" | "breadbox" | "charcoal" | "wood" | "ivory";

/** A CRT monitor: plastic shell, recessed bezel, curved glass with scanlines, phosphor glow and glare. */
export function CRT({ children, material = "beige", on = false, variant = "monitor", glow = "#9fd3ff", className, label, chin }: {
  children: React.ReactNode; material?: Material; on?: boolean; variant?: "monitor" | "built-in" | "tv"; glow?: string; className?: string; label?: string; chin?: React.ReactNode;
}) {
  return (
    <div className={`crt crt-${variant} mat-${material} ${on ? "is-on" : ""} ${className ?? ""}`} style={{ ["--glow" as string]: glow }}>
      <div className="crt-shell plastic">
        <div className="crt-bezel">
          <div className="crt-glass">
            {children}
            <div className="crt-scan" aria-hidden />
            <div className="crt-vignette" aria-hidden />
            <div className="crt-glare" aria-hidden />
          </div>
        </div>
        <div className="crt-chin">
          {label && <span className="crt-label">{label}</span>}
          {chin}
          {variant !== "built-in" && <><span className="crt-knob" /><span className="crt-knob" /></>}
          <span className={`crt-led ${on ? "on" : ""}`} />
        </div>
      </div>
      {variant === "monitor" && <div className="crt-neck plastic" aria-hidden />}
      {variant === "monitor" && <div className="crt-foot plastic" aria-hidden />}
    </div>
  );
}
