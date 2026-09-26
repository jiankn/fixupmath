// 混凝土用量计算引擎：纯函数，浏览器和构建时共用，便于测试。
import { toFeet, cubicFeetToCubicYards, cubicFeetToCubicMeters, type LengthUnit } from './units';

export interface Length {
  value: number;
  unit: LengthUnit;
}

export type ShapeId = 'slab' | 'footing' | 'column' | 'tube' | 'stairs' | 'circle';

export interface ShapeInput {
  shape: ShapeId;
  dims: Record<string, Length>;
  quantity: number;
}

// 每种形状需要哪些尺寸，以及默认值（默认值也用于服务端渲染首屏结果）
export interface DimSpec {
  key: string;
  label: string;
  hint?: string;
  default: Length;
}

export interface ShapeSpec {
  id: ShapeId;
  label: string;
  description: string;
  dims: DimSpec[];
}

export const SHAPES: ShapeSpec[] = [
  {
    id: 'slab',
    label: 'Slab',
    description: 'Patios, driveways, sidewalks, shed and garage floors.',
    dims: [
      { key: 'length', label: 'Length', default: { value: 10, unit: 'ft' } },
      { key: 'width', label: 'Width', default: { value: 10, unit: 'ft' } },
      { key: 'thickness', label: 'Thickness', hint: '4 in for patios and walks', default: { value: 4, unit: 'in' } },
    ],
  },
  {
    id: 'footing',
    label: 'Footing / Wall',
    description: 'Continuous footings, grade beams, and poured walls.',
    dims: [
      { key: 'length', label: 'Length', default: { value: 20, unit: 'ft' } },
      { key: 'width', label: 'Width', default: { value: 16, unit: 'in' } },
      { key: 'depth', label: 'Depth', default: { value: 8, unit: 'in' } },
    ],
  },
  {
    id: 'column',
    label: 'Column / Post hole',
    description: 'Round columns, sonotubes, and fence or deck post holes.',
    dims: [
      { key: 'diameter', label: 'Diameter', default: { value: 12, unit: 'in' } },
      { key: 'height', label: 'Height / Depth', default: { value: 4, unit: 'ft' } },
    ],
  },
  {
    id: 'circle',
    label: 'Circular slab',
    description: 'Round pads for hot tubs, fire pits, and grain bins.',
    dims: [
      { key: 'diameter', label: 'Diameter', default: { value: 10, unit: 'ft' } },
      { key: 'thickness', label: 'Thickness', default: { value: 4, unit: 'in' } },
    ],
  },
  {
    id: 'tube',
    label: 'Tube / Ring',
    description: 'Hollow cylinders, pipe surrounds, and ring footings.',
    dims: [
      { key: 'outerDiameter', label: 'Outer diameter', default: { value: 24, unit: 'in' } },
      { key: 'innerDiameter', label: 'Inner diameter', default: { value: 16, unit: 'in' } },
      { key: 'height', label: 'Height', default: { value: 4, unit: 'ft' } },
    ],
  },
  {
    id: 'stairs',
    label: 'Stairs',
    description: 'Solid poured steps with an optional top landing.',
    dims: [
      { key: 'width', label: 'Stair width', default: { value: 4, unit: 'ft' } },
      { key: 'rise', label: 'Rise (step height)', default: { value: 7, unit: 'in' } },
      { key: 'run', label: 'Run (tread depth)', default: { value: 11, unit: 'in' } },
      { key: 'landing', label: 'Top landing depth', hint: '0 if none', default: { value: 0, unit: 'in' } },
    ],
  },
];

export const STAIR_STEPS_DEFAULT = 3;

