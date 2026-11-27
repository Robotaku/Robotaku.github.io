/** 盤面の背景に描く簡易地図(街区・川・公園・ラベル)。路線や駅より下に描く、見た目だけの装飾。 */

export function backgroundSvg(): string {
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

