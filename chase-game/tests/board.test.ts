import { describe, it, expect } from 'vitest';
import { BOARD } from '../src/game/board';
import type { Mode } from '../src/game/types';

const ids = BOARD.stations.map((s) => s.id);
const idSet = new Set(ids);
const N = BOARD.stations.length;

/** 駅 id の無向隣接(モード指定があればそれのみ) */
function neighbors(id: number, mode?: Mode): Set<number> {
  const out = new Set<number>();
  for (const e of BOARD.edges) {
    if (mode && e.mode !== mode) continue;
    if (e.a === id) out.add(e.b);
    if (e.b === id) out.add(e.a);
  }
  return out;
}

/** 連結成分の数を数える(BFS) */
function componentCount(nodes: number[], adj: (id: number) => Set<number>): number {
  const seen = new Set<number>();
  let count = 0;
  for (const start of nodes) {
    if (seen.has(start)) continue;
    count += 1;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of adj(cur)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
  }
  return count;
}

describe('BOARD: 駅', () => {
  it('駅数は40〜60', () => {
    expect(N).toBeGreaterThanOrEqual(40);
    expect(N).toBeLessThanOrEqual(60);
  });

  it('idは1..Nで連続し、重複がない', () => {
    expect(new Set(ids).size).toBe(N);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(N);
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  });
});

describe('BOARD: エッジ', () => {
  it('全エッジの端点が存在し、自己ループがない', () => {
    for (const e of BOARD.edges) {
      expect(idSet.has(e.a), `端点 ${e.a} が存在しない`).toBe(true);
      expect(idSet.has(e.b), `端点 ${e.b} が存在しない`).toBe(true);
      expect(e.a, `自己ループ ${e.a}-${e.b} (${e.mode})`).not.toBe(e.b);
    }
  });

  it('(a,b,mode) の組に重複がない(向きは無視)', () => {
    const keys = BOARD.edges.map((e) => {
      const [lo, hi] = e.a < e.b ? [e.a, e.b] : [e.b, e.a];
      return `${lo}-${hi}-${e.mode}`;
    });
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('BOARD: 連結性と手段', () => {
  it('全駅が taxi で2本以上のエッジを持つ', () => {
    for (const id of ids) {
      const deg = BOARD.edges.filter((e) => e.mode === 'taxi' && (e.a === id || e.b === id)).length;
      expect(deg, `駅 ${id} の taxi 本数`).toBeGreaterThanOrEqual(2);
    }
  });

  it('全駅が(全手段で)連結', () => {
    expect(componentCount(ids, (id) => neighbors(id))).toBe(1);
  });

  it('bus 駅は10以上', () => {
    const busStations = new Set(BOARD.edges.filter((e) => e.mode === 'bus').flatMap((e) => [e.a, e.b]));
    expect(busStations.size).toBeGreaterThanOrEqual(10);
  });

  it('metro 駅は4以上', () => {
    const metroStations = new Set(BOARD.edges.filter((e) => e.mode === 'metro').flatMap((e) => [e.a, e.b]));
    expect(metroStations.size).toBeGreaterThanOrEqual(4);
  });

  it('metro 駅はすべて bus 駅でもある', () => {
    const busStations = new Set(BOARD.edges.filter((e) => e.mode === 'bus').flatMap((e) => [e.a, e.b]));
    const metroStations = new Set(BOARD.edges.filter((e) => e.mode === 'metro').flatMap((e) => [e.a, e.b]));
    for (const id of metroStations) {
      expect(busStations.has(id), `metro 駅 ${id} は bus 駅ではない`).toBe(true);
    }
  });
});

describe('BOARD: 開始位置', () => {
  it('fugitiveStarts と chaserStarts は存在する駅を指す', () => {
    for (const id of [...BOARD.fugitiveStarts, ...BOARD.chaserStarts]) {
      expect(idSet.has(id), `開始駅 ${id} が存在しない`).toBe(true);
    }
  });

  it('fugitiveStarts と chaserStarts は互いに重複しない', () => {
    const overlap = BOARD.fugitiveStarts.filter((id) => BOARD.chaserStarts.includes(id));
    expect(overlap).toEqual([]);
  });

  it('chaserStarts は7個以上', () => {
    expect(BOARD.chaserStarts.length).toBeGreaterThanOrEqual(7);
  });
});
