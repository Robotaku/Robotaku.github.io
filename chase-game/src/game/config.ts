/**
 * ゲームの数値設定。ルールの「つまみ」はすべてここに集めてある。
 * 変更したら、勝率の偏りがないか(Bot同士の対戦)と、画面のルール文・READMEの数字も確認すること。
 */
import type { Tickets } from './types';

export const MAX_ROUNDS = 24;
export const REVEAL_ROUNDS = [3, 8, 13, 18, 24];
export const FUGITIVE_TICKETS: Tickets = { taxi: 24, bus: 9, metro: 6 };
export const CHASER_TICKETS: Tickets = { taxi: 24, bus: 8, metro: 4 };
export const MIN_SEATS = 2;
export const MAX_SEATS = 8; // 逃走者1 + 追跡者7
