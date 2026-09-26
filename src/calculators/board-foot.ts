// 板英尺计算器
import type { CalculatorDef, ResultRow, Values } from '../lib/calc-types';
import { lenFt, lenIn, num, price } from '../lib/calc-types';
import { boardFeet } from '../lib/framing';
import { fmt, money } from '../lib/format';

const measure = (v: Values) => boardFeet(lenIn(v, 'thickness'), lenIn(v, 'width'), lenFt(v, 'length'), num(v, 'quantity', 1));

const def: CalculatorDef = {
  id: 'board-foot',
  diagram: 'board-foot',
  fields: [
    { kind: 'length', key: 'thickness', label: 'Thickness', default: { value: 2, unit: 'in' }, hint: 'Hardwood: 4/4 = 1 in, 8/4 = 2 in (rough)' },
    { kind: 'length', key: 'width', label: 'Width', default: { value: 6, unit: 'in' } },
    { kind: 'length', key: 'length', label: 'Length', default: { value: 8, unit: 'ft' } },
    { kind: 'number', key: 'quantity', label: 'Number of boards', default: 1, step: 1 },
  ],
  priceFields: [{ kind: 'money', key: 'priceBf', label: 'Price per board foot', placeholder: 'e.g. 6.50' }],
  project: { format: (bf) => `${fmt(bf, 2)} BF` },
  measure,
  compute(v, total) {
    const bf = total ?? measure(v);
    const cost: ResultRow[] = [];
    const p = price(v, 'priceBf');
    if (p) cost.push({ label: `${fmt(bf, 2)} BF × ${money(p)}`, value: money(bf * p) });
    const qty = Math.max(0, Math.floor(num(v, 'quantity', 1)));
    return {
      label: 'Board feet',
      value: fmt(bf, 2),
      unit: 'BF',
      sub: `${fmt(bf / 12, 3)} ft³ · ${fmt(bf * 0.00235974, 4)} m³`,
      blocks: [
        { title: 'Lumber', rows: total === undefined ? [{ label: 'Linear feet', value: fmt(lenFt(v, 'length') * qty, 1) }] : [] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        bf > 0
          ? 'Hardwood is priced on its rough thickness, so a board sold as 8/4 counts as 2 in even after planing.'
          : 'Enter the board size to see board feet.',
      summary: `${fmt(bf, 2)} BF`,
    };
  },
};
export default def;
