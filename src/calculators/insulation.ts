// 保温材料计算器：目标 R 值 → 厚度、体积、板英尺
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price, str } from '../lib/calc-types';
import { INSULATION, insulationNeeded } from '../lib/hvac';
import { fmt, int, money } from '../lib/format';
import { areaShapes, areaFt2 } from './shared';

const def: CalculatorDef = {
  id: 'insulation',
  shapeLegend: 'Area to insulate',
  shapes: areaShapes({ length: { value: 40, unit: 'ft' }, width: { value: 25, unit: 'ft' }, area: { value: 1000, unit: 'ft2' } }),
  fields: [
    {
      kind: 'select',
      key: 'material',
      label: 'Insulation type',
      default: 'cellulose',
      options: INSULATION.map((m) => ({ value: m.id, label: `${m.label} (≈R-${m.rPerIn}/in)` })),
      hint: 'Typical values; your product label gives the exact R per inch',
    },
    { kind: 'number', key: 'target', label: 'Target R-value', default: 49, step: 1, hint: 'Attics: R-49 to R-60 in most of the US' },
    { kind: 'number', key: 'existing', label: 'Existing R-value', default: 11, step: 1, hint: 'About R-3 per inch of old fiberglass; 0 if none' },
  ],
  priceFields: [{ kind: 'money', key: 'priceBf', label: 'Price per board foot (spray foam)', placeholder: 'e.g. 1.25' }],
  project: { format: (a) => `${fmt(a, 0)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const m = INSULATION.find((x) => x.id === str(v, 'material')) ?? INSULATION[0];
    const r = insulationNeeded(area, num(v, 'target', 49), num(v, 'existing', 0), m.rPerIn);
    const cost: ResultRow[] = [];
    const p = price(v, 'priceBf');
    if (p) cost.push({ label: `${int(r.boardFeet)} board feet`, value: money(r.boardFeet * p) });
    return {
      label: `${m.label} to add`,
      value: fmt(r.inches, 1),
      unit: 'inches deep',
      sub: `R-${fmt(r.addR, 0)} added over ${fmt(area, 0)} ft² at ≈R-${m.rPerIn} per inch`,
      blocks: [
        {
          title: 'Quantity',
          rows: [
            { label: 'Volume', value: `${fmt(r.cubicFt, 0)} ft³`, note: `${fmt(r.cubicFt / 27, 1)} yd³` },
            { label: 'Board feet', value: int(r.boardFeet), note: 'Spray foam is priced this way: 1 ft² at 1 in thick' },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.addR <= 0
          ? 'Your existing insulation already meets the target.'
          : 'For blown insulation, use the coverage chart on the bag: it lists how many bags reach each R-value for your area, allowing for settling.',
      summary: `${fmt(r.inches, 1)} in · R-${fmt(r.addR, 0)} added`,
    };
  },
};
export default def;
