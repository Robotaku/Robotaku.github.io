/**
 * ゲーム全体で使う型の定義。まずここを読むと、データの形が分かる。
 *
 *  Board     … 盤面(駅・路線・開始位置)。board.ts に実データがある。
 *  GameState … 進行中のゲームの全状態。rules.ts の関数は、これを受け取って新しい状態を返す。
 *              「秘密」と書かれた項目は、publicState() で消してから他人に見せる。
 *
 * 用語:
 *  ・手数(step)   … 逃走者の移動記録の番号(1〜24)。公開は手数で決まる。2×カードで1手番に2手数進む。
 *  ・ラウンド(round)… 逃走者→追跡者全員が1回ずつ動く1周。state.round は追跡者の手番の数え方。
 */
/** 公開される移動手段(路線の種類でもある) */
export type Mode = 'taxi' | 'bus' | 'metro';
export const MODES: Mode[] = ['taxi', 'bus', 'metro'];

/** 路線の種類。ferry(船)はブラックチケットでしか通れない */
export type EdgeMode = Mode | 'ferry';

/** チケットの種類。black は逃走者専用で、どの路線(船を含む)にも使え、追跡者には手段が見えない */
export type TicketKind = Mode | 'black';
export const TICKET_KINDS: TicketKind[] = ['taxi', 'bus', 'metro', 'black'];
export const MODE_LABEL: Record<TicketKind, string> = {
  taxi: 'タクシー',
  bus: 'バス',
  metro: '地下鉄',
  black: 'ブラック',
};

export interface Station { id: number; x: number; y: number }
export interface Edge { a: number; b: number; mode: EdgeMode }
export interface Board { stations: Station[]; edges: Edge[]; fugitiveStarts: number[]; chaserStarts: number[] }

export type Role = 'fugitive' | 'chaser';
export type Difficulty = 'easy' | 'normal';
export type Tickets = Record<TicketKind, number>;

export interface SeatConfig { name: string; isBot: boolean; role: Role; difficulty: Difficulty }

export interface Player {
  name: string; isBot: boolean; role: Role; difficulty: Difficulty;
  pos: number; tickets: Tickets;
  doubleCards: number;      // 2×カードの残り(逃走者のみ。追跡者は0)
}

/** 逃走者の公開ログ1手分。mode が black のとき、追跡者には手段が分からない */
export interface LogEntry {
  round: number;            // 手数(1〜maxRounds)。公開ラウンドの判定に使う
  turn: number;             // このとき state.round だった値(追跡者の移動との対応づけに使う)
  mode: TicketKind;
  revealedPos: number | null;
  double: boolean;          // 2×カードによる手(2手分の両方に true)
}
/** double: true は「2×カードを使って、続けてもう1手動く」の宣言(最初の手にだけ付ける) */
export interface Move { to: number; mode: TicketKind; double?: boolean }
export interface ChaserMoveRecord { round: number; player: number; to: number; mode: TicketKind }

export interface GameState {
  round: number;            // 追跡者の手番の数え方(1から)
  maxRounds: number;        // 逃走者の移動記録の数(これを埋めて追跡者が動き終えたら逃走者の勝ち)
  revealRounds: number[];   // 位置が公開される手数
  players: Player[];        // 逃走者が先頭。以降が追跡者
  turn: number;             // players のインデックス
  pendingDouble: boolean;   // 2×カードの1手目を指し終え、2手目を待っている
  log: LogEntry[];          // 逃走者の公開履歴
  chaserMoves: ChaserMoveRecord[];
  passed: { round: number; player: number }[]; // 動けず手番を飛ばした追跡者
  chaserStart: number[];    // 追跡者の開始位置(players[k+1] が chaserStart[k]。公開情報)
  fugitiveTrail: number[];  // 【秘密】逃走者の通った駅。publicState では空になる
  lastReveal: { round: number; pos: number } | null; // round は手数
  winner: Role | null;
  winReason: string;
}
