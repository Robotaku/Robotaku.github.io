import { colorOf } from '../game/settings';
import { canUndo, scoresOf } from '../game/rules';
import type { GameState } from '../game/types';
import { clear, el } from './dom';
import { boardSvg } from './svg';

export interface PlayHandlers {
  onEdge(edge: number): void;
  onUndo(): void;
  onQuit(): void;
  /** Botの待ち時間中に画面をタップしたとき */
  onSkip(): void;
}

export function renderPlay(root: HTMLElement, state: GameState, handlers: PlayHandlers): void {
  clear(root);
  const me = state.players[state.current];
  const col = colorOf(me.colorId);
  const isBot = me.kind === 'bot';
  const scores = scoresOf(state);
  const last = state.history[state.history.length - 1];
  // 手番が切り替わったときだけ、大きく切り替えのアニメーションを出す
  const turnChanged = !last || last.player !== state.current;
  const bonus = !!last && last.player === state.current && last.captured.length > 0;

  const banner = el(
    'div',
    {
      class: `turn${turnChanged ? ' turn-changed' : ''}${isBot ? ' is-bot' : ''}`,
      style: `background:${col.hex};color:${col.text}`,
      'aria-live': 'polite',
    },
    el('span', { class: 'turn-initial' }, me.initial),
    el(
      'div',
      { class: 'turn-text' },
      el('div', { class: 'turn-name' }, state.finished ? '全部の線が引かれました' : `${me.name}${isBot ? '(Bot)' : ''}の番`),
      el(
        'div',
        { class: 'turn-sub' },
        state.finished
          ? 'ゲーム終了! 結果を表示します'
          : isBot
          ? 'Botが考え中…(画面タップで早送り)'
          : bonus
            ? '四角をゲット! もう1本引けます'
            : '線をタップして引こう',
      ),
    ),
  );

  const scoreboard = el(
    'ul',
    { class: 'scores' },
    ...state.players.map((p, i) => {
      const c = colorOf(p.colorId);
      return el(
        'li',
        { class: `score${i === state.current ? ' current' : ''}` },
        el('span', { class: 'score-badge', style: `background:${c.hex};color:${c.text}` }, p.initial),
        el('span', { class: 'score-name' }, p.name, p.kind === 'bot' ? el('small', {}, 'Bot') : null),
        el('span', { class: 'score-num' }, String(scores[i])),
      );
    }),
  );

  const board = el(
    'div',
    { class: 'board-wrap' },
    boardSvg(state, { interactive: !isBot && !state.finished, onEdge: handlers.onEdge }),
  );

  const controls = el(
    'div',
    { class: 'controls' },
    el(
      'button',
      {
        type: 'button',
        class: 'btn',
        disabled: !canUndo(state),
        onClick: (ev: Event) => {
          ev.stopPropagation();
          handlers.onUndo();
        },
      },
      '↩ ひとつ戻す',
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'btn ghost',
        onClick: (ev: Event) => {
          ev.stopPropagation();
          handlers.onQuit();
        },
      },
      '設定に戻る',
    ),
  );

  const screen = el('div', { class: 'screen play' }, banner, scoreboard, board, controls);
  // Botの手番中は、画面のどこをタップしても早送りできる
  if (isBot && !state.finished) screen.addEventListener('click', () => handlers.onSkip());
  root.append(screen);
}
