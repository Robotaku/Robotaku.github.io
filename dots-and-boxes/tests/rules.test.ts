import { describe, expect, it } from 'vitest';
import { getBoard } from '../src/game/board';
import {
  applyMove,
  canUndo,
  createGame,
  legalMoves,
  resultOf,
  undoMove,
  undoToHuman,
} from '../src/game/rules';
import { boxEdgeList, makeGame, play } from './helpers';
import { defaultSettings } from '../src/game/settings';

describe('applyMove', () => {
  it('四角が取れなければ次の席へ手番が移る', () => {
    const s = applyMove(makeGame(3, ['human', 'human']), 0);
    expect(s.current).toBe(1);
    expect(s.edges[0]).toBe(0);
    expect(s.lastEdge).toBe(0);
  });

  it('4辺目を引くと四角を取り、続けて引ける', () => {
    const e = boxEdgeList(3, 0); // 左上の四角
    // P0,P1,P0 と3辺、間に別の線は挟まず P1 が4辺目を引く
    let s = makeGame(3, ['human', 'human']);
    s = play(s, [e[0], e[1], e[2]]); // P0,P1,P0
    expect(s.current).toBe(1);
    s = applyMove(s, e[3]);
    expect(s.boxes[0]).toBe(1);
    expect(s.current).toBe(1); // 取ったので続けて引く
    expect(s.history[s.history.length - 1].captured).toEqual([0]);
  });

  it('1本で2つの四角が同時に取れる', () => {
    const b = getBoard(3);
    // 四角0と四角1の間の縦線(共有線)
    const shared = b.boxEdges[0][3];
    expect(b.boxEdges[1][2]).toBe(shared);
    const others = [...b.boxEdges[0].slice(0, 3), ...b.boxEdges[1].filter((x) => x !== shared)];
    let s = makeGame(3, ['human', 'human', 'human']);
    s = play(s, others); // 共有線以外の6本。取れていないこと
    expect(s.boxes.every((x) => x === null)).toBe(true);
    s = applyMove(s, shared);
    expect(s.boxes[0]).toBe(s.boxes[1]);
    expect(s.boxes[0]).not.toBeNull();
    expect(s.history[s.history.length - 1].captured.length).toBe(2);
  });

  it('引いた線・範囲外の線は例外', () => {
    const s = applyMove(makeGame(3, ['human', 'human']), 0);
    expect(() => applyMove(s, 0)).toThrow();
    expect(() => applyMove(s, 999)).toThrow();
  });

  it('元の状態は書き換えない', () => {
    const s0 = makeGame(3, ['human', 'human']);
    applyMove(s0, 0);
    expect(s0.edges[0]).toBeNull();
    expect(s0.history.length).toBe(0);
  });

  it('全線が引かれたら終了し、legalMovesは空になる', () => {
    let s = makeGame(3, ['human', 'human']);
    for (const e of legalMoves(s)) s = applyMove(s, e);
    expect(s.finished).toBe(true);
    expect(legalMoves(s)).toEqual([]);
    expect(s.boxes.every((x) => x !== null)).toBe(true);
  });
});

describe('resultOf', () => {
  const finishedWith = (boxes: (number | null)[], players = 2) => {
    const s = createGame({
      size: 3,
      botLevel: 'normal',
      botSpeed: 'instant',
      players: Array.from({ length: players }, (_, i) => ({
        name: `P${i}`,
        colorId: ['blue', 'vermillion', 'green', 'orange', 'pink', 'sky'][i],
        kind: 'human' as const,
      })),
    });
    return { ...s, boxes };
  };

  it('最多の人が勝ち', () => {
    const r = resultOf(finishedWith([0, 0, 0, 1]));
    expect(r.winner).toBe(0);
    expect(r.draw).toBe(false);
    expect(r.ranks).toEqual([1, 2]);
  });

  it('同数なら引き分け', () => {
    const r = resultOf(finishedWith([0, 0, 1, 1]));
    expect(r.draw).toBe(true);
    expect(r.winner).toBeNull();
  });

  it('3人で首位が2人同率なら引き分け、最下位は3位', () => {
    const r = resultOf(finishedWith([0, 0, 1, 1], 3));
    expect(r.draw).toBe(true);
    expect(r.ranks).toEqual([1, 1, 3]);
  });

  it('3人で単独首位なら勝者あり。同点の下位は同順位', () => {
    const r = resultOf(finishedWith([0, 0, 1, 2], 3));
    expect(r.winner).toBe(0);
    expect(r.ranks).toEqual([1, 2, 2]);
  });
});

describe('undo', () => {
  it('undoMove は線・四角・手番を元に戻す', () => {
    const e = boxEdgeList(3, 0);
    let s = makeGame(3, ['human', 'human']);
    s = play(s, [e[0], e[1], e[2]]);
    const before = s;
    s = applyMove(s, e[3]);
    expect(s.boxes[0]).toBe(1);
    const back = undoMove(s);
    expect(back.boxes[0]).toBeNull();
    expect(back.edges[e[3]]).toBeNull();
    expect(back.current).toBe(before.current);
    expect(back.lastEdge).toBe(before.lastEdge);
    expect(back.history.length).toBe(before.history.length);
  });

  it('履歴が無ければ何もしない', () => {
    const s = makeGame(3, ['human', 'bot']);
    expect(undoMove(s)).toBe(s);
    expect(canUndo(s)).toBe(false);
  });

  it('Botの手番では戻せない', () => {
    const s = applyMove(makeGame(3, ['human', 'bot']), 0);
    expect(s.current).toBe(1);
    expect(canUndo(s)).toBe(false);
  });

  it('人間の手番では、間のBotの手をまとめて戻す', () => {
    // 人間0 → Bot1 → Bot2 → 人間0
    let s = makeGame(4, ['human', 'bot', 'bot']);
    s = play(s, [0, 1, 2]);
    expect(s.current).toBe(0);
    expect(canUndo(s)).toBe(true);
    const back = undoToHuman(s);
    expect(back.history.length).toBe(0);
    expect(back.current).toBe(0);
    expect(back.edges.every((x) => x === null)).toBe(true);
  });

  it('人間の手が履歴に無ければ戻せない(Botが先手のとき)', () => {
    // Bot0 → 人間1 の手番。Botの手しか無いので戻せない
    const s = applyMove(makeGame(4, ['bot', 'human']), 0);
    expect(s.current).toBe(1);
    expect(canUndo(s)).toBe(false);
  });

  it('人間2人なら直前の1手だけ戻る', () => {
    let s = makeGame(4, ['human', 'human']);
    s = play(s, [0, 1]);
    const back = undoToHuman(s);
    expect(back.history.length).toBe(1);
    expect(back.current).toBe(1);
  });
});

describe('createGame: 名前が空の席', () => {
  it('自動名になり、頭文字は席番号になる(人間とBotは別々に数える)', () => {
    const g = createGame(defaultSettings());
    expect(g.players.map((p) => p.name)).toEqual(['プレイヤー1', 'プレイヤー2', 'Bot1']);
    expect(g.players.map((p) => p.initial)).toEqual(['1', '2', '3']);
  });

  it('入力した名前はそのまま使い、頭文字は先頭の1文字になる', () => {
    const d = defaultSettings();
    const g = createGame({
      ...d,
      players: d.players.map((p, i) => (i === 0 ? { ...p, name: 'たろう' } : p)),
    });
    expect(g.players[0].name).toBe('たろう');
    expect(g.players[0].initial).toBe('た');
    expect(g.players[1].name).toBe('プレイヤー2'); // 空の席は自動名のまま
  });
});

