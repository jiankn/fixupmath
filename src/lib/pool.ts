// 泳池容积与盐量
import { toFeet } from './units';
import type { Length } from './concrete';

export const GALLONS_PER_FT3 = 7.48052;
export const LB_PER_GALLON_WATER = 8.3454;
export const LITERS_PER_GALLON = 3.78541;

export type PoolShape = 'rectangle' | 'round' | 'oval' | 'volume';

function ft(dims: Record<string, unknown>, key: string): number {
  const d = dims[key] as Length | undefined;
  if (!d || !Number.isFinite(d.value) || d.value < 0) return 0;
  return toFeet(d.value, d.unit);
}

/** 泳池水量（加仑）。有单一水深 depth 就用它，否则取浅端和深端的平均值；volume 形状直接用输入的加仑数 */
export function poolGallons(shape: string, dims: Record<string, unknown>): number {
  const avgDepth = dims.depth ? ft(dims, 'depth') : (ft(dims, 'shallow') + ft(dims, 'deep')) / 2;
  switch (shape) {
    case 'rectangle':
      return ft(dims, 'length') * ft(dims, 'width') * avgDepth * GALLONS_PER_FT3;
    case 'round': {
      const r = ft(dims, 'diameter') / 2;
      return Math.PI * r * r * avgDepth * GALLONS_PER_FT3;
    }
    case 'oval':
      return Math.PI * (ft(dims, 'length') / 2) * (ft(dims, 'width') / 2) * avgDepth * GALLONS_PER_FT3;
    case 'volume': {
      const g = Number(dims.gallons);
      return Number.isFinite(g) && g > 0 ? g : 0;
    }
    default:
      return 0;
  }
}

/** 把盐度从 current 提到 target（ppm）需要的盐（磅） */
export function saltPounds(gallons: number, currentPpm: number, targetPpm: number): number {
  const delta = (Number.isFinite(targetPpm) ? targetPpm : 0) - (Number.isFinite(currentPpm) ? currentPpm : 0);
  if (!(gallons > 0) || delta <= 0) return 0;
  return (gallons * LB_PER_GALLON_WATER * delta) / 1_000_000;
}

/** 盐度过高时，需要换掉多少比例的水（按换入零盐淡水计算） */
export function drainFraction(currentPpm: number, targetPpm: number): number {
  if (!(currentPpm > 0) || !(targetPpm >= 0) || currentPpm <= targetPpm) return 0;
  return 1 - targetPpm / currentPpm;
}
