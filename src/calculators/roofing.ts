// 屋面计算器：占地面积 + 坡度 + 屋顶形式 → 屋面面积、平方数和整张材料清单
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { roofMaterials, UNDERLAYMENTS, NAILS_PER_SQUARE, RIDGE_CAP_LF_PER_BUNDLE, STARTER_LF_PER_BUNDLE, DRIP_EDGE_PIECE_FT } from '../lib/roof';
import { areaToFt2, type AreaValue } from '../lib/units';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

export const ROOF_PITCHES = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18];

const def: CalculatorDef = {
  id: 'roofing',
  shapeLegend: 'What do you know?',
  shapes: [
    {
      id: 'footprint',
      label: 'House footprint',
      diagram: 'roof-plan',
      description: 'Measure the length and width of the roof from above, including the overhangs.',
      fields: [
        { kind: 'length', key: 'length', label: 'Roof length', default: { value: 50, unit: 'ft' } },
        { kind: 'length', key: 'width', label: 'Roof width', default: { value: 30, unit: 'ft' } },
      ],
    },
    {
      id: 'area',
      label: 'Roof area',
      description: 'Already have the sloped roof area, e.g. from a roofing report? Enter it and set pitch to Flat.',
      fields: [{ kind: 'area', key: 'area', label: 'Roof area', default: { value: 1700, unit: 'ft2' } }],
    },
  ],
  fields: [
    {
      kind: 'select',
      key: 'pitch',
      label: 'Roof pitch',
      default: '6',
      options: ROOF_PITCHES.map((p) => ({ value: String(p), label: p === 0 ? 'Flat / already sloped area' : `${p}/12` })),
      hint: 'Not sure? Use the roof pitch calculator',
    },
    {
      kind: 'select',
      key: 'type',
      label: 'Roof shape',
      default: 'gable',
      options: [
        { value: 'gable', label: 'Gable (two slopes)' },
        { value: 'hip', label: 'Hip (four slopes)' },
      ],
      hint: 'Sets the length of eaves, rakes, ridges, and hips',
    },
    wasteField(10, '10% for gable roofs, 15% for hips and valleys'),
    {
      kind: 'select',
      key: 'bundles',
      label: 'Bundles per square',
      default: '3',
      options: [
        { value: '3', label: '3 (most architectural and 3-tab)' },
        { value: '4', label: '4 (some heavier shingles)' },
      ],
    },
    { kind: 'select', key: 'underlay', label: 'Underlayment', default: UNDERLAYMENTS[0].value, options: UNDERLAYMENTS.map(({ value, label }) => ({ value, label })) },
  ],
  priceFields: [
    { kind: 'money', key: 'priceSquare', label: 'Installed price per square', placeholder: 'from your roofer’s quote' },
    { kind: 'money', key: 'priceBundle', label: 'Shingle price per bundle', placeholder: 'e.g. 38' },
  ],
  priceNote: 'Roofers quote per square (100 ft²) installed. Tear-off, disposal, and decking repairs are often extra.',
  compute(v) {
    const byArea = str(v, 'shape') === 'area';
    const pitch = num(v, 'pitch', 6);
    const type = str(v, 'type') === 'hip' ? 'hip' : 'gable';
    const waste = num(v, 'waste', 10);
    const u = UNDERLAYMENTS.find((x) => x.value === str(v, 'underlay')) ?? UNDERLAYMENTS[0];
    const a = v.area as AreaValue | undefined;
    const r = roofMaterials({
      lengthFt: byArea ? 0 : lenFt(v, 'length'),
      widthFt: byArea ? 0 : lenFt(v, 'width'),
      slopedFt2: byArea ? areaToFt2(a?.value || 0, a?.unit ?? 'ft2') * Math.sqrt(1 + (pitch / 12) ** 2) : undefined,
      pitch,
      type,
      wastePct: waste,
      bundlesPerSquare: num(v, 'bundles', 3),
      underlayCoverFt2: u.coverFt2,
    });

    const cost: ResultRow[] = [];
    const ps = price(v, 'priceSquare');
    const pb = price(v, 'priceBundle');
    if (ps) cost.push({ label: `Installed, ${fmt(r.squares, 1)} squares`, value: money(r.squares * ps) });
    if (pb) cost.push({ label: `${r.bundles} bundles of shingles`, value: money(r.bundles * pb) });

    const lines: ResultRow[] = r.hasPlan
      ? [
          { label: 'Drip edge', value: `${r.dripEdgePieces} pieces`, note: `${fmt(r.dripEdgeFt, 0)} ft of eaves and rakes in ${DRIP_EDGE_PIECE_FT} ft pieces` },
          { label: 'Starter strip', value: `${r.starterBundles} bundles`, note: `${fmt(r.eavesFt, 0)} ft of eaves, ≈${STARTER_LF_PER_BUNDLE} ft per bundle` },
          { label: 'Ridge cap', value: `${r.ridgeCapBundles} bundles`, note: `${fmt(r.ridgeCapFt, 0)} ft of ${type === 'hip' ? 'ridge and hips' : 'ridge'}, ≈${RIDGE_CAP_LF_PER_BUNDLE} ft per bundle` },
        ]
      : [];

    return {
      label: 'Roof size',
      value: fmt(r.squares, 1),
      unit: 'squares',
      sub: `${fmt(r.sloped, 0)} ft² of roof + ${waste}% extra · ${r.bundles} bundles of shingles`,
      blocks: [
        {
          title: 'Roof area',
          rows: [
            ...(byArea ? [] : [{ label: 'Footprint', value: `${fmt(r.footprint, 0)} ft²` }]),
            { label: `Pitch factor (${pitch}/12)`, value: `× ${fmt(r.factor, 3)}` },
            { label: 'Sloped roof area', value: `${fmt(r.sloped, 0)} ft²` },
          ],
        },
        {
          title: 'Materials',
          rows: [
            { label: 'Shingles', value: `${r.bundles} bundles` },
            { label: 'Underlayment', value: `${r.underlayRolls} rolls`, note: u.label },
            ...lines,
            { label: 'Roofing nails', value: int(r.nails), note: `≈${NAILS_PER_SQUARE} per square, four nails per shingle` },
          ],
        },
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.squares <= 0
          ? 'Enter your roof size to see how many squares it is.'
          : r.hasPlan
            ? 'Valleys, dormers, chimneys, and skylights add flashing and waste. Raise the waste to 15% or more for a cut-up roof.'
            : 'With only the roof area, eave, rake, and ridge lengths are unknown. Enter the footprint for drip edge, starter, and ridge cap.',
      summary: `${fmt(r.squares, 1)} squares · ${r.bundles} bundles`,
    };
  },
};
export default def;
