import { describe, expect, it } from 'vitest';
import { edgeEndpoints, getBoard, hEdge, nearestOpenEdge, vEdge } from '../src/game/board';
import { BOARD_SIZES } from '../src/game/types';

describe('board', () => {
  it.each([
    [3, 4, 12],
    [4, 9, 24],
    [5, 16, 40],
    [6, 25, 60],
    [8, 49, 112],
    [10, 81, 180],
  ] as const)('点%i×%i: 四角%i個・線%i本', (size, boxes, edges) => {
    const b = getBoard(size);
    expect(b.boxCount).toBe(boxes);
    expect(b.edgeCount).toBe(edges);
  });

  it('各四角は4辺を持ち、各線は1〜2個の四角に隣接する', () => {
    for (const size of BOARD_SIZES) {
      const b = getBoard(size);
      for (const es of b.boxEdges) expect(new Set(es).size).toBe(4);
      for (const bs of b.edgeBoxes) expect(bs.length === 1 || bs.length === 2).toBe(true);
      const total = b.edgeBoxes.reduce((s, bs) => s + bs.length, 0);
      expect(total).toBe(b.boxCount * 4);
    }
  });
});

describe('nearestOpenEdge(タップ位置に最も近い線)', () => {
  const b = getBoard(10);
  const all = () => true;

  it('線の真上・近くのタップは、その線を選ぶ', () => {
    expect(nearestOpenEdge(b, all, 4.5, 5, 0.4)).toBe(hEdge(10, 5, 4));
    expect(nearestOpenEdge(b, all, 8.7, 4.5, 0.4)).toBe(vEdge(10, 4, 9));
  });

  it('点の斜め近くでは、距離が近いほうの線を選ぶ(横線側・縦線側)', () => {
    // 点(2,3)の右0.3・やや上(y=2.9): 横線(2,3)-(3,3)まで0.1、縦線(2,2)-(2,3)まで0.3
    expect(nearestOpenEdge(b, all, 2.3, 2.9, 0.4)).toBe(hEdge(10, 3, 2));
    // 点(6,6)の上0.3・やや右(x=6.1): 縦線(6,5)-(6,6)まで0.1
    expect(nearestOpenEdge(b, all, 6.1, 5.7, 0.4)).toBe(vEdge(10, 5, 6));
  });

  it('引かれた線は選ばず、次に近い線を選ぶ', () => {
    const drawn = hEdge(10, 5, 4);
    expect(nearestOpenEdge(b, (e) => e !== drawn, 4.5, 5.05, 0.4)).not.toBe(drawn);
  });

  it('四角の中心など、どの線からも遠いときは何も選ばない', () => {
    expect(nearestOpenEdge(b, all, 4.5, 4.5, 0.4)).toBeNull();
  });

  it('全ての線について、線の中点をタップするとその線が選ばれる', () => {
    for (const size of BOARD_SIZES) {
      const board = getBoard(size);
      for (let e = 0; e < board.edgeCount; e++) {
        const p = edgeEndpoints(board, e);
        const got = nearestOpenEdge(board, all, (p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2, 0.4);
        expect(got).toBe(e);
      }
    }
  });
});

