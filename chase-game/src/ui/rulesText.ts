/** 「ルール」ボタンで出す説明文。ゲームのルールを変えたら、ここと README も直すこと。 */
import { CHASER_TICKETS, FUGITIVE_TICKETS, MAX_ROUNDS, REVEAL_ROUNDS, TRANSFER_TICKETS } from '../game/config';
import { ui } from './state';

export const RULES_HTML = `
<h3>勝ち負け</h3>
<ul>
  <li><b>追跡者の勝ち</b>: 追跡者のだれかが、逃走者と同じ駅に止まったら勝ちです。</li>
  <li><b>逃走者の勝ち</b>: 逃走者の移動記録(${MAX_ROUNDS}手)を埋めて逃げ切るか、追跡者が全員動けなくなる(チケット切れ・行き場なし)と勝ちです。</li>
  <li>逃走者が動ける駅・チケットを失ったときは、追跡者の勝ちです。</li>
</ul>
<h3>手番</h3>
<ul>
  <li>1ラウンドごとに「逃走者 → 追跡者1 → 追跡者2 …」の順に1回ずつ移動します。</li>
  <li>移動先は、いま立っている駅から線でつながった隣の駅です。</li>
  <li>追跡者がいる駅には、逃走者も他の追跡者も入れません。</li>
  <li>動ける手がない追跡者は、自動でパスします。</li>
</ul>
<h3>移動手段とチケット</h3>
<ul>
  <li><span class="chip taxi">タクシー</span> 黄色い線。ほぼ全駅で使えます。</li>
  <li><span class="chip bus">バス</span> 緑の線。駅の下に緑の■がある駅で使えます。</li>
  <li><span class="chip metro">地下鉄</span> 赤い線。駅の下に赤の■がある駅で使え、遠くへ一気に移動できます。</li>
  <li>手段ごとにチケットの枚数が決まっていて、使うと1枚減ります。0枚の手段は使えません。</li>
  <li>追跡者(1人あたり): タクシー${CHASER_TICKETS.taxi}・バス${CHASER_TICKETS.bus}・地下鉄${CHASER_TICKETS.metro}</li>
  <li>逃走者: タクシー${FUGITIVE_TICKETS.taxi}・バス${FUGITIVE_TICKETS.bus}・地下鉄${FUGITIVE_TICKETS.metro} から始まります。</li>
  ${TRANSFER_TICKETS ? '<li><b>追跡者が使い終えたチケットは、逃走者に渡ります。</b>追跡者が動くほど、逃走者の手持ちが増えます。</li>' : ''}
</ul>
<h3>逃走者だけの特別なカード</h3>
<ul>
  <li><span class="chip black">ブラックチケット</span> どの路線にも使えて、<b>追跡者には手段が分かりません</b>(「黒」とだけ記録されます)。<b>船</b>(川を渡る黒い点線)は、このチケットでしか乗れません。追跡者の人数が2人以下なら1枚、3人以上なら人数分です。</li>
  <li><span class="chip dbl">2×カード</span> 1ラウンドに<b>続けて2回</b>動けます。それぞれ別のチケットを使い、記録は2手分つきます。追跡者が2人以下なら1枚、3人以上なら2枚です。</li>
  <li>残りのブラック・2×の枚数は、逃走者本人にしか見えません。</li>
</ul>
<h3>見えるもの・見えないもの</h3>
<ul>
  <li>逃走者の位置は追跡者には見えません。見えるのは「使った移動手段」だけです。</li>
  <li><b>${REVEAL_ROUNDS.join('・')}手目</b>だけ、移動後の位置が公開されます(紫のひし形)。2×カードの手も1手と数えます。</li>
  <li>逃走者は最初、★印の5駅のどこかから始まります。</li>
  <li>追跡者の位置とチケット残りは全員に公開されています。</li>
</ul>
<h3>端末の受け渡し</h3>
<ul>
  <li>人間の手番が変わるたびに「端末を○○さんに渡してください」の画面が出ます。渡されたら、ボタンを押すまで盤面は見えません。</li>
</ul>`;

/** ルールのモーダル(ui.showRules が true のときだけ表示) */
export function rulesModal(): string {
  if (!ui.showRules) return '';
  return `<div class="modal"><div class="modal-body"><h2>ルール</h2>${RULES_HTML}<button class="btn primary" data-act="rules">閉じる</button></div></div>`;
}
