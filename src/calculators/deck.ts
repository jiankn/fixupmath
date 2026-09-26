// 露台计算器：面板、龙骨、封边梁、螺丝
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price } from '../lib/calc-types';
import { deckMaterials } from '../lib/deck';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';
import { deckSvg } from '../lib/figures';

const opts = (xs: [string, string][]) => xs.map(([value, label]) => ({ value, label }));

const def: CalculatorDef = {
  id: 'deck',
  diagram: 'deck',
  fields: [
    { kind: 'length', key: 'length', label: 'Deck length', default: { value: 16, unit: 'ft' }, hint: 'The direction the boards run' },
    { kind: 'length', key: 'width', label: 'Deck width', default: { value: 12, unit: 'ft' }, hint: 'Out from the house; joists span this way' },
    {
      kind: 'select',
      key: 'boardWidth',
      label: 'Board width (actual)',
      default: '5.5',
      options: opts([
        ['5.5', '5.5 in (5/4×6, 2×6, most composite)'],
        ['3.5', '3.5 in (2×4)'],
      ]),
    },
    {
      kind: 'select',
      key: 'gap',
      label: 'Gap between boards',
      default: '0.125',
      options: opts([
        ['0', 'None (wet treated lumber)'],
        ['0.125', '1/8 in'],
        ['0.1875', '3/16 in'],
        ['0.25', '1/4 in'],
      ]),
      hint: 'Composite makers often specify 3/16–1/4 in',
    },
    {
      kind: 'select',
      key: 'boardLength',
      label: 'Board length',
      default: '16',
      options: opts([
        ['8', '8 ft'],
        ['10', '10 ft'],
        ['12', '12 ft'],
        ['16', '16 ft'],
        ['20', '20 ft'],
      ]),
    },
    {
      kind: 'select',
      key: 'joistSpacing',
      label: 'Joist spacing',
      default: '16',
      options: opts([
        ['12', '12 in on center'],
        ['16', '16 in on center'],
        ['24', '24 in on center'],
      ]),
      hint: '16 in is typical; many composites and diagonal decking need 12 in',
    },
    wasteField(10, 'Covers cuts, splits, and bad boards'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceBoard', label: 'Price per deck board', placeholder: 'e.g. 24' },
    { kind: 'money', key: 'priceJoist', label: 'Price per joist', placeholder: 'e.g. 22' },
  ],
  compute(v) {
    const L = lenFt(v, 'length');
    const B = num(v, 'boardLength', 16);
    const spacing = num(v, 'joistSpacing', 16);
    const r = deckMaterials({
      lengthFt: L,
      widthFt: lenFt(v, 'width'),
      boardWidthIn: num(v, 'boardWidth', 5.5),
      gapIn: num(v, 'gap', 0.125),
      boardLengthFt: B,
      joistSpacingIn: spacing,
      wastePct: num(v, 'waste', 10),
    });

    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBoard');
    const pj = price(v, 'priceJoist');
    if (pb) cost.push({ label: `${int(r.boards)} deck boards`, value: money(r.boards * pb) });
    if (pj) cost.push({ label: `${int(r.joists)} joists`, value: money(r.joists * pj) });

    let advice = 'Posts, beams, and footings are not included. Use the concrete calculator for footing holes.';
    if (r.boards === 0) advice = 'Enter the deck length and width to see materials.';
    else if (L > B) advice = `The deck is longer than a ${B} ft board, so every row needs a joint. Stagger the joints and land each one on a joist.`;
    else if (B - L >= 2) advice = `Each ${B} ft board gets about ${fmt(B - L, 1)} ft cut off. Shorter boards would waste less.`;

    return {
      label: 'Deck boards',
      value: int(r.boards),
      unit: `× ${B} ft boards`,
      figure: deckSvg(lenIn(v, 'length'), lenIn(v, 'width'), r.joists, spacing, r.rows, num(v, 'boardWidth', 5.5), num(v, 'gap', 0.125)),
      sub: `${fmt(r.areaFt2, 1)} sq ft deck · ${int(r.linearFt)} linear ft of decking · includes ${num(v, 'waste', 10)}% extra`,
      blocks: [
        {
          title: 'Decking',
          rows: [
            { label: 'Rows of boards', value: int(r.rows) },
            { label: 'Boards per row', value: int(r.boardsPerRow) },
          ],
        },
        {
          title: 'Framing',
          rows: [
            { label: 'Joists', value: `${int(r.joists)} × ${fmt(r.joistLengthFt, 1)} ft`, note: `at ${spacing} in on center` },
            { label: 'Rim joists', value: `2 × ${fmt(L, 1)} ft` },
          ],
        },
        { title: 'Fasteners', rows: [{ label: 'Deck screws', value: int(r.screws), note: '2 per board at every joist' }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: `${int(r.boards)} boards · ${int(r.joists)} joists`,
    };
  },
};
export default def;
