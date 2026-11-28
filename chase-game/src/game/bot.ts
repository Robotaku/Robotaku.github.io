/**
 * Bot(CPU)の思考。UIに依存しない純粋な関数。
 *
 *   chooseMove              … 手番のBotが指す手を返す入口
 *   fugitiveMove            … 逃走者Bot: 追跡者から遠く、捕まらない駅へ
 *   chaserMove              … 追跡者Bot: 逃走者がいそうな駅の集合に近づく(公開情報のみ使用)
 *   possibleFugitiveStations … 公開情報だけから「逃走者がいるかもしれない駅」を計算
 *   distanceMatrix          … 駅同士の最短距離(BFS)
 */
import type { Board, GameState, Move, Tickets } from './types';
import { adjacency, canDouble, legalMoves, publicState } from './rules';
import { type Rng, pick } from './rng';

const distCache = new WeakMap<Board, number[][]>();

/** 全駅間の最短ホップ数(手段を問わない無向グラフ上のBFS)。追跡者が乗れない船は含めない。 */
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
        if (e.mode === 'ferry') continue;
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
 *
 * 逃走者の記録(手数ごと)を順にたどる:
 *  ・公開された手数 … 候補はその駅だけになる
 *  ・それ以外      … 公開された手段で行ける隣の駅へ広げる。ブラックなら手段を問わず(船も)広げる
 *  ・追跡者がいた/止まった駅は除く(いたら捕まっているので)
 * 追跡者の移動は「逃走者のターン(LogEntry.turn)」ごとにまとめて反映する。
 * 2×カードの2手は同じターンなので、その間は追跡者の位置が変わらない。
 */
