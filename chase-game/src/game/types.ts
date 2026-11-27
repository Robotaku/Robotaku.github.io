export type Mode = 'taxi' | 'bus' | 'metro';
export const MODES: Mode[] = ['taxi', 'bus', 'metro'];
export const MODE_LABEL: Record<Mode, string> = { taxi: 'タクシー', bus: 'バス', metro: '地下鉄' };

export interface Station { id: number; x: number; y: number }
export interface Edge { a: number; b: number; mode: Mode }
export interface Board { stations: Station[]; edges: Edge[]; fugitiveStarts: number[]; chaserStarts: number[] }

export type Role = 'fugitive' | 'chaser';
export type Difficulty = 'easy' | 'normal';
export type Tickets = Record<Mode, number>;

export interface SeatConfig { name: string; isBot: boolean; role: Role; difficulty: Difficulty }

export interface Player {
  name: string; isBot: boolean; role: Role; difficulty: Difficulty;
  pos: number; tickets: Tickets;
}
export interface LogEntry { round: number; mode: Mode; revealedPos: number | null }
export interface Move { to: number; mode: Mode }
export interface ChaserMoveRecord { round: number; player: number; to: number; mode: Mode }

export interface GameState {
  round: number;            // 1..maxRounds
  maxRounds: number;
  revealRounds: number[];
  players: Player[];        // 逃走者が先頭。以降が追跡者
  turn: number;             // players のインデックス
  log: LogEntry[];          // 逃走者の公開履歴
  chaserMoves: ChaserMoveRecord[];
  passed: { round: number; player: number }[]; // 動けず手番を飛ばした追跡者
  chaserStart: number[];    // 追跡者の開始位置(players[k+1] が chaserStart[k]。公開情報)
  fugitiveTrail: number[];  // 【秘密】逃走者の通った駅。publicState では空になる
  lastReveal: { round: number; pos: number } | null;
  winner: Role | null;
  winReason: string;
}
