// 围栏计算器：立柱、横杆、栅板、立柱坑混凝土
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { fenceMaterials } from '../lib/fence';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';
import { fenceSvg } from '../lib/figures';

const opts = (xs: [string, string][]) => xs.map(([value, label]) => ({ value, label }));

const def: CalculatorDef = {
  id: 'fence',
  diagram: 'fence',
  fields: [
    { kind: 'length', key: 'length', label: 'Total fence length', default: { value: 100, unit: 'ft' }, hint: 'Include the gate openings' },
    {
      kind: 'select',
      key: 'height',
      label: 'Fence height',
      default: '6',
      options: opts([
        ['4', '4 ft'],
        ['5', '5 ft'],
        ['6', '6 ft'],
        ['8', '8 ft'],
      ]),
    },
    {
      kind: 'select',
      key: 'spacing',
      label: 'Post spacing',
      default: '8',
      options: opts([
        ['6', '6 ft'],
        ['8', '8 ft'],
      ]),
      hint: '8 ft is standard for wood; check your panel width for vinyl',
    },
    {
      kind: 'select',
      key: 'rails',
      label: 'Rails per section',
      default: '3',
      options: opts([
        ['2', '2 rails'],
        ['3', '3 rails'],
        ['4', '4 rails'],
      ]),
      hint: '2 for fences up to 4 ft, 3 for 6 ft privacy',
    },
    {
      kind: 'select',
      key: 'picketWidth',
      label: 'Picket width (actual)',
      default: '5.5',
      options: opts([
        ['5.5', '5.5 in (1×6)'],
        ['3.5', '3.5 in (1×4)'],
      ]),
    },
    { kind: 'length', key: 'gap', label: 'Gap between pickets', default: { value: 0, unit: 'in' }, hint: '0 for privacy; about 2.5 in for a picket look' },
    { kind: 'number', key: 'gates', label: 'Number of gates', default: 1, step: 1 },
    { kind: 'length', key: 'gateWidth', label: 'Gate width', default: { value: 4, unit: 'ft' } },
    {
      kind: 'select',
      key: 'post',
      label: 'Post size',
      default: '3.5',
      options: opts([
        ['3.5', '4×4 (3.5 in actual)'],
        ['5.5', '6×6 (5.5 in actual)'],
      ]),
    },
    { kind: 'length', key: 'holeDiameter', label: 'Post hole diameter', default: { value: 10, unit: 'in' }, hint: 'About 3× the post width' },
    {
      kind: 'length',
      key: 'holeDepth',
      label: 'Post hole depth',
      default: { value: 2, unit: 'ft' },
      hint: 'Often ⅓ of the fence height; go below your frost line',
    },
    wasteField(5, 'Extra pickets for splits and bad boards'),
  ],
  priceFields: [
    { kind: 'money', key: 'pricePost', label: 'Price per post', placeholder: 'e.g. 18' },
    { kind: 'money', key: 'priceRail', label: 'Price per rail', placeholder: 'e.g. 9' },
    { kind: 'money', key: 'pricePicket', label: 'Price per picket', placeholder: 'e.g. 3.50' },
    { kind: 'money', key: 'priceBag', label: 'Price per 80-lb concrete bag', placeholder: 'e.g. 6.50' },
  ],
  compute(v) {
    const height = num(v, 'height', 6);
    const gates = Math.max(0, Math.floor(num(v, 'gates', 0)));
    const r = fenceMaterials({
      lengthFt: lenFt(v, 'length'),
      postSpacingFt: num(v, 'spacing', 8),
      heightFt: height,
      railsPerSection: num(v, 'rails', 3),
      picketWidthIn: num(v, 'picketWidth', 5.5),
      picketGapIn: lenIn(v, 'gap'),
      gates,
      gateWidthFt: lenFt(v, 'gateWidth'),
      holeDiameterIn: lenIn(v, 'holeDiameter'),
      holeDepthFt: lenFt(v, 'holeDepth'),
      postSizeIn: num(v, 'post', 3.5),
      wastePct: num(v, 'waste', 5),
    });
    const postName = str(v, 'post') === '5.5' ? '6×6' : '4×4';
    const bags80 = r.bags.find((b) => b.lb === 80)!.count;

    const cost: ResultRow[] = [];
    const add = (key: string, n: number, what: string) => {
      const p = price(v, key);
      if (p) cost.push({ label: `${int(n)} ${what}`, value: money(n * p) });
    };
    add('pricePost', r.posts, 'posts');
    add('priceRail', r.rails, 'rails');
    add('pricePicket', r.pickets, 'pickets');
    add('priceBag', bags80, 'bags of concrete');

    return {
      label: 'Fence posts',
      value: int(r.posts),
      unit: 'posts',
      figure: fenceSvg(num(v, 'spacing', 8), height, num(v, 'rails', 3), num(v, 'picketWidth', 5.5), lenIn(v, 'gap'), num(v, 'post', 3.5), lenIn(v, 'holeDiameter'), lenFt(v, 'holeDepth')),
      sub: `${int(r.sections)} sections · ${fmt(r.runFt, 1)} ft of fence${gates ? ` + ${gates} gate${gates > 1 ? 's' : ''}` : ''}`,
      blocks: [
        {
          title: 'Posts',
          rows: [
            {
              label: `${r.stockPostFt} ft ${postName} posts`,
              value: int(r.posts),
              note: `${fmt(r.postLengthFt, 1)} ft needed: ${fmt(height)} ft above ground + ${fmt(r.postLengthFt - height, 1)} ft buried`,
            },
          ],
        },
        { title: 'Rails', rows: [{ label: `${fmt(r.railLengthFt)} ft rails`, value: int(r.rails) }] },
        { title: 'Pickets', rows: [{ label: `${fmt(height)} ft pickets`, value: int(r.pickets) }] },
        {
          title: 'Concrete for post holes',
          rows: r.bags.map((b) => ({ label: `${b.lb}-lb bags`, value: int(b.count) })),
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.posts > 0
          ? 'Confirm your property line and call 811 a few days before you dig so buried utilities get marked.'
          : 'Enter the fence length to see materials.',
      summary: `${int(r.posts)} posts · ${int(r.pickets)} pickets`,
    };
  },
};
export default def;
