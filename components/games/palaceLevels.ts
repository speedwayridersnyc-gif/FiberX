/** Palace Escape level data. Built from column floor heights so geometry stays consistent.
 *  Grid: 6 rows x N columns of 32px cells; each room is 10 columns wide (flip-screen).
 *  Tiles: '#' solid, 'L' loose floor, 'G' gate, 'p' pressure plate, '^' spikes, '!' red potion,
 *  '+' blue potion, 'E' exit, 'S' start, 'g' guard, 'w' warden (strong guard), ' ' air. */
export const ROWS = 6;
export const ROOM_COLS = 10;

type Seg = [count: number, floorRow: number];
type Item = [col: number, row: number, ch: string];

function build(segs: Seg[], items: Item[]): string[] {
  const floors: number[] = [];
  segs.forEach(([n, f]) => { for (let i = 0; i < n; i++) floors.push(f); });
  const w = floors.length;
  const grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: w }, (_, c): string => (r >= floors[c] ? "#" : " ")));
  for (const [c, r, ch] of items) {
    grid[r][c] = ch;
    if (ch === "G") for (let rr = 0; rr < r; rr++) grid[rr][c] = "#"; // nothing to jump over
  }
  return grid.map((row) => row.join(""));
}

export interface LevelDef { name: string; subtitle: string; map: string[]; guardSkill: number }

export const LEVELS: LevelDef[] = [
  {
    name: "I · The Cistern", subtitle: "Find your feet. Mind the floor.", guardSkill: 0.25,
    map: build(
      [[1, 0], [4, 5], [2, 4], [1, 4], [3, 4], [2, 6], [16, 4], [1, 0]],
      [[2, 4, "S"], [7, 4, "L"], [9, 3, "!"], [13, 3, "p"], [15, 3, "^"], [19, 3, "G"], [23, 3, "g"], [27, 3, "E"]],
    ),
  },
  {
    name: "II · The Hall of Lamps", subtitle: "Plates open gates — but not for long.", guardSkill: 0.4,
    map: build(
      [[1, 0], [3, 5], [1, 4], [5, 3], [2, 6], [4, 3], [1, 4], [3, 5], [10, 5], [3, 5], [1, 4], [5, 3], [1, 0]],
      [[2, 4, "S"], [7, 3, "L"], [9, 2, "!"], [12, 2, "p"], [14, 2, "^"], [22, 4, "G"], [26, 4, "g"], [31, 4, "!"], [37, 2, "E"]],
    ),
  },
  {
    name: "III · The Warden's Stair", subtitle: "The hourglass is nearly empty.", guardSkill: 0.45,
    map: build(
      [[1, 0], [7, 5], [1, 4], [12, 3], [2, 6], [9, 3], [1, 4], [6, 5], [1, 0]],
      [[2, 4, "S"], [5, 4, "^"], [6, 4, "^"], [9, 2, "+"],
       [10, 3, "L"], [11, 3, "L"], [12, 3, "L"], [13, 3, "L"], [10, 4, " "], [11, 4, "^"], [12, 4, "^"], [13, 4, " "],
       [17, 2, "g"], [20, 2, "p"], [25, 2, "!"], [28, 2, "G"], [36, 4, "w"], [38, 4, "E"]],
    ),
  },
];
