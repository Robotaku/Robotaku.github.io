import type { Board, GameState, Move, Mode, Player, SeatConfig, Tickets } from './types';
import { MODES } from './types';
import { type Rng, shuffle, pick } from './rng';

export const MAX_ROUNDS = 24;
export const REVEAL_ROUNDS = [3, 8, 13, 18, 24];
export const FUGITIVE_TICKETS: Tickets = { taxi: 24, bus: 9, metro: 6 };
export const CHASER_TICKETS: Tickets = { taxi: 24, bus: 8, metro: 4 };
export const MIN_SEATS = 2;
export const MAX_SEATS = 8; // 逃走者1 + 追跡者7

export interface Neighbor { to: number; mode: Mode }

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
  const mk = (s: SeatConfig, pos: number, tickets: Tickets, fallback: string): Player => ({
    name: s.name.trim() || fallback,
    isBot: s.isBot,
    role: s.role,
    difficulty: s.difficulty,
    pos,
    tickets: { ...tickets },
  });
  const fPos = pick(board.fugitiveStarts, rng);
  const players = [
    mk(fSeat, fPos, FUGITIVE_TICKETS, '逃走者'),
    ...cSeats.map((s, i) => mk(s, starts[i], CHASER_TICKETS, `追跡者${i + 1}`)),
  ];
  const state: GameState = {
    round: 1,
    maxRounds: MAX_ROUNDS,
    revealRounds: [...REVEAL_ROUNDS],
    players,
    turn: 0,
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

/** 手番プレイヤーが選べる合法手(同じ(駅,手段)は1つ)。逃走者の位置には依存しない。 */
export function legalMoves(state: GameState, board: Board, idx: number): Move[] {
  const p = state.players[idx];
  const blocked = new Set<number>();
  state.players.forEach((q, i) => {
    if (i !== idx && q.role === 'chaser') blocked.add(q.pos);
  });
  const seen = new Set<string>();
  const out: Move[] = [];
  for (const n of adjacency(board)[p.pos]) {
    if (p.tickets[n.mode] <= 0) continue;
    if (blocked.has(n.to)) continue;
    const key = `${n.to}:${n.mode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ to: n.to, mode: n.mode });
  }
  return out;
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
    if (s.round > s.maxRounds) {
      s.winner = 'fugitive';
      s.winReason = `${s.maxRounds}ラウンド逃げ切りました。`;
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
    const reveal = s.revealRounds.includes(s.round);
    s.log.push({ round: s.round, mode: move.mode, revealedPos: reveal ? move.to : null });
    s.fugitiveTrail.push(move.to);
    if (reveal) s.lastReveal = { round: s.round, pos: move.to };
  } else {
    s.chaserMoves.push({ round: s.round, player: s.turn, to: move.to, mode: move.mode });
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

/** 他プレイヤーに見せてよい状態。逃走者の位置・チケット・軌跡を消す。 */
export function publicState(state: GameState): GameState {
  const s = structuredClone(state);
  s.players[0].pos = -1;
  s.players[0].tickets = { taxi: -1, bus: -1, metro: -1 };
  s.fugitiveTrail = [];
  return s;
}

/** 公開ログから数えた、逃走者が使った手段の回数。 */
export function usedByFugitive(state: GameState): Tickets {
  const t: Tickets = { taxi: 0, bus: 0, metro: 0 };
  for (const e of state.log) t[e.mode] += 1;
  return t;
}

export function isRevealRound(state: GameState, round: number): boolean {
  return state.revealRounds.includes(round);
}

export function nextRevealRound(state: GameState): number | null {
  return state.revealRounds.find((r) => r >= state.round) ?? null;
}

export { MODES };
