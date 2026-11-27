import { describe, expect, it } from 'vitest';
import { getBoard } from '../src/game/board';

describe('board', () => {
  it.each([
    [3, 4, 12],
    [4, 9, 24],
    [5, 16, 40],
  ] as const)('点%i×%i: 四角%i個・線%i本', (size, boxes, edges) => {
    const b = getBoard(size);
    expect(b.boxCount).toBe(boxes);
    expect(b.edgeCount).toBe(edges);
  });

  it('各四角は4辺を持ち、各線は1〜2個の四角に隣接する', () => {
    for (const size of [3, 4, 5] as const) {
      const b = getBoard(size);
      for (const es of b.boxEdges) expect(new Set(es).size).toBe(4);
      for (const bs of b.edgeBoxes) expect(bs.length === 1 || bs.length === 2).toBe(true);
      const total = b.edgeBoxes.reduce((s, bs) => s + bs.length, 0);
      expect(total).toBe(b.boxCount * 4);
    }
  });
});
