/**
 * 画面の状態(アプリ全体で1つだけ持つ)。
 * ・どの画面を出しているか、設定中の席、進行中のゲーム、などをここに集める。
 * ・各画面ファイル(screens/*.ts)はこの状態を読んでHTMLを作るだけ。変更は app.ts が行う。
 */
import type { GameState, SeatConfig } from '../game/types';

export type Screen = 'setup' | 'handoff' | 'play' | 'result';

export interface Ui {
  screen: Screen;
  seats: SeatConfig[];
  debug: boolean;
  hint: boolean;
  game: GameState | null;
  holder: number | null; // 端末を今持っている人間のプレイヤー番号
  selected: number | null;
  feed: string[];
  zoom: number;
  showRules: boolean;
  thinking: boolean;
  centerOn: number | null;
  doubleArmed: boolean; // 逃走者が「2×カードを使う」を選んだ状態(次の1手目に宣言が付く)
}

/** Botが1手指すまでの待ち時間(ミリ秒)。何をしたか見えるように少し間を置く。 */
export const BOT_DELAY = 800;

export const ui: Ui = {
  screen: 'setup',
  seats: [
    { name: 'プレイヤー1', isBot: false, role: 'fugitive', difficulty: 'normal' },
    { name: 'プレイヤー2', isBot: false, role: 'chaser', difficulty: 'normal' },
    { name: 'Bot1', isBot: true, role: 'chaser', difficulty: 'normal' },
  ],
  debug: false,
  hint: false,
  game: null,
  holder: null,
  selected: null,
  feed: [],
  zoom: typeof window !== 'undefined' && window.innerWidth < 700 ? 2 : 1,
  showRules: false,
  thinking: false,
  centerOn: null,
  doubleArmed: false,
};
