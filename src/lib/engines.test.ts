// 散装材料、面积、露台、围栏、泳池盐量：每个公式都用手算例子核对
import { describe, it, expect } from 'vitest';
import { shapeAreaFt2 } from './area';
import { bulkResult, coverageFt2PerYd3 } from './bulk';
import { deckMaterials } from './deck';
import { fenceMaterials } from './fence';
import { poolGallons, saltPounds, drainFraction } from './pool';
import { ceilTo, ceilCount } from './format';

const L = (value: number, unit: 'in' | 'ft' | 'yd' | 'cm' | 'm' = 'ft') => ({ value, unit });

describe('取整工具', () => {
  it('不因浮点误差多进一档', () => {
    expect(ceilTo(1, 0.5)).toBe(1);
    expect(ceilTo(1.01, 0.5)).toBe(1.5);
    expect(ceilCount(27 / 0.5)).toBe(54);
    expect(ceilCount(0)).toBe(0);
  });
});

describe('面积', () => {
  it('长方形、圆形、三角形、直接输入', () => {
    expect(shapeAreaFt2('rectangle', { length: L(10), width: L(12) })).toBe(120);
    expect(shapeAreaFt2('circle', { diameter: L(10) })).toBeCloseTo(78.5398, 4);
    expect(shapeAreaFt2('triangle', { base: L(10), height: L(6) })).toBe(30);
    expect(shapeAreaFt2('area', { area: { value: 1, unit: 'acre' } })).toBe(43560);
    expect(shapeAreaFt2('area', { area: { value: 10, unit: 'm2' } })).toBeCloseTo(107.639, 3);
  });
  it('混合单位：12 ft × 150 in = 150 ft²', () => {
    expect(shapeAreaFt2('rectangle', { length: L(12), width: L(150, 'in') })).toBeCloseTo(150, 10);
  });
});

describe('散装材料', () => {
  it('10×10 ft、3 in 厚的碎石（1.4 吨/码）', () => {
    const r = bulkResult(25, 0, 1.4, [0.5]);
    expect(r.cubicYards).toBeCloseTo(0.9259, 4);
    expect(r.tons).toBeCloseTo(1.2963, 4);
    expect(r.bags[0].count).toBe(50);
    expect(r.orderYards).toBe(1);
    expect(r.orderTons).toBe(1.5);
  });
  it('正好 1 立方码：2 ft³ 的袋要 14 袋（13.5 向上取整），下单量不多进一档', () => {
    const r = bulkResult(27, 0, 1.4, [2, 3]);
    expect(r.bags.map((b) => b.count)).toEqual([14, 9]);
    expect(r.orderYards).toBe(1);
  });
  it('损耗加在体积上', () => {
    expect(bulkResult(100, 10, 1, [1]).totalFt3).toBeCloseTo(110, 10);
  });
  it('每立方码覆盖面积：3 in = 108 ft²，2 in = 162 ft²', () => {
    expect(coverageFt2PerYd3(3)).toBeCloseTo(108, 10);
    expect(coverageFt2PerYd3(2)).toBeCloseTo(162, 10);
  });
});

describe('露台', () => {
  const base = { lengthFt: 16, widthFt: 12, boardWidthIn: 5.5, gapIn: 0.125, boardLengthFt: 16, joistSpacingIn: 16, wastePct: 10 };
  it('16×12 ft 露台，5.5 in 板、1/8 in 缝、16 ft 板、16 in 龙骨间距', () => {
    const r = deckMaterials(base);
    expect(r.areaFt2).toBe(192);
    expect(r.rows).toBe(26); // 144 / 5.625 = 25.6
    expect(r.boards).toBe(29); // 26 × 1.1 = 28.6
    expect(r.joists).toBe(13); // 192 / 16 + 1
    expect(r.joistLengthFt).toBe(12);
    expect(r.rimJoistLf).toBe(32);
    expect(r.screws).toBe(676); // 26 × 13 × 2
    expect(r.linearFt).toBe(416);
  });
  it('露台比板长时每排要接板', () => {
    expect(deckMaterials({ ...base, lengthFt: 20 }).boardsPerRow).toBe(2);
  });
  it('输入不完整时不报错，数量为 0', () => {
    expect(deckMaterials({ ...base, widthFt: 0 }).boards).toBe(0);
  });
});

describe('围栏', () => {
  const base = {
    lengthFt: 100, postSpacingFt: 8, heightFt: 6, railsPerSection: 3, picketWidthIn: 5.5, picketGapIn: 0,
    gates: 1, gateWidthFt: 4, holeDiameterIn: 10, holeDepthFt: 2, postSizeIn: 3.5, wastePct: 0,
  };
  it('100 ft 围栏带一扇 4 ft 门', () => {
    const r = fenceMaterials(base);
    expect(r.runFt).toBe(96);
    expect(r.sections).toBe(12);
    expect(r.posts).toBe(14); // 两段各 6 格 7 根
    expect(r.rails).toBe(36);
    expect(r.pickets).toBe(210); // 1152 / 5.5 = 209.5
    expect(r.postLengthFt).toBe(8);
    expect(r.stockPostFt).toBe(8);
  });
  it('立柱坑混凝土：10 in 直径、2 ft 深，扣掉 4×4 立柱', () => {
    const r = fenceMaterials(base);
    const perPost = Math.PI * (5 / 12) ** 2 * 2 - (3.5 / 12) ** 2 * 2;
    expect(r.concreteFt3PerPost).toBeCloseTo(perPost, 6); // ≈ 0.92 ft³
    expect(r.bags).toEqual([
      { lb: 80, count: 28 }, // 每坑 2 袋 × 14
      { lb: 60, count: 42 },
      { lb: 40, count: 56 },
    ]);
  });
  it('没有门：100 ft 按 8 ft 间距是 13 段 14 根柱', () => {
    const r = fenceMaterials({ ...base, gates: 0 });
    expect(r.sections).toBe(13);
    expect(r.posts).toBe(14);
  });
});

describe('泳池', () => {
  it('32×16 ft 长方形，浅端 3.5 ft、深端 6 ft', () => {
    expect(poolGallons('rectangle', { length: L(32), width: L(16), shallow: L(3.5), deep: L(6) })).toBeCloseTo(18192.6, 0);
  });
  it('直径 24 ft 圆形地上泳池，4 ft 深', () => {
    expect(poolGallons('round', { diameter: L(24), shallow: L(4), deep: L(4) })).toBeCloseTo(13536.2, 0);
  });
  it('30×15 ft 椭圆形，4 ft 深', () => {
    expect(poolGallons('oval', { length: L(30), width: L(15), shallow: L(4), deep: L(4) })).toBeCloseTo(10575.4, 0);
  });
  it('圆形泳池用单一水深：和浅端 = 深端结果一样', () => {
    expect(poolGallons('round', { diameter: L(24), depth: L(4) })).toBeCloseTo(13536.2, 0);
  });
  it('直接输入加仑数', () => {
    expect(poolGallons('volume', { gallons: 15000 })).toBe(15000);
  });
  it('1 万加仑从 0 加到 3,200 ppm 约 267 磅盐', () => {
    expect(saltPounds(10000, 0, 3200)).toBeCloseTo(267.05, 2);
    expect(saltPounds(10000, 2800, 3200)).toBeCloseTo(33.38, 2);
    expect(saltPounds(10000, 3500, 3200)).toBe(0);
  });
  it('盐度 4,000 降到 3,200 要换 20% 的水', () => {
    expect(drainFraction(4000, 3200)).toBeCloseTo(0.2, 10);
    expect(drainFraction(3000, 3200)).toBe(0);
  });
});
