/** Original 1-bit pixel icons drawn on a 16x16 grid. */
const P = ({ d }: { d: string[] }) => (
  <svg viewBox="0 0 16 16" width="32" height="32" shapeRendering="crispEdges" className="px-icon">
    {d.map((row, y) => row.split("").map((ch, x) => ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#000" /> : ch === "o" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#fff" /> : null))}
  </svg>
);
const ICONS: Record<string, string[]> = {
  hd: [
    "................", "................", "................", "................",
    "################", "#oooooooooooooo#", "#oooooooooooooo#", "#oooooooooooooo#",
    "#oooooooooooooo#", "#oo##oooooooooo#", "#oooooooooooooo#", "################",
    "................", "................", "................", "................"],
  disk: [
    "##############..", "#oo#######oo#o#.", "#oo#######oo#oo#", "#oo##oo###oo#oo#", "#oo##oo###oo#oo#",
    "#oo#######oo#oo#", "#oooooooooooooo#", "#oooooooooooooo#", "#o############o#", "#o#oooooooooo#o#",
    "#o#o#######oo#o#", "#o#oooooooooo#o#", "#o#o######ooo#o#", "#o#oooooooooo#o#", "#o#oooooooooo#o#", "################"],
  trash: [
    ".....######.....", "....#oooooo#....", ".################", ".#oooooooooooooo#", "..#oooooooooooo#.",
    "..#o#o#o#o#o#oo#.", "..#o#o#o#o#o#o#..", "..#o#o#o#o#o#o#..", "..#o#o#o#o#o#o#..", "..#o#o#o#o#o#o#..",
    "..#o#o#o#o#o#o#..", "..#o#o#o#o#o#o#..", "..#o#o#o#o#o#o#..", "..#oooooooooooo#.", "...############..", "................"],
  terminal: [
    "################", "#oooooooooooooo#", "#o############o#", "#o#oooooooooo#o#", "#o#o#oooooooo#o#",
    "#o#oo#ooooooo#o#", "#o#o#oooooooo#o#", "#o#ooooo###oo#o#", "#o#oooooooooo#o#", "#o############o#",
    "#oooooooooooooo#", "################", "...#oooooooo#...", "..############..", "................", "................"],
  paint: [
    "............###.", "...........#oo#.", "..........#oo#..", ".........#oo#...", "........#oo#....",
    ".......#oo#.....", "......#oo#......", ".....####.......", "....#oo#........", "...#ooo#........",
    "..#ooo#.........", "..#oo#..........", ".###............", "#ooo#...........", "#####...........", "................"],
  mine: [
    ".......#........", ".......#........", "...#..###..#....", "....#######.....", "...#########....",
    "...##oo######...", "#######oo######.", "...#########....", "...#########....", "....#######.....",
    "...#..###..#....", ".......#........", ".......#........", "................", "................", "................"],
  doc: [
    "..#########.....", "..#ooooooo##....", "..#ooooooo#o#...", "..#ooooooo####..", "..#oooooooooo#..",
    "..#o#######oo#..", "..#oooooooooo#..", "..#o########o#..", "..#oooooooooo#..", "..#o######ooo#..",
    "..#oooooooooo#..", "..#o########o#..", "..#oooooooooo#..", "..#oooooooooo#..", "..############..", "................"],
  palace: [
    ".......##.......", "......#oo#......", ".....#oooo#.....", "....##oooo##....", "....#o####o#....",
    "...#oo#..#oo#...", "...#oo#..#oo#...", "..##oo#..#oo##..", "..#ooo####ooo#..", "..#oooooooooo#..",
    "..#oo##oo##oo#..", "..#oo##oo##oo#..", "..#oooooooooo#..", ".##############.", ".#oooooooooooo#.", ".##############."],
};
export function PixelIcon({ name }: { name: keyof typeof ICONS | string }) { return <P d={ICONS[name] ?? ICONS.doc} />; }
