// 填方土计算器：压实后的体积 → 要买的松散方量、吨数、卡车数
import type { CalculatorDef, ResultRow, Values } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { fillDirtResult } from '../lib/sitework';
import type { Material } from '../lib/bulk';
import { fmt, int, money } from '../lib/format';
import { areaShapes, areaFt2 } from './shared';

export const DIRT_MATERIALS: Material[] = [
  { id: 'fill', label: 'Fill dirt, dry', tonsPerYd3: 1.2 },
  { id: 'fill-moist', label: 'Fill dirt, moist', tonsPerYd3: 1.4 },
  { id: 'clay', label: 'Clay', tonsPerYd3: 1.5 },
  { id: 'topsoil', label: 'Topsoil', tonsPerYd3: 1.1 },
];

/** 卡车装载量（立方码）：单桥自卸约 5，双桥约 10 */
export const TRUCKS = [
  { value: '10', label: 'Tandem dump truck (≈10 yd³)' },
  { value: '5', label: 'Single-axle dump truck (≈5 yd³)' },
  { value: '1', label: 'Pickup truck bed (≈1 yd³)' },
];

const measure = (v: Values) => areaFt2(v) * lenFt(v, 'depth');

const def: CalculatorDef = {
  id: 'dirt',
  shapeLegend: 'Shape of the area or hole',
  shapes: areaShapes({ length: { value: 20, unit: 'ft' }, width: { value: 10, unit: 'ft' } }),
  fields: [
    { kind: 'length', key: 'depth', label: 'Depth to fill', default: { value: 12, unit: 'in' }, hint: 'The finished, compacted depth' },
    {
      kind: 'select',
      key: 'compaction',
      label: 'Extra for compaction',
      default: '20',
      options: [
        { value: '0', label: 'None (loose fill)' },
        { value: '10', label: '10% (light tamping)' },
        { value: '20', label: '20% (plate compactor)' },
        { value: '25', label: '25% (heavy compaction, clay)' },
      ],
      hint: 'Loose dirt shrinks when compacted, so you buy more than the hole holds',
    },
    {
      kind: 'select',
      key: 'material',
      label: 'Material',
      default: DIRT_MATERIALS[0].id,
      options: [...DIRT_MATERIALS.map((m) => ({ value: m.id, label: `${m.label} (≈${m.tonsPerYd3} t/yd³)` })), { value: 'custom', label: 'Custom weight…' }],
      hint: 'Wet soil is heavier. Your supplier can give you theirs.',
    },
    { kind: 'number', key: 'density', label: 'Weight per cubic yard', default: 1.2, step: 0.05, suffix: 'tons/yd³', showWhen: { key: 'material', equals: 'custom' } },
    { kind: 'select', key: 'truck', label: 'Delivery truck', default: '10', options: TRUCKS },
  ],
  priceFields: [
    { kind: 'money', key: 'priceYard', label: 'Price per cubic yard', placeholder: 'e.g. 15' },
    { kind: 'money', key: 'priceLoad', label: 'Delivery fee per load', placeholder: 'e.g. 150' },
  ],
  priceNote: 'Fill dirt itself is cheap; most of the cost is trucking. Ask for the price delivered.',
  project: { format: (ft3) => `${fmt(ft3 / 27)} yd³ compacted` },
  measure,
  compute(v, total) {
    const m = DIRT_MATERIALS.find((x) => x.id === str(v, 'material'));
    const density = m ? m.tonsPerYd3 : num(v, 'density', 1.2);
    const compaction = num(v, 'compaction', 20);
    const truck = num(v, 'truck', 10);
    const r = fillDirtResult(total ?? measure(v), compaction, density, truck);
    const truckName = TRUCKS.find((t) => t.value === str(v, 'truck'))?.label.split(' (')[0].toLowerCase() ?? 'truck';

    const cost: ResultRow[] = [];
    const py = price(v, 'priceYard');
    const pl = price(v, 'priceLoad');
    if (py) cost.push({ label: `${fmt(r.orderYards)} yd³ of dirt`, value: money(r.orderYards * py) });
    if (pl) cost.push({ label: `${r.truckloads} ${r.truckloads === 1 ? 'load' : 'loads'} delivered`, value: money(r.truckloads * pl) });

    return {
      label: 'Dirt to order',
      value: fmt(r.cubicYards),
      unit: 'cubic yards',
      sub: `${fmt(r.compactedYd3)} yd³ compacted + ${compaction}% · ${fmt(r.cubicMeters)} m³`,
      blocks: [
        {
          title: 'Weight',
          rows: [
            { label: 'Tons', value: fmt(r.tons), note: `at ${fmt(density)} tons per cubic yard` },
            { label: 'Pounds', value: int(r.pounds) },
          ],
        },
        {
          title: 'Delivery',
          rows: [
            { label: 'Order', value: `${fmt(r.orderYards)} yd³`, note: 'rounded up to the next ½ yard' },
            { label: 'Truckloads', value: String(r.truckloads), note: `${truckName}, by volume. Check the weight limit for wet dirt.` },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.cubicYards <= 0
          ? 'Enter the area and depth to see how much dirt you need.'
          : 'Spread and compact fill in 4–6 in layers. Finish with 4–6 in of topsoil if you plan to plant grass or a garden.',
      summary: `${fmt(r.cubicYards)} yd³ · ${fmt(r.tons)} tons · ${r.truckloads} ${r.truckloads === 1 ? 'load' : 'loads'}`,
    };
  },
};
export default def;
