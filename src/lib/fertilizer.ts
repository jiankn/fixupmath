import { ceilCount } from './format';

export const LB_PER_KG = 1 / 0.45359237;
export const APPLICATION_UNITS = [
  { value: 'lb-1000', label: 'lb per 1,000 ft²' },
  { value: 'kg-100m2', label: 'kg per 100 m²' },
  { value: 'lb-acre', label: 'lb per acre' },
];
export function applicationPounds(areaFt2: number, rate: number, unit: string): number {
  if (![areaFt2, rate].every(Number.isFinite) || areaFt2 < 0 || rate < 0) return 0;
  if (unit === 'lb-1000') return areaFt2 / 1000 * rate;
  if (unit === 'kg-100m2') return areaFt2 * 0.09290304 / 100 * rate * LB_PER_KG;
  if (unit === 'lb-acre') return areaFt2 / 43560 * rate;
  return 0;
}
export function fertilizerAmount(areaFt2: number, rate: number, unit: string, mode: string,
  nitrogenPct: number, phosphatePct: number, potashPct: number, bagLb: number) {
  const labelValid = [nitrogenPct, phosphatePct, potashPct].every(n => Number.isFinite(n) && n >= 0 && n <= 100)
    && nitrogenPct + phosphatePct + potashPct <= 100;
  const valid = labelValid && (mode === 'nitrogen' ? nitrogenPct > 0 : mode === 'product')
    && APPLICATION_UNITS.some(u => u.value === unit) && [areaFt2, rate, bagLb].every(Number.isFinite)
    && areaFt2 > 0 && rate >= 0 && bagLb > 0;
  const targetLb = applicationPounds(areaFt2, rate, unit);
  const productLb = valid ? (mode === 'nitrogen' ? targetLb / (nitrogenPct / 100) : targetLb) : 0;
  return { valid, productLb, bags: valid ? ceilCount(productLb / bagLb) : 0,
    nitrogenLb: productLb * nitrogenPct / 100,
    phosphateLb: productLb * phosphatePct / 100, potashLb: productLb * potashPct / 100 };
}
