// 地板计算器：面积 + 损耗 → 箱数
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price } from '../lib/calc-types';
import { unitsForArea } from '../lib/finish';
import { fmt, int, money } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

const def: CalculatorDef = {
  id: 'flooring',
  shapeLegend: 'Shape of the room',
  shapes: areaShapes({ length: { value: 15, unit: 'ft' }, width: { value: 12, unit: 'ft' }, area: { value: 180, unit: 'ft2' } }),
  fields: [
    { kind: 'number', key: 'box', label: 'Coverage per box', default: 20, step: 0.01, suffix: 'sq ft', hint: 'Printed on the box; often 18–30 sq ft' },
    wasteField(10, '5–10% straight lay, 15% diagonal or herringbone'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceSqft', label: 'Price per square foot', placeholder: 'e.g. 3.49' },
    { kind: 'money', key: 'priceBox', label: 'Price per box', placeholder: 'e.g. 65' },
  ],
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const waste = num(v, 'waste', 10);
    const box = num(v, 'box', 20);
    const r = unitsForArea(area, waste, box);
    const bought = r.units * box;
    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSqft');
    const pb = price(v, 'priceBox');
    if (ps) cost.push({ label: `${fmt(bought, 1)} ft² in ${r.units} boxes`, value: money(bought * ps) });
    if (pb) cost.push({ label: `${r.units} boxes`, value: money(r.units * pb) });
    return {
      label: 'Flooring boxes',
      value: int(r.units),
      unit: 'boxes',
      sub: `${fmt(area, 1)} ft² floor + ${waste}% extra = ${fmt(r.need, 1)} ft²`,
      blocks: [
        {
          title: 'Coverage',
          rows: [
            { label: 'Square feet to buy', value: fmt(r.need, 1) },
            { label: 'Square feet in the boxes', value: fmt(bought, 1), note: `${fmt(bought - r.need, 1)} ft² left over` },
            { label: 'Square yards', value: fmt(r.need / 9, 1) },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.units > 0
          ? 'Buy every box from the same lot number so color and texture match, and keep a spare box for future repairs.'
          : 'Enter your room size to see how many boxes you need.',
      summary: `${int(r.units)} boxes · ${fmt(r.need, 0)} ft²`,
    };
  },
};
export default def;
