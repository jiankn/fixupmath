// 屋面瓦计算器：占地面积 × 坡度系数 → 屋面面积、平方数、捆数
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { pitchFactor } from '../lib/finish';
import { areaToFt2, type AreaValue } from '../lib/units';
import { fmt, money, ceilCount } from '../lib/format';
import { wasteField } from './shared';

export const PITCHES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

const def: CalculatorDef = {
  id: 'shingle',
  shapeLegend: 'What do you know?',
  shapes: [
    {
      id: 'footprint',
      label: 'House footprint',
      diagram: 'roof-plan',
      description: 'Measure the length and width of the roof from above, including the overhangs.',
      fields: [
        { kind: 'length', key: 'length', label: 'Roof length', default: { value: 50, unit: 'ft' } },
        { kind: 'length', key: 'width', label: 'Roof width', default: { value: 30, unit: 'ft' } },
      ],
    },
    {
      id: 'area',
      label: 'Roof area',
      description: 'Already have the actual sloped roof area, e.g. from a roofing report? Enter it and set pitch to Flat.',
      fields: [{ kind: 'area', key: 'area', label: 'Roof area', default: { value: 1700, unit: 'ft2' } }],
    },
  ],
  fields: [
    {
      kind: 'select',
      key: 'pitch',
      label: 'Roof pitch',
      default: '6',
      options: [{ value: '0', label: 'Flat / already sloped area' }, ...PITCHES.map((p) => ({ value: String(p), label: `${p}/12` }))],
      hint: 'Inches of rise per 12 inches of run',
    },
    wasteField(10, '10% for gable roofs, 15% for hips and valleys'),
    {
      kind: 'select',
      key: 'bundles',
      label: 'Bundles per square',
      default: '3',
      options: [
        { value: '3', label: '3 (most architectural and 3-tab)' },
        { value: '4', label: '4 (some heavier shingles)' },
      ],
      hint: 'Printed on the bundle wrapper',
    },
  ],
  priceFields: [{ kind: 'money', key: 'priceBundle', label: 'Price per bundle', placeholder: 'e.g. 38' }],
  compute(v) {
    const flat = str(v, 'shape') === 'area' ? areaToFt2((v.area as AreaValue)?.value || 0, (v.area as AreaValue)?.unit ?? 'ft2') : lenFt(v, 'length') * lenFt(v, 'width');
    const pitch = num(v, 'pitch', 6);
    const roof = flat * pitchFactor(pitch);
    const waste = num(v, 'waste', 10);
    const need = roof * (1 + waste / 100);
    const squares = need / 100;
    const perSq = num(v, 'bundles', 3);
    const bundles = ceilCount(squares * perSq);
    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBundle');
    if (pb) cost.push({ label: `${bundles} bundles`, value: money(bundles * pb) });
    return {
      label: 'Shingle bundles',
      value: String(bundles),
      unit: 'bundles',
      sub: `${fmt(squares, 2)} squares · ${fmt(roof, 0)} ft² roof + ${waste}% extra`,
      blocks: [
        {
          title: 'Roof area',
          rows: [
            { label: 'Footprint', value: `${fmt(flat, 0)} ft²` },
            { label: `Pitch factor (${pitch}/12)`, value: `× ${fmt(pitchFactor(pitch), 3)}` },
            { label: 'Sloped roof area', value: `${fmt(roof, 0)} ft²` },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        bundles > 0
          ? 'Starter strip, ridge cap, underlayment, drip edge, and nails are extra. Ridge cap is ordered by the linear foot of hips and ridges.'
          : 'Enter your roof size to see how many bundles you need.',
      summary: `${bundles} bundles · ${fmt(squares, 1)} squares`,
    };
  },
};
export default def;
