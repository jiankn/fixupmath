// 混凝土板计算器：长 × 宽 × 厚，可选加厚边和损耗，给出立方码、袋数和预拌下单量
import type { CalculatorDef, ResultRow, Values } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { slabVolume, bagsFor, BAG_YIELDS } from '../lib/concrete-bags';
import { readyMixOrder, CONCRETE_DENSITY_LB_FT3 } from '../lib/concrete';
import { cubicFeetToCubicMeters } from '../lib/units';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

const slabOf = (v: Values) =>
  slabVolume({
    lengthFt: lenFt(v, 'length'),
    widthFt: lenFt(v, 'width'),
    thicknessFt: lenFt(v, 'thickness'),
    edgeDepthFt: str(v, 'edge') === 'yes' ? lenFt(v, 'edgeDepth') : 0,
    edgeWidthFt: str(v, 'edge') === 'yes' ? lenFt(v, 'edgeWidth') : 0,
  });

const SHOWN_BAGS = [80, 60, 40] as const;

const def: CalculatorDef = {
  id: 'concrete-slab',
  diagram: 'rect',
  fields: [
    { kind: 'length', key: 'length', label: 'Length', default: { value: 10, unit: 'ft' } },
    { kind: 'length', key: 'width', label: 'Width', default: { value: 10, unit: 'ft' } },
    { kind: 'length', key: 'thickness', label: 'Thickness', default: { value: 4, unit: 'in' }, hint: '4 in for patios and walks; 5–6 in for driveways' },
    {
      kind: 'select',
      key: 'edge',
      label: 'Thickened edge',
      default: 'no',
      options: [
        { value: 'no', label: 'None' },
        { value: 'yes', label: 'Yes, around the perimeter' },
      ],
      hint: 'A deeper strip under the slab edges, common on shed and garage slabs',
    },
    { kind: 'length', key: 'edgeDepth', label: 'Total depth at edge', default: { value: 12, unit: 'in' }, hint: 'Measured from the top of the slab', showWhen: { key: 'edge', equals: 'yes' } },
    { kind: 'length', key: 'edgeWidth', label: 'Edge width', default: { value: 12, unit: 'in' }, hint: 'Width of the deeper strip', showWhen: { key: 'edge', equals: 'yes' } },
    wasteField(10, 'Covers uneven subgrade, form bulge, and spillage'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceYard', label: 'Ready-mix price per cubic yard', placeholder: 'from your supplier' },
    { kind: 'money', key: 'priceBag', label: 'Price per 80-lb bag', placeholder: 'from your store' },
  ],
  priceNote: 'Ready-mix quotes often add delivery and short-load fees. Ask your supplier.',
  project: { format: (ft3) => `${fmt(ft3 / 27)} yd³` },
  measure: (v) => slabOf(v).netFt3,
  compute(v, total) {
    const s = slabOf(v);
    const net = total ?? s.netFt3;
    const waste = num(v, 'waste', 10);
    const ft3 = net * (1 + Math.max(0, waste) / 100);
    const yd3 = ft3 / 27;
    const order = readyMixOrder(yd3);
    const bags = SHOWN_BAGS.map((lb) => ({ lb, count: bagsFor(ft3, BAG_YIELDS.find((b) => b.lb === lb)!.ft3) }));
    const bag80 = bags[0].count;

    const cost: ResultRow[] = [];
    const py = price(v, 'priceYard');
    const pb = price(v, 'priceBag');
    if (py) cost.push({ label: `Ready-mix, ${fmt(order)} yd³ ordered`, value: money(order * py), note: 'before delivery fees' });
    if (pb) cost.push({ label: `${int(bag80)} bags at 80 lb`, value: money(bag80 * pb) });

    const volumeRows: ResultRow[] = [
      { label: 'Cubic feet', value: fmt(ft3) },
      { label: 'Cubic meters', value: fmt(cubicFeetToCubicMeters(ft3)) },
    ];
    if (total === undefined) {
      volumeRows.unshift({ label: 'Slab area', value: `${fmt(s.areaFt2, 1)} ft²` });
      if (s.edgeFt3 > 0) volumeRows.push({ label: 'Thickened edge adds', value: `${fmt(s.edgeFt3)} ft³`, note: 'before waste' });
    }

    const advice = !(yd3 > 0)
      ? 'Enter the slab length, width, and thickness.'
      : yd3 < 0.5
        ? `A small pour: ${int(bag80)} bags at 80 lb is usually easier than a truck.`
        : yd3 < 1.5
          ? `${int(bag80)} bags at 80 lb is a lot of hand mixing. Price a short load of ready-mix too.`
          : `Order ready-mix: about ${fmt(order)} yd³. One truck lets you pour the whole slab at once.`;

    return {
      label: 'Concrete for this slab',
      value: fmt(yd3),
      unit: 'cubic yards',
      sub: `${fmt(ft3)} ft³ · includes ${waste}% extra`,
      blocks: [
        { title: 'Volume', rows: volumeRows },
        { title: 'Premixed bags', rows: bags.map((b) => ({ label: `${b.lb}-lb bags`, value: int(b.count) })) },
        {
          title: 'Ready-mix order',
          rows: [
            { label: 'Order', value: `${fmt(order)} yd³`, note: 'rounded up to the next ¼ yard' },
            { label: 'Approx. weight', value: `${int(ft3 * CONCRETE_DENSITY_LB_FT3)} lb` },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: `${fmt(yd3)} yd³ · ${int(bag80)} bags (80 lb)`,
    };
  },
};
export default def;
