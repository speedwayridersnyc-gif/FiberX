/** Original "Silicon Hall" mark: a classical portico whose pediment holds a single pixel. */
export function MuseumMark({ size = 32, mono = false, title = "Silicon Hall" }: { size?: number; mono?: boolean; title?: string }) {
  const brass = mono ? "currentColor" : "#b8893b";
  const jade = mono ? "currentColor" : "#3fa37a";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title} shapeRendering={mono ? "crispEdges" : "auto"}>
      <path d="M3 11 L16 3 L29 11 Z" fill="none" stroke={brass} strokeWidth="2" strokeLinejoin={mono ? "miter" : "round"} />
      <rect x="14" y="7" width="4" height="3" fill={jade} />
      <rect x="4" y="12" width="24" height="2" fill={brass} />
      {[6, 12, 18, 24].map((x) => (<rect key={x} x={x - 1} y="15" width="3" height="10" fill={brass} />))}
      <rect x="3" y="26" width="26" height="3" fill={brass} />
    </svg>
  );
}
