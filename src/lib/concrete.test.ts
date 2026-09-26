// 每个公式都用手算的例子核对。计算器算错是这类站最致命的问题。
import { describe, it, expect } from 'vitest';
import { shapeVolumeFt3, concreteResult, costEstimate, readyMixOrder, adviceFor } from './concrete';
import { toFeet } from './units';

const L = (value: number, unit: 'in' | 'ft' | 'yd' | 'cm' | 'm') => ({ value, unit });

describe('单位换算', () => {
  it('英寸、码、厘米、米 → 英尺', () => {
    expect(toFeet(12, 'in')).toBeCloseTo(1, 10);
    expect(toFeet(1, 'yd')).toBeCloseTo(3, 10);
    expect(toFeet(30.48, 'cm')).toBeCloseTo(1, 10);
    expect(toFeet(1, 'm')).toBeCloseTo(3.28084, 5);
  });
});

describe('形状体积', () => {
  it('板：10 ft × 10 ft × 4 in = 33.33 ft³', () => {
    const v = shapeVolumeFt3('slab', { length: L(10, 'ft'), width: L(10, 'ft'), thickness: L(4, 'in') });
    expect(v).toBeCloseTo(33.3333, 4);
  });

  it('公制板：3 m × 3 m × 10 cm = 0.9 m³', () => {
    const v = shapeVolumeFt3('slab', { length: L(3, 'm'), width: L(3, 'm'), thickness: L(10, 'cm') });
    expect(concreteResult(v, 0).cubicMeters).toBeCloseTo(0.9, 6);
  });

  it('圆柱：直径 12 in、高 4 ft = π ft³', () => {
    const v = shapeVolumeFt3('column', { diameter: L(12, 'in'), height: L(4, 'ft') });
    expect(v).toBeCloseTo(Math.PI, 6);
  });

  it('圆管：外径 24 in、内径 16 in、高 4 ft', () => {
    const v = shapeVolumeFt3('tube', { outerDiameter: L(24, 'in'), innerDiameter: L(16, 'in'), height: L(4, 'ft') });
    expect(v).toBeCloseTo(Math.PI * (1 - (2 / 3) ** 2) * 4, 6);
  });

  it('圆管：内径大于外径时体积为 0，不出现负数', () => {
    const v = shapeVolumeFt3('tube', { outerDiameter: L(10, 'in'), innerDiameter: L(20, 'in'), height: L(4, 'ft') });
    expect(v).toBe(0);
  });

  it('台阶：宽 4 ft、踢面 7 in、踏面 11 in、3 级、无平台', () => {
    const dims = { width: L(4, 'ft'), rise: L(7, 'in'), run: L(11, 'in'), landing: L(0, 'in') };
    // 4 × (11/12) × (7/12) × (1+2+3)
    expect(shapeVolumeFt3('stairs', dims, 3)).toBeCloseTo(4 * (11 / 12) * (7 / 12) * 6, 6);
  });

  it('台阶：加 36 in 顶部平台', () => {
    const dims = { width: L(4, 'ft'), rise: L(7, 'in'), run: L(11, 'in'), landing: L(36, 'in') };
    const expected = 4 * (11 / 12) * (7 / 12) * 6 + 4 * 3 * (7 / 12) * 3;
    expect(shapeVolumeFt3('stairs', dims, 3)).toBeCloseTo(expected, 6);
  });

  it('负数或空值按 0 处理', () => {
    expect(shapeVolumeFt3('slab', { length: L(-5, 'ft'), width: L(10, 'ft'), thickness: L(4, 'in') })).toBe(0);
    expect(shapeVolumeFt3('slab', { length: L(NaN, 'ft'), width: L(10, 'ft'), thickness: L(4, 'in') })).toBe(0);
  });
});

describe('用量结果', () => {
  it('10×10 ft、4 in 板，加 10% 损耗', () => {
    const r = concreteResult(100 / 3, 10);
    expect(r.totalFt3).toBeCloseTo(36.6667, 4);
    expect(r.cubicYards).toBeCloseTo(1.358, 3);
    // 36.667 / 0.6 = 61.1 → 62；/0.45 = 81.5 → 82；/0.3 = 122.2 → 123
    expect(r.bags).toEqual([
      { lb: 40, count: 123 },
      { lb: 60, count: 82 },
      { lb: 80, count: 62 },
    ]);
  });

  it('正好 1 立方码：80 磅 45 袋、60 磅 60 袋、40 磅 90 袋（不因浮点误差多算一袋）', () => {
    const r = concreteResult(27, 0);
    expect(r.cubicYards).toBe(1);
    expect(r.bags.map((b) => b.count)).toEqual([90, 60, 45]);
    expect(r.weightLb).toBe(4050);
  });

  it('体积为 0 时袋数为 0', () => {
    expect(concreteResult(0, 10).bags.every((b) => b.count === 0)).toBe(true);
  });
});

describe('费用估算', () => {
  it('预拌混凝土按立方码计价，袋装按袋计价，未填价格则不估算', () => {
    const r = concreteResult(27, 0);
    const c = costEstimate(r, { readyMixPerYd3: 180, bagPrice: { 80: 6.5 } });
    expect(c.readyMix).toBe(180);
    expect(c.bags.find((b) => b.lb === 80)?.cost).toBeCloseTo(292.5, 6);
    expect(c.bags.find((b) => b.lb === 40)?.cost).toBeUndefined();
  });
});


describe('下单量与建议', () => {
  it('预拌量向上取整到 ¼ 码', () => {
    expect(readyMixOrder(1.358)).toBe(1.5);
    expect(readyMixOrder(1.25)).toBe(1.25);
    expect(readyMixOrder(0.01)).toBe(0.25);
    expect(readyMixOrder(0)).toBe(0);
  });
  it('按用量给出袋装 / 搅拌机 / 预拌建议', () => {
    expect(adviceFor(0)).toBe('empty');
    expect(adviceFor(0.3)).toBe('bags');
    expect(adviceFor(1)).toBe('bags-or-mixer');
    expect(adviceFor(3)).toBe('ready-mix');
  });
});
