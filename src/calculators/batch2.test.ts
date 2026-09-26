// 第二批：每个计算器用默认输入跑一遍，核对显示的关键数字（预期值先手算）
import { describe, it, expect } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import flooring from './flooring';
import carpet from './carpet';
import tile from './tile';
import paver from './paver';
import grassSeed from './grass-seed';
import drywall from './drywall';
import wallpaper from './wallpaper';
import siding from './siding';
import shingle from './shingle';
import brick from './brick';

const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, block: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find((b) => b.title === block)?.rows.find((r) => r.label.startsWith(label))?.value;

describe('第二批关键数字', () => {
  it('地板：15×12 = 180 ft² + 10% = 198 ft²，每箱 20 → 10 箱', () => {
    expect(run(flooring).value).toBe('10');
  });
  it('地毯：14×12 = 168 ft² + 10% = 184.8 ft² = 20.5 yd²', () => {
    expect(run(carpet).value).toBe('20.5');
  });
  it('瓷砖：10×8 = 80 ft² + 10% = 88 ft²，12 in 砖 1/8 缝 → 87 块', () => {
    expect(run(tile).value).toBe('87'); // 88 / 1.0209 = 86.2
  });
  it('铺路砖：144 ft² + 10%，4×8 in → 713 块；4 in 碎石垫层 2.74 吨', () => {
    expect(run(paver).value).toBe('713'); // 158.4 × 4.5 = 712.8
    expect(row(paver, 'Gravel base', 'Tons')).toBe('2.74'); // 48 ft³ × 1.1 / 27 × 1.4
  });
  it('草籽：2,000 ft² 高羊茅 7 lb/千 ft² → 14 磅；补播 7 磅；自定义 3 → 6 磅', () => {
    expect(run(grassSeed).value).toBe('14');
    expect(run(grassSeed, { mode: 'over' }).value).toBe('7');
    expect(run(grassSeed, { rate: 3 }).value).toBe('6');
  });
  it('石膏板：12×12×8 房间，墙 348 + 天花板 144 = 492 ft² + 10% → 17 张 4×8', () => {
    expect(run(drywall).value).toBe('17'); // 541.2 / 32 = 16.9
    expect(run(drywall, { ceiling: 'no' }).value).toBe('12'); // 382.8 / 32 = 11.96
  });
  it('壁纸：12×12×8 房间、标准双卷、一扇门 → 10 卷', () => {
    expect(run(wallpaper).value).toBe('10');
  });
  it('外墙挂板：1,068 ft² 墙 + 240 ft² 山墙 = 1,308 ft² + 10% → 14.4 平方、8 箱', () => {
    expect(run(siding).value).toBe('14.4');
    expect(row(siding, 'Vinyl siding boxes', 'Boxes')).toBe('8');
  });
  it('屋面瓦：50×30 占地、6/12 坡 → 1,677 ft² + 10% = 18.45 平方 → 56 捆', () => {
    expect(run(shingle).value).toBe('56');
  });
  it('屋面瓦：直接输入屋面面积、平坡 → 1,700 × 1.1 = 18.7 平方 → 57 捆', () => {
    expect(run(shingle, { shape: 'area', area: { value: 1700, unit: 'ft2' }, pitch: 0 }).value).toBe('57'); // 56.1 → 57
  });
  it('砖：20×6 ft 墙、模数砖 → 120 × 6.857 × 1.05 = 864 块、22 袋砂浆', () => {
    expect(run(brick).value).toBe('864');
    expect(row(brick, 'Mortar', '80-lb')).toBe('22');
  });
});
