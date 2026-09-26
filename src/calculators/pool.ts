// 泳池容积计算器：加仑、升、注水时间、水重
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { num, price } from '../lib/calc-types';
import { poolGallons, GALLONS_PER_FT3, LITERS_PER_GALLON, LB_PER_GALLON_WATER } from '../lib/pool';
import { fmt, int, money } from '../lib/format';
import saltPool from './salt-pool';

const def: CalculatorDef = {
  id: 'pool',
  shapeLegend: 'Pool shape',
  // 形状与盐量计算器相同，去掉「已知加仑数」
  shapes: saltPool.shapes!.filter((s) => s.id !== 'volume'),
  fields: [{ kind: 'number', key: 'flow', label: 'Fill rate', default: 8, step: 0.5, suffix: 'gal/min', hint: 'A garden hose runs about 5–10 gal/min' }],
  priceFields: [{ kind: 'money', key: 'priceKgal', label: 'Water price per 1,000 gallons', placeholder: 'e.g. 6' }],
  compute(v) {
    const gal = poolGallons(String(v.shape ?? 'rectangle'), v);
    const flow = num(v, 'flow', 8);
    const hours = flow > 0 ? gal / flow / 60 : 0;
    const cost: ResultRow[] = [];
    const p = price(v, 'priceKgal');
    if (p) cost.push({ label: `${fmt(gal / 1000, 1)} × 1,000 gal`, value: money((gal / 1000) * p) });
    return {
      label: 'Pool volume',
      value: int(gal),
      unit: 'gallons',
      sub: `${int(gal * LITERS_PER_GALLON)} liters · ${fmt(gal / GALLONS_PER_FT3, 0)} ft³`,
      blocks: [
        {
          title: 'Filling',
          rows: [
            { label: `Time at ${fmt(flow, 1)} gal/min`, value: `${fmt(hours, 1)} hours`, note: hours > 24 ? `about ${fmt(hours / 24, 1)} days` : undefined },
            { label: 'Water weight', value: `${int(gal * LB_PER_GALLON_WATER)} lb` },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        gal > 0
          ? 'Chemical doses are all based on gallons. Write this number down, and use it to size salt, chlorine, and your pump.'
          : 'Enter your pool dimensions to see the volume.',
      summary: `${int(gal)} gal · ${fmt(hours, 1)} h to fill`,
    };
  },
};
export default def;
