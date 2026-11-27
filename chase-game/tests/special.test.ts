/** ブラックチケット・船・2×カード・チケットの受け渡し・手数による終局のテスト */
import { describe, it, expect } from 'vitest';
import { BOARD } from '../src/game/board';
import { applyMove, canDouble, createGame, legalMoves, publicState } from '../src/game/rules';
import { blackTicketsFor, doubleCardsFor } from '../src/game/config';
import { mulberry32 } from '../src/game/rng';
import type { Board, GameState, LogEntry, SeatConfig } from '../src/game/types';

const seat = (role: 'fugitive' | 'chaser', isBot = false): SeatConfig => ({ name: '', isBot, role, difficulty: 'normal' });
const seats2: SeatConfig[] = [seat('fugitive'), seat('chaser')];

/** 船・バス・地下鉄・タクシーをひと通り含む小さな盤面 */
const MINI: Board = {
  stations: [1, 2, 3, 4, 5, 6].map((id) => ({ id, x: id * 100, y: 100 })),
  edges: [
    { a: 1, b: 2, mode: 'taxi' },
    { a: 2, b: 3, mode: 'taxi' },
    { a: 1, b: 3, mode: 'ferry' },
    { a: 3, b: 4, mode: 'bus' },
    { a: 1, b: 4, mode: 'metro' },
    { a: 4, b: 5, mode: 'taxi' },
    { a: 5, b: 6, mode: 'taxi' },
  ],
  fugitiveStarts: [1],
  chaserStarts: [5, 6],
};

function game(board: Board = BOARD, seats = seats2, seed = 1): GameState {
  return createGame(board, seats, mulberry32(seed));
}
function withPos(s: GameState, fPos: number, cPos: number[]): GameState {
  const c = structuredClone(s);
  c.players[0].pos = fPos;
  cPos.forEach((p, i) => (c.players[i + 1].pos = p));
  c.fugitiveTrail = [fPos];
  return c;
}
const fakeLog = (n: number): LogEntry[] =>
  Array.from({ length: n }, (_, i) => ({ round: i + 1, turn: 1, mode: 'taxi' as const, revealedPos: null, double: false }));

describe('初期チケット', () => {
  it('逃走者だけがブラックと2×カードを持ち、枚数は追跡者の人数で決まる', () => {
    const g = game(BOARD, [seat('fugitive'), seat('chaser'), seat('chaser'), seat('chaser', true)]);
    expect(g.players[0].tickets.black).toBe(blackTicketsFor(3));
    expect(g.players[0].doubleCards).toBe(doubleCardsFor(3));
    g.players.slice(1).forEach((p) => {
      expect(p.tickets.black).toBe(0);
      expect(p.doubleCards).toBe(0);
    });
  });
});

describe('ブラックチケットと船', () => {
  it('船の路線はブラックチケットでしか通れない', () => {
    const g = withPos(game(MINI), 1, [5]);
    const toThree = legalMoves(g, MINI, 0).filter((m) => m.to === 3);
    expect(toThree).toEqual([{ to: 3, mode: 'black' }]);
  });
  it('ブラックが0枚なら船には乗れない', () => {
    const g = withPos(game(MINI), 1, [5]);
    g.players[0].tickets.black = 0;
    expect(legalMoves(g, MINI, 0).some((m) => m.to === 3)).toBe(false);
  });
  it('ブラックはどの路線にも使える(その手段のチケットが0でも)', () => {
    const g = withPos(game(MINI), 1, [5]);
    g.players[0].tickets.metro = 0;
    const toFour = legalMoves(g, MINI, 0).filter((m) => m.to === 4);
    expect(toFour).toEqual([{ to: 4, mode: 'black' }]);
  });
  it('追跡者はブラックも船も使えない', () => {
    const g = withPos(game(MINI), 5, [1]);
    const moves = legalMoves({ ...g, turn: 1 }, MINI, 1);
    expect(moves.every((m) => m.mode !== 'black')).toBe(true);
    expect(moves.some((m) => m.to === 3)).toBe(false);
  });
  it('ブラックを使うと公開ログには「black」とだけ残り、本当の路線は分からない', () => {
    const g = withPos(game(MINI), 1, [5]);
    const before = g.players[0].tickets.black;
    const g2 = applyMove(g, MINI, { to: 3, mode: 'black' });
    expect(g2.players[0].tickets.black).toBe(before - 1);
    expect(publicState(g2).log[0].mode).toBe('black');
  });
  it('ブラックは追跡者に渡らない(受け渡しの対象外)', () => {
    const g = withPos(game(MINI), 3, [4]);
    const g2 = applyMove({ ...g, turn: 1 }, MINI, { to: 5, mode: 'taxi' });
    expect(g2.players[0].tickets.black).toBe(g.players[0].tickets.black);
  });
});

describe('チケットの受け渡し', () => {
  it('追跡者が使った手段のチケットが逃走者に1枚渡る', () => {
    const g = withPos(game(), 1, [11]);
    const before = g.players[0].tickets.bus;
    const g2 = applyMove({ ...g, turn: 1 }, BOARD, { to: 12, mode: 'bus' });
    expect(g2.players[0].tickets.bus).toBe(before + 1);
    expect(g2.players[1].tickets.bus).toBe(g.players[1].tickets.bus - 1);
  });
});

