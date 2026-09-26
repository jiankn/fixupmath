// 端到端：每个计算器配置用默认输入跑一遍，核对显示出来的关键数字
import { describe, it, expect } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import gravel from './gravel';
import sand from './sand';
import topsoil from './topsoil';
import mulch from './mulch';
import squareFootage from './square-footage';
import sod from './sod';
import deck from './deck';
import fence from './fence';
import saltPool from './salt-pool';

const all: CalculatorDef[] = [gravel, sand, topsoil, mulch, squareFootage, sod, deck, fence, saltPool];
const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, block: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find((b) => b.title === block)?.rows.find((r) => r.label.startsWith(label))?.value;

describe('所有计算器默认值都能算出非零结果', () => {
  for (const def of all) {
    it(def.id, () => {
      const r = run(def);
      expect(r.value).not.toBe('0');
      expect(r.summary.length).toBeGreaterThan(0);
    });
  }
});

describe('关键数字', () => {
  it('碎石：10×10 ft、3 in、5% → 0.97 yd³、1.36 吨、53 袋', () => {
    // 25 ft³ × 1.05 = 26.25 ft³ = 0.972 yd³；× 1.4 = 1.361 吨；26.25 / 0.5 = 52.5 → 53 袋
    const r = run(gravel);
    expect(r.value).toBe('0.97');
    expect(row(gravel, 'Weight', 'Tons')).toBe('1.36');
    expect(row(gravel, 'Bags', '0.5 cu ft')).toBe('53');
  });
  it('碎石：选「自定义」时用用户填的密度', () => {
    expect(row(gravel, 'Weight', 'Tons', { material: 'custom', density: 2 })).toBe('1.94');
  });
  it('覆盖物：20×4 ft、3 in、10% → 0.81 yd³、11 袋 2 cu ft', () => {
    // 80 × 0.25 = 20 ft³ × 1.1 = 22 ft³ = 0.815 yd³；22 / 2 = 11
    const r = run(mulch);
    expect(r.value).toBe('0.81');
    expect(row(mulch, 'Bags', '2 cu ft')).toBe('11');
  });
  it('面积：15 × 12 ft = 180 ft² = 20 yd²', () => {
    const r = run(squareFootage);
    expect(r.value).toBe('180');
    expect(row(squareFootage, 'Other units', 'Square yards')).toBe('20');
  });
  it('面积：英尺 + 英寸（12 ft 6 in × 10 ft）= 125 ft²', () => {
    expect(run(squareFootage, { length: { value: 12.5, unit: 'ft' }, width: { value: 10, unit: 'ft' } }).value).toBe('125');
  });
  it('草皮：600 ft² + 5% = 630 ft²、2 托盘、237 块', () => {
    // 630 / 450 = 1.4 → 2；630 / 2.667 = 236.2 → 237
    const r = run(sod);
    expect(r.value).toBe('630');
    expect(row(sod, 'Pallets', 'Full pallets')).toBe('2');
    expect(row(sod, 'Pieces', '16 × 24 in slab')).toBe('237');
  });
  it('露台默认 16×12：29 块板、13 根龙骨', () => {
    expect(run(deck).value).toBe('29');
    expect(row(deck, 'Framing', 'Joists')).toBe('13 × 12 ft');
  });
  it('围栏默认：14 根柱、28 袋 80 磅混凝土', () => {
    expect(run(fence).value).toBe('14');
    expect(row(fence, 'Concrete for post holes', '80-lb')).toBe('28');
  });
  it('泳池：直接输入 1 万加仑，0 → 3,200 ppm = 267 磅、7 袋', () => {
    const r = run(saltPool, { shape: 'volume', gallons: 10000 });
    expect(r.value).toBe('267');
    expect(row(saltPool, 'Bags', '40-lb', { shape: 'volume', gallons: 10000 })).toBe('7');
  });
  it('泳池：盐度过高时建议换水', () => {
    const r = run(saltPool, { current: 4000, target: 3200 });
    expect(r.value).toBe('0');
    expect(r.advice).toContain('20%');
  });
  it('价格：填了才出现费用行', () => {
    expect(run(gravel).blocks.find((b) => b.title === 'Estimated cost')!.rows).toHaveLength(0);
    expect(row(gravel, 'Estimated cost', 'Bulk', { priceYard: 50 })).toBe('$50.00');
  });
});

import cubicYard from './cubic-yard';
describe('立方码计算器', () => {
  it('10×10 ft、4 in、5% → 1.3 yd³；泥土 1.43 吨；换成混凝土 2.63 吨', () => {
    // 100 × 1/3 = 33.33 ft³ × 1.05 = 35 ft³ = 1.296 yd³
    expect(run(cubicYard).value).toBe('1.3');
    expect(row(cubicYard, 'Weight', 'Tons')).toBe('1.43');
    expect(row(cubicYard, 'Weight', 'Tons', { material: 'concrete' })).toBe('2.63');
  });
});

import landscapeRock from './landscape-rock';
describe('景观石计算器', () => {
  it('20×5 ft、3 in、5% → 0.97 yd³；河石 1.31 吨；火山石只有 0.49 吨', () => {
    // 100 × 0.25 = 25 ft³ × 1.05 = 26.25 ft³ = 0.972 yd³
    expect(run(landscapeRock).value).toBe('0.97');
    expect(row(landscapeRock, 'Weight', 'Tons')).toBe('1.31');
    expect(row(landscapeRock, 'Weight', 'Tons', { material: 'lava' })).toBe('0.49');
  });
});
