import { edgeEndpoints, getBoard, nearestOpenEdge } from '../game/board';
import { colorOf } from '../game/settings';
import type { GameState } from '../game/types';

const NS = 'http://www.w3.org/2000/svg';

function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  cls?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (cls) node.setAttribute('class', cls);
  return node;
}

export interface BoardOptions {
  /** true のとき、未引きの線がタップできる */
  interactive: boolean;
  onEdge?: (edge: number) => void;
}

const MARGIN = 0.55;
/** タップ位置から、この距離(点の間隔=1)以内の線を引く */
const HIT_DISTANCE = 0.4;

/**
 * 盤面をSVGで描く。座標は「点の間隔 = 1」の単位。
 * 線の当たり判定は、見た目より太い透明な線(.edge-hit)で確保する。
 */
export function boardSvg(state: GameState, opts: BoardOptions): SVGSVGElement {
  const board = getBoard(state.size);
  const span = state.size - 1 + MARGIN * 2;
  const svg = s('svg', {
    viewBox: `${-MARGIN} ${-MARGIN} ${span} ${span}`,
    role: 'group',
    'aria-label': 'ゲーム盤面',
  }, 'board');

  // 取られた四角(色+頭文字)
  for (let b = 0; b < board.boxCount; b++) {
    const owner = state.boxes[b];
    if (owner === null) continue;
    const r = Math.floor(b / board.cells);
    const c = b % board.cells;
    const player = state.players[owner];
    const col = colorOf(player.colorId);
    const captured = state.history.length > 0 && state.history[state.history.length - 1].captured.includes(b);
    const g = s('g', {}, captured ? 'box box-new' : 'box');
    g.append(
      s('rect', { x: c + 0.1, y: r + 0.1, width: 0.8, height: 0.8, rx: 0.08, fill: col.hex }),
    );
    const t = s('text', {
      x: c + 0.5,
      y: r + 0.5,
      fill: col.text,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': 0.5,
    }, 'box-letter');
    t.textContent = player.initial;
    g.append(t);
    svg.append(g);
  }

  // 線(未引き → 引かれた線 → 直前の線の順に重ねる)
  const drawLine = (edge: number, cls: string, stroke?: string): SVGLineElement => {
    const p = edgeEndpoints(board, edge);
    const line = s('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 }, cls);
    // CSSの .edge より優先させるため、属性ではなくインラインstyleで色を付ける
    if (stroke) line.style.stroke = stroke;
    return line;
  };
  for (let e = 0; e < board.edgeCount; e++) {
    if (state.edges[e] === null) svg.append(drawLine(e, 'edge'));
  }
  for (let e = 0; e < board.edgeCount; e++) {
    const owner = state.edges[e];
    if (owner === null || e === state.lastEdge) continue;
    svg.append(drawLine(e, 'edge drawn', colorOf(state.players[owner].colorId).hex));
  }
  if (state.lastEdge !== null) {
    const owner = state.edges[state.lastEdge] as number;
    svg.append(drawLine(state.lastEdge, 'edge-glow'));
    svg.append(
      drawLine(state.lastEdge, 'edge drawn last', colorOf(state.players[owner].colorId).hex),
    );
  }

  // 点
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) svg.append(s('circle', { cx: c, cy: r, r: 0.085 }, 'dot'));
  }

  // 当たり判定: 透明な太い線(.edge-hit)はカーソルの形と見た目用。
  // 実際に引く線は、タップ位置にいちばん近い未引きの線を選ぶ(点の近くで判定が重ならない)。
  if (opts.interactive && opts.onEdge) {
    const onEdge = opts.onEdge;
    for (let e = 0; e < board.edgeCount; e++) {
      if (state.edges[e] !== null) continue;
      const hit = drawLine(e, 'edge-hit');
      hit.style.strokeLinecap = 'butt';
      svg.append(hit);
    }
    svg.addEventListener('click', (ev) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      const edge = nearestOpenEdge(board, (e) => state.edges[e] === null, p.x, p.y, HIT_DISTANCE);
      if (edge !== null) {
        ev.stopPropagation();
        onEdge(edge);
      }
    });
  }
  return svg;
}
