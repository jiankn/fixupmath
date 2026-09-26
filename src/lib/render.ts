// 结果面板的 HTML。构建时和浏览器里用同一个函数，保证首屏和交互后的样子完全一致。
import type { CalcResult } from './calc-types';

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function resultHTML(r: CalcResult): string {
  const blocks = r.blocks
    .filter((b) => b.rows.length)
    .map(
      (b) =>
        `<div class="res-block"><h3>${esc(b.title)}</h3><ul class="rows">${b.rows
          .map(
            (row) =>
              `<li><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong>${
                row.note ? `<span class="note">${esc(row.note)}</span>` : ''
              }</li>`,
          )
          .join('')}</ul></div>`,
    )
    .join('');
  return (
    `<p class="res-label">${esc(r.label)}</p>` +
    `<p class="res-main"><span class="res-num">${esc(r.value)}</span> <span class="res-unit">${esc(r.unit)}</span></p>` +
    (r.sub ? `<p class="res-sub">${esc(r.sub)}</p>` : '') +
    (r.figure ? `<div class="res-figure">${r.figure}</div>` : '') +
    blocks +
    (r.advice ? `<p class="advice">${esc(r.advice)}</p>` : '')
  );
}
