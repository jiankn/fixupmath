// 常见平面形状的面积（平方英尺）。散装材料、面积、草皮等计算器共用。
import { toFeet, areaToFt2, type AreaValue } from './units';
import type { Length } from './concrete';

export type AreaShapeId = 'rectangle' | 'circle' | 'triangle' | 'area';

function ft(dims: Record<string, unknown>, key: string): number {
  const d = dims[key] as Length | undefined;
  if (!d || !Number.isFinite(d.value) || d.value < 0) return 0;
  return toFeet(d.value, d.unit);
}

export function shapeAreaFt2(shape: string, dims: Record<string, unknown>): number {
  switch (shape) {
    case 'rectangle':
      return ft(dims, 'length') * ft(dims, 'width');
    case 'circle': {
      const r = ft(dims, 'diameter') / 2;
      return Math.PI * r * r;
    }
    case 'triangle':
      return (ft(dims, 'base') * ft(dims, 'height')) / 2;
    case 'area': {
      const a = dims.area as AreaValue | undefined;
      return a && Number.isFinite(a.value) && a.value > 0 ? areaToFt2(a.value, a.unit) : 0;
    }
    default:
      return 0;
  }
}
