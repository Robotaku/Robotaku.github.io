import { getBoard } from './board';
import { displayName } from './settings';
import type { GameState, Player, PlayerConfig, Result, Settings } from './types';

/** 席ごとの頭文字。名前の先頭1文字(大文字化)。空・重複なら席番号を使う */
export function assignInitials(configs: PlayerConfig[]): string[] {
  const used = new Set<string>();
  return configs.map((p, i) => {
    const first = Array.from(p.name.trim())[0]?.toUpperCase();
    let initial = first && !used.has(first) ? first : String(i + 1);
    if (used.has(initial)) initial = `${i + 1}`;
    used.add(initial);
    return initial;
  });
}

export function createGame(settings: Settings): GameState {
  const board = getBoard(settings.size);
  const initials = assignInitials(settings.players);
  // 名前が空の席は自動名(プレイヤー1、Bot1…)にし、頭文字は席番号にする
  const players: Player[] = settings.players.map((p, i) => ({
    ...p,
    name: displayName(settings.players, i),
    initial: initials[i],
  }));
  return {
    size: settings.size,
    players,
    edges: new Array<number | null>(board.edgeCount).fill(null),
    boxes: new Array<number | null>(board.boxCount).fill(null),
    current: 0,
    lastEdge: null,
    history: [],
    finished: false,
  };
}

/** 四角のすでに引かれた辺の数 */
export function sidesOf(state: GameState, box: number): number {
  const board = getBoard(state.size);
  let n = 0;
  for (const e of board.boxEdges[box]) if (state.edges[e] !== null) n++;
  return n;
}

export function legalMoves(state: GameState): number[] {
  if (state.finished) return [];
  const moves: number[] = [];
  for (let e = 0; e < state.edges.length; e++) if (state.edges[e] === null) moves.push(e);
  return moves;
}

export function isLegalMove(state: GameState, edge: number): boolean {
  return !state.finished && Number.isInteger(edge) && edge >= 0 && edge < state.edges.length && state.edges[edge] === null;
}

/**
 * 線を1本引く(状態は書き換えず、新しい状態を返す)。
 * 四角が完成したら引いた席のものになり、手番は変わらない。完成しなければ次の席へ。
 */
export function applyMove(state: GameState, edge: number): GameState {
  if (!isLegalMove(state, edge)) throw new Error(`引けない線です: ${edge}`);
  const board = getBoard(state.size);
  const edges = state.edges.slice();
  edges[edge] = state.current;
  const boxes = state.boxes.slice();
  const captured: number[] = [];
  for (const b of board.edgeBoxes[edge]) {
    if (boxes[b] === null && board.boxEdges[b].every((e) => edges[e] !== null)) {
      boxes[b] = state.current;
      captured.push(b);
    }
  }
  const finished = edges.every((e) => e !== null);
  const current =
    captured.length > 0 || finished ? state.current : (state.current + 1) % state.players.length;
  return {
    ...state,
    edges,
    boxes,
    current,
    lastEdge: edge,
    history: [...state.history, { edge, player: state.current, captured }],
    finished,
  };
}

/** 直前の1手を取り消す。履歴が無ければそのまま返す */
export function undoMove(state: GameState): GameState {
  const last = state.history[state.history.length - 1];
  if (!last) return state;
  const edges = state.edges.slice();
  edges[last.edge] = null;
  const boxes = state.boxes.slice();
  for (const b of last.captured) boxes[b] = null;
  const history = state.history.slice(0, -1);
  return {
    ...state,
    edges,
    boxes,
    current: last.player,
    lastEdge: history.length > 0 ? history[history.length - 1].edge : null,
    history,
    finished: false,
  };
}

/** 「ひとつ戻す」ボタンが使えるか: 人間の手番で、戻せる人間の手が履歴にあること */
export function canUndo(state: GameState): boolean {
  if (state.finished) return false;
  if (state.players[state.current].kind !== 'human') return false;
  return state.history.some((m) => state.players[m.player].kind === 'human');
}

/** 直近の人間の手番まで戻す。間のBotの手は連続して戻す */
export function undoToHuman(state: GameState): GameState {
  if (!canUndo(state)) return state;
  let s = state;
  while (s.history.length > 0) {
    const wasHuman = s.players[s.history[s.history.length - 1].player].kind === 'human';
    s = undoMove(s);
    if (wasHuman) break;
  }
  return s;
}

export function scoresOf(state: GameState): number[] {
  const scores = new Array<number>(state.players.length).fill(0);
  for (const owner of state.boxes) if (owner !== null) scores[owner]++;
  return scores;
}

/** 順位と勝敗。首位が複数(同数・同率首位)なら引き分け */
export function resultOf(state: GameState): Result {
  const scores = scoresOf(state);
  const ranks = scores.map((s) => 1 + scores.filter((o) => o > s).length);
  const top = Math.max(...scores);
  const leaders = scores.map((s, i) => (s === top ? i : -1)).filter((i) => i >= 0);
  const draw = leaders.length !== 1;
  return { scores, ranks, winner: draw ? null : leaders[0], draw };
}
