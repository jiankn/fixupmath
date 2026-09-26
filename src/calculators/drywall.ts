// 石膏板计算器：房间墙面（扣门窗）+ 可选天花板 → 板数、螺丝
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { wallAreaFt2, unitsForArea } from '../lib/finish';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

export const SHEETS = [
  { value: '32', label: '4 × 8 ft (32 sq ft)' },
  { value: '40', label: '4 × 10 ft (40 sq ft)' },
  { value: '48', label: '4 × 12 ft (48 sq ft)' },
];

const def: CalculatorDef = {
  id: 'drywall',
  diagram: 'room',
  fields: [
    { kind: 'length', key: 'length', label: 'Room length', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'width', label: 'Room width', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'height', label: 'Wall height', default: { value: 8, unit: 'ft' } },
    { kind: 'number', key: 'doors', label: 'Doors', default: 1, step: 1, hint: 'Deducts 21 sq ft each (3 × 7 ft)' },
    { kind: 'number', key: 'windows', label: 'Windows', default: 1, step: 1, hint: 'Deducts 15 sq ft each (3 × 5 ft)' },
    {
      kind: 'select',
      key: 'ceiling',
      label: 'Include ceiling',
      default: 'yes',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No, walls only' },
      ],
    },
    { kind: 'select', key: 'sheet', label: 'Sheet size', default: '32', options: SHEETS },
    wasteField(10, 'Covers cutouts and breakage'),
  ],
  priceFields: [{ kind: 'money', key: 'priceSheet', label: 'Price per sheet', placeholder: 'e.g. 16' }],
  compute(v) {
    const L = lenFt(v, 'length');
    const W = lenFt(v, 'width');
    const walls = wallAreaFt2(2 * (L + W), lenFt(v, 'height'), num(v, 'doors', 0), num(v, 'windows', 0));
    const ceiling = str(v, 'ceiling') === 'no' ? 0 : L * W;
    const area = walls + ceiling;
    const sheetFt2 = num(v, 'sheet', 32);
    const r = unitsForArea(area, num(v, 'waste', 10), sheetFt2);
    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSheet');
    if (ps) cost.push({ label: `${r.units} sheets`, value: money(r.units * ps) });
    const sheetLabel = SHEETS.find((s) => s.value === String(sheetFt2))?.label.split(' (')[0] ?? '';
    return {
      label: 'Drywall sheets',
      value: int(r.units),
      unit: `× ${sheetLabel} sheets`,
      sub: `${fmt(area, 0)} ft² to cover · includes ${num(v, 'waste', 10)}% extra`,
      blocks: [
        {
          title: 'Area',
          rows: [
            { label: 'Walls (after doors and windows)', value: `${fmt(walls, 0)} ft²` },
            { label: 'Ceiling', value: `${fmt(ceiling, 0)} ft²` },
          ],
        },
        {
          title: 'Fasteners',
          rows: [{ label: 'Drywall screws', value: int(r.need), note: 'About 1 per square foot with framing 16 in on center' }],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.units > 0
          ? 'Longer sheets mean fewer seams to tape. Check they fit up the stairs and through the doors before you order.'
          : 'Enter the room size to see how many sheets you need.',
      summary: `${int(r.units)} sheets · ${fmt(area, 0)} ft²`,
    };
  },
};
export default def;
