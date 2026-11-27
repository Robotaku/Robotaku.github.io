/**
 * ゲームのルール(UIに依存しない純粋な関数)。
 *
 *   createGame   … 席の設定から最初の状態を作る
 *   legalMoves   … いま指せる手の一覧
 *   applyMove    … 手を適用して「新しい状態」を返す(元の状態は書き換えない)
 *   publicState  … 他の人に見せてよい状態(逃走者の位置・チケット・軌跡を消す)
 *
 * 勝敗判定は settle() にまとめてある。数値設定は config.ts。
 */
import type { Board, EdgeMode, GameState, Move, Player, SeatConfig, Tickets } from './types';
import { MODES } from './types';
import {
  CHASER_TICKETS, FUGITIVE_TICKETS, MAX_ROUNDS, MAX_SEATS, MIN_SEATS, REVEAL_ROUNDS,
  TRANSFER_TICKETS, blackTicketsFor, doubleCardsFor,
} from './config';
import { type Rng, shuffle, pick } from './rng';

export interface Neighbor { to: number; mode: EdgeMode }

const adjCache = new WeakMap<Board, Neighbor[][]>();

/** 駅idで引ける隣接リスト(無向)。 */
export function adjacency(board: Board): Neighbor[][] {
  let a = adjCache.get(board);
  if (!a) {
    const maxId = Math.max(...board.stations.map((s) => s.id));
    a = Array.from({ length: maxId + 1 }, () => [] as Neighbor[]);
    for (const e of board.edges) {
      a[e.a].push({ to: e.b, mode: e.mode });
      a[e.b].push({ to: e.a, mode: e.mode });
    }
    adjCache.set(board, a);
  }
  return a;
}

/** 席設定の検証。問題がなければ空配列。 */
export function validateSeats(seats: readonly SeatConfig[]): string[] {
  const errors: string[] = [];
  if (seats.length < MIN_SEATS) errors.push(`席は${MIN_SEATS}つ以上必要です。`);
  if (seats.length > MAX_SEATS) errors.push(`席は${MAX_SEATS}つまでです。`);
  const fugitives = seats.filter((s) => s.role === 'fugitive').length;
  const chasers = seats.filter((s) => s.role === 'chaser').length;
  if (fugitives !== 1) errors.push('逃走者はちょうど1席にしてください。');
  if (chasers < 1) errors.push('追跡者は1席以上必要です。');
  if (!seats.some((s) => !s.isBot)) errors.push('最低1人は人間の席が必要です。');
  return errors;
}

export function createGame(board: Board, seats: readonly SeatConfig[], rng: Rng): GameState {
  const errors = validateSeats(seats);
  if (errors.length) throw new Error(errors.join(' '));
  const fSeat = seats.find((s) => s.role === 'fugitive')!;
  const cSeats = seats.filter((s) => s.role === 'chaser');
  const starts = shuffle(board.chaserStarts, rng).slice(0, cSeats.length);
  const mk = (s: SeatConfig, pos: number, tickets: Tickets, doubleCards: number, fallback: string): Player => ({
    name: s.name.trim() || fallback,
    isBot: s.isBot,
    role: s.role,
    difficulty: s.difficulty,
    pos,
    tickets: { ...tickets },
    doubleCards,
  });
  const n = cSeats.length;
  const fPos = pick(board.fugitiveStarts, rng);
  const players = [
    mk(fSeat, fPos, { ...FUGITIVE_TICKETS, black: blackTicketsFor(n) }, doubleCardsFor(n), '逃走者'),
    ...cSeats.map((s, i) => mk(s, starts[i], CHASER_TICKETS, 0, `追跡者${i + 1}`)),
  ];
  const state: GameState = {
    round: 1,
    maxRounds: MAX_ROUNDS,
    revealRounds: [...REVEAL_ROUNDS],
    players,
    turn: 0,
    pendingDouble: false,
    log: [],
    chaserMoves: [],
    passed: [],
    chaserStart: starts.slice(),
    fugitiveTrail: [fPos],
    lastReveal: null,
    winner: null,
    winReason: '',
  };
  settle(state, board);
  return state;
}

/**
 * 手番プレイヤーが選べる合法手(同じ(駅,チケット)は1つ)。逃走者の位置には依存しない。
 * ・通常の路線は、その手段のチケットが残っていれば使える。
 * ・ブラックチケットは、逃走者だけがどの路線(船を含む)にも使える。船はブラックでしか通れない。
 */
