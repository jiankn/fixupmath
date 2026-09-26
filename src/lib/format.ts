// 页面上的数字格式（美式千分位）
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** 整数，带千分位 */
export function int(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';
}

/** 金额：100 美元以下保留两位小数（$6.50），以上取整（$1,898） */
export function money(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  const d = n >= 100 ? 0 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** 向上取整到指定步长，如 0.5 码。减去极小值，避免 27/27 这类浮点误差多进一档 */
export function ceilTo(n: number, step: number): number {
  if (!(n > 0)) return 0;
  return Math.ceil(n / step - 1e-9) * step;
}

/** 向上取整成件数（袋、块、板） */
export function ceilCount(n: number): number {
  if (!(n > 0)) return 0;
  return Math.ceil(n - 1e-9);
}
