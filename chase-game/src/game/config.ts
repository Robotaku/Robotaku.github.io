/**
 * ゲームの数値設定。ルールの「つまみ」はすべてここに集めてある。
 * 変更したら、Bot同士の対戦で勝率・終局理由の偏りがないかを確認し、
 * 画面のルール文(ui/rulesText.ts)とREADMEの数字も直すこと。
 */
import type { Tickets } from './types';

/** 逃走者の移動記録の数。これを埋めたあと追跡者が動き終えれば逃走者の勝ち */
export const MAX_ROUNDS = 24;
/** 位置が公開される手数(2×カードの手も1手と数える) */
export const REVEAL_ROUNDS = [3, 8, 13, 18, 24];

/**
 * 追跡者1人あたりの最初のチケット。原作は タクシー10・バス8・地下鉄4。
 * タクシーだけ18にしている: この盤面は34/50駅がタクシー専用で、10枚だと追跡者が券切れで動けなくなり、
 * 追跡ではなく「追跡者が全員動けない」で終わる対戦が5〜8割になる(Bot同士の対戦で計測)。
 */
export const CHASER_TICKETS: Tickets = { taxi: 18, bus: 8, metro: 4, black: 0 };
/** 逃走者の最初のチケット(ブラックは人数で決まるので blackTicketsFor を使う) */
export const FUGITIVE_TICKETS: Tickets = { taxi: 6, bus: 4, metro: 3, black: 0 };

/** 追跡者が使い終えたチケットを逃走者に渡すか(原作のルール) */
export const TRANSFER_TICKETS = true;

/**
 * ブラックチケットの枚数。追跡者が少ないと逃走者が有利になりすぎるため、2人以下は1枚に絞る。
 * (原作は版によって「追跡者の人数分」「5枚」と違う)
 */
export function blackTicketsFor(chaserCount: number): number {
  return chaserCount <= 2 ? 1 : chaserCount;
}
/** 2×カードの枚数。2人以下は1枚(原作は2枚) */
export function doubleCardsFor(chaserCount: number): number {
  return chaserCount <= 2 ? 1 : 2;
}

export const MIN_SEATS = 2;
export const MAX_SEATS = 8; // 逃走者1 + 追跡者7
