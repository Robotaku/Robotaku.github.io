import type { BoardSize } from './types';

/**
 * 盤面の幾何情報。点は size×size、四角は (size-1)×(size-1)。
 * 線の番号: 横線 h(r,c) = r*(size-1)+c(r:0..size-1, c:0..size-2)が先、
 *           縦線 v(r,c) = H + r*size+c(r:0..size-2, c:0..size-1)が後。
 * 四角の番号: r*(size-1)+c
 */
export interface Board {
  size: BoardSize;
  /** 1辺あたりの四角の数 */
  cells: number;
  edgeCount: number;
  boxCount: number;
  /** 横線の本数(縦線の番号はこの値から始まる) */
  hCount: number;
  /** 四角 → 4辺の線番号 */
  boxEdges: number[][];
  /** 線 → 隣接する四角(1〜2個) */
  edgeBoxes: number[][];
}

export const hEdge = (size: number, r: number, c: number): number => r * (size - 1) + c;
export const vEdge = (size: number, r: number, c: number): number =>
  size * (size - 1) + r * size + c;

const cache = new Map<number, Board>();

export function getBoard(size: BoardSize): Board {
  const hit = cache.get(size);
  if (hit) return hit;
  const cells = size - 1;
  const hCount = size * cells;
  const edgeCount = hCount * 2;
  const boxCount = cells * cells;
  const boxEdges: number[][] = [];
  const edgeBoxes: number[][] = Array.from({ length: edgeCount }, () => []);
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const b = r * cells + c;
      const edges = [
        hEdge(size, r, c), // 上
        hEdge(size, r + 1, c), // 下
        vEdge(size, r, c), // 左
        vEdge(size, r, c + 1), // 右
      ];
      boxEdges.push(edges);
      for (const e of edges) edgeBoxes[e].push(b);
    }
  }
  const board: Board = { size, cells, edgeCount, boxCount, hCount, boxEdges, edgeBoxes };
  cache.set(size, board);
  return board;
}

/** 線の端点の点座標。横線: (r,c)-(r,c+1) / 縦線: (r,c)-(r+1,c)。x=列, y=行 */
export function edgeEndpoints(
  board: Board,
  edge: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const { size, hCount } = board;
  if (edge < hCount) {
    const r = Math.floor(edge / (size - 1));
    const c = edge % (size - 1);
    return { x1: c, y1: r, x2: c + 1, y2: r };
  }
  const k = edge - hCount;
  const r = Math.floor(k / size);
  const c = k % size;
  return { x1: c, y1: r, x2: c, y2: r + 1 };
}
