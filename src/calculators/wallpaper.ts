// 壁纸计算器：按条计算，考虑对花和裁切余量
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { wallpaperRolls, wallAreaFt2 } from '../lib/finish';
import { fmt, int, money } from '../lib/format';

export const ROLLS = [
  { value: '20.5x33', label: '20.5 in × 33 ft (standard double roll)', w: 20.5, l: 33 },
  { value: '20.5x16.5', label: '20.5 in × 16.5 ft (single roll)', w: 20.5, l: 16.5 },
  { value: '27x27', label: '27 in × 27 ft', w: 27, l: 27 },
  { value: '21x33', label: '21 in × 33 ft (European roll)', w: 21, l: 33 },
];

const def: CalculatorDef = {
  id: 'wallpaper',
  diagram: 'room',
  fields: [
    { kind: 'length', key: 'length', label: 'Room length', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'width', label: 'Room width', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'height', label: 'Wall height', default: { value: 8, unit: 'ft' } },
    { kind: 'number', key: 'doors', label: 'Doors', default: 1, step: 1 },
    { kind: 'number', key: 'windows', label: 'Windows', default: 1, step: 1, hint: 'Not deducted: you still paper above and below them' },
    { kind: 'select', key: 'roll', label: 'Roll size', default: '20.5x33', options: ROLLS.map(({ value, label }) => ({ value, label })), hint: 'Printed on the roll label' },
    { kind: 'length', key: 'repeat', label: 'Pattern repeat', default: { value: 0, unit: 'in' }, hint: '0 for plain paper; on the label for patterns' },
  ],
  priceFields: [{ kind: 'money', key: 'priceRoll', label: 'Price per roll', placeholder: 'e.g. 60' }],
  compute(v) {
    const L = lenFt(v, 'length');
    const W = lenFt(v, 'width');
    const H = lenFt(v, 'height');
    const roll = ROLLS.find((r) => r.value === str(v, 'roll')) ?? ROLLS[0];
    const r = wallpaperRolls({ perimeterFt: 2 * (L + W), heightFt: H, rollWidthIn: roll.w, rollLengthFt: roll.l, repeatIn: lenIn(v, 'repeat'), doors: num(v, 'doors', 0) });
    const wall = wallAreaFt2(2 * (L + W), H, num(v, 'doors', 0), num(v, 'windows', 0));
    const cost: ResultRow[] = [];
    const pr = price(v, 'priceRoll');
    if (pr) cost.push({ label: `${r.rolls} rolls`, value: money(r.rolls * pr) });
    let advice = 'Buy all rolls from one batch number, and one spare roll for repairs.';
    if (r.stripsPerRoll === 0) advice = 'Each strip is longer than a roll. Check the wall height and roll length.';
    else if (r.rolls === 0) advice = 'Enter the room size to see how many rolls you need.';
    return {
      label: 'Wallpaper rolls',
      value: int(r.rolls),
      unit: 'rolls',
      sub: `${r.strips} strips at ${fmt(r.stripIn / 12, 2)} ft · ${r.stripsPerRoll} strips per roll`,
      blocks: [
        {
          title: 'Strips',
          rows: [
            { label: 'Strips needed', value: String(r.strips), note: 'Around the room, minus full-height door openings' },
            { label: 'Cut length per strip', value: `${fmt(r.stripIn, 1)} in`, note: 'Wall height + pattern repeat + 4 in for trimming' },
          ],
        },
        { title: 'Wall area', rows: [{ label: 'Net wall area', value: `${fmt(wall, 0)} ft²` }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: `${int(r.rolls)} rolls · ${r.strips} strips`,
    };
  },
};
export default def;
