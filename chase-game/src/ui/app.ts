/**
 * アプリの進行制御(コントローラ)。
 *
 *   startGame → proceed → (Botなら) botStep / (人間なら) 中継画面 → 盤面 → 手を選ぶ → commit → proceed …
 *
 * ・ゲームのルールは game/rules.ts、Botの思考は game/bot.ts にあり、ここでは呼ぶだけ。
 * ・画面のHTMLは screens/*.ts が作る。ここでは「今どの画面を出すか」を決めて描画する。
 * ・隠し情報を守る要は proceed(): 人間の手番が替わるたびに必ず中継画面を挟む。
 */
import { BOARD } from '../game/board';
import { chooseMove } from '../game/bot';
import { MAX_SEATS, MIN_SEATS } from '../game/config';
import { applyMove, createGame, legalMoves, validateSeats } from '../game/rules';
import { MODE_LABEL } from '../game/types';
import type { Difficulty, GameState, Mode, Role, SeatConfig } from '../game/types';
import { dispName } from './format';
import { handoffHtml } from './screens/handoffScreen';
import { playHtml } from './screens/playScreen';
import { resultHtml } from './screens/resultScreen';
import { setupHtml } from './screens/setupScreen';
import { BOT_DELAY, ui } from './state';

let root: HTMLElement;
let timer: number | undefined;

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
