import { describe, it, expect } from 'vitest';
import { BOARD } from '../src/game/board';
import { applyMove, createGame, publicState } from '../src/game/rules';
import { chooseMove } from '../src/game/bot';
import { mulberry32 } from '../src/game/rng';
import { renderBoardSvg } from '../src/ui/boardView';
import type { SeatConfig } from '../src/game/types';

const seats: SeatConfig[] = [
  { name: 'A', isBot: false, role: 'fugitive', difficulty: 'normal' },
  { name: 'B', isBot: false, role: 'chaser', difficulty: 'normal' },
  { name: 'Bot', isBot: true, role: 'chaser', difficulty: 'normal' },
];

describe('隠し情報が描画に出ない', () => {
  it('公開状態だけで描いた盤面に逃走者の駒・デバッグ駒がない(全ラウンド)', () => {
    const rng = mulberry32(21);
    let g = createGame(BOARD, seats, rng);
    let n = 0;
    while (!g.winner && n++ < 100) {
      const svg = renderBoardSvg({ board: BOARD, pub: publicState(g) });
      expect(svg).not.toContain('fugitive-token');
      expect(svg).not.toContain('debug-token');
      g = applyMove(g, BOARD, chooseMove(g, BOARD, rng));
    }
    expect(n).toBeGreaterThan(3);
  });
  it('逃走者本人の手番でだけ駒を描く指定ができる', () => {
    const g = createGame(BOARD, seats, mulberry32(1));
    const svg = renderBoardSvg({ board: BOARD, pub: publicState(g), secretFugitivePos: g.players[0].pos });
    expect(svg).toContain('fugitive-token');
  });
  it('公開ログに逃走者の位置は、公開ラウンド以外では含まれない', () => {
    const rng = mulberry32(8);
    let g = createGame(BOARD, seats, rng);
    for (let i = 0; i < 12 && !g.winner; i++) g = applyMove(g, BOARD, chooseMove(g, BOARD, rng));
    for (const e of publicState(g).log) {
      if (![3, 8, 13, 18, 24].includes(e.round)) expect(e.revealedPos).toBeNull();
    }
  });
});
