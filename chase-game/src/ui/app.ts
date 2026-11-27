import { BOARD } from '../game/board';
import { chooseMove, possibleFugitiveStations } from '../game/bot';
import { applyMove, createGame, legalMoves, publicState, validateSeats, MAX_SEATS, MIN_SEATS } from '../game/rules';
import { MODE_LABEL, MODES } from '../game/types';
import type { Difficulty, GameState, Mode, Role, SeatConfig } from '../game/types';
import { CHASER_COLORS, renderBoardSvg } from './boardView';

type Screen = 'setup' | 'handoff' | 'play' | 'result';

interface Ui {
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
}

const BOT_DELAY = 800;
const SHORT: Record<Mode, string> = { taxi: 'タ', bus: 'バ', metro: '地' };

const RULES_HTML = `
<h3>勝ち負け</h3>
<ul>
  <li><b>追跡者の勝ち</b>: 追跡者のだれかが、逃走者と同じ駅に止まったら勝ちです。</li>
  <li><b>逃走者の勝ち</b>: 24ラウンド逃げ切るか、追跡者が全員動けなくなる(チケット切れ・行き場なし)と勝ちです。</li>
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
  <li><span class="chip metro">地下鉄</span> 赤い線。駅の下に赤い■がある駅で使え、遠くへ一気に移動できます。</li>
  <li>手段ごとにチケットの枚数が決まっています。使うと1枚減り、0枚の手段は使えません。</li>
  <li>逃走者: タクシー24・バス9・地下鉄6 / 追跡者: タクシー24・バス8・地下鉄4(1人あたり)</li>
</ul>
<h3>見えるもの・見えないもの</h3>
<ul>
  <li>逃走者の位置は追跡者には見えません。見えるのは「使った移動手段」だけです。</li>
  <li><b>3・8・13・18・24ラウンド</b>だけ、移動後の位置が公開されます(紫のひし形)。</li>
  <li>逃走者は最初、★印の5駅のどこかから始まります。</li>
  <li>追跡者の位置とチケット残りは全員に公開されています。</li>
</ul>
<h3>端末の受け渡し</h3>
<ul>
  <li>人間の手番が変わるたびに「端末を○○さんに渡してください」の画面が出ます。渡されたら、ボタンを押すまで盤面は見えません。</li>
</ul>`;

const ui: Ui = {
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
};

let root: HTMLElement;
let timer: number | undefined;

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const dispName = (g: GameState, i: number): string => `${esc(g.players[i].name)}${g.players[i].isBot ? '(Bot)' : ''}`;
const roleLabel = (r: Role): string => (r === 'fugitive' ? '逃走者' : '追跡者');
const chaserColor = (i: number): string => CHASER_COLORS[(i - 1) % CHASER_COLORS.length];

export function startApp(el: HTMLElement): void {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  render();
}

// ---------------------------------------------------------------- 進行制御

function startGame(): void {
  if (validateSeats(ui.seats).length) return;
  window.clearTimeout(timer);
  ui.game = createGame(BOARD, ui.seats, Math.random);
  ui.holder = null;
  ui.selected = null;
  ui.thinking = false;
  ui.feed = ['ゲーム開始! 逃走者から動きます。'];
  proceed();
}

/** 次に何を見せるかを決める。人間が替わるなら必ず中継画面を挟む。 */
function proceed(): void {
  const g = ui.game!;
  ui.selected = null;
  if (g.winner) {
    ui.screen = 'result';
    ui.thinking = false;
    render();
    return;
  }
  const p = g.players[g.turn];
  if (p.isBot) {
    ui.screen = 'play';
    ui.thinking = true;
    render();
    timer = window.setTimeout(botStep, BOT_DELAY);
    return;
  }
  ui.thinking = false;
  if (ui.holder !== g.turn) {
    ui.screen = 'handoff';
  } else {
    ui.screen = 'play';
    ui.centerOn = p.pos;
  }
  render();
}

