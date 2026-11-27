import type { Board, GameState, Move, Mode } from './types';
import { adjacency, legalMoves, publicState } from './rules';
import { type Rng, pick } from './rng';

const distCache = new WeakMap<Board, number[][]>();

/** 全駅間の最短ホップ数(手段を問わない無向グラフ上のBFS)。 */
export function distanceMatrix(board: Board): number[][] {
  let m = distCache.get(board);
  if (m) return m;
  const adj = adjacency(board);
  const n = adj.length;
  m = Array.from({ length: n }, () => new Array<number>(n).fill(Infinity));
  for (const st of board.stations) {
    const d = m[st.id];
    d[st.id] = 0;
    const q = [st.id];
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const e of adj[u]) {
        if (d[e.to] === Infinity) {
          d[e.to] = d[u] + 1;
          q.push(e.to);
        }
      }
    }
  }
  distCache.set(board, m);
  return m;
}

/**
 * 公開情報だけから「逃走者がいる可能性のある駅」を求める。
 * 最後に公開された位置(なければ開始候補)から、公開された移動手段を順にたどり、
 * 追跡者が立ち入った/いる駅を除く。
 */
export function possibleFugitiveStations(pub: GameState, board: Board): number[] {
  const adj = adjacency(board);
  const cp = pub.chaserStart.slice();
  const applyRound = (round: number): number[] => {
    const visited: number[] = [];
    for (const m of pub.chaserMoves) {
      if (m.round === round) {
        cp[m.player - 1] = m.to;
        visited.push(m.to);
      }
    }
    return visited;
  };
  const R = pub.lastReveal?.round ?? 0;
  let S: Set<number>;
  if (pub.lastReveal) {
    for (let r = 1; r <= R; r++) applyRound(r);
    S = new Set([pub.lastReveal.pos]);
  } else {
    S = new Set(board.fugitiveStarts);
  }
  for (const entry of pub.log) {
    if (entry.round <= R) continue;
    const next = new Set<number>();
    for (const u of S) {
      for (const e of adj[u]) {
        if (e.mode === entry.mode && !cp.includes(e.to)) next.add(e.to);
      }
    }
    S = next;
    for (const v of applyRound(entry.round)) S.delete(v);
    for (const c of cp) S.delete(c);
  }
  if (S.size === 0) {
    // 矛盾した場合の保険: 追跡者のいない全駅
    return board.stations.map((s) => s.id).filter((id) => !cp.includes(id));
  }
  return [...S].sort((a, b) => a - b);
}

function ticketCost(remaining: number): number {
  return 0.3 / Math.max(1, remaining);
}

function argBest<T>(items: T[], score: (t: T) => number, rng: Rng): T {
  let best = -Infinity;
  let bests: T[] = [];
  for (const it of items) {
    const sc = score(it);
    if (sc > best + 1e-9) {
      best = sc;
      bests = [it];
    } else if (Math.abs(sc - best) <= 1e-9) bests.push(it);
  }
  return pick(bests, rng);
}

/** 追跡者Bot: 公開情報のみ(publicState)から、可能性のある駅の集合に近づく手を選ぶ。 */
export function chaserMove(pub: GameState, board: Board, rng: Rng): Move {
  const idx = pub.turn;
  const me = pub.players[idx];
  const legal = legalMoves(pub, board, idx);
  const easy = me.difficulty === 'easy';
  if (easy && rng() < 0.3) return pick(legal, rng);
  const dist = distanceMatrix(board);
  const S = possibleFugitiveStations(pub, board);
  const others = pub.players.filter((p, i) => i !== idx && p.role === 'chaser').map((p) => p.pos);
  const score = (m: Move): number => {
    const pos = [...others, m.to];
    let sum = 0;
    for (const s of S) {
      let best = Infinity;
      for (const c of pos) best = Math.min(best, dist[c][s]);
      sum += best;
    }
    let cost = sum / S.length;
    if (S.includes(m.to)) cost -= 0.5;
    cost += ticketCost(me.tickets[m.mode]);
    if (easy) cost += rng() * 1.5;
    return -cost;
  };
  return argBest(legal, score, rng);
}

/** 逃走者Bot: 追跡者から最も遠く、捕まりにくい駅へ。公開直後は直前の公開位置から離れる。 */
export function fugitiveMove(state: GameState, board: Board, rng: Rng): Move {
  const idx = state.turn;
  const me = state.players[idx];
  const legal = legalMoves(state, board, idx);
  const easy = me.difficulty === 'easy';
  const dist = distanceMatrix(board);
  const adj = adjacency(board);
  const chasers = state.players.filter((p) => p.role === 'chaser');
  const justRevealed = state.lastReveal !== null && state.lastReveal.round === state.round - 1;

  const danger = (to: number): number =>
    chasers.filter((c) => adj[c.pos].some((e) => e.to === to && c.tickets[e.mode] > 0)).length;
  const safe = legal.filter((m) => danger(m.to) === 0);

  if (easy && rng() < 0.4) return pick(safe.length ? safe : legal, rng);

  const score = (m: Move): number => {
    const ds = chasers.map((c) => dist[c.pos][m.to]);
    const minD = Math.min(...ds);
    const avgD = ds.reduce((a, b) => a + b, 0) / ds.length;
    const mobility = new Set(adj[m.to].map((e) => e.to)).size;
    let sc = 10 * minD + avgD + 0.8 * mobility - 1000 * danger(m.to);
    sc += 0.4 * me.tickets[m.mode] - 3 * ticketCost(me.tickets[m.mode]);
    if (state.lastReveal) {
      sc += (justRevealed ? 4 : 0.3) * dist[state.lastReveal.pos][m.to];
    }
    if (easy) sc += rng() * 8;
    return sc;
  };
  return argBest(legal, score, rng);
}

/** 現在の手番のBotが指す手を返す。追跡者は必ず publicState 経由で判断する。 */
export function chooseMove(state: GameState, board: Board, rng: Rng): Move {
  const p = state.players[state.turn];
  return p.role === 'fugitive'
    ? fugitiveMove(state, board, rng)
    : chaserMove(publicState(state), board, rng);
}

export type { Mode };
