// 散装材料（碎石、沙子、表土、覆盖物）：体积 → 立方码、吨、袋数、下单量
import { cubicFeetToCubicYards, cubicFeetToCubicMeters } from './units';
import { ceilTo, ceilCount } from './format';

export interface Material {
  id: string;
  label: string;
  /** 典型容重，吨/立方码（美吨，2,000 lb）。各地、各含水率差别大，页面上允许用户改 */
  tonsPerYd3: number;
}

export interface BulkResult {
  netFt3: number;
  totalFt3: number;
  cubicYards: number;
  cubicMeters: number;
  tons: number;
  pounds: number;
  bags: { ft3: number; count: number }[];
  /** 散装下单量：向上取整到 ½ 立方码 / ½ 吨 */
  orderYards: number;
  orderTons: number;
}

export function bulkResult(netFt3: number, wastePct: number, tonsPerYd3: number, bagSizesFt3: number[]): BulkResult {
  const net = Number.isFinite(netFt3) && netFt3 > 0 ? netFt3 : 0;
  const w = Number.isFinite(wastePct) && wastePct > 0 ? wastePct : 0;
  const density = Number.isFinite(tonsPerYd3) && tonsPerYd3 > 0 ? tonsPerYd3 : 0;
  const totalFt3 = net * (1 + w / 100);
  const cubicYards = cubicFeetToCubicYards(totalFt3);
  const tons = cubicYards * density;
  return {
    netFt3: net,
    totalFt3,
    cubicYards,
    cubicMeters: cubicFeetToCubicMeters(totalFt3),
    tons,
    pounds: tons * 2000,
    bags: bagSizesFt3.map((b) => ({ ft3: b, count: ceilCount(totalFt3 / b) })),
    orderYards: ceilTo(cubicYards, 0.5),
    orderTons: ceilTo(tons, 0.5),
  };
}

/** 一立方码在某个厚度下能铺多少平方英尺 */
export function coverageFt2PerYd3(depthIn: number): number {
  return depthIn > 0 ? 27 / (depthIn / 12) : 0;
}
