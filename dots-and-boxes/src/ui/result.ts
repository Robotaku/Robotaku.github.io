import { colorOf } from '../game/settings';
import { resultOf } from '../game/rules';
import type { GameState } from '../game/types';
import { clear, el } from './dom';
import { boardSvg } from './svg';

export interface ResultHandlers {
  onAgain(): void;
  onSetup(): void;
}

export function renderResult(root: HTMLElement, state: GameState, handlers: ResultHandlers): void {
  clear(root);
  const result = resultOf(state);
  const order = state.players.map((_, i) => i).sort((a, b) => result.ranks[a] - result.ranks[b] || a - b);
  const headline =
    result.winner !== null
      ? `${state.players[result.winner].name}の勝ち!`
      : '引き分け!';
  const winnerColor = result.winner !== null ? colorOf(state.players[result.winner].colorId) : null;

  root.append(
    el(
      'div',
      { class: 'screen result' },
      el(
        'h1',
        {
          class: 'result-title',
          style: winnerColor ? `background:${winnerColor.hex};color:${winnerColor.text}` : undefined,
        },
        headline,
      ),
      el(
        'ol',
        { class: 'ranking' },
        ...order.map((i) => {
          const p = state.players[i];
          const c = colorOf(p.colorId);
          const top = result.ranks[i] === 1;
          return el(
            'li',
            { class: `rank${top ? ' top' : ''}` },
            el('span', { class: 'rank-pos' }, `${result.ranks[i]}位`),
            el('span', { class: 'score-badge', style: `background:${c.hex};color:${c.text}` }, p.initial),
            el('span', { class: 'rank-name' }, p.name, p.kind === 'bot' ? el('small', {}, 'Bot') : null),
            el('span', { class: 'rank-score' }, `${result.scores[i]}枚`),
          );
        }),
      ),
      el('div', { class: 'board-wrap small' }, boardSvg({ ...state, lastEdge: null }, { interactive: false })),
      el(
        'div',
        { class: 'result-actions' },
        el('button', { type: 'button', class: 'btn primary big', onClick: handlers.onAgain }, 'もう一度遊ぶ'),
        el('button', { type: 'button', class: 'btn ghost', onClick: handlers.onSetup }, '設定に戻る'),
      ),
    ),
  );
}
