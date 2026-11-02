"use client";
import type { ConsoleView } from "./useConsole";

export function RetroConsole({ view, cols, rows, fontSize, lineHeight, borderX, borderY, cursor = "block", className, children }: {
  view: ConsoleView; cols: number; rows: number; fontSize: number; lineHeight: number; borderX: number; borderY: number; cursor?: "block" | "underscore"; className?: string; children?: React.ReactNode;
}) {
  const showInput = !view.busy;
  const tail = view.cur + (showInput ? view.prompt + view.input : "");
  const wrapped: string[] = [];
  for (let i = 0; i < tail.length; i += cols) wrapped.push(tail.slice(i, i + cols));
  if (!wrapped.length || (showInput && tail.length % cols === 0 && tail.length > 0)) wrapped.push("");
  const all = [...view.lines, ...wrapped];
  const visible = all.slice(-rows);
  const lastIdx = visible.length - 1;
  return (
    <div className={`rcon ${className ?? ""}`} style={{ background: view.colors.border, padding: `${borderY}px ${borderX}px`, position: "absolute", inset: 0 }}>
      <div className="rcon-text" style={{ background: view.colors.bg, color: view.colors.fg, fontSize, lineHeight: `${lineHeight}px`, width: cols * fontSize * 0.6, height: rows * lineHeight }}>
        {visible.map((l, i) => (
          <div key={i} className="rcon-line" style={{ height: lineHeight }}>
            {l}
            {i === lastIdx && showInput && <span className={`rcon-cursor ${cursor}`} style={{ background: cursor === "block" ? view.colors.fg : undefined, borderBottomColor: view.colors.fg }}>&nbsp;</span>}
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
