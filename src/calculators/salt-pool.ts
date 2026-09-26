// 盐水泳池加盐计算器
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price } from '../lib/calc-types';
import { poolGallons, saltPounds, drainFraction, LITERS_PER_GALLON } from '../lib/pool';
import { fmt, int, money, ceilCount } from '../lib/format';

const ft = (value: number) => ({ value, unit: 'ft' as const });

const def: CalculatorDef = {
  id: 'salt-pool',
  shapeLegend: 'Pool shape',
  shapes: [
    {
      id: 'rectangle',
      label: 'Rectangle',
      diagram: 'pool-rect',
      fields: [
        { kind: 'length', key: 'length', label: 'Length', default: ft(32) },
        { kind: 'length', key: 'width', label: 'Width', default: ft(16) },
        { kind: 'length', key: 'shallow', label: 'Shallow end depth', default: ft(3.5) },
        { kind: 'length', key: 'deep', label: 'Deep end depth', default: ft(6) },
      ],
    },
    {
      id: 'round',
      label: 'Round',
      diagram: 'pool-round',
      fields: [
        { kind: 'length', key: 'diameter', label: 'Diameter', default: ft(24) },
        { kind: 'length', key: 'depth', label: 'Water depth', default: { value: 48, unit: 'in' } },
      ],
    },
    {
      id: 'oval',
      label: 'Oval',
      diagram: 'pool-oval',
      fields: [
        { kind: 'length', key: 'length', label: 'Length', default: ft(30) },
        { kind: 'length', key: 'width', label: 'Width', default: ft(15) },
        { kind: 'length', key: 'shallow', label: 'Shallow end depth', default: ft(4) },
        { kind: 'length', key: 'deep', label: 'Deep end depth', default: ft(4) },
      ],
    },
    {
      id: 'volume',
      label: 'I know the gallons',
      description: 'Use the volume from your pool builder or equipment paperwork.',
      fields: [{ kind: 'number', key: 'gallons', label: 'Pool volume', default: 15000, step: 100, suffix: 'gallons' }],
    },
  ],
  fields: [
    { kind: 'number', key: 'current', label: 'Current salt level', default: 0, step: 100, suffix: 'ppm', hint: '0 for fresh water; test with salt strips' },
    { kind: 'number', key: 'target', label: 'Target salt level', default: 3200, step: 100, suffix: 'ppm', hint: 'Check your chlorinator manual; most want 2,700–3,400' },
    {
      kind: 'select',
      key: 'bag',
      label: 'Bag size',
      default: '40',
      options: [
        { value: '40', label: '40 lb' },
        { value: '50', label: '50 lb' },
      ],
    },
  ],
  priceFields: [{ kind: 'money', key: 'priceBag', label: 'Price per bag', placeholder: 'e.g. 9' }],
  compute(v) {
    const gallons = poolGallons(String(v.shape ?? 'rectangle'), v);
    const current = num(v, 'current', 0);
    const target = num(v, 'target', 3200);
    const bag = num(v, 'bag', 40);
    const lb = saltPounds(gallons, current, target);
    const bags = ceilCount(lb / bag);
    const drain = drainFraction(current, target);

    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBag');
    if (pb && bags) cost.push({ label: `${bags} bags`, value: money(bags * pb) });

    let advice = 'Enter your pool size to see how much salt to add.';
    if (drain > 0) advice = `Salt is above target. Replace about ${fmt(drain * 100, 0)}% of the water with fresh water, then retest.`;
    else if (lb > 0) advice = 'Add about three-quarters of the salt, run the pump for 24 hours, retest, then add the rest. Salt is easy to add and hard to remove.';
    else if (gallons > 0) advice = 'Your salt level is already at target. No salt needed.';

    return {
      label: 'Salt to add',
      value: int(lb),
      unit: 'pounds',
      sub: `${int(gallons)} gallons · ${fmt(lb * 0.453592, 0)} kg · ${int(current)} → ${int(target)} ppm`,
      blocks: [
        { title: 'Bags', rows: [{ label: `${bag}-lb bags`, value: int(bags) }] },
        {
          title: 'Pool volume',
          rows: [
            { label: 'Gallons', value: int(gallons) },
            { label: 'Liters', value: int(gallons * LITERS_PER_GALLON) },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: `${int(lb)} lb · ${bags} bags`,
    };
  },
};
export default def;
