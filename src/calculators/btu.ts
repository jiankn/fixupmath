// 空调 / 采暖功率计算器（BTU）
import type { CalculatorDef } from '../lib/calc-types';
import { num, str } from '../lib/calc-types';
import { coolingBtu, HEATING_BTU_PER_FT2 } from '../lib/hvac';
import { fmt, int } from '../lib/format';
import { areaShapes, areaFt2 } from './shared';

const def: CalculatorDef = {
  id: 'btu',
  shapeLegend: 'Shape of the room',
  shapes: areaShapes({ length: { value: 20, unit: 'ft' }, width: { value: 20, unit: 'ft' }, area: { value: 400, unit: 'ft2' } }),
  fields: [
    {
      kind: 'select',
      key: 'sun',
      label: 'Sun exposure',
      default: 'normal',
      options: [
        { value: 'shady', label: 'Heavily shaded (−10%)' },
        { value: 'normal', label: 'Normal' },
        { value: 'sunny', label: 'Very sunny (+10%)' },
      ],
    },
    { kind: 'number', key: 'people', label: 'People who usually use the room', default: 2, step: 1, hint: '+600 BTU for each person over two' },
    {
      kind: 'select',
      key: 'kitchen',
      label: 'Is it a kitchen?',
      default: 'no',
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes (+4,000 BTU)' },
      ],
    },
    {
      kind: 'select',
      key: 'climate',
      label: 'Climate (for heating)',
      default: 'mixed',
      options: Object.entries(HEATING_BTU_PER_FT2).map(([value, [, , label]]) => ({ value, label })),
    },
  ],
  project: { format: (a) => `${fmt(a, 0)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const c = coolingBtu({ areaFt2: area, sun: (str(v, 'sun') as 'shady' | 'normal' | 'sunny') || 'normal', people: num(v, 'people', 2), kitchen: str(v, 'kitchen') === 'yes' });
    const [lo, hi, climate] = HEATING_BTU_PER_FT2[str(v, 'climate')] ?? HEATING_BTU_PER_FT2.mixed;
    return {
      label: 'Cooling capacity',
      value: int(c.btu),
      unit: 'BTU/h',
      sub: `${fmt(c.tons, 2)} tons · ${fmt(area, 0)} ft²`,
      blocks: [
        {
          title: 'Cooling breakdown',
          rows: [
            { label: 'ENERGY STAR base for the area', value: `${int(c.base)} BTU`, note: c.outOfTable ? 'Above 2,500 ft²: extrapolated, get a Manual J load calculation' : undefined },
            { label: 'After sun, people, and kitchen', value: `${int(c.btu)} BTU` },
          ],
        },
        {
          title: 'Heating (rough estimate)',
          rows: [{ label: `${lo}–${hi} BTU per ft²`, value: `${int(area * lo)}–${int(area * hi)} BTU`, note: climate }],
        },
      ],
      advice:
        area > 0
          ? 'Bigger is not better: an oversized air conditioner cycles on and off and leaves the room clammy. For whole-house systems, ask for a Manual J load calculation.'
          : 'Enter the room size to see the BTUs you need.',
      summary: `${int(c.btu)} BTU · ${fmt(c.tons, 2)} tons`,
    };
  },
};
export default def;
