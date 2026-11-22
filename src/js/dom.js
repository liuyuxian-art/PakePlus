/**
 * 轻量 DOM 工具：查询、转义、提示条与日期格式化。
 * 所有插入 innerHTML 的动态文本都必须先经过 esc()，避免招聘文本里的
 * 尖括号被当成标签执行（这是原型版本缺失的防护）。
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

let toastTimer = null;

export function toast(message, tone = 'info') {
  const box = $('#toast');
  if (!box) return;
  box.textContent = message;
  box.style.background = tone === 'error' ? 'rgba(150, 32, 24, .94)' : 'rgba(17, 24, 39, .92)';
  box.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('on'), 2600);
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

export function shortName(name) {
  if (!name) return '';
  const parts = String(name).split(/\s+/);
  return parts[0].length <= 6 ? parts[0] : parts[0].slice(0, 6);
}

export function levelBadge(level) {
  return `<span class="badge b-${String(level || 'l0').toLowerCase()}">${esc(level)}</span>`;
}

export function statusTag(status) {
  const map = {
    draft: ['gray', '待答题'],
    test_done: ['warn', '待复核'],
    reviewed: ['ok', '已复核'],
    doing: ['', '进行中'],
    todo: ['gray', '未开始'],
    done: ['ok', '已完成']
  };
  const [tone, text] = map[status] || ['gray', status || '—'];
  return `<span class="tag ${tone}">${esc(text)}</span>`;
}
