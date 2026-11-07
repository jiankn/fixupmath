// 混凝土板 / 袋数两个细分计算器：手算核对公式、出处数据、换算和边界
import { describe, expect, it } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import { CALCULATORS } from '../data/calculators';
import { EMBEDS } from '../data/embeds';
import slab from './concrete-slab';
import bag, { bagVolumeFt3 } from './concrete-bag';
import { BAG_YIELDS, bagsFor, bagsPerYard, palletSplit, slabVolume, sqftPerYard } from '../lib/concrete-bags';

const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, title: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find((b) => b.title === title)?.rows.find((r) => r.label === label)?.value;
const ft = (value: number) => ({ value, unit: 'ft' as const });
const inch = (value: number) => ({ value, unit: 'in' as const });

describe('出处数据（QUIKRETE 1101 数据表 2022-10、产品页托盘数）', () => {
  it('每袋出方量和托盘袋数', () => {
    expect(BAG_YIELDS.map((b) => [b.lb, b.ft3])).toEqual([[40, 0.3], [50, 0.375], [60, 0.45], [80, 0.6]]);
    expect(BAG_YIELDS.map((b) => b.perPallet)).toEqual([80, undefined, 56, 42]);
  });
  it('每立方码袋数：27 ÷ 出方量 = 90 / 72 / 60 / 45', () => {
    expect(BAG_YIELDS.map((b) => bagsPerYard(b.ft3).bags)).toEqual([90, 72, 60, 45]);
    expect(bagsPerYard(0.6).yardsPerBag).toBeCloseTo(1 / 45, 10);
  });
  it('整托盘 + 散袋', () => {
    expect(palletSplit(45, 42)).toEqual({ pallets: 1, loose: 3 });
    expect(palletSplit(84, 42)).toEqual({ pallets: 2, loose: 0 });
    expect(palletSplit(10, undefined)).toEqual({ pallets: 0, loose: 10 });
  });
  it('刚好整除不多进一袋，无效输入返回 0', () => {
    expect(bagsFor(27, 0.6)).toBe(45);
    expect(bagsFor(27.0001, 0.6)).toBe(46);
    expect(bagsFor(-1, 0.6)).toBe(0);
    expect(bagsFor(10, 0)).toBe(0);
    expect(bagsFor(NaN, 0.6)).toBe(0);
  });
});

describe('混凝土板体积', () => {
  it('10 × 10 ft × 4 in = 33.33 ft³', () => {
    expect(slabVolume({ lengthFt: 10, widthFt: 10, thicknessFt: 1 / 3 }).netFt3).toBeCloseTo(100 / 3, 10);
  });
  it('加厚边：12 × 16 ft、4 in 板，边宽 12 in、总深 12 in → 64 + 52 × 8/12 = 98.67 ft³', () => {
    const s = slabVolume({ lengthFt: 16, widthFt: 12, thicknessFt: 1 / 3, edgeDepthFt: 1, edgeWidthFt: 1 });
    expect(s.slabFt3).toBeCloseTo(64, 10);
    expect(s.bandAreaFt2).toBeCloseTo(52, 10);
    expect(s.edgeFt3).toBeCloseTo(104 / 3, 10);
    expect(s.netFt3).toBeCloseTo(64 + 104 / 3, 10);
  });
  it('边缘不比板厚深时不加量；边宽超过一半时整块都按加厚算', () => {
    expect(slabVolume({ lengthFt: 10, widthFt: 10, thicknessFt: 0.5, edgeDepthFt: 0.4, edgeWidthFt: 1 }).edgeFt3).toBe(0);
    expect(slabVolume({ lengthFt: 4, widthFt: 4, thicknessFt: 0.5, edgeDepthFt: 1, edgeWidthFt: 3 }).netFt3).toBeCloseTo(16, 10);
  });
  it('每码铺多少平方英尺：4 in 81、6 in 54', () => {
    expect(sqftPerYard(4)).toBeCloseTo(81, 10);
    expect(sqftPerYard(6)).toBeCloseTo(54, 10);
  });
});

