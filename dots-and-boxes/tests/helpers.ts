import { createGame } from '../src/game/rules';
import { applyMove } from '../src/game/rules';
import { getBoard } from '../src/game/board';
import type { BoardSize, GameState, PlayerKind } from '../src/game/types';

export function makeGame(size: BoardSize, kinds: PlayerKind[]): GameState {
  const ids = ['blue', 'vermillion', 'green', 'orange', 'pink', 'sky'];
  return createGame({
    size,
    botLevel: 'normal',
    botSpeed: 'instant',
    players: kinds.map((kind, i) => ({ name: `P${i}`, colorId: ids[i], kind })),
  });
}

/** 指定した線を順に引く(手番は本来のルールどおりに進む) */
export function play(state: GameState, edges: number[]): GameState {
  return edges.reduce((s, e) => applyMove(s, e), state);
}

/** 四角 box の4辺のうち、n本を引いた状態にする(同じ席が連続で引く扱いは問わない) */
export function boxEdgeList(size: BoardSize, box: number): number[] {
  return getBoard(size).boxEdges[box];
}
