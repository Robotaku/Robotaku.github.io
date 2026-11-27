/** 画面で共通して使う、文字列まわりの小さな部品。 */
import { MODE_LABEL, MODES } from '../game/types';
import type { GameState, Mode, Role } from '../game/types';
import { CHASER_COLORS } from './boardView';

/** ログ欄に出す手段の1文字表記 */
export const SHORT: Record<Mode, string> = { taxi: 'タ', bus: 'バ', metro: '地' };

/** ユーザー入力(名前)をHTMLに埋め込む前のエスケープ */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** 「名前(Bot)」の形式。Botのときだけ(Bot)を付ける */
export const dispName = (g: GameState, i: number): string => `${esc(g.players[i].name)}${g.players[i].isBot ? '(Bot)' : ''}`;
export const roleLabel = (r: Role): string => (r === 'fugitive' ? '逃走者' : '追跡者');
export const chaserColor = (i: number): string => CHASER_COLORS[(i - 1) % CHASER_COLORS.length];

export function chipsHtml(t: Record<Mode, number>): string {
  return MODES.map((m) => `<span class="chip ${m}">${MODE_LABEL[m]} ${t[m]}</span>`).join('');
}