export function getShape(id: ShapeId): ShapeSpec {
  const s = SHAPES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown shape: ${id}`);
  return s;
}

function ft(dims: Record<string, Length>, key: string): number {
  const d = dims[key];
  if (!d || !Number.isFinite(d.value) || d.value < 0) return 0;
  return toFeet(d.value, d.unit);
}

/**
 * 单个构件的体积（立方英尺），未乘数量、未加损耗。
 * stairs 需要额外的台阶数 steps。
 */
export function shapeVolumeFt3(shape: ShapeId, dims: Record<string, Length>, steps = STAIR_STEPS_DEFAULT): number {
  switch (shape) {
    case 'slab':
      return ft(dims, 'length') * ft(dims, 'width') * ft(dims, 'thickness');
    case 'footing':
      return ft(dims, 'length') * ft(dims, 'width') * ft(dims, 'depth');
    case 'column': {
      const r = ft(dims, 'diameter') / 2;
      return Math.PI * r * r * ft(dims, 'height');
    }
    case 'circle': {
      const r = ft(dims, 'diameter') / 2;
      return Math.PI * r * r * ft(dims, 'thickness');
    }
    case 'tube': {
      const R = ft(dims, 'outerDiameter') / 2;
      const r = Math.min(ft(dims, 'innerDiameter') / 2, R);
      return Math.PI * (R * R - r * r) * ft(dims, 'height');
    }
    case 'stairs': {
      // 实心台阶：第 i 级是一个 宽 × 踏面深 × (i × 踢面高) 的块，从 1 累加到 n；
      // 顶部平台深度 × 宽 × (n × 踢面高)
      const w = ft(dims, 'width');
      const rise = ft(dims, 'rise');
      const run = ft(dims, 'run');
      const landing = ft(dims, 'landing');
      const n = Math.max(0, Math.floor(steps));
      const stepsVol = w * run * rise * ((n * (n + 1)) / 2);
      const landingVol = w * landing * rise * n;
      return stepsVol + landingVol;
    }
  }
}

// 常见美国预拌袋装混凝土：每袋出方量（立方英尺），按厂家袋上标注的产量
export const BAG_SIZES = [
  { lb: 40, yieldFt3: 0.3 },
  { lb: 60, yieldFt3: 0.45 },
  { lb: 80, yieldFt3: 0.6 },
] as const;

// 普通混凝土容重约 150 lb/ft³（4,050 lb/yd³）
export const CONCRETE_DENSITY_LB_FT3 = 150;

export interface ConcreteResult {
  netFt3: number; // 未加损耗
  totalFt3: number; // 含损耗
  cubicYards: number;
  cubicMeters: number;
  weightLb: number;
  bags: { lb: number; count: number }[];
}

export function concreteResult(netFt3: number, wastePct: number): ConcreteResult {
  const safeNet = Number.isFinite(netFt3) && netFt3 > 0 ? netFt3 : 0;
  const waste = Number.isFinite(wastePct) && wastePct > 0 ? wastePct : 0;
  const totalFt3 = safeNet * (1 + waste / 100);
  return {
    netFt3: safeNet,
    totalFt3,
    cubicYards: cubicFeetToCubicYards(totalFt3),
    cubicMeters: cubicFeetToCubicMeters(totalFt3),
    weightLb: totalFt3 * CONCRETE_DENSITY_LB_FT3,
    // 袋数向上取整：买少了要再跑一趟
    bags: BAG_SIZES.map((b) => ({ lb: b.lb, count: totalFt3 > 0 ? Math.ceil(totalFt3 / b.yieldFt3 - 1e-9) : 0 })),
  };
}

export interface CostInput {
  readyMixPerYd3?: number; // 预拌混凝土每立方码价格
  bagPrice?: Partial<Record<40 | 60 | 80, number>>; // 每袋价格
}

export function costEstimate(r: ConcreteResult, c: CostInput) {
  const readyMix = c.readyMixPerYd3 && c.readyMixPerYd3 > 0 ? r.cubicYards * c.readyMixPerYd3 : undefined;
  const bags = r.bags.map((b) => {
    const p = c.bagPrice?.[b.lb as 40 | 60 | 80];
    return { lb: b.lb, count: b.count, cost: p && p > 0 ? b.count * p : undefined };
  });
  return { readyMix, bags };
}

export { fmt } from './format';

/** 预拌混凝土下单量：向上取整到 ¼ 立方码（多数搅拌站按 ¼ 或 ½ 码接单） */
export function readyMixOrder(cubicYards: number): number {
  if (!(cubicYards > 0)) return 0;
  return Math.ceil(cubicYards * 4 - 1e-9) / 4;
}

export type Advice = 'empty' | 'bags' | 'bags-or-mixer' | 'ready-mix';

/** 用袋装还是叫搅拌车：按总立方码给建议 */
export function adviceFor(cubicYards: number): Advice {
  if (!(cubicYards > 0)) return 'empty';
  if (cubicYards < 0.5) return 'bags';
  if (cubicYards < 1.5) return 'bags-or-mixer';
  return 'ready-mix';
}
