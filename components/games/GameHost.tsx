"use client";
import { useOptionalSecrets } from "@/lib/secrets/SecretsProvider";
import { PalaceEscape, PEEvent } from "./PalaceEscape";
import { JungleRun, JREvent } from "./JungleRun";
import { Snake, SnakeTheme, SNAKE_C64 } from "./Snake";
import { Brickwork, BrickTheme, BRICK_CGA } from "../s500/Brickwork";
import { Paddle, PaddleEvent } from "./Paddle";

export type GameId = "palace" | "jungle" | "snake" | "bricks" | "paddle";
export const GAME_TITLES: Record<GameId, string> = { palace: "Palace Escape", jungle: "Jungle Run", snake: "Snake", bricks: "Bricks", paddle: "Paddle" };

export function useGameSecrets() {
  const sec = useOptionalSecrets();
  const u = (id: string) => sec?.unlock(id);
  return {
    palace: (e: PEEvent) => { if (e.type === "level" && e.index === 0) u("pe-level1"); if (e.type === "win") { u("pe-escape"); if (e.timeLeft >= 150) u("pe-swift"); } if (e.type === "parry" && e.total >= 5) u("pe-parry"); },
    jungle: (e: JREvent) => { if (e.type === "treasure") u("jr-treasure"); if (e.type === "win") u("jr-all"); if (e.type === "vine" && e.total >= 5) u("jr-vine"); if (e.type === "croc") u("jr-croc"); },
    snake: (e: { type: "eat"; total: number } | { type: "crash"; score: number }) => { if (e.type === "eat" && e.total >= 10) u("snake-10"); if (e.type === "crash") u("snake-crash"); },
    bricksScore: (s: number) => { if (s >= 500) u("bricks-score"); },
    bricksClear: () => u("bricks-clear"),
    paddle: (e: PaddleEvent) => { if (e.type === "rally" && e.hits >= 20) u("pd-rally"); if (e.type === "win" && e.mode === "1p" && e.diff === "hard" && e.winner === 1) u("pd-hard"); },
  };
}

export function GameHost({ game, active, mono = false, snakeTheme = SNAKE_C64, brickTheme = BRICK_CGA }: { game: GameId; active: boolean; mono?: boolean; snakeTheme?: SnakeTheme; brickTheme?: BrickTheme }) {
  const g = useGameSecrets();
  switch (game) {
    case "palace": return <PalaceEscape mono={mono} active={active} onEvent={g.palace} />;
    case "jungle": return <JungleRun mono={mono} active={active} onEvent={g.jungle} />;
    case "snake": return <Snake active={active} theme={snakeTheme} onEvent={g.snake} />;
    case "paddle": return <Paddle mono={mono} active={active} onEvent={g.paddle} />;
    case "bricks": return <Brickwork active={active} theme={brickTheme} onScore={g.bricksScore} onClear={g.bricksClear} />;
  }
}
