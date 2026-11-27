import { chooseMove } from './game/bot';
import { applyMove, createGame, undoToHuman, canUndo } from './game/rules';
import { loadSettings, sanitizeSettings, saveSettings } from './game/settings';
import type { BotSpeed, GameState, Settings } from './game/types';
import { renderPlay } from './ui/play';
import { renderResult } from './ui/result';
import { renderSetup } from './ui/setup';

const root = document.getElementById('app') as HTMLElement;
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null; // プライベートモードなどで使えない場合
  }
})();

const BOT_DELAY: Record<BotSpeed, number> = { normal: 600, fast: 200, instant: 0 };
/** 最後の1本を引いてから結果画面を出すまでの間(最後の四角を見せる) */
const RESULT_DELAY = 900;

let settings: Settings = loadSettings(storage);
let game: GameState | null = null;
let timer: number | undefined;
/** 画面タップで早送りしたら、次の人間の手番まで待たずに進める */
let skipping = false;

function cancelTimer(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
}

function showSetup(): void {
  cancelTimer();
  game = null;
  renderSetup(root, settings, {
    onChange: (s) => {
      settings = s;
      saveSettings(storage, settings);
    },
    onStart: (s) => {
      // 名前が空などの入力を補正してから始める
      settings = sanitizeSettings(s);
      saveSettings(storage, settings);
      startGame();
    },
  });
}

function startGame(): void {
  cancelTimer();
  skipping = false;
  game = createGame(settings);
  show();
}

function show(): void {
  if (!game) return;
  const state = game;
  if (state.finished) {
    cancelTimer();
    renderPlay(root, state, handlers);
    timer = window.setTimeout(showResult, settings.botSpeed === 'instant' ? 500 : RESULT_DELAY);
    return;
  }
  renderPlay(root, state, handlers);
  scheduleBot();
}

function showResult(): void {
  if (!game) return;
  cancelTimer();
  renderResult(root, game, { onAgain: startGame, onSetup: showSetup });
}

/** Botの手番なら、設定した速さで1手指す */
function scheduleBot(): void {
  cancelTimer();
  if (!game || game.finished || game.players[game.current].kind !== 'bot') {
    skipping = false;
    return;
  }
  const delay = skipping ? 0 : BOT_DELAY[settings.botSpeed];
  if (delay === 0) {
    // 即時: 人間の手番か終了まで、画面を描かずに連続して指す
    // (直前の線は強調されるので、最後の手だけは見える)
    let s = game;
    while (!s.finished && s.players[s.current].kind === 'bot') {
      s = applyMove(s, chooseMove(s, settings.botLevel));
    }
    game = s;
    show();
    return;
  }
  timer = window.setTimeout(botStep, delay);
}

function botStep(): void {
  if (!game || game.finished || game.players[game.current].kind !== 'bot') return;
  game = applyMove(game, chooseMove(game, settings.botLevel));
  show();
}

const handlers = {
  onEdge(edge: number): void {
    if (!game || game.finished || game.players[game.current].kind !== 'human') return;
    game = applyMove(game, edge);
    show();
  },
  onUndo(): void {
    if (!game || !canUndo(game)) return;
    cancelTimer();
    skipping = false;
    game = undoToHuman(game);
    show();
  },
  onQuit(): void {
    if (window.confirm('ゲームをやめて設定に戻りますか?')) showSetup();
  },
  onSkip(): void {
    if (!game || game.finished || game.players[game.current].kind !== 'bot') return;
    skipping = true;
    cancelTimer();
    scheduleBot();
  },
};

showSetup();

// 本番(公開用ビルド)のときだけ、オフラインで遊べるようにService Workerを登録する
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 登録できなくても、オンラインでは普通に遊べる
    });
  });
}