function describeMove(g: GameState, who: number, mode: Mode, to: number, revealed: boolean): string {
  const p = g.players[who];
  if (p.role === 'fugitive') {
    return `逃走者 ${dispName(g, who)}: ${MODE_LABEL[mode]}で移動${revealed ? `(位置公開! 駅${to})` : ''}`;
  }
  return `追跡者${who} ${dispName(g, who)}: ${MODE_LABEL[mode]}で 駅${p.pos}→駅${to}`;
}

function commit(mv: { to: number; mode: Mode }): void {
  const g = ui.game!;
  const who = g.turn;
  const ng = applyMove(g, BOARD, mv);
  const revealed = ng.log.length > g.log.length && ng.log[ng.log.length - 1].revealedPos !== null;
  const text = describeMove(g, who, mv.mode, mv.to, revealed); // g は移動前なので players[who].pos が出発駅
  ui.feed.push(`R${g.round} ${text}`);
  for (const ps of ng.passed.slice(g.passed.length)) ui.feed.push(`R${ps.round} 追跡者${ps.player} ${dispName(ng, ps.player)}: 動けないのでパス`);
  if (ng.winner) ui.feed.push(`終了: ${ng.winReason}`);
  if (ui.debug) console.debug('[debug] 逃走者の位置:', ng.players[0].pos);
  ui.game = ng;
}

function botStep(): void {
  const g = ui.game!;
  if (g.winner || !g.players[g.turn].isBot) return proceed();
  const mv = chooseMove(g, BOARD, Math.random);
  commit(mv);
  if (ui.game!.winner) {
    render();
    timer = window.setTimeout(proceed, 1000);
  } else proceed();
}

// ---------------------------------------------------------------- イベント

function onClick(e: Event): void {
  const t = e.target as HTMLElement;
  const stEl = t.closest('[data-station]') as HTMLElement | null;
  if (stEl && ui.screen === 'play') return onStationTap(Number(stEl.dataset.station));
  const btn = t.closest('[data-act]') as HTMLElement | null;
  if (!btn) return;
  const act = btn.dataset.act!;
  const i = Number(btn.dataset.i);
  switch (act) {
    case 'add-human':
    case 'add-bot': {
      if (ui.seats.length >= MAX_SEATS) return;
      const bot = act === 'add-bot';
      const n = ui.seats.filter((s) => s.isBot === bot).length + 1;
      ui.seats.push({ name: bot ? `Bot${n}` : `プレイヤー${n}`, isBot: bot, role: 'chaser', difficulty: 'normal' });
      break;
    }
    case 'del-seat':
      if (ui.seats.length > MIN_SEATS) ui.seats.splice(i, 1);
      break;
    case 'preset':
      applyPreset(btn.dataset.p!);
      break;
    case 'start':
      return startGame();
    case 'handoff-ok': {
      ui.holder = ui.game!.turn;
      proceed();
      return;
    }
    case 'mode':
      if (ui.selected !== null) {
        const mv = { to: ui.selected, mode: btn.dataset.mode as Mode };
        ui.selected = null;
        commit(mv);
        proceed();
      }
      return;
    case 'cancel':
      ui.selected = null;
      break;
    case 'rules':
      ui.showRules = !ui.showRules;
      break;
    case 'hint':
      ui.hint = !ui.hint;
      break;
    case 'zoom-in':
      ui.zoom = Math.min(3, ui.zoom + 0.5);
      break;
    case 'zoom-out':
      ui.zoom = Math.max(1, ui.zoom - 0.5);
      break;
    case 'again':
      startGame();
      return;
    case 'to-setup':
      window.clearTimeout(timer);
      ui.game = null;
      ui.screen = 'setup';
      break;
  }
  render();
}

