import { describe, it, expect } from 'vitest';
import { BOARD } from '../src/game/board';
import { applyMove, createGame, legalMoves, publicState, adjacency } from '../src/game/rules';
import { chooseMove, distanceMatrix, possibleFugitiveStations } from '../src/game/bot';
import { mulberry32 } from '../src/game/rng';
import type { GameState, SeatConfig, Difficulty } from '../src/game/types';

// 席検証(人間1人以上)を通すため逃走者席は人間扱い。chooseMove は席種に関係なくBotとして手を選ぶ
const seat = (role: 'fugitive' | 'chaser', difficulty: Difficulty = 'normal'): SeatConfig => ({ name: '', isBot: role === 'chaser', role, difficulty });
const humanSeat = (role: 'fugitive' | 'chaser'): SeatConfig => ({ name: '', isBot: false, role, difficulty: 'normal' });

function play(seats: SeatConfig[], seed: number, maxMoves = 400): GameState {
  const rng = mulberry32(seed);
  let g = createGame(BOARD, seats, rng);
  let n = 0;
  while (!g.winner && n++ < maxMoves) g = applyMove(g, BOARD, chooseMove(g, BOARD, rng));
  return g;
}

describe('distanceMatrix', () => {
  it('BFS距離: 自分は0、隣接は1、対称', () => {
    const d = distanceMatrix(BOARD);
    expect(d[1][1]).toBe(0);
    const n = adjacency(BOARD)[1][0].to;
    expect(d[1][n]).toBe(1);
    expect(d[5][40]).toBe(d[40][5]);
    expect(Number.isFinite(d[1][50])).toBe(true);
  });
});

describe('possibleFugitiveStations', () => {
  it('公開位置の直後は、使われた手段で行ける隣接駅だけになる', () => {
    const g0 = createGame(BOARD, [humanSeat('fugitive'), humanSeat('chaser')], mulberry32(3));
    const g = structuredClone(g0);
    g.lastReveal = { round: 3, pos: 13 };
    g.round = 4;
    g.log = [
      { round: 1, mode: 'taxi', revealedPos: null },
      { round: 2, mode: 'taxi', revealedPos: null },
      { round: 3, mode: 'taxi', revealedPos: 13 },
      { round: 4, mode: 'bus', revealedPos: null },
    ];
    g.chaserStart = [50];
    g.players[1].pos = 50;
    const S = possibleFugitiveStations(publicState(g), BOARD);
    const expected = adjacency(BOARD)[13].filter((e) => e.mode === 'bus').map((e) => e.to).sort((a, b) => a - b);
    expect(S).toEqual(expected);
  });
  it('実際の逃走者位置は常に候補集合に含まれる(Bot同士の対戦で検証)', () => {
    const rng = mulberry32(11);
    let g = createGame(BOARD, [seat('fugitive'), seat('chaser'), seat('chaser')], rng);
    let checked = 0;
    while (!g.winner && checked < 200) {
      g = applyMove(g, BOARD, chooseMove(g, BOARD, rng));
      if (g.winner) break;
      const S = possibleFugitiveStations(publicState(g), BOARD);
      expect(S).toContain(g.players[0].pos);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

describe('Bot', () => {
  it('Bot同士で必ず終局し、常に合法手を指す', () => {
    for (const diff of ['easy', 'normal'] as Difficulty[]) {
      for (let seed = 1; seed <= 8; seed++) {
        const g = play([seat('fugitive', diff), seat('chaser', diff), seat('chaser', diff)], seed);
        expect(g.winner).not.toBeNull();
      }
    }
  });
  it('追跡者Botは逃走者の本当の位置に依存しない(情報漏えいなし)', () => {
    const rng0 = mulberry32(5);
    let g = createGame(BOARD, [seat('fugitive'), seat('chaser'), seat('chaser')], rng0);
    for (let i = 0; i < 4 && !g.winner; i++) g = applyMove(g, BOARD, chooseMove(g, BOARD, rng0));
    // 手番を追跡者にそろえる
    while (!g.winner && g.players[g.turn].role === 'fugitive') g = applyMove(g, BOARD, chooseMove(g, BOARD, rng0));
    if (g.winner) return;
    const h = structuredClone(g);
    const others = BOARD.stations.map((s) => s.id).filter((id) => !g.players.some((p) => p.pos === id));
    h.players[0].pos = others[others.length - 1];
    h.players[0].tickets = { taxi: 1, bus: 1, metro: 1 };
    h.fugitiveTrail = [h.players[0].pos];
    const a = chooseMove(g, BOARD, mulberry32(99));
    const b = chooseMove(h, BOARD, mulberry32(99));
    expect(a).toEqual(b);
  });
  it('逃走者Bot(ふつう)は、次の一手で捕まる駅を避ける', () => {
    const rng = mulberry32(2);
    const g = createGame(BOARD, [seat('fugitive'), seat('chaser')], rng);
    g.players[0].pos = 13;
    g.players[1].pos = 12; // 12-13 は隣接
    const adj = adjacency(BOARD);
    for (let i = 0; i < 20; i++) {
      const m = chooseMove(g, BOARD, mulberry32(i));
      const canCatch = adj[12].some((e) => e.to === m.to && g.players[1].tickets[e.mode] > 0);
      expect(canCatch).toBe(false);
      expect(legalMoves(g, BOARD, 0).some((x) => x.to === m.to && x.mode === m.mode)).toBe(true);
    }
  });
  it('逃走者Botは追跡者までの最短距離が最大になる駅を選ぶ(安全な範囲で)', () => {
    const g = createGame(BOARD, [seat('fugitive'), seat('chaser')], mulberry32(4));
    g.players[0].pos = 25;
    g.players[1].pos = 24;
    g.lastReveal = null;
    const d = distanceMatrix(BOARD);
    const m = chooseMove(g, BOARD, mulberry32(1));
    const best = Math.max(...legalMoves(g, BOARD, 0).map((x) => d[24][x.to]));
    expect(d[24][m.to]).toBeGreaterThanOrEqual(best - 1);
  });
});
