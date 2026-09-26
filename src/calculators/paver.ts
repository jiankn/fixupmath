// 铺路砖计算器：砖块数 + 碎石垫层 + 沙层
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price } from '../lib/calc-types';
import { tilesFor } from '../lib/finish';
import { bulkResult } from '../lib/bulk';
import { fmt, int, money } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

export const BASE_TONS_PER_YD3 = 1.4;
export const SAND_TONS_PER_YD3 = 1.35;

const def: CalculatorDef = {
  id: 'paver',
  shapeLegend: 'Shape of the patio or walkway',
  shapes: areaShapes({ length: { value: 12, unit: 'ft' }, width: { value: 12, unit: 'ft' }, area: { value: 144, unit: 'ft2' } }),
  fields: [
    { kind: 'length', key: 'paverL', label: 'Paver length', default: { value: 8, unit: 'in' } },
    { kind: 'length', key: 'paverW', label: 'Paver width', default: { value: 4, unit: 'in' } },
    { kind: 'length', key: 'base', label: 'Gravel base depth', default: { value: 4, unit: 'in' }, hint: '4–6 in for patios and walks, 8–12 in for driveways' },
    { kind: 'length', key: 'sand', label: 'Sand bedding depth', default: { value: 1, unit: 'in' } },
    wasteField(10, '5% straight edges, 10–15% curves and patterns'),
  ],
  priceFields: [
    { kind: 'money', key: 'pricePaver', label: 'Price per paver', placeholder: 'e.g. 0.75' },
    { kind: 'money', key: 'priceBase', label: 'Gravel price per ton', placeholder: 'e.g. 35' },
    { kind: 'money', key: 'priceSand', label: 'Sand price per ton', placeholder: 'e.g. 40' },
  ],
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const waste = num(v, 'waste', 10);
    // 铺路砖一般紧贴铺设，缝里扫砂，不单独计灰缝
    const p = tilesFor(area, waste, lenIn(v, 'paverL'), lenIn(v, 'paverW'), 0);
    // 垫层压实后会变薄，按 10% 余量；沙层 5%
    const base = bulkResult(area * lenFt(v, 'base'), 10, BASE_TONS_PER_YD3, [0.5]);
    const sand = bulkResult(area * lenFt(v, 'sand'), 5, SAND_TONS_PER_YD3, [0.5]);
    const cost: ResultRow[] = [];
    const pp = price(v, 'pricePaver');
    const pb = price(v, 'priceBase');
    const ps = price(v, 'priceSand');
    if (pp) cost.push({ label: `${int(p.tiles)} pavers`, value: money(p.tiles * pp) });
    if (pb) cost.push({ label: `Gravel, ${fmt(base.orderTons)} tons`, value: money(base.orderTons * pb) });
    if (ps) cost.push({ label: `Sand, ${fmt(sand.orderTons)} tons`, value: money(sand.orderTons * ps) });
    return {
      label: 'Pavers needed',
      value: int(p.tiles),
      unit: 'pavers',
      sub: `${fmt(area, 1)} ft² + ${waste}% extra · ${fmt(p.perTileFt2 > 0 ? 1 / p.perTileFt2 : 0, 2)} pavers per ft²`,
      blocks: [
        {
          title: 'Gravel base',
          rows: [
            { label: 'Cubic yards', value: fmt(base.cubicYards), note: 'includes 10% for compaction' },
            { label: 'Tons', value: fmt(base.tons), note: `order ${fmt(base.orderTons)} tons` },
          ],
        },
        {
          title: 'Bedding sand',
          rows: [
            { label: 'Cubic yards', value: fmt(sand.cubicYards) },
            { label: 'Tons', value: fmt(sand.tons) },
            { label: '0.5 cu ft bags', value: int(sand.bags[0].count) },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        p.tiles > 0
          ? 'Joint sand for sweeping between pavers is extra; polymeric sand bags list their own coverage.'
          : 'Enter the area and paver size to see how many pavers you need.',
      summary: `${int(p.tiles)} pavers · ${fmt(base.tons, 1)} t gravel`,
    };
  },
};
export default def;
