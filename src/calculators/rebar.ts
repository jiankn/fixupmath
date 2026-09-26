// 钢筋计算器：板上双向钢筋网
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { rebarGrid, REBAR, ftIn } from '../lib/framing';
import { int, money } from '../lib/format';
import { rebarSvg } from '../lib/figures';
import { wasteField } from './shared';

const def: CalculatorDef = {
  id: 'rebar',
  diagram: 'rect',
  fields: [
    { kind: 'length', key: 'length', label: 'Slab length', default: { value: 20, unit: 'ft' } },
    { kind: 'length', key: 'width', label: 'Slab width', default: { value: 20, unit: 'ft' } },
    { kind: 'select', key: 'spacing', label: 'Grid spacing', default: '12', options: ['12', '16', '18', '24'].map((s) => ({ value: s, label: `${s} in on center` })) },
    { kind: 'length', key: 'edge', label: 'Edge distance', default: { value: 3, unit: 'in' }, hint: 'Gap between bar ends and the slab edge' },
    { kind: 'select', key: 'size', label: 'Bar size', default: '#4', options: REBAR.map((b) => ({ value: b.size, label: `${b.size} (${b.diaIn} in)` })) },
    { kind: 'select', key: 'stock', label: 'Bar length', default: '20', options: ['10', '20', '40'].map((s) => ({ value: s, label: `${s} ft` })) },
    { kind: 'number', key: 'lap', label: 'Lap splice', default: 40, step: 1, suffix: '× bar dia.', hint: 'Commonly 40 bar diameters; follow your plans' },
    wasteField(5, 'Offcuts and extra for mistakes'),
  ],
  priceFields: [{ kind: 'money', key: 'priceBar', label: 'Price per bar', placeholder: 'e.g. 12' }],
  compute(v) {
    const stockIn = num(v, 'stock', 20) * 12;
    const r = rebarGrid({
      lengthFt: lenFt(v, 'length'),
      widthFt: lenFt(v, 'width'),
      spacingIn: num(v, 'spacing', 12),
      edgeIn: lenIn(v, 'edge'),
      size: str(v, 'size'),
      stockFt: num(v, 'stock', 20),
      lapDiameters: num(v, 'lap', 40),
      wastePct: num(v, 'waste', 5),
    });
    const spliced = r.alongLength.barIn > stockIn || r.alongWidth.barIn > stockIn;
    const cost: ResultRow[] = [];
    const p = price(v, 'priceBar');
    if (p) cost.push({ label: `${r.sticks} bars`, value: money(r.sticks * p) });
    return {
      label: `${r.bar.size} bars to buy`,
      value: int(r.sticks),
      unit: `× ${num(v, 'stock', 20)} ft`,
      sub: `${int(r.totalFt)} linear ft · ${int(r.weightLb)} lb`,
      figure: rebarSvg(lenIn(v, 'length'), lenIn(v, 'width'), lenIn(v, 'edge'), num(v, 'spacing', 12), r.alongLength, r.alongWidth, spliced),
      blocks: [
        {
          title: 'Grid',
          rows: [
            { label: 'Bars running the length', value: `${r.alongLength.count} × ${ftIn(r.alongLength.barIn)}` },
            { label: 'Bars running the width', value: `${r.alongWidth.count} × ${ftIn(r.alongWidth.barIn)}` },
            ...(spliced ? [{ label: 'Lap splice', value: ftIn(r.lapIn), note: 'Added where a run is longer than one bar' }] : []),
          ],
        },
        { title: 'Weight', rows: [{ label: 'Total steel', value: `${int(r.weightLb)} lb`, note: `${r.bar.lbPerFt} lb per foot of ${r.bar.size}` }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.sticks > 0
          ? 'Set bars on chairs so they sit in the middle of the slab, not on the ground. Bar size and spacing should follow your plans or local code.'
          : 'Enter the slab size to lay out the rebar grid.',
      summary: `${int(r.sticks)} bars · ${int(r.weightLb)} lb`,
    };
  },
};
export default def;
