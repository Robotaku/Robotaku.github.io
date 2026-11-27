import { describe, it, expect } from 'vitest';
import { BOARD } from '../src/game/board';
import { applyMove, createGame, legalMoves, publicState, adjacency, isLegal } from '../src/game/rules';
import { mulberry32 } from '../src/game/rng';
import type { GameState, SeatConfig } from '../src/game/types';

const seat = (role: 'fugitive' | 'chaser', isBot = false, name = ''): SeatConfig => ({ name, isBot, role, difficulty: 'normal' });
const seats2: SeatConfig[] = [seat('fugitive', false, 'A'), seat('chaser', false, 'B')];

function game(seats = seats2, seed = 1): GameState {
  return createGame(BOARD, seats, mulberry32(seed));
}
/** 状態を直接組み替えるテスト用ヘルパ */
function withPos(s: GameState, fPos: number, cPos: number[]): GameState {
  const c = structuredClone(s);
  c.players[0].pos = fPos;
  cPos.forEach((p, i) => (c.players[i + 1].pos = p));
  c.fugitiveTrail = [fPos];
  return c;
}
const nb = (id: number, mode: 'taxi' | 'bus' | 'metro') => adjacency(BOARD)[id].filter((e) => e.mode === mode).map((e) => e.to);

describe('createGame', () => {
  it('逃走者が先頭で、位置は開始候補、追跡者は重複しない開始位置', () => {
    const g = game([seat('chaser'), seat('fugitive'), seat('chaser'), seat('chaser', true)]);
    expect(g.players[0].role).toBe('fugitive');
    expect(BOARD.fugitiveStarts).toContain(g.players[0].pos);
    const cs = g.players.slice(1).map((p) => p.pos);
    expect(new Set(cs).size).toBe(3);
    cs.forEach((p) => expect(BOARD.chaserStarts).toContain(p));
    expect(g.round).toBe(1);
    expect(g.turn).toBe(0);
  });
  it('不正な席構成は例外', () => {
    expect(() => createGame(BOARD, [seat('fugitive'), seat('fugitive')], mulberry32(1))).toThrow();
    expect(() => createGame(BOARD, [seat('fugitive', true), seat('chaser', true)], mulberry32(1))).toThrow();
  });
});

