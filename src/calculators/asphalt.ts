// 沥青计算器：面积 × 压实厚度 × 容重 → 吨数；可选碎石基层
import type { CalculatorDef, FieldDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { asphaltResult, ASPHALT_MATERIALS } from '../lib/sitework';
import { bulkResult } from '../lib/bulk';
import { fmt, int, money, ceilCount } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';
import { GRAVEL_MATERIALS } from './gravel';

/** 冷补沥青袋装：50 lb 一袋，适合补坑 */
export const COLD_PATCH_BAG_LB = 50;
const BASE = GRAVEL_MATERIALS.find((m) => m.id === 'crusher-run')!;

const fields: FieldDef[] = [
  { kind: 'length', key: 'thickness', label: 'Compacted thickness', default: { value: 3, unit: 'in' }, hint: '2 in for an overlay, 3 in for a driveway, 4 in for heavy vehicles' },
  {
    kind: 'select',
    key: 'material',
    label: 'Material',
    default: ASPHALT_MATERIALS[0].id,
    options: [
      ...ASPHALT_MATERIALS.map((m) => ({ value: m.id, label: `${m.label} (≈${m.lbPerFt3} lb/ft³)` })),
      { value: 'custom', label: 'Custom weight…' },
    ],
    hint: 'Typical weights. Your plant can give you its mix weight.',
  },
  { kind: 'number', key: 'density', label: 'Weight per cubic foot', default: 145, step: 1, suffix: 'lb/ft³', showWhen: { key: 'material', equals: 'custom' } },
  wasteField(5, '5% covers uneven base and edges'),
  { kind: 'length', key: 'baseDepth', label: 'Gravel base (optional)', default: { value: 0, unit: 'in' }, hint: 'New driveway? Enter 4–8 in of compacted crusher run' },
];

const def: CalculatorDef = {
  id: 'asphalt',
  shapeLegend: 'Shape of the area',
  shapes: areaShapes({ length: { value: 40, unit: 'ft' }, width: { value: 12, unit: 'ft' } }),
  fields,
  priceFields: [
    { kind: 'money', key: 'priceTon', label: 'Asphalt price per ton', placeholder: 'e.g. 110' },
    { kind: 'money', key: 'priceBase', label: 'Base gravel price per ton', placeholder: 'e.g. 35' },
  ],
  priceNote: 'Plant prices per ton exclude hauling, paving labor, and small-load fees.',
  compute(v) {
    const area = areaFt2(v);
    const thick = lenIn(v, 'thickness');
    const m = ASPHALT_MATERIALS.find((x) => x.id === str(v, 'material'));
    const density = m ? m.lbPerFt3 : num(v, 'density', 145);
    const waste = num(v, 'waste', 5);
    const r = asphaltResult(area, thick, density, waste);
    const base = bulkResult(area * lenFt(v, 'baseDepth'), 10, BASE.tonsPerYd3, []);
    const bags = ceilCount(r.pounds / COLD_PATCH_BAG_LB);

    const cost: ResultRow[] = [];
    const pt = price(v, 'priceTon');
    const pb = price(v, 'priceBase');
    if (pt) cost.push({ label: `Asphalt, ${fmt(r.orderTons)} tons`, value: money(r.orderTons * pt) });
    if (pb && base.tons > 0) cost.push({ label: `Base, ${fmt(base.orderTons)} tons`, value: money(base.orderTons * pb) });

    const advice =
      r.tons <= 0
        ? 'Enter the area and thickness to see how much asphalt you need.'
        : r.tons < 1
          ? `A job this small is usually patched with cold mix: about ${int(bags)} bags of ${COLD_PATCH_BAG_LB} lb. Compact it in layers no thicker than 2 in.`
          : 'Plants sell hot mix by the ton and many have a minimum load. Order the rounded-up tonnage so the paver does not run short at the far end.';

    return {
      label: 'Asphalt needed',
      value: fmt(r.tons),
      unit: 'tons',
      sub: `${fmt(r.cubicYards)} yd³ · ${fmt(area, 0)} ft² at ${fmt(thick, 2)} in · includes ${waste}% extra`,
      blocks: [
        {
          title: 'Asphalt',
          rows: [
            { label: 'Order', value: `${fmt(r.orderTons)} tons`, note: 'rounded up to the next ½ ton' },
            { label: 'Pounds', value: int(r.pounds), note: `at ${fmt(density, 0)} lb per cubic foot` },
            { label: 'Area', value: `${fmt(r.squareYards)} yd²` },
            { label: `Cold patch bags (${COLD_PATCH_BAG_LB} lb)`, value: int(bags), note: 'only practical for small repairs' },
          ],
        },
        ...(base.tons > 0
          ? [
              {
                title: 'Gravel base',
                rows: [
                  { label: 'Crusher run', value: `${fmt(base.tons)} tons`, note: `${fmt(base.cubicYards)} yd³ incl. 10% for compaction` },
                  { label: 'Order', value: `${fmt(base.orderTons)} tons` },
                ],
              },
            ]
          : []),
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: base.tons > 0 ? `${fmt(r.tons)} tons asphalt · ${fmt(base.tons)} tons base` : `${fmt(r.tons)} tons · ${fmt(r.cubicYards)} yd³`,
    };
  },
};
export default def;
