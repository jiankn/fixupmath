import { fmt } from './format';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Text is escaped; bar geometry is generated only from finite numbers. */
export function limitMeter(value: number, limit: number, label: string, status: string, scale = 100): string {
  if (![value, limit, scale].every(Number.isFinite) || scale <= 0) return '';
  const pos = (n: number) => Math.min(100, Math.max(0, n / scale * 100));
  return `<div class="result-visual ${value > limit ? 'is-over' : ''}">
    <p class="visual-heading">${esc(label)}</p>
    <div class="visual-pair"><span>Current <strong>${fmt(value, 2)}%</strong></span><span>Reference <strong>${fmt(limit)}%</strong></span></div>
    <div class="limit-track" role="img" aria-label="${esc(`${label}: ${fmt(value, 2)} percent; reference ${fmt(limit)} percent. ${status}`)}"><span class="limit-fill" style="width:${pos(value)}%"></span><span class="limit-marker" style="left:${pos(limit)}%"></span></div>
    <div class="visual-scale"><span>0%</span><span>${fmt(scale)}%${value > scale ? ' · bar capped' : ''}</span></div>
    <p class="visual-status">${esc(status)}</p></div>`;
}

export function circuitResult(volts: number, drop: number, feet: number): string {
  return `<div class="result-visual"><div class="visual-pair"><span>Source<strong>${fmt(volts, 1)} V</strong></span><span class="visual-arrow" aria-hidden="true">→</span><span>At load<strong>${fmt(volts - drop, 1)} V</strong></span></div><p class="visual-note">${fmt(feet)} ft one way · ${fmt(drop, 2)} V lost</p></div>`;
}

export function targetComparison(now: number, target: number, name: string): string {
  const delta = target - now;
  const state = delta > 0 ? `Increase needed: ${fmt(delta, 1)} ppm` : delta === 0 ? 'Target reached · nothing to add' : 'Above target · nothing to add';
  return `<div class="result-visual"><p class="visual-heading">${esc(name)}</p><div class="visual-pair"><span>Current<strong>${fmt(now, 1)} ppm</strong></span><span class="visual-arrow" aria-hidden="true">→</span><span>Target<strong>${fmt(target, 1)} ppm</strong></span></div><p class="visual-status">${esc(state)}</p></div>`;
}
