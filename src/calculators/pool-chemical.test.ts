// 泳池化学品计算器端到端
import { describe, it, expect } from 'vitest';
import { defaultValues, type Values } from '../lib/calc-types';
import def from './pool-chemical';

const run = (patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (block: string, label: string, patch: Values = {}) =>
  run(patch).blocks.find((b) => b.title.startsWith(block))?.rows.find((r) => r.label.startsWith(label));

describe('泳池化学品计算器', () => {
  it('1.5 万加仑、游离氯 1 → 4 ppm、10% 液氯 → 57.6 液量盎司', () => {
    expect(run().value).toBe('57.6 fl oz'); // 12.8 × 1.5 × 3
  });
  it('CYA 40 时冲击水平 16 ppm，从 1 ppm 冲到 16 要 2.25 加仑液氯', () => {
    const r = row('Free chlorine targets', 'Shock');
    expect(r?.value).toBe('16 ppm');
    expect(r?.note).toContain('2.25 gal');
  });
  it('二氯异氰尿酸提高 3 ppm 游离氯，同时提高稳定剂 2.7 ppm', () => {
    expect(row('Side effects', 'Also raises CYA', { product: 'dichlor' })?.value).toBe('2.7 ppm');
  });
  it('已达标时不加', () => {
    const r = run({ fcNow: 5, fcTarget: 4 });
    expect(r.value).toBe('0');
    expect(r.advice).toContain('already');
  });
  it('碱度 60 → 90 ppm：小苏打 6.31 磅', () => {
    expect(run({ goal: 'ta' }).value).toBe('6.31 lb');
  });
  it('稳定剂 20 → 40 ppm：2.5 磅', () => {
    expect(run({ goal: 'cya' }).value).toBe('2.5 lb'); // 15000 × 8.3454e-6 × 20
  });
  it('钙硬度降低时提示只能换水', () => {
    expect(run({ goal: 'ch', chNow: 400, chTarget: 300 }).advice).toContain('replacing water');
  });
  it('没填水量时提示', () => {
    expect(run({ gallons: 0 }).advice).toContain('pool volume');
  });
});
