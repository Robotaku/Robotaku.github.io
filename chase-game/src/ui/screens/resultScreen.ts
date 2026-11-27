/** 結果画面。ゲーム終了後なので、逃走者の通った道(秘密だった軌跡)を公開してよい。 */
import { BOARD } from '../../game/board';
import { renderBoardSvg } from '../boardView';
import { dispName, esc } from '../format';
import { ui } from '../state';

export function resultHtml(): string {
  const g = ui.game!;
  const svg = renderBoardSvg({ board: BOARD, pub: g, secretFugitivePos: g.players[0].pos, trail: g.fugitiveTrail, targets: new Set(), selected: null });
  const winner = g.winner === 'fugitive' ? '逃走者' : '追跡者';
  return `
  <main class="screen result">
    <h1>${winner}の勝ち!</h1>
    <p class="reason">${esc(g.winReason)}</p>
    <p>逃走者: <b>${dispName(g, 0)}</b> / 追跡者: ${g.players
      .slice(1)
      .map((_, i) => `<b>${dispName(g, i + 1)}</b>`)
      .join('、')}</p>
    <section class="panel"><h2>逃走者の通った道(点線)</h2><div class="board-wrap"><div class="board-inner" style="width:${ui.zoom * 100}%">${svg}</div></div>
    <p class="route">経路: ${g.fugitiveTrail.map((x) => `駅${x}`).join(' → ')}</p></section>
    <section class="panel"><h2>行動ログ</h2><ul class="feed">${ui.feed.slice().reverse().map((f) => `<li>${f}</li>`).join('')}</ul></section>
    <div class="row center">
      <button class="btn primary big" data-act="again">同じ設定でもう一度</button>
      <button class="btn" data-act="to-setup">設定に戻る</button>
    </div>
  </main>`;
}
