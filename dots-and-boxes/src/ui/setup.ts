import { MAX_SEATS, MIN_SEATS, PALETTE, colorOf, newSeat } from '../game/settings';
import type { BoardSize, BotLevel, BotSpeed, PlayerConfig, Settings } from '../game/types';
import { clear, el } from './dom';

export interface SetupHandlers {
  onChange(settings: Settings): void;
  onStart(settings: Settings): void;
}

function segmented<T extends string | number>(
  label: string,
  options: { value: T; text: string; sub?: string }[],
  current: T,
  onPick: (v: T) => void,
): HTMLElement {
  return el(
    'div',
    { class: 'field' },
    el('div', { class: 'field-label' }, label),
    el(
      'div',
      { class: 'segmented', role: 'radiogroup', 'aria-label': label },
      ...options.map((o) =>
        el(
          'button',
          {
            type: 'button',
            class: `seg${o.value === current ? ' on' : ''}`,
            role: 'radio',
            'aria-checked': o.value === current,
            onClick: () => onPick(o.value),
          },
          el('span', { class: 'seg-main' }, o.text),
          o.sub ? el('span', { class: 'seg-sub' }, o.sub) : null,
        ),
      ),
    ),
  );
}

export function renderSetup(root: HTMLElement, initial: Settings, handlers: SetupHandlers): void {
  let settings: Settings = structuredClone(initial);

  const update = (next: Settings, redraw = true): void => {
    settings = next;
    handlers.onChange(settings);
    if (redraw) draw();
  };
  const setPlayer = (i: number, patch: Partial<PlayerConfig>): Settings => ({
    ...settings,
    players: settings.players.map((p, k) => (k === i ? { ...p, ...patch } : p)),
  });

  function seatRow(p: PlayerConfig, i: number): HTMLElement {
    const humans = settings.players.filter((q) => q.kind === 'human').length;
    const usedByOthers = new Set(settings.players.filter((_, k) => k !== i).map((q) => q.colorId));
    const col = colorOf(p.colorId);
    const kindBtn = (kind: PlayerConfig['kind'], text: string) => {
      // 最後の人間を Bot にはできない
      const blocked = kind === 'bot' && p.kind === 'human' && humans <= 1;
      return el(
        'button',
        {
          type: 'button',
          class: `seg${p.kind === kind ? ' on' : ''}`,
          disabled: blocked,
          title: blocked ? '最低1人は人間が必要です' : undefined,
          onClick: () => update(setPlayer(i, { kind })),
        },
        text,
      );
    };
    return el(
      'li',
      { class: 'seat' },
      el(
        'span',
        { class: 'seat-badge', style: `background:${col.hex};color:${col.text}`, 'aria-hidden': 'true' },
        Array.from(p.name.trim())[0]?.toUpperCase() ?? String(i + 1),
      ),
      el(
        'div',
        { class: 'seat-main' },
        el(
          'div',
          { class: 'seat-top' },
          el('input', {
            class: 'seat-name',
            type: 'text',
            value: p.name,
            maxLength: 8,
            'aria-label': `席${i + 1}の名前`,
            onInput: (ev: Event) => {
              settings = setPlayer(i, { name: (ev.target as HTMLInputElement).value });
              const badge = (ev.target as HTMLElement)
                .closest('.seat')
                ?.querySelector('.seat-badge');
              if (badge) badge.textContent = Array.from(settings.players[i].name.trim())[0]?.toUpperCase() ?? String(i + 1);
              handlers.onChange(settings);
            },
          }),
          el('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': `席${i + 1}の種類` },
            kindBtn('human', '人間'),
            kindBtn('bot', 'Bot'),
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'icon-btn',
              disabled: settings.players.length <= MIN_SEATS || (p.kind === 'human' && humans <= 1),
              'aria-label': `席${i + 1}を削除`,
              onClick: () => update({ ...settings, players: settings.players.filter((_, k) => k !== i) }),
            },
            '✕',
          ),
        ),
        el(
          'div',
          { class: 'swatches', role: 'radiogroup', 'aria-label': `席${i + 1}の色` },
          ...PALETTE.map((c) =>
            el(
              'button',
              {
                type: 'button',
                class: `swatch${c.id === p.colorId ? ' on' : ''}`,
                style: `background:${c.hex};color:${c.text}`,
                disabled: usedByOthers.has(c.id),
                role: 'radio',
                'aria-checked': c.id === p.colorId,
                'aria-label': c.label,
                title: c.label,
                onClick: () => update(setPlayer(i, { colorId: c.id })),
              },
              c.id === p.colorId ? '✓' : '',
            ),
          ),
        ),
      ),
    );
  }

  function draw(): void {
    clear(root);
    const hasBot = settings.players.some((p) => p.kind === 'bot');
    const humans = settings.players.filter((p) => p.kind === 'human').length;
    const boxes = (settings.size - 1) ** 2;

    root.append(
      el(
        'div',
        { class: 'screen setup' },
        el('h1', { class: 'title' }, 'ドット&ボックス'),
        el('p', { class: 'lead' }, `人間${humans}人 + Bot${settings.players.length - humans}人 ・ 四角${boxes}個`),
        el(
          'section',
          { class: 'card' },
          el('h2', {}, '参加者'),
          el('ul', { class: 'seats' }, ...settings.players.map(seatRow)),
          el(
            'button',
            {
              type: 'button',
              class: 'btn ghost',
              disabled: settings.players.length >= MAX_SEATS,
              onClick: () => update({ ...settings, players: [...settings.players, newSeat(settings.players)] }),
            },
            `＋ 席を追加(${settings.players.length}/${MAX_SEATS})`,
          ),
        ),
        el(
          'section',
          { class: 'card' },
          el('h2', {}, 'ルール設定'),
          segmented<BoardSize>(
            '盤面サイズ',
            [
              { value: 3, text: '3×3', sub: '四角4個' },
              { value: 4, text: '4×4', sub: '四角9個・標準' },
              { value: 5, text: '5×5', sub: '四角16個' },
            ],
            settings.size,
            (size) => update({ ...settings, size }),
          ),
          hasBot
            ? segmented<BotLevel>(
                'Botの強さ',
                [
                  { value: 'easy', text: 'かんたん' },
                  { value: 'normal', text: 'ふつう' },
                  { value: 'strong', text: 'つよい' },
                ],
                settings.botLevel,
                (botLevel) => update({ ...settings, botLevel }),
              )
            : null,
          hasBot
            ? segmented<BotSpeed>(
                'Botの速さ',
                [
                  { value: 'normal', text: 'ふつう' },
                  { value: 'fast', text: '速い' },
                  { value: 'instant', text: '即時' },
                ],
                settings.botSpeed,
                (botSpeed) => update({ ...settings, botSpeed }),
              )
            : null,
        ),
        el(
          'button',
          { type: 'button', class: 'btn primary big', onClick: () => handlers.onStart(settings) },
          'ゲーム開始',
        ),
      ),
    );
  }
  draw();
}
