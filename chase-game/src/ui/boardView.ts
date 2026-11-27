import type { Board, GameState, Mode } from '../game/types';

export const CHASER_COLORS = ['#1e88e5', '#8e24aa', '#00897b', '#f4511e', '#6d4c41', '#3949ab', '#7cb342'];
const MODE_COLOR: Record<Mode, string> = { taxi: '#d9961a', bus: '#2e9e4f', metro: '#d32f2f' };
const MODE_OFFSET: Record<Mode, number> = { taxi: 0, bus: 5, metro: -5 };
const MODE_WIDTH: Record<Mode, number> = { taxi: 2.5, bus: 3.5, metro: 4.5 };

export interface BoardViewOptions {
  board: Board;
  /** 必ず publicState() を通した状態を渡すこと(逃走者の位置を含まない) */
  pub: GameState;
  /** 逃走者本人の手番でだけ渡す、逃走者の現在地 */
  secretFugitivePos?: number | null;
  /** 開発用デバッグ表示(設定でオフにできる) */
  debugPos?: number | null;
  targets?: ReadonlySet<number>;
  selected?: number | null;
  candidates?: readonly number[];
  /** 終了画面で見せる逃走者の全軌跡 */
  trail?: readonly number[];
}


/** 背景の簡易地図(街区・川・公園・ラベル)。路線や駅より下に描く装飾。 */
function backgroundSvg(): string {
  const blocks: string[] = [];
  for (let x = 20; x < 1000; x += 60) {
    for (let y = 20; y < 700; y += 60) {
      const w = 26 + ((x * 7 + y * 3) % 13);
      const h = 22 + ((x * 5 + y * 11) % 15);
      blocks.push(`<rect x="${x + ((y * 3) % 9)}" y="${y + ((x * 5) % 9)}" width="${w}" height="${h}" rx="3"/>`);
    }
  }
  return `<g class="bg" pointer-events="none">
    <rect x="0" y="0" width="1000" height="700" rx="14" fill="#f1ede2"/>
    <g fill="#e2dccb">${blocks.join('')}</g>
    <path d="M -20 150 C 180 60, 300 300, 470 330 S 760 520, 1020 600" fill="none" stroke="#a9d3ec" stroke-width="58" stroke-linecap="round"/>
    <path d="M -20 150 C 180 60, 300 300, 470 330 S 760 520, 1020 600" fill="none" stroke="#c9e6f6" stroke-width="40" stroke-linecap="round"/>
    <ellipse cx="170" cy="470" rx="105" ry="62" fill="#c5e2b6"/>
    <ellipse cx="820" cy="190" rx="95" ry="58" fill="#c5e2b6"/>
    <ellipse cx="560" cy="610" rx="80" ry="40" fill="#c5e2b6"/>
    <rect x="700" y="395" width="120" height="70" rx="10" fill="#d8d2c0" stroke="#bdb6a0"/>
    <g font-size="17" font-weight="700" fill="#5d6f7d" fill-opacity="0.75" text-anchor="middle">
      <text x="170" y="474">さくら公園</text>
      <text x="820" y="194">みどり公園</text>
      <text x="560" y="614" font-size="14">南の森</text>
      <text x="760" y="436" font-size="14">中央駅前広場</text>
      <text transform="rotate(14 330 252)" x="330" y="252" fill="#3f7ea3">せせらぎ川</text>
    </g>
  </g>`;
}

