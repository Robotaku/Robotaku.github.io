/**
 * 端末受け渡しの中継画面。
 * 盤面を一切含まない(次の人が来るまで何も見せない)ことが、隠し情報を守る要。
 */
import { esc, roleLabel } from '../format';
import { ui } from '../state';

export function handoffHtml(): string {
  const g = ui.game!;
  const p = g.players[g.turn];
  return `
  <main class="screen handoff">
    <div class="handoff-box">
      <p class="handoff-small">ラウンド ${g.round} / ${g.maxRounds}</p>
      <h1>端末を<br><span class="who">${esc(p.name)}</span> さん<br>に渡してください</h1>
      <p class="handoff-role">あなたは<b>${roleLabel(p.role)}</b>です。<br>他の人は画面を見ないでください。</p>
      <button class="btn primary big" data-act="handoff-ok">${esc(p.name)}です。盤面を見る</button>
    </div>
  </main>`;
}
