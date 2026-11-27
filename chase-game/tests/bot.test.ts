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
      { round: 1, turn: 1, mode: 'taxi', revealedPos: null, double: false },
      { round: 2, turn: 2, mode: 'taxi', revealedPos: null, double: false },
      { round: 3, turn: 3, mode: 'taxi', revealedPos: 13, double: false },
      { round: 4, turn: 4, mode: 'bus', revealedPos: null, double: false },
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
    h.players[0].tickets = { taxi: 1, bus: 1, metro: 1, black: 1 };
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
      const canCatch = adj[12].some((e) => e.mode !== 'ferry' && e.to === m.to && g.players[1].tickets[e.mode] > 0);
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

// ---------------------------------------------------------------- ブラック・船・2×対応

describe('距離と船', () => {
  it('追跡者は船に乗れないので、距離は船を含めずに数える', () => {
    const d = distanceMatrix(BOARD);
    expect(d[6][17]).toBeGreaterThanOrEqual(2); // 6-17 は船で直結しているが、距離は陸路で数える
  });
});

describe('possibleFugitiveStations: 手作りの境界ケース', () => {
  const base = () => {
    const g = createGame(BOARD, [humanSeat('fugitive'), humanSeat('chaser')], mulberry32(3));
    g.chaserStart = [50];
    g.players[1].pos = 50;
    return g;
  };
  const entry = (round: number, turn: number, mode: 'taxi' | 'bus' | 'black', revealedPos: number | null, double = false) => ({
    round, turn, mode, revealedPos, double,
  });
  const nbrs = (id: number, f: (m: string) => boolean) =>
    [...new Set(adjacency(BOARD)[id].filter((e) => f(e.mode)).map((e) => e.to))].sort((a, b) => a - b);

  it('ブラックは手段を問わず(船も)広がる', () => {
    const g = base();
    g.log = [entry(3, 3, 'taxi', 6), entry(4, 4, 'black', null)];
    const S = possibleFugitiveStations(publicState(g), BOARD);
    expect(S).toEqual(nbrs(6, () => true));
    expect(S).toContain(17); // 6-17 は船
  });
  it('ブラック以外の手段では船は使えない', () => {
    const g = base();
    g.log = [entry(3, 3, 'taxi', 6), entry(4, 4, 'taxi', null)];
    expect(possibleFugitiveStations(publicState(g), BOARD)).toEqual(nbrs(6, (m) => m === 'taxi'));
  });
  it('2×の1手目が公開手数: 公開位置から2手目の手段で広がる(追跡者は間に動かない)', () => {
    const g = base();
    g.log = [entry(3, 3, 'taxi', 13, true), entry(4, 3, 'bus', null, true)];
    expect(possibleFugitiveStations(publicState(g), BOARD)).toEqual(nbrs(13, (m) => m === 'bus'));
  });
  it('2×の2手目が公開手数: 候補は公開位置だけ', () => {
    const g = base();
    g.log = [entry(2, 2, 'taxi', null, true), entry(3, 2, 'taxi', 13, true)];
    expect(possibleFugitiveStations(publicState(g), BOARD)).toEqual([13]);
  });
  it('追跡者が止まった駅は候補から除かれる', () => {
    const g = base();
    const target = nbrs(13, (m) => m === 'taxi')[0];
    g.log = [entry(3, 3, 'taxi', 13), entry(4, 4, 'taxi', null)];
    g.chaserMoves = [{ round: 3, player: 1, to: 20, mode: 'taxi' }];
    g.chaserStart = [50];
    // ターン3の追跡者が target に止まっていた場合
    g.chaserMoves = [{ round: 3, player: 1, to: target, mode: 'taxi' }];
    const S = possibleFugitiveStations(publicState(g), BOARD);
    expect(S).not.toContain(target);
  });
});

describe('不変条件: 本当の位置は常に候補集合に含まれる(ブラック・船・2×を有効にした対戦)', () => {
  it('多数のBot対戦で、すべての手のあとに成り立つ(2×の途中も含む)', () => {
    let black = 0, doubles = 0, ferries = 0, checks = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed * 131);
      const n = 1 + (seed % 4);
      const seats: SeatConfig[] = [humanSeat('fugitive'), ...Array.from({ length: n }, () => seat('chaser'))];
      let g = createGame(BOARD, seats, rng);
      let guard = 0;
      while (!g.winner && guard++ < 200) {
        const mv = chooseMove(g, BOARD, rng);
        if (g.players[g.turn].role === 'fugitive') {
          if (mv.mode === 'black') black++;
          if (mv.double) doubles++;
          if (mv.mode === 'black' && adjacency(BOARD)[g.players[0].pos].some((e) => e.mode === 'ferry' && e.to === mv.to)) ferries++;
        }
        g = applyMove(g, BOARD, mv);
        if (g.winner) break;
        expect(possibleFugitiveStations(publicState(g), BOARD)).toContain(g.players[0].pos);
        checks++;
      }
    }
    expect(checks).toBeGreaterThan(500);
    // 機能が実際に使われていること(使われないと、このテストは新機能を検証していない)
    expect(black).toBeGreaterThan(0);
    expect(doubles).toBeGreaterThan(0);
    console.log(`[不変条件テスト] 検証${checks}回 / ブラック使用${black} / 2×使用${doubles} / 船利用${ferries}`);
  });
});

describe('追跡者Botは逃走者の秘密(位置・ブラック残数・2×残数)に依存しない', () => {
  it('秘密を差し替えても、同じ手を選ぶ(複数の局面)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rng0 = mulberry32(seed * 17);
      let g = createGame(BOARD, [humanSeat('fugitive'), seat('chaser'), seat('chaser')], rng0);
      for (let i = 0; i < 3 + (seed % 6) && !g.winner; i++) g = applyMove(g, BOARD, chooseMove(g, BOARD, rng0));
      while (!g.winner && g.players[g.turn].role === 'fugitive') g = applyMove(g, BOARD, chooseMove(g, BOARD, rng0));
      if (g.winner) continue;
      const h = structuredClone(g);
      const free = BOARD.stations.map((s) => s.id).filter((id) => !g.players.some((p) => p.pos === id));
      h.players[0].pos = free[(seed * 7) % free.length];
      h.players[0].tickets = { taxi: 9, bus: 9, metro: 9, black: 9 };
      h.players[0].doubleCards = 5;
      h.fugitiveTrail = [h.players[0].pos];
      expect(chooseMove(g, BOARD, mulberry32(99))).toEqual(chooseMove(h, BOARD, mulberry32(99)));
    }
  });
});
