// 草籽计算器：面积 × 草种播种量
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price, str } from '../lib/calc-types';
import { fmt, money, ceilCount } from '../lib/format';
import { areaShapes, areaFt2 } from './shared';

/** 典型播种量（磅 / 1,000 平方英尺），新草坪；补播约为一半。以种子袋标签为准 */
export const GRASS_TYPES = [
  { id: 'tall-fescue', label: 'Tall fescue', newRate: 7, region: 'Cool season' },
  { id: 'kbg', label: 'Kentucky bluegrass', newRate: 2.5, region: 'Cool season' },
  { id: 'rye', label: 'Perennial ryegrass', newRate: 8, region: 'Cool season' },
  { id: 'fine-fescue', label: 'Fine fescue', newRate: 4, region: 'Cool season, shade' },
  { id: 'bermuda', label: 'Bermuda (hulled)', newRate: 1.5, region: 'Warm season' },
  { id: 'zoysia', label: 'Zoysia', newRate: 1.5, region: 'Warm season' },
  { id: 'bahia', label: 'Bahia', newRate: 7, region: 'Warm season' },
  { id: 'centipede', label: 'Centipede', newRate: 0.5, region: 'Warm season' },
];

const def: CalculatorDef = {
  id: 'grass-seed',
  shapeLegend: 'Shape of the lawn',
  shapes: areaShapes({ length: { value: 50, unit: 'ft' }, width: { value: 40, unit: 'ft' }, area: { value: 2000, unit: 'ft2' } }),
  fields: [
    {
      kind: 'select',
      key: 'grass',
      label: 'Grass type',
      default: 'tall-fescue',
      options: GRASS_TYPES.map((g) => ({ value: g.id, label: `${g.label} (${g.newRate} lb / 1,000 ft²)` })),
      hint: 'Typical new-lawn rates; your seed label may differ',
    },
    {
      kind: 'select',
      key: 'mode',
      label: 'Seeding',
      default: 'new',
      options: [
        { value: 'new', label: 'New lawn (bare soil)' },
        { value: 'over', label: 'Overseeding an existing lawn' },
      ],
      hint: 'Overseeding uses about half the new-lawn rate',
    },
    { kind: 'number', key: 'rate', label: 'Custom rate (optional)', default: 0, step: 0.25, suffix: 'lb / 1,000 ft²', hint: 'Enter the rate from your seed label to override' },
    {
      kind: 'select',
      key: 'bag',
      label: 'Bag size',
      default: '7',
      options: ['3', '7', '20', '50'].map((b) => ({ value: b, label: `${b} lb` })),
    },
  ],
  priceFields: [{ kind: 'money', key: 'priceBag', label: 'Price per bag', placeholder: 'e.g. 35' }],
  project: { format: (a) => `${fmt(a, 0)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const g = GRASS_TYPES.find((x) => x.id === str(v, 'grass')) ?? GRASS_TYPES[0];
    const over = str(v, 'mode') === 'over';
    const custom = num(v, 'rate', 0);
    const rate = custom > 0 ? custom : over ? g.newRate / 2 : g.newRate;
    const lb = (area / 1000) * rate;
    const bag = num(v, 'bag', 7);
    const bags = ceilCount(lb / bag);
    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBag');
    if (pb) cost.push({ label: `${bags} bags`, value: money(bags * pb) });
    return {
      label: 'Grass seed needed',
      value: fmt(lb, 1),
      unit: 'pounds',
      sub: `${fmt(area, 0)} ft² at ${fmt(rate, 2)} lb per 1,000 ft² · ${custom > 0 ? 'custom rate' : `${g.label}, ${over ? 'overseeding' : 'new lawn'}`}`,
      blocks: [
        { title: 'Bags', rows: [{ label: `${bag}-lb bags`, value: String(bags) }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        lb > 0
          ? `${g.label} is a ${g.region.toLowerCase()} grass. Spread half the seed in one direction and half at a right angle for even coverage.`
          : 'Enter your lawn size to see how much seed you need.',
      summary: `${fmt(lb, 1)} lb · ${bags} bags`,
    };
  },
};
export default def;
