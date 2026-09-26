// 瓷砖计算器：按砖尺寸 + 灰缝算块数和箱数
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenIn, num, price } from '../lib/calc-types';
import { tilesFor } from '../lib/finish';
import { fmt, int, money, ceilCount } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

const def: CalculatorDef = {
  id: 'tile',
  shapeLegend: 'Shape of the floor or wall',
  shapes: areaShapes({ length: { value: 10, unit: 'ft' }, width: { value: 8, unit: 'ft' }, area: { value: 80, unit: 'ft2' } }),
  fields: [
    { kind: 'length', key: 'tileL', label: 'Tile length', default: { value: 12, unit: 'in' } },
    { kind: 'length', key: 'tileW', label: 'Tile width', default: { value: 12, unit: 'in' } },
    { kind: 'length', key: 'joint', label: 'Grout joint', default: { value: 0.125, unit: 'in' }, hint: '1/16–1/8 in for rectified tile, 1/4 in for rustic' },
    { kind: 'number', key: 'box', label: 'Coverage per box (optional)', default: 0, step: 0.01, suffix: 'sq ft', hint: 'Leave 0 if you buy by the piece' },
    wasteField(10, '10% straight, 15% diagonal or large-format tile'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceSqft', label: 'Price per square foot', placeholder: 'e.g. 4' },
    { kind: 'money', key: 'priceTile', label: 'Price per tile', placeholder: 'e.g. 2.50' },
  ],
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const waste = num(v, 'waste', 10);
    const r = tilesFor(area, waste, lenIn(v, 'tileL'), lenIn(v, 'tileW'), lenIn(v, 'joint'));
    const box = num(v, 'box', 0);
    const boxes = box > 0 ? ceilCount(r.need / box) : 0;
    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSqft');
    const pt = price(v, 'priceTile');
    if (ps) cost.push({ label: `${fmt(box > 0 ? boxes * box : r.need, 1)} ft²`, value: money((box > 0 ? boxes * box : r.need) * ps) });
    if (pt) cost.push({ label: `${int(r.tiles)} tiles`, value: money(r.tiles * pt) });
    return {
      label: 'Tiles needed',
      value: int(r.tiles),
      unit: 'tiles',
      sub: `${fmt(area, 1)} ft² + ${waste}% extra = ${fmt(r.need, 1)} ft² · ${fmt(r.perTileFt2 > 0 ? 1 / r.perTileFt2 : 0, 2)} tiles per ft²`,
      blocks: [
        ...(box > 0 ? [{ title: 'Boxes', rows: [{ label: `Boxes of ${fmt(box, 2)} ft²`, value: int(boxes) }] }] : []),
        { title: 'Coverage', rows: [{ label: 'Square feet to buy', value: fmt(r.need, 1) }, { label: 'Each tile with grout', value: `${fmt(r.perTileFt2, 3)} ft²` }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.tiles > 0
          ? 'Order an extra box beyond the waste allowance if the tile could be discontinued. Replacement tiles from a different dye lot rarely match.'
          : 'Enter the area and tile size to see how many tiles you need.',
      summary: `${int(r.tiles)} tiles${box > 0 ? ` · ${boxes} boxes` : ''}`,
    };
  },
};
export default def;
