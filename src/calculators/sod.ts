// 草皮计算器
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price, str } from '../lib/calc-types';
import { fmt, int, money, ceilCount } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

export const SOD_PIECES = [
  { value: '2.667', label: '16 × 24 in slab (2.67 sq ft)' },
  { value: '10', label: '2 × 5 ft roll (10 sq ft)' },
];

const def: CalculatorDef = {
  id: 'sod',
  shapeLegend: 'Shape of the lawn',
  shapes: areaShapes({ length: { value: 30, unit: 'ft' }, width: { value: 20, unit: 'ft' }, area: { value: 600, unit: 'ft2' } }),
  fields: [
    { kind: 'select', key: 'piece', label: 'Sod piece size', default: '2.667', options: SOD_PIECES, hint: 'Slabs are the most common size at US farms and stores' },
    { kind: 'number', key: 'pallet', label: 'Coverage per pallet', default: 450, step: 10, suffix: 'sq ft', hint: 'Usually 400–500 sq ft; ask your supplier' },
    wasteField(5, 'Curves, edges, and beds need more'),
  ],
  priceFields: [
    { kind: 'money', key: 'pricePallet', label: 'Price per pallet', placeholder: 'e.g. 250' },
    { kind: 'money', key: 'priceSqft', label: 'Price per square foot', placeholder: 'e.g. 0.55' },
  ],
  project: { format: (a) => `${fmt(a, 0)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const lawn = total ?? areaFt2(v);
    const waste = num(v, 'waste', 5);
    const need = lawn * (1 + waste / 100);
    const pieceFt2 = num(v, 'piece', 2.667);
    const palletFt2 = num(v, 'pallet', 450);
    const pieces = ceilCount(need / pieceFt2);
    const exactPallets = palletFt2 > 0 ? need / palletFt2 : 0;
    const pallets = ceilCount(exactPallets);
    const pieceLabel = SOD_PIECES.find((p) => p.value === str(v, 'piece'))?.label.split(' (')[0] ?? 'Pieces';

    const cost: ResultRow[] = [];
    const pp = price(v, 'pricePallet');
    const ps = price(v, 'priceSqft');
    if (pp) cost.push({ label: `${pallets} pallets`, value: money(pallets * pp) });
    if (ps) cost.push({ label: `${int(need)} ft²`, value: money(need * ps) });

    return {
      label: 'Sod needed',
      value: int(need),
      unit: 'square feet',
      sub: `${fmt(lawn, 0)} ft² of lawn + ${waste}% extra · ${fmt(need / 9, 1)} yd²`,
      blocks: [
        {
          title: 'Pallets',
          rows: [{ label: 'Full pallets', value: int(pallets), note: `${fmt(exactPallets, 2)} pallets at ${int(palletFt2)} sq ft each` }],
        },
        { title: 'Pieces', rows: [{ label: pieceLabel, value: int(pieces) }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        need > 0
          ? 'Sod is perishable. Schedule delivery for the day you install and lay it within 24 hours of cutting.'
          : 'Enter your lawn measurements to see how much sod you need.',
      summary: `${int(need)} ft² · ${pallets} pallets`,
    };
  },
};
export default def;
