import { BOARD_SIZES } from './types';
import type { BotLevel, BotSpeed, PlayerConfig, Settings } from './types';

export const STORAGE_KEY = 'dots-and-boxes:settings:v2';
export const MIN_SEATS = 2;
export const MAX_SEATS = 6;

/** 色覚に配慮したパレット(Okabe-Ito系)。色だけに頼らず頭文字も表示する */
export const PALETTE = [
  { id: 'blue', label: 'あお', hex: '#0072B2', text: '#ffffff' },
  { id: 'vermillion', label: 'あか', hex: '#D55E00', text: '#ffffff' },
  { id: 'green', label: 'みどり', hex: '#009E73', text: '#ffffff' },
  { id: 'orange', label: 'オレンジ', hex: '#E69F00', text: '#1a1a1a' },
  { id: 'pink', label: 'ピンク', hex: '#CC79A7', text: '#1a1a1a' },
  { id: 'sky', label: 'みずいろ', hex: '#56B4E9', text: '#1a1a1a' },
] as const;

/**
 * 名前が空の席の自動名。人間は「プレイヤー1」…、Botは「Bot1」…と、種類ごとに数える。
 * 名前の初期値は空にしてあり、空のまま始めるとこの名前になる。
 */
export function autoName(configs: PlayerConfig[], index: number): string {
  const kind = configs[index].kind;
  const n = configs.slice(0, index + 1).filter((p) => p.kind === kind).length;
  return kind === 'bot' ? `Bot${n}` : `プレイヤー${n}`;
}

/** 空の名前を自動名に置き換えた、表示用の名前 */
export function displayName(configs: PlayerConfig[], index: number): string {
  return configs[index].name.trim() || autoName(configs, index);
}

export const colorOf = (colorId: string) =>
  PALETTE.find((c) => c.id === colorId) ?? PALETTE[0];

export function defaultSettings(): Settings {
  return {
    size: 4,
    players: [
      { name: '', colorId: PALETTE[0].id, kind: 'human' },
      { name: '', colorId: PALETTE[1].id, kind: 'human' },
      { name: '', colorId: PALETTE[2].id, kind: 'bot' },
    ],
    botLevel: 'normal',
    botSpeed: 'normal',
  };
}

/** 次に追加する席(未使用の色を割り当てる) */
export function newSeat(existing: PlayerConfig[], kind: PlayerConfig['kind'] = 'bot'): PlayerConfig {
  const usedColors = new Set(existing.map((p) => p.colorId));
  const color = PALETTE.find((c) => !usedColors.has(c.id)) ?? PALETTE[0];
  return { name: '', colorId: color.id, kind };
}

const LEVELS: BotLevel[] = ['easy', 'normal', 'strong'];
const SPEEDS: BotSpeed[] = ['normal', 'fast', 'instant'];

/** 保存データなど信頼できない入力から、必ず有効な設定を作る */
export function sanitizeSettings(input: unknown): Settings {
  const base = defaultSettings();
  if (typeof input !== 'object' || input === null) return base;
  const raw = input as Record<string, unknown>;
  const size = BOARD_SIZES.find((s) => s === raw.size) ?? base.size;
  const botLevel = LEVELS.find((l) => l === raw.botLevel) ?? base.botLevel;
  const botSpeed = SPEEDS.find((s) => s === raw.botSpeed) ?? base.botSpeed;

  let players: PlayerConfig[] = [];
  if (Array.isArray(raw.players)) {
    players = raw.players
      .slice(0, MAX_SEATS)
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p) => ({
        // 名前は空のままにしておく(空なら開始時に自動名になる)
        name: typeof p.name === 'string' ? p.name.trim().slice(0, 8) : '',
        colorId: PALETTE.some((c) => c.id === p.colorId) ? (p.colorId as string) : '',
        kind: p.kind === 'bot' ? 'bot' : 'human',
      }));
  }
  if (players.length < MIN_SEATS) players = base.players;

  // 色の重複・未設定は、未使用の色に振り直す
  const used = new Set<string>();
  players = players.map((p) => {
    if (p.colorId && !used.has(p.colorId)) {
      used.add(p.colorId);
      return p;
    }
    const free = PALETTE.find((c) => !used.has(c.id)) ?? PALETTE[0];
    used.add(free.id);
    return { ...p, colorId: free.id };
  });

  // 最低1人は人間
  if (!players.some((p) => p.kind === 'human')) players[0] = { ...players[0], kind: 'human' };

  return { size, players, botLevel, botSpeed };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSettings(storage: StorageLike | null): Settings {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return sanitizeSettings(text ? JSON.parse(text) : null);
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(storage: StorageLike | null, settings: Settings): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても遊べるので無視する
  }
}