export function possibleFugitiveStations(pub: GameState, board: Board): number[] {
  const adj = adjacency(board);
  const cp = pub.chaserStart.slice();
  let S = new Set<number>(board.fugitiveStarts);
  let applied = 0; // 反映済みの追跡者ターン

  const applyTurn = (turn: number): void => {
    for (const m of pub.chaserMoves) {
      if (m.round !== turn) continue;
      cp[m.player - 1] = m.to;
      S.delete(m.to);
    }
    for (const c of cp) S.delete(c);
  };
  const catchUp = (upTo: number): void => {
    while (applied < upTo) applyTurn(++applied);
  };

  for (const e of pub.log) {
    catchUp(e.turn - 1);
    if (e.revealedPos !== null) {
      S = new Set([e.revealedPos]);
      continue;
    }
    const next = new Set<number>();
    for (const u of S) {
      for (const n of adj[u]) {
        const usable = e.mode === 'black' || n.mode === e.mode;
        if (usable && !cp.includes(n.to)) next.add(n.to);
      }
    }
    S = next;
  }
  if (pub.log.length > 0) catchUp(pub.log[pub.log.length - 1].turn);

  if (S.size === 0) {
    // 矛盾した場合の保険: 追跡者のいない全駅
    return board.stations.map((st) => st.id).filter((id) => !cp.includes(id));
  }
  return [...S].sort((x, y) => x - y);
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

/** 追跡者Botの調整値。0/false なら、対応する工夫を使わない(改善前の挙動) */
export interface ChaserTuning {
  /** 自分自身が候補の駅へ近づく項の重み。0だと「他の追跡者のほうが近い」とき動きが同点になりランダムに動く */
  pull: number;
  /** 直前にいた駅へ戻る手の減点(往復の抑制) */
  backtrack: number;
  /** 動けなくなる(使えるチケットで出られない)駅への移動を避ける */
  mobility: boolean;
}

/** 改善前の挙動(比較用) */
export const BASELINE_CHASER_TUNING: ChaserTuning = { pull: 0, backtrack: 0, mobility: false };
/** 標準(ふつう)の調整値。計測の根拠は README の「追跡者Botの改善」を参照 */
export const CHASER_TUNING: ChaserTuning = { pull: 0.25, backtrack: 0.4, mobility: true };

/**
 * 追跡者Bot: 公開情報のみ(publicState)から、可能性のある駅の集合に近づく手を選ぶ。
 * 評価(小さいほど良い): 候補の各駅への「追跡者全員のうち最短の距離」の平均 + 調整項(ChaserTuning)。
 */
export function chaserMove(pub: GameState, board: Board, rng: Rng, tuning: ChaserTuning = CHASER_TUNING): Move {
  const idx = pub.turn;
  const me = pub.players[idx];
  const legal = legalMoves(pub, board, idx);
  const easy = me.difficulty === 'easy';
  if (easy && rng() < 0.3) return pick(legal, rng);
  const dist = distanceMatrix(board);
  const adj = adjacency(board);
  const S = possibleFugitiveStations(pub, board);
  const others = pub.players.filter((p, i) => i !== idx && p.role === 'chaser').map((p) => p.pos);

  // 自分の直前の駅(往復の検出用)
  const hist = [pub.chaserStart[idx - 1], ...pub.chaserMoves.filter((m) => m.player === idx).map((m) => m.to)];
  const prev = hist.length >= 2 ? hist[hist.length - 2] : -1;

  const score = (m: Move): number => {
    const pos = [...others, m.to];
    // 候補の各駅へ「追跡者全員のうち最も近い人」の距離。平均が小さいほど、全員で網を張れている
    let sum = 0;
    for (const s of S) {
      let best = Infinity;
      for (const c of pos) best = Math.min(best, dist[c][s]);
      sum += best;
    }
    let cost = sum / S.length;
    // 自分自身の距離も少し見る。これが無いと「他の追跡者のほうが近い」ときに自分はどこへ動いても
    // 同点になり、ランダムに動いてしまう(往復・隅へ行ってチケット切れ、の原因になっていた)
    if (tuning.pull > 0) {
      let own = 0;
      for (const s of S) own += dist[m.to][s];
      cost += (tuning.pull * own) / S.length;
    }
    if (S.includes(m.to)) cost -= 0.5;
    cost += ticketCost(me.tickets[m.mode]);
    if (m.to === prev) cost += tuning.backtrack;
    if (tuning.mobility) {
      // この手のあと、残りのチケットで次に動ける駅の数。0なら次の手番はパス(手詰まり)
      const left = { ...me.tickets, [m.mode]: me.tickets[m.mode] - 1 };
      const exits = new Set(
        adj[m.to].filter((n) => n.mode !== 'ferry' && left[n.mode] > 0 && !others.includes(n.to)).map((n) => n.to),
      ).size;
      cost += exits === 0 ? 6 : exits === 1 ? 1.5 : 0;
    }
    if (easy) cost += rng() * 1.5;
    return -cost;
  };
  return argBest(legal, score, rng);
}

/**
 * 逃走者Bot: 追跡者から最も遠く、捕まりにくい駅へ。公開直後は直前の公開位置から離れる。
 *
 * ブラックチケット: 手段を隠せる貴重な1枚。追跡者が近い・公開直後など、推理を撹乱したいときだけ使う。
 * 2×カード: 追跡者が近いときに、2手連続で動いたほうが明らかに安全なら使う。
 */
export function fugitiveMove(state: GameState, board: Board, rng: Rng): Move {
  const idx = state.turn;
  const me = state.players[idx];
  const legal = legalMoves(state, board, idx);
  const easy = me.difficulty === 'easy';
  const dist = distanceMatrix(board);
  const adj = adjacency(board);
  const chasers = state.players.filter((p) => p.role === 'chaser');
  // 直前の手が公開手数だったか(=追跡者が位置を知っている)
  const justRevealed = state.lastReveal !== null && state.lastReveal.round === state.log.length;

  const danger = (to: number): number =>
    chasers.filter((c) => adj[c.pos].some((e) => e.mode !== 'ferry' && e.to === to && c.tickets[e.mode] > 0)).length;
  const nearest = (pos: number): number => Math.min(...chasers.map((c) => dist[c.pos][pos]));

  /** 行き先そのものの良さ */
  const destScore = (to: number): number => {
    const ds = chasers.map((c) => dist[c.pos][to]);
    const minD = Math.min(...ds);
    const avgD = ds.reduce((a, b) => a + b, 0) / ds.length;
    const mobility = new Set(adj[to].map((e) => e.to)).size;
    let sc = 10 * minD + avgD + 0.8 * mobility - 1000 * danger(to);
    if (state.lastReveal) sc += (justRevealed ? 4 : 0.3) * dist[state.lastReveal.pos][to];
    return sc;
  };
  /** どのチケットで行くかの良さ(ブラックは温存、通常券は豊富なものを優先) */
  const ticketScore = (mode: Move['mode'], tickets: Tickets, from: number): number => {
    if (mode === 'black') {
      const near = nearest(from);
      const need = (justRevealed ? 5 : 0) + (near <= 2 ? 5 : near <= 3 ? 2 : 0);
      return need - 4;
    }
    return 0.4 * tickets[mode] - 3 * ticketCost(tickets[mode]);
  };
  const moveScore = (m: Move): number => destScore(m.to) + ticketScore(m.mode, me.tickets, me.pos);

  const safe = legal.filter((m) => danger(m.to) === 0);
  if (easy && rng() < 0.4) return pick(safe.length ? safe : legal, rng);

  const noise = (m: Move): number => moveScore(m) + (easy ? rng() * 8 : 0);
  const single = argBest(legal, noise, rng);

  // 2×カード: 追跡者が近い/公開直後に、2手連続のほうが明らかに良いときだけ
  if (canDouble(state) && (!easy || rng() < 0.3)) {
    const near = nearest(me.pos);
    if (near <= 2 || (justRevealed && near <= 4)) {
      let bestPlan = -Infinity;
      let bestFirst: Move | null = null;
      for (const m1 of legal) {
        const tmp = structuredClone(state);
        tmp.players[idx].pos = m1.to;
        tmp.players[idx].tickets[m1.mode] -= 1;
        const first = ticketScore(m1.mode, me.tickets, me.pos);
        for (const m2 of legalMoves(tmp, board, idx)) {
          const plan = destScore(m2.to) + first + ticketScore(m2.mode, tmp.players[idx].tickets, m1.to) - DOUBLE_CARD_COST;
          if (plan > bestPlan) {
            bestPlan = plan;
            bestFirst = m1;
          }
        }
      }
      if (bestFirst && bestPlan > moveScore(single) + DOUBLE_MARGIN) return { ...bestFirst, double: true };
    }
  }
  return single;
}

/** 2×カードは貴重なので、使う手の点数から引く値と、単手より良いと認める差 */
const DOUBLE_CARD_COST = 6;
const DOUBLE_MARGIN = 4;

/** 現在の手番のBotが指す手を返す。追跡者は必ず publicState 経由で判断する。 */
export function chooseMove(state: GameState, board: Board, rng: Rng): Move {
  const p = state.players[state.turn];
  return p.role === 'fugitive'
    ? fugitiveMove(state, board, rng)
    : chaserMove(publicState(state), board, rng);
}

