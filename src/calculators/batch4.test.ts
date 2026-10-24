// 第四批：沥青、填方土、砌块、屋面坡度、屋面。每个计算器用默认输入跑一遍，核对显示的关键数字
import { describe, it, expect } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import asphalt from './asphalt';
import dirt from './dirt';
import cinderBlock from './cinder-block';
import roofPitch from './roof-pitch';
import roofing from './roofing';

const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, block: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find((b) => b.title === block)?.rows.find((r) => r.label.startsWith(label))?.value;

describe('第四批默认值都能算出非零结果', () => {
  for (const def of [asphalt, dirt, cinderBlock, roofPitch, roofing]) {
    it(def.id, () => {
      const r = run(def);
      expect(r.value).not.toMatch(/^0(\/12)?$/);
      expect(r.summary.length).toBeGreaterThan(0);
    });
  }
});

describe('第四批关键数字', () => {
  it('沥青：40 × 12 ft、3 in、5% → 约 9.13 吨、下单 9.5 吨，不显示基层', () => {
    const r = run(asphalt);
    expect(r.value).toMatch(/^9\.1[34]$/); // 9.135 吨，浮点舍入可能显示 9.13
    expect(row(asphalt, 'Asphalt', 'Order')).toBe('9.5 tons');
    expect(r.blocks.some((b) => b.title === 'Gravel base')).toBe(false);
  });
  it('沥青：加 6 in 碎石基层 → 480 × 0.5 × 1.1 = 264 ft³ = 9.78 yd³ × 1.5 = 14.67 吨', () => {
    expect(row(asphalt, 'Gravel base', 'Crusher run', { baseDepth: { value: 6, unit: 'in' } })).toBe('14.67 tons');
  });
  it('沥青：价格按下单吨数算', () => {
    expect(row(asphalt, 'Estimated cost', 'Asphalt', { priceTon: 100 })).toBe('$950');
  });
  it('填方土：20 × 10 ft、12 in、压实 20% → 8.89 yd³、10.67 吨、1 车', () => {
    const r = run(dirt);
    expect(r.value).toBe('8.89');
    expect(row(dirt, 'Weight', 'Tons')).toBe('10.67');
    expect(row(dirt, 'Delivery', 'Truckloads')).toBe('1');
    expect(row(dirt, 'Delivery', 'Truckloads', { truck: '1' })).toBe('9');
  });
  it('砌块：20 × 6 ft、5% → 142 块、每皮 15 块 9 皮、11 袋砂浆', () => {
    const r = run(cinderBlock);
    expect(r.value).toBe('142');
    expect(row(cinderBlock, 'Layout', 'Blocks per course')).toBe('15');
    expect(row(cinderBlock, 'Layout', 'Courses')).toBe('9');
    expect(row(cinderBlock, 'Mortar', '80-lb bags')).toBe('11');
  });
  it('砌块：全灌芯 → 1.21 yd³、55 袋 80 lb 混凝土', () => {
    expect(row(cinderBlock, 'Core fill', 'Grout', { fill: 'full' })).toBe('1.21 yd³');
    expect(row(cinderBlock, 'Core fill', '80-lb bags', { fill: 'full' })).toBe('55');
  });
  it('砌块：按面积输入时没有皮数', () => {
    expect(run(cinderBlock, { shape: 'area', area: { value: 120, unit: 'ft2' } }).blocks.some((b) => b.title === 'Layout')).toBe(false);
  });
  it('坡度：6 in / 12 in → 6/12、26.6°、并生成示意图', () => {
    const r = run(roofPitch);
    expect(r.value).toBe('6/12');
    expect(r.sub).toContain('26.6°');
    expect(r.figure).toContain('<svg');
    expect(r.advice).toContain('conventional');
  });
  it('坡度：跨度 24 ft、屋脊高 6 ft → 6/12', () => {
    expect(run(roofPitch, { shape: 'span', span: { value: 24, unit: 'ft' }, height: { value: 6, unit: 'ft' } }).value).toBe('6/12');
  });
  it('坡度：30° → 6.93/12，最接近 7/12', () => {
    const p = { shape: 'angle', angle: 30 };
    expect(run(roofPitch, p).value).toBe('6.93/12');
    expect(row(roofPitch, 'Pitch', 'Nearest whole pitch', p)).toBe('7/12');
  });
  it('坡度：3/12 提示双层底衬，0 不出错', () => {
    expect(run(roofPitch, { rise: { value: 3, unit: 'in' } }).advice).toContain('two layers');
    expect(run(roofPitch, { rise: { value: 0, unit: 'in' } }).value).toBe('0/12');
  });
  it('屋面：50 × 30 ft、6/12、双坡 → 18.4 平方、56 捆、17 根滴水边', () => {
    const r = run(roofing);
    expect(r.value).toBe('18.4');
    expect(row(roofing, 'Materials', 'Shingles')).toBe('56 bundles');
    expect(row(roofing, 'Materials', 'Drip edge')).toBe('17 pieces');
    expect(row(roofing, 'Materials', 'Ridge cap')).toBe('2 bundles');
  });
  it('屋面：四坡屋脊瓦 5 捆；按面积输入时不出线性构件', () => {
    expect(row(roofing, 'Materials', 'Ridge cap', { type: 'hip' })).toBe('5 bundles');
    const a = { shape: 'area', pitch: '0', area: { value: 1700, unit: 'ft2' } };
    expect(row(roofing, 'Materials', 'Drip edge', a)).toBeUndefined();
    expect(run(roofing, a).value).toBe('18.7'); // 1,700 × 1.1 / 100
  });
});
