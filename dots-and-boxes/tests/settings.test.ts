import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  defaultSettings,
  loadSettings,
  newSeat,
  sanitizeSettings,
  saveSettings,
} from '../src/game/settings';
import { assignInitials, createGame } from '../src/game/rules';

class MemStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('settings', () => {
  it('保存して読み込むと同じ設定になる', () => {
    const st = new MemStorage();
    const s = { ...defaultSettings(), size: 5 as const, botLevel: 'strong' as const, botSpeed: 'fast' as const };
    saveSettings(st, s);
    expect(loadSettings(st)).toEqual(s);
  });

  it('壊れた保存データは既定値に戻る', () => {
    const st = new MemStorage();
    st.setItem(STORAGE_KEY, '{ずれたjson');
    expect(loadSettings(st)).toEqual(defaultSettings());
    expect(loadSettings(null)).toEqual(defaultSettings());
  });

  it('席は2〜6に収まり、最低1人は人間になる', () => {
    const many = Array.from({ length: 9 }, () => ({ name: 'x', colorId: 'blue', kind: 'bot' }));
    const s = sanitizeSettings({ size: 4, players: many });
    expect(s.players.length).toBe(6);
    expect(s.players.some((p) => p.kind === 'human')).toBe(true);
    // 席が足りない保存データは既定の席構成に戻る
    expect(sanitizeSettings({ players: [{ name: 'a', kind: 'human' }] }).players.length).toBeGreaterThanOrEqual(2);
  });

  it('色の重複は振り直され、不正な値は既定値になる', () => {
    const s = sanitizeSettings({
      size: 9,
      botLevel: 'xx',
      players: [
        { name: 'a', colorId: 'blue', kind: 'human' },
        { name: 'b', colorId: 'blue', kind: 'bot' },
      ],
    });
    expect(s.players[0].colorId).not.toBe(s.players[1].colorId);
    expect(s.size).toBe(4);
    expect(s.botLevel).toBe('normal');
  });

  it('新しい席には未使用の色が付く', () => {
    const d = defaultSettings();
    const seat = newSeat(d.players);
    expect(d.players.map((p) => p.colorId)).not.toContain(seat.colorId);
  });

  it('頭文字は席ごとに重複しない', () => {
    const cfg = [
      { name: 'ab', colorId: 'blue', kind: 'human' as const },
      { name: 'ac', colorId: 'green', kind: 'bot' as const },
      { name: '', colorId: 'pink', kind: 'bot' as const },
    ];
    const initials = assignInitials(cfg);
    expect(new Set(initials).size).toBe(3);
    expect(initials[0]).toBe('A');
    expect(createGame({ ...defaultSettings(), players: cfg }).players.map((p) => p.initial)).toEqual(initials);
  });
});
