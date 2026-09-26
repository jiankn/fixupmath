// 外墙挂板计算器：墙面 + 山墙三角 − 门窗 → 平方数（square = 100 ft²）
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price } from '../lib/calc-types';
import { wallAreaFt2 } from '../lib/finish';
import { fmt, money, ceilCount } from '../lib/format';
import { wasteField } from './shared';
import { gableWallSvg } from '../lib/figures';

const def: CalculatorDef = {
  id: 'siding',
  diagram: 'house',
  fields: [
    { kind: 'length', key: 'perimeter', label: 'Total wall length', default: { value: 140, unit: 'ft' }, hint: 'Add up every wall you are siding' },
    { kind: 'length', key: 'height', label: 'Wall height', default: { value: 9, unit: 'ft' }, hint: 'Foundation to eaves' },
    { kind: 'number', key: 'gables', label: 'Gables', default: 2, step: 1 },
    { kind: 'length', key: 'gableWidth', label: 'Gable width', default: { value: 30, unit: 'ft' } },
    { kind: 'length', key: 'gableHeight', label: 'Gable height', default: { value: 8, unit: 'ft' }, hint: 'From the eave line to the peak' },
    { kind: 'number', key: 'doors', label: 'Doors', default: 2, step: 1, hint: 'Deducts 21 sq ft each' },
    { kind: 'number', key: 'windows', label: 'Windows', default: 10, step: 1, hint: 'Deducts 15 sq ft each' },
    wasteField(10, '10% for simple walls, 15% with many corners and gables'),
  ],
  priceFields: [{ kind: 'money', key: 'priceSquare', label: 'Price per square (100 sq ft)', placeholder: 'e.g. 200' }],
  compute(v) {
    const walls = wallAreaFt2(lenFt(v, 'perimeter'), lenFt(v, 'height'), num(v, 'doors', 0), num(v, 'windows', 0));
    const gables = Math.max(0, Math.floor(num(v, 'gables', 0))) * ((lenFt(v, 'gableWidth') * lenFt(v, 'gableHeight')) / 2);
    const area = walls + gables;
    const waste = num(v, 'waste', 10);
    const need = area * (1 + waste / 100);
    const squares = need / 100;
    const boxes = ceilCount(squares / 2);
    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSquare');
    if (ps) cost.push({ label: `${fmt(Math.ceil(squares - 1e-9))} squares`, value: money(Math.ceil(squares - 1e-9) * ps) });
    return {
      label: 'Siding needed',
      value: fmt(squares, 1),
      unit: 'squares',
      figure: gableWallSvg(lenIn(v, 'gableWidth'), lenIn(v, 'height'), lenIn(v, 'gableHeight'), num(v, 'gables', 0)),
      sub: `${fmt(need, 0)} ft² including ${waste}% extra · 1 square = 100 ft²`,
      blocks: [
        {
          title: 'Area',
          rows: [
            { label: 'Walls (after doors and windows)', value: `${fmt(walls, 0)} ft²` },
            { label: 'Gables', value: `${fmt(gables, 0)} ft²` },
          ],
        },
        { title: 'Vinyl siding boxes', rows: [{ label: 'Boxes of 2 squares', value: String(boxes), note: 'Most vinyl siding ships 2 squares per box; check your product' }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        area > 0
          ? 'Trim pieces such as J-channel, corner posts, starter strip, and soffit are sold separately by the linear foot.'
          : 'Enter your wall measurements to see how much siding you need.',
      summary: `${fmt(squares, 1)} squares · ${boxes} boxes`,
    };
  },
};
export default def;
