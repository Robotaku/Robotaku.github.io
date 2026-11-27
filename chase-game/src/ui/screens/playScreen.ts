/**
 * 対戦中の画面(盤面・移動ログ・プレイヤー一覧・行動ログ)。
 *
 * 隠し情報のルール:
 *  ・盤面には必ず publicState() を通した状態だけを渡す。
 *  ・逃走者の位置・チケットは、「逃走者本人(人間)の手番」のときだけ secret として見せる。
 */
import { BOARD } from '../../game/board';
import { possibleFugitiveStations } from '../../game/bot';
import { legalMoves, publicState } from '../../game/rules';
import { MODE_LABEL } from '../../game/types';
import type { GameState } from '../../game/types';
import { renderBoardSvg } from '../boardView';
import { SHORT, chaserColor, chipsHtml, dispName, esc, roleLabel } from '../format';
import { rulesModal } from '../rulesText';
import { ui } from '../state';

export function logHtml(g: GameState): string {
  const cells: string[] = [];
  for (let r = 1; r <= g.maxRounds; r++) {
    const e = g.log[r - 1];
    const reveal = g.revealRounds.includes(r);
    const body = e ? `${SHORT[e.mode]}${e.revealedPos !== null ? `<br>駅${e.revealedPos}` : ''}` : reveal ? '公開' : '・';
    cells.push(
      `<div class="log-cell ${e ? `used ${e.mode}` : 'future'}${reveal ? ' reveal' : ''}${r === g.round ? ' now' : ''}"><span class="log-r">${r}</span><span class="log-body">${body}</span></div>`,
    );
  }
  return `<div class="log">${cells.join('')}</div>`;
}
function playersHtml(g: GameState, secret: boolean): string {
  return g.players
    .map((p, i) => {
      const cur = i === g.turn ? ' current' : '';
      if (p.role === 'fugitive') {
        return `<div class="pl fugitive${cur}"><b>逃走者 ${dispName(g, i)}</b>${
          secret ? `<span> 現在地: 駅${p.pos}</span><div>${chipsHtml(p.tickets)}</div>` : '<span> 位置・チケット: 非公開</span>'
        }</div>`;
      }
      return `<div class="pl chaser${cur}"><span class="dot" style="background:${chaserColor(i)}">${i}</span><b>${dispName(g, i)}</b><span> 駅${p.pos}</span><div>${chipsHtml(p.tickets)}</div></div>`;
    })
    .join('');
}
export function playHtml(): string {
  const g = ui.game!;
  const pub = publicState(g);
  const cur = g.players[g.turn];
  const myTurn = !cur.isBot && ui.holder === g.turn && !ui.thinking;
  const secret = myTurn && cur.role === 'fugitive';
  const moves = myTurn ? legalMoves(g, BOARD, g.turn) : [];
  const targets = new Set(moves.map((m) => m.to));
  const candidates = ui.hint && myTurn && cur.role === 'chaser' ? possibleFugitiveStations(pub, BOARD) : undefined;
  const svg = renderBoardSvg({
    board: BOARD,
    pub,
    secretFugitivePos: secret ? cur.pos : null,
    debugPos: ui.debug ? g.players[0].pos : null,
    targets,
    selected: ui.selected,
    candidates,
  });
  let action: string;
  if (ui.thinking) {
    action = `<div class="action wait">${dispName(g, g.turn)} が考えています…</div>`;
  } else if (ui.selected !== null) {
    const opts = moves.filter((m) => m.to === ui.selected);
    action = `<div class="action"><div>駅${ui.selected}へ、どの手段で移動しますか?</div><div class="row">${opts
      .map((m) => `<button class="btn mode ${m.mode}" data-act="mode" data-mode="${m.mode}">${MODE_LABEL[m.mode]}で移動<small>残り${cur.tickets[m.mode]}</small></button>`)
      .join('')}<button class="btn" data-act="cancel">やめる</button></div></div>`;
  } else {
    action = `<div class="action"><b>${esc(cur.name)}さん(${roleLabel(cur.role)})の番です。</b> 光っている駅をタップして移動先を選びます。</div>`;
  }
  const nextReveal = g.revealRounds.find((r) => r >= g.round);
  return `
  <main class="screen play">
    <header class="topbar">
      <div class="round">ラウンド <b>${g.round}</b> / ${g.maxRounds}${nextReveal ? ` <small>(次の位置公開: R${nextReveal})</small>` : ''}</div>
      <div class="tools">
        ${myTurn && cur.role === 'chaser' ? `<button class="btn small${ui.hint ? ' on' : ''}" data-act="hint">推理ヒント${ui.hint ? 'ON' : 'OFF'}</button>` : ''}
        <button class="btn small" data-act="zoom-out" aria-label="縮小">－</button>
        <button class="btn small" data-act="zoom-in" aria-label="拡大">＋</button>
        <button class="btn small" data-act="rules">ルール</button>
      </div>
    </header>
    ${action}
    <div class="board-wrap"><div class="board-inner" style="width:${ui.zoom * 100}%">${svg}</div></div>
    <div class="legend"><span class="chip taxi">タクシー(黄)</span><span class="chip bus">バス(緑)</span><span class="chip metro">地下鉄(赤)</span><span class="chip">紫◇=最後の公開位置</span><span class="chip">★=逃走者の開始候補</span></div>
    <section class="panel"><h2>逃走者の移動(公開情報)</h2>${logHtml(pub)}</section>
    <section class="panel"><h2>プレイヤー</h2>${playersHtml(secret ? g : pub, secret)}</section>
    <section class="panel"><h2>行動ログ</h2><ul class="feed">${ui.feed
      .slice(-8)
      .reverse()
      .map((f) => `<li>${f}</li>`)
      .join('')}</ul></section>
    ${rulesModal()}
  </main>`;
}