function applyPreset(p: string): void {
  const h = (n: number): SeatConfig => ({ name: `プレイヤー${n}`, isBot: false, role: 'chaser', difficulty: 'normal' });
  const b = (n: number): SeatConfig => ({ name: `Bot${n}`, isBot: true, role: 'chaser', difficulty: 'normal' });
  const f = (s: SeatConfig): SeatConfig => ({ ...s, role: 'fugitive' });
  if (p === 'h2') ui.seats = [f(h(1)), h(2)];
  if (p === 'h2b1') ui.seats = [f(h(1)), h(2), b(1)];
  if (p === 'h1b3') ui.seats = [f(h(1)), b(1), b(2), b(3)];
  if (p === 'h2b2') ui.seats = [h(1), f(h(2)), b(1), b(2)];
}

function onChange(e: Event): void {
  const t = e.target as HTMLInputElement | HTMLSelectElement;
  const field = t.dataset.field;
  if (!field) return;
  if (field === 'debug') ui.debug = (t as HTMLInputElement).checked;
  else {
    const i = Number(t.dataset.i);
    const s = ui.seats[i];
    if (field === 'kind') {
      s.isBot = t.value === 'bot';
      if (/^(Bot|プレイヤー)\d+$/.test(s.name)) {
        const n = ui.seats.filter((x, j) => j !== i && x.isBot === s.isBot).length + 1;
        s.name = s.isBot ? `Bot${n}` : `プレイヤー${n}`;
      }
    } else if (field === 'role') {
      s.role = t.value as Role;
      if (s.role === 'fugitive') ui.seats.forEach((o, j) => j !== i && o.role === 'fugitive' && (o.role = 'chaser'));
    } else if (field === 'difficulty') s.difficulty = t.value as Difficulty;
  }
  render();
}

function onInput(e: Event): void {
  const t = e.target as HTMLInputElement;
  if (t.dataset.field === 'name') ui.seats[Number(t.dataset.i)].name = t.value; // 再描画しない(入力フォーカス維持)
}

function onStationTap(id: number): void {
  const g = ui.game;
  if (!g || ui.thinking || g.winner) return;
  const p = g.players[g.turn];
  if (p.isBot || ui.holder !== g.turn) return;
  const moves = legalMoves(g, BOARD, g.turn);
  ui.selected = moves.some((m) => m.to === id) ? id : null;
  render();
}

// ---------------------------------------------------------------- 描画

function render(): void {
  const wrap = root.querySelector('.board-wrap') as HTMLElement | null;
  const keep = wrap ? { l: wrap.scrollLeft, t: wrap.scrollTop } : null;
  switch (ui.screen) {
    case 'setup':
      root.innerHTML = setupHtml();
      break;
    case 'handoff':
      root.innerHTML = handoffHtml();
      break;
    case 'play':
      root.innerHTML = playHtml();
      break;
    case 'result':
      root.innerHTML = resultHtml();
      break;
  }
  const w = root.querySelector('.board-wrap') as HTMLElement | null;
  if (w) {
    if (ui.centerOn !== null) {
      const st = BOARD.stations.find((s) => s.id === ui.centerOn);
      if (st) {
        w.scrollLeft = (st.x / 1000) * w.scrollWidth - w.clientWidth / 2;
        w.scrollTop = (st.y / 700) * w.scrollHeight - w.clientHeight / 2;
      }
      ui.centerOn = null;
    } else if (keep) {
      w.scrollLeft = keep.l;
      w.scrollTop = keep.t;
    }
  }
}

function rulesModal(): string {
  if (!ui.showRules) return '';
  return `<div class="modal"><div class="modal-body"><h2>ルール</h2>${RULES_HTML}<button class="btn primary" data-act="rules">閉じる</button></div></div>`;
}

function setupHtml(): string {
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

function handoffHtml(): string {
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

function chipsHtml(t: Record<Mode, number>): string {
  return MODES.map((m) => `<span class="chip ${m}">${MODE_LABEL[m]} ${t[m]}</span>`).join('');
}

function logHtml(g: GameState): string {
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

function playHtml(): string {
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

function resultHtml(): string {
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
