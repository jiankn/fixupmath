import { ceilCount } from './format';
export const LITERS_PER_GALLON = 3.785411784;

/** Ratios here are strictly by volume. Weight ratios require product densities. */
export function epoxyVolume(areaFt2: number, depthIn: number, wastePct: number, resinParts: number, hardenerParts: number, kitGal: number) {
  const valid = [areaFt2, depthIn, wastePct, resinParts, hardenerParts, kitGal].every(Number.isFinite)
    && areaFt2 > 0 && depthIn > 0 && wastePct >= 0 && resinParts > 0 && hardenerParts > 0 && kitGal > 0;
  const netGal = valid ? areaFt2 * 144 * depthIn / 231 : 0;
  const totalGal = netGal * (1 + (valid ? wastePct : 0) / 100);
  const resinGal = valid ? totalGal * resinParts / (resinParts + hardenerParts) : 0;
  return { valid, netGal, totalGal, liters: totalGal * LITERS_PER_GALLON, resinGal,
    hardenerGal: totalGal - resinGal, kits: valid ? ceilCount(totalGal / kitGal) : 0 };
}
