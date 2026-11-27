import { getBoard } from './board';
import { legalMoves } from './rules';
import type { BotLevel, GameState, Rng } from './types';

/** 残りの線がこの本数以下になったら、終盤を全探索して最善手を選ぶ(つよい) */
export const EXACT_LIMIT = 17;

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

function sidesOfBox(state: GameState, box: number): number {
  const board = getBoard(state.size);
  let n = 0;
  for (const e of board.boxEdges[box]) if (state.edges[e] !== null) n++;
  return n;
}

/** その線を引くと四角が完成する(=取れる)線 */
export function capturingMoves(state: GameState): number[] {
  const board = getBoard(state.size);
  return legalMoves(state).filter((e) =>
    board.edgeBoxes[e].some((b) => state.boxes[b] === null && sidesOfBox(state, b) === 3),
  );
}

/** 引いても、隣の四角が「3辺」にならない安全な線 */
export function safeMoves(state: GameState): number[] {
  const board = getBoard(state.size);
  return legalMoves(state).filter((e) =>
    board.edgeBoxes[e].every((b) => sidesOfBox(state, b) < 2),
  );
}

/**
 * その線を引いた直後、相手が取れる四角を取れるだけ取ったときの、相手の獲得数。
 * (自分がその線で四角を完成させる場合は、その分を除いて数える)
 */
export function giveAwayCount(state: GameState, edge: number): number {
  const board = getBoard(state.size);
  const drawn = state.edges.map((e) => e !== null);
  const owned = state.boxes.map((b) => b !== null);
  const sides = board.boxEdges.map((es) => es.filter((e) => drawn[e]).length);
  const draw = (e: number): number => {
    drawn[e] = true;
    let got = 0;
    for (const b of board.edgeBoxes[e]) {
      sides[b]++;
      if (!owned[b] && sides[b] === 4) {
        owned[b] = true;
        got++;
      }
    }
    return got;
  };
  draw(edge);
  let given = 0;
  // 相手は3辺の四角を見つけるたびに取り続ける
  for (;;) {
    let progressed = false;
    for (let b = 0; b < board.boxCount; b++) {
      if (!owned[b] && sides[b] === 3) {
        const open = board.boxEdges[b].find((e) => !drawn[e]);
        if (open === undefined) continue;
        given += draw(open);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return given;
}

function chooseNormal(state: GameState, rng: Rng): number {
  const captures = capturingMoves(state);
  if (captures.length > 0) return pick(captures, rng);
  const safe = safeMoves(state);
  if (safe.length > 0) return pick(safe, rng);
  const moves = legalMoves(state);
  const costs = moves.map((e) => giveAwayCount(state, e));
  const best = Math.min(...costs);
  return pick(
    moves.filter((_, i) => costs[i] === best),
    rng,
  );
}

/**
 * 終盤の全探索。残りの線をビットで表し、「自分が今後取れる四角数」を
 * 自分は最大化、他の席はまとめて最小化する(2人対戦なら通常のミニマックス)。
 * 手番の進行は本物のルールと同じ(取れたら続けて引く)。
 */
function chooseExact(state: GameState, rng: Rng): number {
  const board = getBoard(state.size);
  const open = legalMoves(state); // 未引きの線(k本)
  const k = open.length;
  const bit = new Map<number, number>();
  open.forEach((e, i) => bit.set(e, i));
  const players = state.players.length;
  const me = state.current;

  // 未取得の四角ごとに、未引きの辺のビットマスク
  const boxMask: number[] = [];
  for (let b = 0; b < board.boxCount; b++) {
    if (state.boxes[b] !== null) {
      boxMask.push(0);
      continue;
    }
    let mask = 0;
    for (const e of board.boxEdges[b]) {
      const i = bit.get(e);
      if (i !== undefined) mask |= 1 << i;
    }
    boxMask.push(mask);
  }
  // 線ごとに、隣接する未取得の四角
  const adj: number[][] = open.map((e) => board.edgeBoxes[e].filter((b) => state.boxes[b] === null));
  const full = (1 << k) - 1;
  const memo = new Map<number, number>();

  const captured = (m: number, i: number): number => {
    let c = 0;
    for (const b of adj[i]) if ((m & boxMask[b]) === boxMask[b]) c++;
    return c;
  };

  // 戻り値: この局面以降に「自分」が取る四角の数
  const solve = (m: number, player: number): number => {
    if (m === full) return 0;
    const key = m * 8 + player;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const mine = player === me;
    let best = mine ? -1 : Infinity;
    for (let i = 0; i < k; i++) {
      if (m & (1 << i)) continue;
      const nm = m | (1 << i);
      const c = captured(nm, i);
      const next = c > 0 ? player : (player + 1) % players;
      const v = (mine ? c : 0) + solve(nm, next);
      if (mine ? v > best : v < best) best = v;
    }
    memo.set(key, best);
    return best;
  };

  let bestValue = -1;
  let bestMoves: number[] = [];
  // 現在の局面は m=0(未引きの線は全て未引き)から始める
  for (let i = 0; i < k; i++) {
    const nm = 1 << i;
    const c = captured(nm, i);
    const next = c > 0 ? me : (me + 1) % players;
    const v = c + solve(nm, next);
    if (v > bestValue) {
      bestValue = v;
      bestMoves = [open[i]];
    } else if (v === bestValue) {
      bestMoves.push(open[i]);
    }
  }
  return pick(bestMoves, rng);
}

function chooseStrong(state: GameState, rng: Rng): number {
  const remaining = legalMoves(state).length;
  if (remaining <= EXACT_LIMIT) return chooseExact(state, rng);
  return chooseNormal(state, rng);
}

/** Botの1手を選ぶ。引ける線が無ければ例外 */
export function chooseMove(state: GameState, level: BotLevel, rng: Rng = Math.random): number {
  if (legalMoves(state).length === 0) throw new Error('引ける線がありません');
  if (level === 'easy') {
    const captures = capturingMoves(state);
    if (captures.length > 0) return pick(captures, rng);
    return pick(legalMoves(state), rng);
  }
  if (level === 'normal') return chooseNormal(state, rng);
  return chooseStrong(state, rng);
}
