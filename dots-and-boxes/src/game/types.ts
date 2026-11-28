// ゲームの型定義(UIに依存しない)

/** 選べる盤面の点の数(1辺)。四角は (点の数-1)² 個: 4 / 9 / 16 / 25 / 49 / 81 */
export const BOARD_SIZES = [3, 4, 5, 6, 8, 10] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];
export type PlayerKind = 'human' | 'bot';
export type BotLevel = 'easy' | 'normal' | 'strong';
export type BotSpeed = 'normal' | 'fast' | 'instant';

export interface PlayerConfig {
  name: string;
  colorId: string;
  kind: PlayerKind;
}

export interface Settings {
  size: BoardSize;
  players: PlayerConfig[];
  botLevel: BotLevel;
  botSpeed: BotSpeed;
}

export interface Player extends PlayerConfig {
  /** 四角の中に表示する頭文字(席ごとに重複しない) */
  initial: string;
}

export interface Move {
  edge: number;
  player: number;
  /** この手で完成した四角の番号 */
  captured: number[];
}

export interface GameState {
  size: BoardSize;
  players: Player[];
  /** 各線を引いた席の番号。未引きは null */
  edges: (number | null)[];
  /** 各四角を取った席の番号。未取得は null */
  boxes: (number | null)[];
  /** 現在の手番の席 */
  current: number;
  lastEdge: number | null;
  history: Move[];
  finished: boolean;
}

export interface Result {
  scores: number[];
  /** 各席の順位(同点は同順位。1始まり) */
  ranks: number[];
  /** 単独の勝者。引き分け(首位が複数)なら null */
  winner: number | null;
  draw: boolean;
}

/** 乱数。0以上1未満を返す。テストで差し替えられるよう引数で受け取る */
export type Rng = () => number;
