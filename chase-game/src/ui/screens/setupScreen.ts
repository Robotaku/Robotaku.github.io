/** トップ画面(参加席の設定)のHTMLを作る。 */
import { MAX_SEATS, MIN_SEATS } from '../../game/config';
import { validateSeats } from '../../game/rules';
import { esc } from '../format';
import { rulesModal } from '../rulesText';
import { ui } from '../state';

export function setupHtml(): string {
  const errors = validateSeats(ui.seats);
  const seatRows = ui.seats
    .map(
      (s, i) => `
    <div class="seat">
      <div class="seat-no">席${i + 1}</div>
      <input class="seat-name" type="text" maxlength="12" value="${esc(s.name)}" data-field="name" data-i="${i}" aria-label="席${i + 1}の名前" />
      <select data-field="kind" data-i="${i}" aria-label="人間かBotか">
        <option value="human"${s.isBot ? '' : ' selected'}>人間</option>
        <option value="bot"${s.isBot ? ' selected' : ''}>Bot</option>
      </select>
      <select data-field="role" data-i="${i}" aria-label="役割">
        <option value="fugitive"${s.role === 'fugitive' ? ' selected' : ''}>逃走者</option>
        <option value="chaser"${s.role === 'chaser' ? ' selected' : ''}>追跡者</option>
      </select>
      ${
        s.isBot
          ? `<select data-field="difficulty" data-i="${i}" aria-label="難易度">
        <option value="easy"${s.difficulty === 'easy' ? ' selected' : ''}>かんたん</option>
        <option value="normal"${s.difficulty === 'normal' ? ' selected' : ''}>ふつう</option>
      </select>`
          : '<span class="seat-spacer"></span>'
      }
      <button class="btn small danger" data-act="del-seat" data-i="${i}" ${ui.seats.length <= MIN_SEATS ? 'disabled' : ''} aria-label="席${i + 1}を削除">削除</button>
    </div>`,
    )
    .join('');
  return `
  <main class="screen setup">
    <h1>追跡ゲーム</h1>
    <p class="lead">1台の端末を交代で使う、逃走者 VS 追跡者のボードゲームです。逃走者の位置は追跡者に見えません。</p>
    <section class="card">
      <h2>参加席</h2>
      <div class="presets">
        <span>かんたん設定:</span>
        <button class="btn small" data-act="preset" data-p="h2">人間2</button>
        <button class="btn small" data-act="preset" data-p="h2b1">人間2+Bot1</button>
        <button class="btn small" data-act="preset" data-p="h2b2">人間2+Bot2</button>
        <button class="btn small" data-act="preset" data-p="h1b3">人間1+Bot3</button>
      </div>
      <div class="seats">${seatRows}</div>
      <div class="row">
        <button class="btn" data-act="add-human" ${ui.seats.length >= MAX_SEATS ? 'disabled' : ''}>＋人間を追加</button>
        <button class="btn" data-act="add-bot" ${ui.seats.length >= MAX_SEATS ? 'disabled' : ''}>＋Botを追加</button>
      </div>
      ${errors.length ? `<ul class="errors">${errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <label class="check"><input type="checkbox" data-field="debug" ${ui.debug ? 'checked' : ''}/> <span>開発用デバッグ表示(逃走者の位置を画面とコンソールに出す。<b>遊ぶときはオフ</b>)</span></label>
    </section>
    <div class="row center">
      <button class="btn primary big" data-act="start" ${errors.length ? 'disabled' : ''}>ゲーム開始</button>
      <button class="btn" data-act="rules">ルールを見る</button>
    </div>
    <p class="note">逃走者は1席、追跡者は1席以上、人間は最低1人。席は${MIN_SEATS}〜${MAX_SEATS}席。</p>
    ${rulesModal()}
  </main>`;
}