export function legalMoves(state: GameState, board: Board, idx: number): Move[] {
  const p = state.players[idx];
  const blocked = new Set<number>();
  state.players.forEach((q, i) => {
    if (i !== idx && q.role === 'chaser') blocked.add(q.pos);
  });
  const seen = new Set<string>();
  const out: Move[] = [];
  const add = (to: number, mode: Move['mode']) => {
    const key = `${to}:${mode}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ to, mode });
  };
  for (const n of adjacency(board)[p.pos]) {
    if (blocked.has(n.to)) continue;
    if (n.mode !== 'ferry' && p.tickets[n.mode] > 0) add(n.to, n.mode);
    if (p.role === 'fugitive' && p.tickets.black > 0) add(n.to, 'black');
  }
  return out;
}

/** 逃走者がいま2×カードを宣言できるか(残り枚数があり、記録欄に2手分の空きがある) */
export function canDouble(state: GameState): boolean {
  return (
    !state.winner &&
    state.turn === 0 &&
    !state.pendingDouble &&
    state.players[0].doubleCards > 0 &&
    state.log.length <= state.maxRounds - 2
  );
}

function advance(s: GameState): void {
  s.turn += 1;
  if (s.turn >= s.players.length) {
    s.turn = 0;
    s.round += 1;
  }
}

/** 勝敗判定と、動けない追跡者の自動パスを行う(破壊的)。 */
function settle(s: GameState, board: Board): void {
  while (!s.winner) {
    if (s.turn === 0 && !s.pendingDouble && s.log.length >= s.maxRounds) {
      s.winner = 'fugitive';
      s.winReason = `${s.maxRounds}手の記録を埋めて逃げ切りました。`;
      return;
    }
    const chaserIdx = s.players.map((_, i) => i).filter((i) => s.players[i].role === 'chaser');
    if (chaserIdx.every((i) => legalMoves(s, board, i).length === 0)) {
      s.winner = 'fugitive';
      s.winReason = '追跡者が全員動けなくなりました。';
      return;
    }
    if (legalMoves(s, board, s.turn).length > 0) return;
    if (s.players[s.turn].role === 'fugitive') {
      s.winner = 'chaser';
      s.winReason = '逃走者は動ける場所がなくなりました。';
      return;
    }
    s.passed.push({ round: s.round, player: s.turn });
    advance(s);
  }
}

export function isLegal(state: GameState, board: Board, move: Move): boolean {
  if (move.double && !canDouble(state)) return false;
  return legalMoves(state, board, state.turn).some((m) => m.to === move.to && m.mode === move.mode);
}

/** 手を適用した新しい状態を返す(元の状態は変更しない)。 */
export function applyMove(state: GameState, board: Board, move: Move): GameState {
  if (state.winner) throw new Error('ゲームはすでに終了しています。');
  if (!isLegal(state, board, move)) throw new Error('その手は指せません。');
  const s = structuredClone(state);
  const p = s.players[s.turn];
  p.tickets[move.mode] -= 1;
  p.pos = move.to;
  if (p.role === 'fugitive') {
    const secondLeg = state.pendingDouble;
    const step = s.log.length + 1; // 手数。公開は手数で決まる
    const reveal = s.revealRounds.includes(step);
    s.log.push({ round: step, turn: s.round, mode: move.mode, revealedPos: reveal ? move.to : null, double: secondLeg || !!move.double });
    s.fugitiveTrail.push(move.to);
    if (reveal) s.lastReveal = { round: step, pos: move.to };
    if (move.double) {
      // 2×カード: 1手目。手番は逃走者のまま、続けてもう1手動く
      p.doubleCards -= 1;
      s.pendingDouble = true;
      settle(s, board);
      return s;
    }
    s.pendingDouble = false;
  } else {
    s.chaserMoves.push({ round: s.round, player: s.turn, to: move.to, mode: move.mode });
    // 原作のルール: 追跡者が使ったチケットは逃走者に渡る
    if (TRANSFER_TICKETS && move.mode !== 'black') s.players[0].tickets[move.mode] += 1;
    if (move.to === s.players[0].pos) {
      s.winner = 'chaser';
      s.winReason = `${p.name}が逃走者を捕まえました。`;
      return s;
    }
  }
  advance(s);
  settle(s, board);
  return s;
}

/** 他プレイヤーに見せてよい状態。逃走者の位置・チケット(ブラック含む)・2×カードの残り・軌跡を消す。 */
export function publicState(state: GameState): GameState {
  const s = structuredClone(state);
  s.players[0].pos = -1;
  s.players[0].tickets = { taxi: -1, bus: -1, metro: -1, black: -1 };
  s.players[0].doubleCards = -1;
  s.fugitiveTrail = [];
  return s;
}

/** 公開ログから数えた、逃走者が使った手段の回数。 */
export function usedByFugitive(state: GameState): Tickets {
  const t: Tickets = { taxi: 0, bus: 0, metro: 0, black: 0 };
  for (const e of state.log) t[e.mode] += 1;
  return t;
}

export function nextRevealRound(state: GameState): number | null {
  return state.revealRounds.find((r) => r > state.log.length) ?? null;
}

export { MODES };
