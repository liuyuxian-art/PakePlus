import { shortName } from './dom.js';

/**
 * 纯 SVG 雷达图：不引入图表库，保证离线可用、软著源程序可读。
 * rows: [{ name, req, score }]，req 为岗位要求线，score 为本人能力线。
 */
export function radarSvg(rows, options = {}) {
  const width = options.width || 400;
  const height = options.height || 330;
  const cx = width / 2;
  const cy = 168;
  const radius = options.radius || 108;
  const items = rows.filter((r) => Number.isFinite(r.score) || Number.isFinite(r.req));
  const n = items.length;
  if (n < 3) return `<p class="muted small">能力项不足 3 项，无法绘制雷达图</p>`;

  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i, value) => {
    const r = (radius * Math.max(0, Math.min(100, value))) / 100;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const polygon = (values) =>
    values
      .map((v, i) => {
        const [x, y] = point(i, v);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  let svg = '';
  for (const level of [25, 50, 75, 100]) {
    svg += `<polygon points="${polygon(items.map(() => level))}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }
  items.forEach((item, i) => {
    const [x, y] = point(i, 100);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eef1f6" stroke-width="1"/>`;
  });

  if (items.every((r) => Number.isFinite(r.req))) {
    svg += `<polygon points="${polygon(items.map((r) => r.req))}" fill="rgba(31,79,216,.09)" stroke="#1f4fd8" stroke-width="2"/>`;
  }
  if (items.every((r) => Number.isFinite(r.score))) {
    svg += `<polygon points="${polygon(items.map((r) => r.score))}" fill="rgba(15,157,138,.16)" stroke="#0f9d8a" stroke-width="2" stroke-dasharray="5 4"/>`;
  }

  items.forEach((item, i) => {
    const [x, y] = point(i, 118);
    const anchor = Math.abs(x - cx) < 12 ? 'middle' : x > cx ? 'start' : 'end';
    svg += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11.5" fill="#4b5563" text-anchor="${anchor}">${shortName(item.name)}</text>`;
  });

  const scoreItem = items.find((r) => Number.isFinite(r.score));
  if (scoreItem) {
    svg += `<text x="${cx}" y="${height - 8}" font-size="11" fill="#9ca3af" text-anchor="middle">虚线为我的能力 · 实线为岗位要求</text>`;
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="能力雷达图">${svg}</svg>`;
}

/** 让 data-w（0—100）的进度条在下一帧展开，触发 CSS 过渡。 */
export function animateBars(scope) {
  const nodes = [...scope.querySelectorAll('[data-w]')];
  requestAnimationFrame(() => {
    nodes.forEach((node) => {
      node.style.width = `${Math.max(0, Math.min(100, Number(node.dataset.w) || 0))}%`;
    });
  });
}

/** 环形占比条，用于后台「证据分布」。 */
export function donutSvg(items, options = {}) {
  const size = options.size || 108;
  const stroke = options.stroke || 14;
  const radius = (size - stroke) / 2;
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 0;
  const colors = ['#1f4fd8', '#4f7cf7', '#0f9d8a', '#d9a441'];
  const circles = items
    .map((item, index) => {
      const length = (item.value / total) * 2 * Math.PI * radius;
      const circle = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
        stroke="${item.color || colors[index % colors.length]}" stroke-width="${stroke}"
        stroke-dasharray="${length} ${2 * Math.PI * radius - length}"
        stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="butt"/>`;
      offset += length;
      return circle;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#eef1f6" stroke-width="${stroke}"/>
    ${circles}
  </svg>`;
}
