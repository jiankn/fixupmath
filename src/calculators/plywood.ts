import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price } from '../lib/calc-types';
import { areaFt2, areaShapes, wasteField } from './shared';
import { plywoodSheets } from '../lib/plywood';
import { fmt, int, money } from '../lib/format';

const def: CalculatorDef = {
  id: 'plywood', shapes: areaShapes({ length: { value: 20, unit: 'ft' }, width: { value: 25, unit: 'ft' } }),
  fields: [
    { kind: 'length', key: 'sheetLength', label: 'Sheet length', default: { value: 8, unit: 'ft' } },
    { kind: 'length', key: 'sheetWidth', label: 'Sheet width', default: { value: 4, unit: 'ft' } },
    wasteField(10, 'Allowance for cuts and unusable offcuts; choose it for your layout.'),
  ],
  priceFields: [{ kind: 'money', key: 'priceSheet', label: 'Price per sheet', placeholder: 'e.g. 38' }],
  project: { format: n => `${fmt(n, 1)} ft²` }, measure: areaFt2,
  compute(v, total) {
    const r = plywoodSheets(total ?? areaFt2(v), lenFt(v, 'sheetLength'), lenFt(v, 'sheetWidth'), num(v, 'waste'));
    const p = price(v, 'priceSheet');
    const cost: ResultRow[] = p ? [{ label: `${int(r.sheets)} whole sheets`, value: money(r.sheets * p) }] : [];
    return {
      label: 'Whole sheets to buy', value: int(r.sheets), unit: r.sheets === 1 ? 'sheet' : 'sheets',
      sub: `${fmt(r.area, 1)} ft² to cover · ${fmt(r.sheetArea, 2)} ft² per sheet`,
      blocks: [
        { title: 'Coverage', rows: [
          { label: 'Area including waste', value: `${fmt(r.orderArea, 1)} ft²` },
          { label: 'Purchased sheet area', value: `${fmt(r.purchasedArea, 1)} ft²` },
          { label: 'Area above net coverage', value: `${fmt(r.surplus, 1)} ft²`, note: 'Includes waste allowance and whole-sheet rounding.' },
        ] },
        { title: 'Estimated material cost', rows: cost },
      ],
      advice: 'Area-based sheet estimate. Plan seams, grain direction, edge support, and cuts before ordering; this is not a cutting layout or a structural thickness selection.',
      summary: `${int(r.sheets)} ${r.sheets === 1 ? 'sheet' : 'sheets'} · ${fmt(r.area, 1)} ft²`,
    };
  },
};
export default def;
