// 第三批：每个计算器用默认输入跑一遍，核对显示的关键数字
import { describe, it, expect } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import stair from './stair';
import rafter from './rafter';
import boardFoot from './board-foot';
import rebar from './rebar';
import wireSize from './wire-size';
import voltageDrop from './voltage-drop';
import conduitFill from './conduit-fill';
import btu from './btu';
import insulation from './insulation';
import pool from './pool';

const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, block: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find((b) => b.title === block)?.rows.find((r) => r.label.startsWith(label))?.value;

describe('第三批关键数字', () => {
  it('楼梯：108 in → 14 级 × 7¾ in，13 块踏板', () => {
    const r = run(stair);
    expect(r.value).toBe('14');
    expect(r.unit).toBe('× 7 ¾ in');
    expect(row(stair, 'Layout', 'Number of treads')).toBe('13');
  });
  it('楼梯：踏面 9 in 时提示超出 IRC', () => {
    expect(run(stair, { tread: { value: 9, unit: 'in' } }).advice).toContain('shallower than 10 in');
  });
  it('楼梯：36 in 宽、16 in 间距 → 每跑 4 根斜梁，买 4 根 16 ft 2×12，并生成示意图', () => {
    const r = run(stair);
    expect(row(stair, 'Stringers', 'Stringers per flight')).toBe('4');
    expect(row(stair, 'Stringers', 'Buy')).toBe('4 × 2×12 at 16 ft'); // 169 + 6 in
    expect(r.figure).toContain('<svg');
  });
  it('楼梯加中间平台：14 级分成 7 + 7，踏板 6 + 6，水平 12 × 10 + 36 = 156 in', () => {
    const p = { landing: 'mid', landingDepth: { value: 36, unit: 'in' } };
    expect(row(stair, 'Layout', 'Number of treads', p)).toBe('12');
    expect(row(stair, 'Layout', 'Total run', p)).toBe('13 ft');
    expect(row(stair, 'Layout', 'Landing height', p)).toBe('4 ft 6 in'); // 7 × 7.714 = 54 in
    expect(row(stair, 'Stringers', 'Buy', p)).toBe('8 × 2×12 at 8 ft');
  });
  it('楼梯：单跑超过 151 in 提示加平台', () => {
    expect(run(stair, { rise: { value: 160, unit: 'in' } }).advice).toContain('Add a landing');
  });
  it('椽子：24 ft 跨、6/12 → 14 ft 5⅝ in，40 ft 长 16 in 间距共 62 根', () => {
    expect(run(rafter).value).toBe('14 ft 5 ⅝ in');
    expect(row(rafter, 'Count', 'Rafters')).toBe('62');
  });
  it('板英尺：2×6×8 = 8 BF', () => {
    expect(run(boardFoot).value).toBe('8');
  });
  it('钢筋：20×20 ft 板 → 40 根 + 5% = 42 根 20 ft #4', () => {
    expect(run(rebar).value).toBe('42');
  });
  it('线径：20 A、100 ft、120 V、3% → 8 AWG 铜', () => {
    const r = run(wireSize);
    expect(r.value).toBe('8');
    expect(r.unit).toBe('AWG copper');
  });
  it('线径：短距离时由载流量决定 → 12 AWG', () => {
    expect(run(wireSize, { distance: { value: 20, unit: 'ft' } }).value).toBe('12');
  });
  it('电压降：12 AWG、20 A、100 ft、120 V → 6.43%', () => {
    expect(run(voltageDrop).value).toBe('6.43');
  });
  it('线管：¾ in EMT 穿 4 根 12 AWG → 10% 填充，最多 16 根，½ in 就够', () => {
    const r = run(conduitFill);
    expect(r.value).toBe('10');
    expect(row(conduitFill, 'Sizing', 'Max')).toBe('16');
    expect(row(conduitFill, 'Sizing', 'Smallest')).toBe('1/2 in');
  });
  it('空调：400 ft² → 9,000 BTU，采暖（温和气候）16,000–18,000', () => {
    expect(run(btu).value).toBe('9,000');
    expect(row(btu, 'Heating (rough estimate)', '40–45')).toBe('16,000–18,000 BTU');
  });
  it('保温：1,000 ft² 从 R11 到 R49，纤维素 → 10.9 in', () => {
    expect(run(insulation).value).toBe('10.9');
  });
  it('泳池：32×16 ft、3.5–6 ft 深 → 18,193 加仑，每分钟 8 加仑要 37.9 小时', () => {
    expect(run(pool).value).toBe('18,193');
    expect(row(pool, 'Filling', 'Time')).toBe('37.9 hours');
  });
});
