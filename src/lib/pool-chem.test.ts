// 泳池化学品剂量：对照业内公认的「每 1 万加仑」参考值
import { describe, it, expect } from 'vitest';
import { CHLORINE_PRODUCTS, chlorineDose, bakingSodaPounds, stabilizerPounds, calciumPounds, fcTargets, CALCIUM_PRODUCTS } from './pool-chem';

const P = (id: string) => CHLORINE_PRODUCTS.find((p) => p.id === id)!;

describe('氯：1 万加仑提高 1 ppm', () => {
  it('10% 液氯 ≈ 12.8 液量盎司', () => {
    expect(chlorineDose(P('liquid10'), 10000, 1).ounces).toBeCloseTo(12.8, 1);
  });
  it('12.5% 液氯 ≈ 10.2 液量盎司', () => {
    expect(chlorineDose(P('liquid125'), 10000, 1).ounces).toBeCloseTo(10.2, 1);
  });
  it('65% 次氯酸钙 ≈ 2.05 盎司（重量）', () => {
    const d = chlorineDose(P('calhypo65'), 10000, 1);
    expect(d.liquid).toBe(false);
    expect(d.ounces).toBeCloseTo(2.05, 2);
  });
  it('剂量与水量、ppm 成正比', () => {
    expect(chlorineDose(P('liquid10'), 20000, 5).ounces).toBeCloseTo(chlorineDose(P('liquid10'), 10000, 1).ounces * 10, 6);
  });
  it('漂白水按重量百分比：8.25% 比同标称的液氯浓 10%', () => {
    const b = chlorineDose(P('bleach825'), 10000, 1).ounces;
    expect(b).toBeCloseTo((0.083454 * 453.592) / (82.5 * 1.1) / 3.78541 * 128, 6);
  });
  it('提高 0 或负数时剂量为 0', () => {
    expect(chlorineDose(P('liquid10'), 10000, 0).ounces).toBe(0);
    expect(chlorineDose(P('liquid10'), 10000, -3).ounces).toBe(0);
  });
});

describe('碱度、稳定剂、钙硬度：1 万加仑提高 10 ppm', () => {
  it('小苏打 ≈ 1.4 磅（常见说法 1.4–1.5 磅）', () => {
    expect(bakingSodaPounds(10000, 10)).toBeCloseTo(1.402, 3);
  });
  it('稳定剂 ≈ 13.35 盎司', () => {
    expect(stabilizerPounds(10000, 10) * 16).toBeCloseTo(13.35, 2);
  });
  it('94–97% 氯化钙 ≈ 0.97 磅；77–80% 片状 ≈ 1.19 磅', () => {
    expect(calciumPounds(10000, 10, CALCIUM_PRODUCTS[0].purity)).toBeCloseTo(0.975, 3);
    expect(calciumPounds(10000, 10, CALCIUM_PRODUCTS[1].purity)).toBeCloseTo(1.188, 3);
  });
});

describe('游离氯目标（按稳定剂浓度）', () => {
  it('CYA 40 → 最低 3、目标 4.6、冲击 16 ppm', () => {
    const t = fcTargets(40);
    expect(t.minimum).toBeCloseTo(3, 6);
    expect(t.target).toBeCloseTo(4.6, 6);
    expect(t.shock).toBeCloseTo(16, 6);
  });
});