describe('2×カード', () => {
  it('1手目で手番が残り、2手目で追跡者に移る。記録は2手分で、追跡者は1回だけ動く', () => {
    const g = withPos(game(), 1, [50]);
    const m1 = legalMoves(g, BOARD, 0).find((m) => m.mode === 'taxi')!;
    const g1 = applyMove(g, BOARD, { ...m1, double: true });
    expect(g1.turn).toBe(0);
    expect(g1.pendingDouble).toBe(true);
    expect(g1.players[0].doubleCards).toBe(g.players[0].doubleCards - 1);
    expect(g1.log).toHaveLength(1);
    expect(g1.log[0].double).toBe(true);
    expect(canDouble(g1)).toBe(false); // 2手目で重ねて宣言はできない

    const m2 = legalMoves(g1, BOARD, 0)[0];
    const g2 = applyMove(g1, BOARD, m2);
    expect(g2.pendingDouble).toBe(false);
    expect(g2.turn).toBe(1);
    expect(g2.round).toBe(1);
    expect(g2.log).toHaveLength(2);
    expect(g2.log.every((e) => e.double && e.turn === 1)).toBe(true);

    const cm = legalMoves(g2, BOARD, 1).find((m) => m.to !== g2.players[0].pos)!;
    const g3 = applyMove(g2, BOARD, cm);
    expect(g3.round).toBe(2);
    expect(g3.turn).toBe(0);
  });
  it('カードが無い・記録欄の空きが2手分ない・宣言済みのときは使えない', () => {
    const g = withPos(game(), 1, [50]);
    expect(canDouble(g)).toBe(true);
    const none = structuredClone(g);
    none.players[0].doubleCards = 0;
    expect(canDouble(none)).toBe(false);
    const late = structuredClone(g);
    late.log = fakeLog(23);
    expect(canDouble(late)).toBe(false);
    const edge = structuredClone(g);
    edge.log = fakeLog(22);
    expect(canDouble(edge)).toBe(true);
    const m = legalMoves(none, BOARD, 0)[0];
    expect(() => applyMove(none, BOARD, { ...m, double: true })).toThrow();
  });
  it('追跡者の手番では宣言できない', () => {
    const g = withPos(game(), 1, [50]);
    expect(canDouble({ ...g, turn: 1 })).toBe(false);
  });
  it('2手目が指せなければ逃走者は動けず負け', () => {
    const g = withPos(game(), 1, [50]);
    g.players[0].tickets = { taxi: 1, bus: 0, metro: 0, black: 0 };
    const m1 = legalMoves(g, BOARD, 0)[0];
    const g1 = applyMove(g, BOARD, { ...m1, double: true });
    expect(g1.winner).toBe('chaser');
  });
  it('公開手数が2×の1手目にあたれば1手目の位置が公開される', () => {
    const g = withPos(game(), 1, [50]);
    g.log = fakeLog(2); // 次は3手目(公開)
    const m1 = legalMoves(g, BOARD, 0).find((m) => m.mode === 'taxi')!;
    const g1 = applyMove(g, BOARD, { ...m1, double: true });
    expect(g1.log[2].revealedPos).toBe(m1.to);
    expect(g1.lastReveal).toEqual({ round: 3, pos: m1.to });
    const g2 = applyMove(g1, BOARD, legalMoves(g1, BOARD, 0)[0]);
    expect(g2.log[3].revealedPos).toBeNull(); // 4手目は非公開
  });
  it('公開手数が2×の2手目にあたれば2手目の位置が公開される', () => {
    const g = withPos(game(), 1, [50]);
    g.log = fakeLog(1); // 次は2手目と3手目(3手目が公開)
    const m1 = legalMoves(g, BOARD, 0).find((m) => m.mode === 'taxi')!;
    const g1 = applyMove(g, BOARD, { ...m1, double: true });
    expect(g1.log[1].revealedPos).toBeNull();
    const m2 = legalMoves(g1, BOARD, 0)[0];
    const g2 = applyMove(g1, BOARD, m2);
    expect(g2.log[2].revealedPos).toBe(m2.to);
    expect(g2.lastReveal).toEqual({ round: 3, pos: m2.to });
  });
});

describe('手数による終局', () => {
  it('24手目を指したあと、追跡者が動き終えたら逃走者の勝ち', () => {
    const g = withPos(game(), 1, [50]);
    g.log = fakeLog(23);
    const g1 = applyMove(g, BOARD, legalMoves(g, BOARD, 0).find((m) => m.to !== 50)!);
    expect(g1.winner).toBeNull();
    expect(g1.turn).toBe(1);
    const cm = legalMoves(g1, BOARD, 1).find((m) => m.to !== g1.players[0].pos)!;
    const g2 = applyMove(g1, BOARD, cm);
    expect(g2.winner).toBe('fugitive');
    expect(g2.winReason).toContain('逃げ切');
  });
  it('24手目の後でも、追跡者が逃走者の駅に止まれば追跡者の勝ち', () => {
    const g = withPos(game(), 1, [50]);
    g.log = fakeLog(23);
    const g1 = applyMove(g, BOARD, legalMoves(g, BOARD, 0).find((m) => m.to !== 50)!);
    // 追跡者を逃走者の隣へ移して、捕まえる手を指す
    const f = g1.players[0].pos;
    const edge = BOARD.edges.find((e) => e.mode === 'taxi' && (e.a === f || e.b === f))!;
    const c = structuredClone(g1);
    c.players[1].pos = edge.a === f ? edge.b : edge.a;
    const g2 = applyMove(c, BOARD, { to: f, mode: 'taxi' });
    expect(g2.winner).toBe('chaser');
  });
});