export function renderBoardSvg(o: BoardViewOptions): string {
  const { board, pub } = o;
  const pos = new Map(board.stations.map((s) => [s.id, s]));
  const modesAt = new Map<number, Set<Mode>>();
  for (const e of board.edges) {
    for (const id of [e.a, e.b]) {
      if (!modesAt.has(id)) modesAt.set(id, new Set());
      modesAt.get(id)!.add(e.mode);
    }
  }
  const parts: string[] = [];
  parts.push(`<svg class="board-svg" viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="駅と路線の盤面">`);
  parts.push(backgroundSvg());

  // 路線(タクシー→バス→地下鉄の順で重ねる)
  for (const mode of ['taxi', 'bus', 'metro'] as Mode[]) {
    for (const e of board.edges.filter((x) => x.mode === mode)) {
      const a = pos.get(e.a)!;
      const b = pos.get(e.b)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * MODE_OFFSET[mode];
      const oy = (dx / len) * MODE_OFFSET[mode];
      parts.push(
        `<line class="edge edge-${mode}" x1="${a.x + ox}" y1="${a.y + oy}" x2="${b.x + ox}" y2="${b.y + oy}" stroke="${MODE_COLOR[mode]}" stroke-width="${MODE_WIDTH[mode]}" stroke-linecap="round"${mode === 'taxi' ? ' stroke-opacity="0.75"' : ''}/>`,
      );
    }
  }

  // 可能性のある駅(ヒント)
  for (const id of o.candidates ?? []) {
    const s = pos.get(id)!;
    parts.push(`<circle class="candidate" cx="${s.x}" cy="${s.y}" r="24" fill="#ff9800" fill-opacity="0.35" stroke="#ef6c00" stroke-dasharray="4 3"/>`);
  }

  // 終了後の逃走者の軌跡
  if (o.trail && o.trail.length > 1) {
    const pts = o.trail.map((id) => `${pos.get(id)!.x},${pos.get(id)!.y}`).join(' ');
    parts.push(`<polyline class="trail" points="${pts}" fill="none" stroke="#212121" stroke-width="3" stroke-dasharray="7 5" stroke-opacity="0.7"/>`);
  }

  // 駅
  for (const s of board.stations) {
    const cls = ['st'];
    if (o.targets?.has(s.id)) cls.push('target');
    if (o.selected === s.id) cls.push('selected');
    const isTarget = o.targets?.has(s.id);
    parts.push(`<g class="${cls.join(' ')}" data-station="${s.id}">`);
    if (isTarget) parts.push(`<circle class="target-ring" cx="${s.x}" cy="${s.y}" r="25" fill="#fff59d" fill-opacity="0.6" stroke="#f57f17" stroke-width="3"/>`);
    parts.push(`<circle class="st-body" cx="${s.x}" cy="${s.y}" r="15" fill="#fff" stroke="${o.selected === s.id ? '#d50000' : '#263238'}" stroke-width="${o.selected === s.id ? 4 : 2}"/>`);
    parts.push(`<text class="st-id" x="${s.x}" y="${s.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#263238">${s.id}</text>`);
    // 使える手段の目印(下に小さな四角)
    const ms = [...(modesAt.get(s.id) ?? [])].sort();
    const order: Mode[] = (['taxi', 'bus', 'metro'] as Mode[]).filter((m) => ms.includes(m));
    order.forEach((m, i) => {
      const x = s.x - (order.length * 7) / 2 + i * 7 + 0.5;
      parts.push(`<rect class="pip pip-${m}" x="${x}" y="${s.y + 17}" width="6" height="6" rx="1" fill="${MODE_COLOR[m]}"/>`);
    });
    parts.push(`<circle class="hit" cx="${s.x}" cy="${s.y}" r="27" fill="transparent"/>`);
    parts.push(`</g>`);
  }

  // 開始候補(最初の公開まで)
  if (!pub.lastReveal) {
    for (const id of board.fugitiveStarts) {
      const s = pos.get(id)!;
      parts.push(`<text class="start-mark" x="${s.x + 15}" y="${s.y - 12}" font-size="16" fill="#6a1b9a" pointer-events="none">★</text>`);
    }
  }

  // 最後に公開された位置
  if (pub.lastReveal) {
    const s = pos.get(pub.lastReveal.pos)!;
    parts.push(
      `<g class="reveal-mark" pointer-events="none"><rect x="${s.x - 17}" y="${s.y - 17}" width="34" height="34" transform="rotate(45 ${s.x} ${s.y})" fill="none" stroke="#6a1b9a" stroke-width="4"/><text x="${s.x}" y="${s.y - 24}" text-anchor="middle" font-size="13" font-weight="700" fill="#6a1b9a">R${pub.lastReveal.round}公開</text></g>`,
    );
  }

  // 追跡者
  pub.players.forEach((p, i) => {
    if (p.role !== 'chaser') return;
    const s = pos.get(p.pos)!;
    const color = CHASER_COLORS[(i - 1) % CHASER_COLORS.length];
    parts.push(
      `<g class="chaser-token" pointer-events="none"><circle cx="${s.x}" cy="${s.y}" r="21" fill="none" stroke="${color}" stroke-width="5"/><circle cx="${s.x + 17}" cy="${s.y - 17}" r="9" fill="${color}"/><text x="${s.x + 17}" y="${s.y - 13}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${i}</text></g>`,
    );
  });

  // 逃走者本人にだけ見える現在地
  if (o.secretFugitivePos != null && o.secretFugitivePos > 0) {
    const s = pos.get(o.secretFugitivePos)!;
    parts.push(
      `<g class="fugitive-token" pointer-events="none"><circle cx="${s.x}" cy="${s.y}" r="21" fill="#212121" fill-opacity="0.9"/><text x="${s.x}" y="${s.y + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#ffeb3b">逃</text></g>`,
    );
  }
  if (o.debugPos != null && o.debugPos > 0) {
    const s = pos.get(o.debugPos)!;
    parts.push(
      `<g class="debug-token" pointer-events="none"><circle cx="${s.x}" cy="${s.y}" r="23" fill="none" stroke="#d50000" stroke-width="3" stroke-dasharray="3 3"/><text x="${s.x}" y="${s.y + 38}" text-anchor="middle" font-size="12" fill="#d50000">DEBUG</text></g>`,
    );
  }
  parts.push(`</svg>`);
  return parts.join('');
}