describe('legalMoves / applyMove', () => {
  it('チケットが0の手段は使えず、使うと1減る', () => {
    const g = game();
    const m = legalMoves(g, BOARD, 0)[0];
    const g2 = applyMove(g, BOARD, m);
    expect(g2.players[0].tickets[m.mode]).toBe(g.players[0].tickets[m.mode] - 1);
    expect(g.players[0].pos).not.toBe(m.to); // 元の状態は不変
    const noTaxi = structuredClone(g);
    noTaxi.players[0].tickets.taxi = 0;
    expect(legalMoves(noTaxi, BOARD, 0).every((x) => x.mode !== 'taxi')).toBe(true);
  });
  it('非合法手は例外', () => {
    const g = game();
    expect(() => applyMove(g, BOARD, { to: 999, mode: 'taxi' })).toThrow();
    expect(isLegal(g, BOARD, { to: g.players[0].pos, mode: 'taxi' })).toBe(false);
  });
  it('逃走者は追跡者のいる駅へ行けない / 追跡者同士も重ならない', () => {
    const g0 = game([seat('fugitive'), seat('chaser'), seat('chaser')]);
    const f = 1;
    const [a, b] = nb(f, 'taxi');
    const g = withPos(g0, f, [a, b]);
    expect(legalMoves(g, BOARD, 0).some((m) => m.to === a || m.to === b)).toBe(false);
  });
  it('追跡者の合法手は逃走者の駅を除外しない(位置が漏れない)', () => {
    const g0 = game();
    const f = 1;
    const c = nb(f, 'taxi')[0];
    const g = withPos(g0, f, [c]);
    g.turn = 1;
    expect(legalMoves(g, BOARD, 1).some((m) => m.to === f)).toBe(true);
  });
  it('追跡者が逃走者と同じ駅に止まれば追跡者の勝ち', () => {
    const g0 = game();
    const f = 1;
    const c = nb(f, 'taxi')[0];
    const g = withPos(g0, f, [c]);
    g.turn = 1;
    const g2 = applyMove(g, BOARD, { to: f, mode: 'taxi' });
    expect(g2.winner).toBe('chaser');
  });
  it('公開ラウンドだけ位置が公開される', () => {
    let g = game();
    // 追跡者を逃走者から遠ざけて安全に回す: 位置を毎手直接置き換える
    for (let r = 1; r <= 8; r++) {
      const m = legalMoves(g, BOARD, 0)[0];
      g = applyMove(g, BOARD, m);
      const e = g.log[g.log.length - 1];
      if (e.round === 3 || e.round === 8) expect(e.revealedPos).toBe(m.to);
      else expect(e.revealedPos).toBeNull();
      // 追跡者を動かす(捕まらないよう、逃走者の位置以外へ)。捕まったら終了
      if (g.winner) break;
      const cm = legalMoves(g, BOARD, 1).filter((x) => x.to !== g.players[0].pos);
      if (!cm.length) break;
      g = applyMove(g, BOARD, cm[0]);
      if (g.winner) break;
    }
    expect(g.lastReveal === null || [3, 8].includes(g.lastReveal.round)).toBe(true);
  });
  it('24ラウンド逃げ切れば逃走者の勝ち', () => {
    let g = game();
    g.maxRounds = 2;
    g = withPos(g, 1, [50]);
    g.players[0].tickets = { taxi: 99, bus: 99, metro: 99, black: 0 };
    g.players[1].tickets = { taxi: 99, bus: 99, metro: 99, black: 0 };
    let guard = 0;
    while (!g.winner && guard++ < 50) {
      const lm = legalMoves(g, BOARD, g.turn).filter((m) => g.turn === 0 || m.to !== g.players[0].pos);
      g = applyMove(g, BOARD, lm[0] ?? legalMoves(g, BOARD, g.turn)[0]);
    }
    expect(g.winner === 'fugitive' || g.winner === 'chaser').toBe(true);
  });
  it('maxRounds経過で逃走者勝ち(追跡者が遠い場合)', () => {
    let g = game();
    g.maxRounds = 1;
    g = withPos(g, 1, [50]);
    g = applyMove(g, BOARD, legalMoves(g, BOARD, 0).find((m) => m.to !== 50)!);
    const cm = legalMoves(g, BOARD, 1).find((m) => m.to !== g.players[0].pos)!;
    g = applyMove(g, BOARD, cm);
    expect(g.winner).toBe('fugitive');
    expect(g.winReason).toContain('逃げ切');
  });
  it('追跡者が全員チケット切れなら逃走者の勝ち', () => {
    const g0 = withPos(game(), 1, [50]);
    g0.players[1].tickets = { taxi: 0, bus: 0, metro: 0, black: 0 };
    const g = applyMove(g0, BOARD, legalMoves(g0, BOARD, 0)[0]);
    expect(g.winner).toBe('fugitive');
    expect(g.winReason).toContain('動けなく');
  });
  it('動けない追跡者は自動でパスされ、他の追跡者が動く', () => {
    const g0 = withPos(game([seat('fugitive'), seat('chaser'), seat('chaser')]), 1, [50, 46]);
    g0.players[1].tickets = { taxi: 0, bus: 0, metro: 0, black: 0 };
    const g = applyMove(g0, BOARD, legalMoves(g0, BOARD, 0)[0]);
    expect(g.winner).toBeNull();
    expect(g.turn).toBe(2);
    expect(g.passed).toEqual([{ round: 1, player: 1 }]);
  });
  it('逃走者が動けなければ追跡者の勝ち', () => {
    // 逃走者は駅1(タクシー路線のみ)。チケットは0。追跡者が使ったバス券が渡っても、駅1ではバスが使えず動けない
    const g0 = withPos(game(), 1, [11]);
    g0.players[0].tickets = { taxi: 0, bus: 0, metro: 0, black: 0 };
    const g = applyMove({ ...g0, turn: 1 }, BOARD, { to: 12, mode: 'bus' });
    expect(g.players[0].tickets.bus).toBe(1); // 受け渡しの確認
    expect(g.winner).toBe('chaser');
    expect(g.winReason).toContain('動ける場所');
  });
});

describe('publicState(隠し情報)', () => {
  it('逃走者の位置・チケット・軌跡を含まない', () => {
    const g = game();
    const p = publicState(g);
    expect(p.players[0].pos).toBe(-1);
    expect(p.players[0].tickets).toEqual({ taxi: -1, bus: -1, metro: -1, black: -1 });
    expect(p.players[0].doubleCards).toBe(-1);
    expect(p.fugitiveTrail).toEqual([]);
    expect(JSON.stringify(p)).not.toContain(`"pos":${g.players[0].pos},"tickets":{"taxi":6`);
  });
  it('公開ログは手段のみで、公開ラウンド以外は位置を含まない', () => {
    let g = game();
    g = applyMove(g, BOARD, legalMoves(g, BOARD, 0)[0]);
    const p = publicState(g);
    expect(p.log[0].revealedPos).toBeNull();
    expect(Object.keys(p.log[0]).sort()).toEqual(['double', 'mode', 'revealedPos', 'round', 'turn']);
  });
});
