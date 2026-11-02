/** Original 4-colour pixel icons (white, black, orange, blue) on a 16x12 grid. */
const C: Record<string, string> = { w: "#ffffff", k: "#000000", o: "#ff8800", b: "#0055aa" };
const ICONS: Record<string, string[]> = {
  disk: ["kkkkkkkkkkkkkk..", "kbbwwwwwwwwbbbk.", "kbbwwkkwwwwbbbbk", "kbbwwkkwwwwbbbbk", "kbbwwwwwwwwbbbbk", "kbbbbbbbbbbbbbbk", "kbbooooooooooobk", "kbbowwwwwwwwwobk", "kbbowkkkkkkwwobk", "kbbowwwwwwwwwobk", "kbbooooooooooobk", "kkkkkkkkkkkkkkkk"],
  ram: ["................", ".kkkkkkkkkkkkkk.", ".kwwwwwwwwwwwwk.", ".kwokokokokokwk.", ".kwwwwwwwwwwwwk.", ".kkkkkkkkkkkkkk.", "..k.k.k.k.k.k...", "................", "....oooooooo....", "....o.RAM..o....", "....oooooooo....", "................"],
  shell: ["kkkkkkkkkkkkkkkk", "kwwwwwwwwwwwwwwk", "kwkkkkkkkkkkkkwk", "kwkowkkkkkkkkkwk", "kwkkowkkkkkkkkwk", "kwkowkkkkkkkkkwk", "kwkkkkkwwwkkkkwk", "kwkkkkkkkkkkkkwk", "kwwwwwwwwwwwwwwk", "kkkkkkkkkkkkkkkk", "...kwwwwwwwwk...", "..kkkkkkkkkkkk.."],
  paint: ["...........kkk..", "..........kook..", ".........kook...", "........kook....", ".......kook.....", "......kkkk......", ".....kbbk.......", "....kbbbk..oo...", "...kbbbk..oooo..", "..kbbk....oooo..", ".kkkk......oo...", "kbbk............"],
  ball: ["....kkkkkkkk....", "..kkowowowowkk..", ".kowowowowowowk.", "kowowowowowowowk", "kwowowowowowowok", "kowowowowowowowk", "kwowowowowowowok", "kowowowowowowowk", ".kwowowowowowok.", "..kkwowowowokk..", "....kkkkkkkk....", "..bbbbbbbbbbbb.."],
  brick: ["oooooookoooooook", "oooooookoooooook", "kkkkkkkkkkkkkkkk", "ooookoooooookooo", "ooookoooooookooo", "kkkkkkkkkkkkkkkk", "................", ".......ww.......", ".......ww.......", "................", "....bbbbbbbb....", "....bbbbbbbb...."],
  doc: ["..kkkkkkkkk.....", "..kwwwwwwwkk....", "..kwwwwwwwkwk...", "..kwwwwwwwkkkk..", "..kwkkkkkkkwwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkkkwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkwwwk..", "..kwwwwwwwwwwk..", "..kwoooooooowk..", "..kkkkkkkkkkkk.."],
};
export function S500Icon({ name }: { name: string }) {
  const d = ICONS[name] ?? ICONS.doc;
  return (
    <svg viewBox="0 0 16 12" width="40" height="30" shapeRendering="crispEdges" className="px-icon">
      {d.map((row, y) => row.split("").map((ch, x) => (C[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={C[ch]} /> : null)))}
    </svg>
  );
}