describe('混凝土板计算器', () => {
  it('默认 10 × 10 × 4 in + 10%：1.36 yd³、62 袋 80 lb、82 袋 60 lb、订 1.5 码', () => {
    // 36.67 ft³ / 27 = 1.358；/0.6 = 61.1 → 62；/0.45 = 81.5 → 82；/0.3 = 122.2 → 123
    const r = run(slab);
    expect(r.value).toBe('1.36');
    expect(row(slab, 'Premixed bags', '80-lb bags')).toBe('62');
    expect(row(slab, 'Premixed bags', '60-lb bags')).toBe('82');
    expect(row(slab, 'Premixed bags', '40-lb bags')).toBe('123');
    expect(row(slab, 'Ready-mix order', 'Order')).toBe('1.5 yd³');
  });
  it('加厚边只在选「Yes」时生效', () => {
    const shed = { length: ft(16), width: ft(12), thickness: inch(4), edgeDepth: inch(12), edgeWidth: inch(12), waste: '0' };
    expect(run(slab, shed).value).toBe('2.37'); // 64 / 27
    expect(run(slab, { ...shed, edge: 'yes' }).value).toBe('3.65'); // 98.67 / 27
    expect(row(slab, 'Volume', 'Thickened edge adds', { ...shed, edge: 'yes' })).toBe('34.67 ft³');
  });
  it('公制：3 m × 3 m × 10 cm = 0.9 m³', () => {
    expect(row(slab, 'Volume', 'Cubic meters', { length: { value: 3, unit: 'm' }, width: { value: 3, unit: 'm' }, thickness: { value: 10, unit: 'cm' }, waste: '0' })).toBe('0.9');
  });
  it('项目合计按净体积求和后加一次损耗', () => {
    expect(slab.compute(defaultValues(slab), 54).value).toBe('2.2'); // 54 × 1.1 / 27
  });
  it('价格：填了才出费用行', () => {
    expect(row(slab, 'Estimated cost', '62 bags at 80 lb', { priceBag: 6 })).toBe('$372');
    expect(run(slab).blocks.find((b) => b.title === 'Estimated cost')!.rows).toHaveLength(0);
  });
});

describe('混凝土袋数计算器', () => {
  it('默认 1 yd³ + 5%：28.35 ft³ → 48 袋 80 lb、1 托盘 + 6 袋', () => {
    // 28.35 / 0.6 = 47.25 → 48
    const r = run(bag);
    expect(r.value).toBe('48');
    expect(row(bag, 'Pallets', 'Full pallets')).toBe('1');
    expect(row(bag, 'Pallets', 'Plus loose bags')).toBe('6');
    expect(row(bag, 'Weight to haul', 'Dry bag weight')).toBe('3,840 lb');
  });
  it('其他袋型：1 yd³ 无损耗 = 90 / 72 / 60 / 45', () => {
    const p = { waste: '0' };
    expect(row(bag, 'All bag sizes', '40-lb bags', p)).toBe('90');
    expect(row(bag, 'All bag sizes', '50-lb bags', p)).toBe('72');
    expect(row(bag, 'All bag sizes', '60-lb bags', p)).toBe('60');
    expect(row(bag, 'All bag sizes', '80-lb bags', p)).toBe('45');
  });
  it('50 lb 没有公开托盘数，不显示托盘行', () => {
    expect(run(bag, { bag: '50', waste: '0' }).value).toBe('72');
    expect(run(bag, { bag: '50' }).blocks.find((b) => b.title === 'Pallets')!.rows).toHaveLength(0);
  });
  it('体积单位：10 ft³ → 17 袋 80 lb；1 m³ → 59 袋', () => {
    expect(run(bag, { volume: 10, volumeUnit: 'ft3', waste: '0' }).value).toBe('17'); // 16.67 → 17
    expect(run(bag, { volume: 1, volumeUnit: 'm3', waste: '0' }).value).toBe('59'); // 35.31 / 0.6 = 58.9
  });
  it('板：4 × 4 ft × 4 in + 5% = 5.6 ft³ → 10 袋', () => {
    expect(run(bag, { shape: 'slab', length: ft(4), width: ft(4), thickness: inch(4) }).value).toBe('10');
  });
  it('柱坑：10 in × 3 ft × 4 个 = 6.54 ft³ → 11 袋 80 lb', () => {
    const v = { shape: 'holes', diameter: inch(10), depth: ft(3), holes: 4, waste: '0' };
    expect(bagVolumeFt3({ ...defaultValues(bag), ...v })).toBeCloseTo(Math.PI * (5 / 12) ** 2 * 3 * 4, 10);
    expect(run(bag, v).value).toBe('11');
  });
  it('自定义袋：用户填的出方量和重量；出方量为 0 时提示检查', () => {
    expect(run(bag, { bag: 'custom', yield: 0.5, bagLb: 70, waste: '0' }).value).toBe('54');
    expect(run(bag, { bag: 'custom', yield: 0, waste: '0' }).value).toBe('Check inputs');
  });
});

describe('登记', () => {
  it('两个新页面已上线、在混凝土分类、可嵌入，并与混凝土页互链', () => {
    for (const slug of ['concrete-slab-calculator', 'concrete-bag-calculator']) {
      const e = CALCULATORS.filter((c) => c.slug === slug);
      expect(e).toHaveLength(1);
      expect(e[0].status).toBe('live');
      expect(e[0].category).toBe('concrete-masonry');
      expect(e[0].related).toContain('concrete-calculator');
      expect(EMBEDS.some((x) => x.slug === slug)).toBe(true);
    }
    const main = CALCULATORS.find((c) => c.slug === 'concrete-calculator')!;
    expect(main.related).toEqual(expect.arrayContaining(['concrete-slab-calculator', 'concrete-bag-calculator']));
    expect(main.keywords).not.toContain('slab');
  });
});
