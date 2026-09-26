// 砖计算器：墙面积 × 每平方英尺砖数；砂浆按袋估算
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { bricksPerFt2 } from '../lib/finish';
import { areaToFt2, type AreaValue } from '../lib/units';
import { fmt, int, money, ceilCount } from '../lib/format';
import { wasteField } from './shared';

/** 常见美国砖型号（实际尺寸，英寸） */
export const BRICKS = [
  { value: 'modular', label: 'Modular 7⅝ × 2¼ in', l: 7.625, h: 2.25 },
  { value: 'standard', label: 'Standard 8 × 2¼ in', l: 8, h: 2.25 },
  { value: 'queen', label: 'Queen 7⅝ × 2¾ in', l: 7.625, h: 2.75 },
  { value: 'king', label: 'King 9⅝ × 2⅝ in', l: 9.625, h: 2.625 },
  { value: 'utility', label: 'Utility 11⅝ × 3⅝ in', l: 11.625, h: 3.625 },
];

/** 一袋 80 磅预拌砂浆大约能砌的标准尺寸砖数（按常见袋标） */
export const BRICKS_PER_MORTAR_BAG = 40;

const def: CalculatorDef = {
  id: 'brick',
  shapeLegend: 'Measure by',
  shapes: [
    {
      id: 'wall',
      label: 'Wall size',
      diagram: 'brick',
      fields: [
        { kind: 'length', key: 'length', label: 'Wall length', default: { value: 20, unit: 'ft' } },
        { kind: 'length', key: 'height', label: 'Wall height', default: { value: 6, unit: 'ft' } },
      ],
    },
    {
      id: 'area',
      label: 'Wall area',
      fields: [{ kind: 'area', key: 'area', label: 'Wall area', default: { value: 120, unit: 'ft2' } }],
    },
  ],
  fields: [
    { kind: 'select', key: 'brick', label: 'Brick size', default: 'modular', options: BRICKS.map(({ value, label }) => ({ value, label })) },
    { kind: 'length', key: 'joint', label: 'Mortar joint', default: { value: 0.375, unit: 'in' }, hint: '3/8 in is standard' },
    { kind: 'number', key: 'openings', label: 'Openings to subtract', default: 0, step: 1, suffix: 'sq ft', hint: 'Doors and windows in the wall' },
    wasteField(5, '5% for breakage and cuts'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceBrick', label: 'Price per brick', placeholder: 'e.g. 0.80' },
    { kind: 'money', key: 'priceMortar', label: 'Price per 80-lb mortar bag', placeholder: 'e.g. 9' },
  ],
  compute(v) {
    const gross = str(v, 'shape') === 'area' ? areaToFt2((v.area as AreaValue)?.value || 0, (v.area as AreaValue)?.unit ?? 'ft2') : lenFt(v, 'length') * lenFt(v, 'height');
    const area = Math.max(0, gross - Math.max(0, num(v, 'openings', 0)));
    const b = BRICKS.find((x) => x.value === str(v, 'brick')) ?? BRICKS[0];
    const perFt2 = bricksPerFt2(b.l, b.h, lenIn(v, 'joint'));
    const waste = num(v, 'waste', 5);
    const bricks = ceilCount(area * perFt2 * (1 + waste / 100));
    const mortar = ceilCount(bricks / BRICKS_PER_MORTAR_BAG);
    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBrick');
    const pm = price(v, 'priceMortar');
    if (pb) cost.push({ label: `${int(bricks)} bricks`, value: money(bricks * pb) });
    if (pm) cost.push({ label: `${mortar} bags of mortar`, value: money(mortar * pm) });
    return {
      label: 'Bricks needed',
      value: int(bricks),
      unit: 'bricks',
      sub: `${fmt(area, 1)} ft² of wall · ${fmt(perFt2, 2)} bricks per ft² · includes ${waste}% extra`,
      blocks: [
        { title: 'Mortar', rows: [{ label: '80-lb bags of mortar mix', value: int(mortar), note: `About ${BRICKS_PER_MORTAR_BAG} bricks per bag; varies with joint size` }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        bricks > 0
          ? 'This is a single-wythe (one brick thick) wall. Double the count for a two-wythe wall.'
          : 'Enter the wall size to see how many bricks you need.',
      summary: `${int(bricks)} bricks · ${mortar} bags mortar`,
    };
  },
};
export default def;
