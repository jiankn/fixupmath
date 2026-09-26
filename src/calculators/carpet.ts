// 地毯计算器：面积 → 平方码、按卷宽的延长英尺
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price } from '../lib/calc-types';
import { fmt, money } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

const def: CalculatorDef = {
  id: 'carpet',
  shapeLegend: 'Shape of the room',
  shapes: areaShapes({ length: { value: 14, unit: 'ft' }, width: { value: 12, unit: 'ft' }, area: { value: 168, unit: 'ft2' } }),
  fields: [
    {
      kind: 'select',
      key: 'roll',
      label: 'Roll width',
      default: '12',
      options: [
        { value: '12', label: '12 ft (most common)' },
        { value: '13.5', label: '13.5 ft' },
        { value: '15', label: '15 ft' },
      ],
    },
    wasteField(10, '10% covers seams and trimming; more for odd shapes'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceSqyd', label: 'Carpet price per square yard', placeholder: 'e.g. 25' },
    { kind: 'money', key: 'pricePad', label: 'Pad price per square yard', placeholder: 'e.g. 5' },
    { kind: 'money', key: 'priceSqft', label: 'Or price per square foot', placeholder: 'e.g. 2.75' },
  ],
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const waste = num(v, 'waste', 10);
    const roll = num(v, 'roll', 12);
    const need = area * (1 + waste / 100);
    const sqyd = need / 9;
    const cost: ResultRow[] = [];
    const py = price(v, 'priceSqyd');
    const pp = price(v, 'pricePad');
    const ps = price(v, 'priceSqft');
    if (py) cost.push({ label: `Carpet, ${fmt(sqyd, 1)} yd²`, value: money(sqyd * py) });
    if (pp) cost.push({ label: `Pad, ${fmt(area / 9, 1)} yd²`, value: money((area / 9) * pp) });
    if (ps) cost.push({ label: `Carpet, ${fmt(need, 0)} ft²`, value: money(need * ps) });
    return {
      label: 'Carpet needed',
      value: fmt(sqyd, 1),
      unit: 'square yards',
      sub: `${fmt(need, 1)} ft² including ${waste}% extra · room ${fmt(area, 1)} ft²`,
      blocks: [
        {
          title: 'Off the roll',
          rows: [{ label: `Length of ${roll} ft roll`, value: `${fmt(need / roll, 1)} ft`, note: 'Assumes pieces can be seamed; a room wider than the roll needs a seam' }],
        },
        { title: 'Pad', rows: [{ label: 'Carpet pad (no waste)', value: `${fmt(area / 9, 1)} yd²` }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        area > 0
          ? 'Installers lay out seams and pile direction before cutting, so their measure can come in higher than this estimate, especially for rooms wider than the roll.'
          : 'Enter your room size to see how much carpet you need.',
      summary: `${fmt(sqyd, 1)} yd² · ${fmt(need, 0)} ft²`,
    };
  },
};
export default def;
