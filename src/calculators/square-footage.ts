// 面积计算器
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { price } from '../lib/calc-types';
import { ft2To } from '../lib/units';
import { fmt, int, money } from '../lib/format';
import { areaShapes, areaFt2 } from './shared';

const def: CalculatorDef = {
  id: 'square-footage',
  shapeLegend: 'Shape of the space',
  // 面积计算器本身就是在求面积，不需要「已知面积」这个选项
  shapes: areaShapes({ length: { value: 15, unit: 'ft' }, width: { value: 12, unit: 'ft' } }).filter((s) => s.id !== 'area'),
  fields: [],
  priceFields: [
    { kind: 'money', key: 'priceSqft', label: 'Price per square foot', placeholder: 'e.g. 4.50' },
    { kind: 'money', key: 'priceSqyd', label: 'Price per square yard', placeholder: 'e.g. 30' },
  ],
  priceNote: 'Use the installed or material price per unit from your quote.',
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const a = total ?? areaFt2(v);
    const yd2 = ft2To(a, 'yd2');
    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSqft');
    const py = price(v, 'priceSqyd');
    if (ps) cost.push({ label: `${fmt(a, 1)} ft² × ${money(ps)}`, value: money(a * ps) });
    if (py) cost.push({ label: `${fmt(yd2, 1)} yd² × ${money(py)}`, value: money(yd2 * py) });
    return {
      label: 'Area',
      value: fmt(a),
      unit: 'square feet',
      sub: `${fmt(yd2)} yd² · ${fmt(ft2To(a, 'm2'))} m²`,
      blocks: [
        {
          title: 'Other units',
          rows: [
            { label: 'Square yards', value: fmt(yd2) },
            { label: 'Square meters', value: fmt(ft2To(a, 'm2')) },
            { label: 'Acres', value: fmt(ft2To(a, 'acre'), 4) },
            { label: 'Square inches', value: int(a * 144) },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        a > 0
          ? 'Buying flooring or tile? Add 5–10% for cuts and waste, or 10–15% for diagonal or herringbone layouts.'
          : 'Enter your measurements to see the area.',
      summary: `${fmt(a)} ft² · ${fmt(yd2)} yd²`,
    };
  },
};
export default def;
