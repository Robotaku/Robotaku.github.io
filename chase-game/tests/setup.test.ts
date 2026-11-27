import { describe, it, expect } from 'vitest';
import { validateSeats } from '../src/game/rules';
import { mulberry32, shuffle } from '../src/game/rng';
import type { SeatConfig, Role } from '../src/game/types';

const seat = (role: Role, isBot = false, name = ''): SeatConfig => ({ name, isBot, role, difficulty: 'normal' });

describe('validateSeats', () => {
  it('人間2 + Bot0 (逃走者1, 追跡者1) は有効', () => {
    expect(validateSeats([seat('fugitive', false, 'A'), seat('chaser', false, 'B')])).toEqual([]);
  });

  it('人間2 + Bot1 は有効', () => {
    expect(validateSeats([seat('fugitive', false, 'A'), seat('chaser', false, 'B'), seat('chaser', true, 'Bot')])).toEqual([]);
  });

  it('人間1 + Bot3 は有効', () => {
    expect(
      validateSeats([
        seat('fugitive', false, 'A'),
        seat('chaser', true, 'B1'),
        seat('chaser', true, 'B2'),
        seat('chaser', true, 'B3'),
      ]),
    ).toEqual([]);
  });

  it('逃走者0席はエラー', () => {
    expect(validateSeats([seat('chaser', false, 'A'), seat('chaser', false, 'B')]).length).toBeGreaterThanOrEqual(1);
  });

  it('逃走者2席はエラー', () => {
    expect(validateSeats([seat('fugitive', false, 'A'), seat('fugitive', false, 'B'), seat('chaser', false, 'C')]).length).toBeGreaterThanOrEqual(1);
  });

  it('追跡者0席はエラー', () => {
    expect(validateSeats([seat('fugitive', false, 'A')]).length).toBeGreaterThanOrEqual(1);
  });

  it('全員Bot はエラー', () => {
    expect(validateSeats([seat('fugitive', true), seat('chaser', true)]).length).toBeGreaterThanOrEqual(1);
  });

  it('席1つはエラー', () => {
    expect(validateSeats([seat('fugitive', false, 'A')]).length).toBeGreaterThanOrEqual(1);
  });

  it('席9つはエラー', () => {
    const seats: SeatConfig[] = [seat('fugitive', false, 'F')];
    for (let i = 0; i < 8; i++) seats.push(seat('chaser', false, `C${i}`));
    expect(seats.length).toBe(9);
    expect(validateSeats(seats).length).toBeGreaterThanOrEqual(1);
  });
});

describe('mulberry32', () => {
  it('同じシードなら同じ乱数列を返す', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('異なるシードなら異なる列になる', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(Array.from({ length: 10 }, () => a())).not.toEqual(Array.from({ length: 10 }, () => b()));
  });

  it('値は [0, 1) の範囲に収まる', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('要素の集合を保つ(重複も含めて同じ要素数)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 2, 2];
    const out = shuffle(input, mulberry32(7));
    expect(out.length).toBe(input.length);
    expect([...out].sort((x, y) => x - y)).toEqual([...input].sort((x, y) => x - y));
  });

  it('元の配列を変更しない', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffle(input, mulberry32(99));
    expect(input).toEqual(copy);
  });
});
