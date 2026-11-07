// 混凝土袋数计算器：已知体积、板尺寸或柱坑尺寸，算 40/50/60/80 lb 袋数、托盘和总重
import type { CalculatorDef, ResultRow, Values } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { BAG_YIELDS, bagOf, bagsFor, palletSplit } from '../lib/concrete-bags';
import { CUBIC_METERS_PER_CUBIC_FOOT } from '../lib/units';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

const VOLUME_UNITS: Record<string, number> = { yd3: 27, ft3: 1, m3: 1 / CUBIC_METERS_PER_CUBIC_FOOT };

/** 当前形状的净体积（ft³），未加损耗 */
export function bagVolumeFt3(v: Values): number {
  switch (str(v, 'shape') || 'volume') {
    case 'volume': {
      const n = num(v, 'volume');
      return n > 0 ? n * (VOLUME_UNITS[str(v, 'volumeUnit')] ?? 27) : 0;
    }
    case 'slab':
      return lenFt(v, 'length') * lenFt(v, 'width') * lenFt(v, 'thickness');
    case 'holes': {
      const r = lenFt(v, 'diameter') / 2;
      const n = Math.max(0, Math.floor(num(v, 'holes', 1)));
      return Math.PI * r * r * lenFt(v, 'depth') * n;
    }
    default:
      return 0;
  }
}

const def: CalculatorDef = {
  id: 'concrete-bag',
  shapeLegend: 'What do you know?',
  shapes: [
    {
      id: 'volume',
      label: 'Volume',
      description: 'Already know the volume? Enter it in cubic yards, feet, or meters.',
      fields: [
        { kind: 'number', key: 'volume', label: 'Concrete volume', default: 1, step: 0.05 },
        {
          kind: 'select',
          key: 'volumeUnit',
          label: 'Volume unit',
          default: 'yd3',
          options: [
            { value: 'yd3', label: 'cubic yards (yd³)' },
            { value: 'ft3', label: 'cubic feet (ft³)' },
            { value: 'm3', label: 'cubic meters (m³)' },
          ],
        },
      ],
    },
    {
      id: 'slab',
      label: 'Slab or pad',
      diagram: 'rect',
      fields: [
        { kind: 'length', key: 'length', label: 'Length', default: { value: 4, unit: 'ft' } },
        { kind: 'length', key: 'width', label: 'Width', default: { value: 4, unit: 'ft' } },
        { kind: 'length', key: 'thickness', label: 'Thickness', default: { value: 4, unit: 'in' } },
      ],
    },
    {
      id: 'holes',
      label: 'Post holes',
      diagram: 'circle',
      fields: [
        { kind: 'length', key: 'diameter', label: 'Hole diameter', default: { value: 10, unit: 'in' } },
        { kind: 'length', key: 'depth', label: 'Hole depth', default: { value: 3, unit: 'ft' } },
        { kind: 'number', key: 'holes', label: 'Number of holes', default: 1, min: 1, step: 1 },
      ],
    },
  ],
  fields: [
    {
      kind: 'select',
      key: 'bag',
      label: 'Bag size',
      default: '80',
      options: [
        ...[...BAG_YIELDS].reverse().map((b) => ({ value: String(b.lb), label: `${b.lb} lb (${b.ft3} ft³ per bag)` })),
        { value: 'custom', label: 'Other bag (enter its yield)' },
      ],
      hint: 'Yields from the QUIKRETE Concrete Mix data sheet; Sakrete lists the same for 40, 60, and 80 lb.',
    },
    { kind: 'number', key: 'yield', label: 'Yield per bag', default: 0.6, step: 0.01, suffix: 'ft³', hint: 'Printed on the bag', showWhen: { key: 'bag', equals: 'custom' } },
    { kind: 'number', key: 'bagLb', label: 'Bag weight', default: 80, step: 1, suffix: 'lb', showWhen: { key: 'bag', equals: 'custom' } },
    wasteField(5, 'Add more for hand-dug holes or uneven ground'),
  ],
  priceFields: [{ kind: 'money', key: 'priceBag', label: 'Price per bag', placeholder: 'from your store' }],
  project: { format: (ft3) => `${fmt(ft3)} ft³` },
  measure: bagVolumeFt3,
  compute(v, total) {
    const net = total ?? bagVolumeFt3(v);
    const waste = num(v, 'waste', 5);
    const ft3 = net * (1 + Math.max(0, waste) / 100);
    const custom = str(v, 'bag') === 'custom';
    const preset = bagOf(Number(str(v, 'bag')));
    const yieldFt3 = custom ? num(v, 'yield') : preset?.ft3 ?? 0.6;
    const lb = custom ? num(v, 'bagLb') : preset?.lb ?? 80;
    const bags = bagsFor(ft3, yieldFt3);

    if (!(yieldFt3 > 0)) {
      return { label: 'Bags needed', value: 'Check inputs', unit: '', blocks: [], advice: 'Enter the yield printed on your bag, in cubic feet.', summary: 'Enter the bag yield' };
    }

    const perPallet = custom ? undefined : preset?.perPallet;
    const split = palletSplit(bags, perPallet);
    const palletRows: ResultRow[] = perPallet
      ? [
          { label: 'Full pallets', value: int(split.pallets), note: `${perPallet} bags per pallet (QUIKRETE)` },
          { label: 'Plus loose bags', value: int(split.loose) },
        ]
      : [];
    const p = price(v, 'priceBag');
    const bagWord = bags === 1 ? 'bag' : 'bags';

    return {
      label: `${fmt(lb, 1)}-lb bags needed`,
      value: int(bags),
      unit: bagWord,
      sub: `${fmt(ft3)} ft³ (${fmt(ft3 / 27, 3)} yd³) · ${fmt(yieldFt3, 3)} ft³ per bag · includes ${waste}% extra`,
      blocks: [
        {
          title: 'All bag sizes',
          rows: [...BAG_YIELDS].reverse().map((b) => ({ label: `${b.lb}-lb bags`, value: int(bagsFor(ft3, b.ft3)) })),
        },
        { title: 'Pallets', rows: palletRows },
        {
          title: 'Weight to haul',
          rows: [{ label: 'Dry bag weight', value: `${int(bags * lb)} lb`, note: 'Check your vehicle payload before loading' }],
        },
        { title: 'Estimated cost', rows: p ? [{ label: `${int(bags)} ${bagWord}`, value: money(bags * p) }] : [] },
      ],
      advice:
        ft3 / 27 >= 1
          ? `Over a cubic yard (${int(bags)} ${bagWord}). Compare the price of a ready-mix delivery before buying bags.`
          : ft3 > 0
            ? 'Consider one spare bag in case a hole or form runs deeper than measured.'
            : 'Enter a volume or dimensions to count bags.',
      summary: `${int(bags)} ${bagWord} (${fmt(lb, 1)} lb) · ${fmt(ft3 / 27, 2)} yd³`,
    };
  },
};
export default def;
