import { describe, expect, it } from 'vitest';
import {
  EXACT_LIMIT,
  capturingMoves,
  chooseMove,
  giveAwayCount,
  safeMoves,
} from '../src/game/bot';
import { getBoard } from '../src/game/board';
import { applyMove, legalMoves, resultOf } from '../src/game/rules';
import type { BotLevel, GameState } from '../src/game/types';
import { boxEdgeList, makeGame, play } from './helpers';

/** 決まった列を返す疑似乱数(テスト用) */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** 四角0の3辺を引いた状態(次の手番は取れる) */
function threeSides(): GameState {
  const e = boxEdgeList(3, 0);
  // 3辺を引く(人間2人。4辺目が取れる状態)
  return play(makeGame(3, ['human', 'human']), [e[0], e[1], e[2]]);
}

describe('Bot: 共通', () => {
  it.each(['easy', 'normal', 'strong'] as BotLevel[])('%s は取れる四角を取る', (level) => {
    const s = threeSides();
    const move = chooseMove(s, level, seeded(1));
    expect(boxEdgeList(3, 0)).toContain(move);
    const next = applyMove(s, move);
    expect(next.boxes[0]).toBe(s.current);
  });

  it.each(['easy', 'normal', 'strong'] as BotLevel[])('%s は常に有効な線を選び、最後まで打ち切れる', (level) => {
    for (const size of [3, 4, 5] as const) {
      let s = makeGame(size, ['bot', 'bot', 'bot']);
      const rng = seeded(size * 7);
      let guard = 0;
      while (!s.finished) {
        const move = chooseMove(s, level, rng);
        expect(legalMoves(s)).toContain(move);
        s = applyMove(s, move);
        if (++guard > 100) throw new Error('終わらない');
      }
      expect(s.boxes.every((b) => b !== null)).toBe(true);
    }
  });

  it('引ける線が無ければ例外', () => {
    let s = makeGame(3, ['bot', 'bot']);
    for (const e of legalMoves(s)) s = applyMove(s, e);
    expect(() => chooseMove(s, 'normal')).toThrow();
  });
});

describe('Bot: ふつう', () => {
  it('3辺目を作らない線(安全な線)があればそれを選ぶ', () => {
    // 四角0に2辺ある状態: その四角の残り2辺は危険
    const e = boxEdgeList(3, 0);
    const s = play(makeGame(3, ['human', 'human']), [e[0], e[2]]);
    const safe = safeMoves(s);
    expect(safe).not.toContain(e[1]);
    expect(safe).not.toContain(e[3]);
    for (let seed = 1; seed <= 30; seed++) {
      expect(safe).toContain(chooseMove(s, 'normal', seeded(seed)));
    }
  });

  it('安全な線が無いとき、相手に渡す四角が最少の線を選ぶ', () => {
    // 3×3点(四角4個)で、全ての線が危険になる局面を作って検証する
    // 外周の8本と中の十字のうち、中の十字4本を引く → 各四角は2辺
    const b = getBoard(3);
    const cross = new Set<number>();
    for (const box of [0, 1, 2, 3]) for (const e of b.boxEdges[box]) {
      if (b.edgeBoxes[e].length === 2) cross.add(e);
    }
    let s = makeGame(3, ['human', 'human']);
    s = play(s, [...cross]);
    expect(safeMoves(s)).toEqual([]);
    // 外周の線を引くと、隣の四角が3辺になり、そこから連鎖的に取られる量を最小にする
    const costs = legalMoves(s).map((e) => giveAwayCount(s, e));
    const best = Math.min(...costs);
    const move = chooseMove(s, 'normal', seeded(3));
    expect(giveAwayCount(s, move)).toBe(best);
  });

  it('giveAwayCount は連鎖の長さを数える', () => {
    // 1×2の細長い連鎖(四角0と1)を作り、端を開くと2枚取られる
    const b = getBoard(3);
    const box0 = b.boxEdges[0];
    const box1 = b.boxEdges[1];
    const shared = box0[3];
    // 四角0: 上・左を引く。四角1: 上・右・下を引く。共有線と四角0の下は未引き
    const lines = [box0[0], box0[2], box1[0], box1[3], box1[1]];
    let s = makeGame(3, ['human', 'human']);
    s = play(s, lines);
    expect(s.boxes[0]).toBeNull();
    // 四角0の下(box0[1])を引くと四角0が3辺→相手が共有線→四角0と四角1の2枚取れる
    expect(giveAwayCount(s, box0[1])).toBe(2);
    expect(shared).toBe(box1[2]);
  });
});

describe('Bot: つよい(終盤の全探索)', () => {
  it('取れる四角が複数ある終盤でも、最終的な獲得数が最大になる手を選ぶ', () => {
    // 2×2の盤で全探索。つよいBotが、ふつうに劣らない結果を出すこと
    let strongWins = 0;
    let normalWins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = seeded(seed);
      // 席0=つよい、席1=ふつう。先手を交互に入れ替える
      let s = makeGame(4, ['bot', 'bot']);
      if (seed % 2 === 0) s = { ...s, current: 1 };
      const strongSeat = seed % 2 === 0 ? 1 : 0;
      while (!s.finished) {
        const level: BotLevel = s.current === strongSeat ? 'strong' : 'normal';
        s = applyMove(s, chooseMove(s, level, rng));
      }
      const r = resultOf(s);
      if (r.winner === strongSeat) strongWins++;
      else if (r.winner !== null) normalWins++;
    }
    expect(strongWins).toBeGreaterThan(normalWins);
  });

  it('終盤の手は、独立に書いた総当たりミニマックスの最善値と一致する', () => {
    // 2人対戦。ランダムに進めて残り9本にし、その局面での最善の獲得差を総当たりで求める
    const best = (s: GameState, me: number): number => {
      // me から見た「この後の自分の獲得 - 相手の獲得」
      if (s.finished) return 0;
      let top = s.current === me ? -Infinity : Infinity;
      for (const e of legalMoves(s)) {
        const n = applyMove(s, e);
        const gained = n.history[n.history.length - 1].captured.length;
        const v = (s.current === me ? gained : -gained) + best(n, me);
        top = s.current === me ? Math.max(top, v) : Math.min(top, v);
      }
      return top;
    };
    for (let seed = 1; seed <= 12; seed++) {
      const rng = seeded(seed * 31);
      let s = makeGame(4, ['bot', 'bot']);
      while (legalMoves(s).length > 9) s = applyMove(s, chooseMove(s, 'easy', rng));
      const me = s.current;
      const move = chooseMove(s, 'strong', rng);
      const n = applyMove(s, move);
      const gained = n.history[n.history.length - 1].captured.length;
      // 全探索は「自分の獲得数の最大化」(2人なら差の最大化と同じ向き)なので、差で比べる
      const chosen = gained + best(n, me);
      expect(chosen).toBe(best(s, me));
    }
  });

  it('EXACT_LIMIT は十分に大きく、取れる四角があるときは必ず取る手が候補に入る', () => {
    expect(EXACT_LIMIT).toBeGreaterThan(8);
    expect(capturingMoves(threeSides()).length).toBeGreaterThan(0);
  });
});
