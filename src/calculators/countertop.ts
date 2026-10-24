import type { CalculatorDef, Values } from '../lib/calc-types';
import { lenFt, price } from '../lib/calc-types';
import { areaToFt2, type AreaValue } from '../lib/units';
import { countertopArea } from '../lib/countertop';
import { fmt, money } from '../lib/format';

const geometry = (v: Values) => {
  const cutout = v.cutout as AreaValue;
  return countertopArea(String(v.shape), lenFt(v, 'back'), lenFt(v, 'left'), lenFt(v, 'right'), lenFt(v, 'depth'), areaToFt2(cutout.value, cutout.unit));
};
const def: CalculatorDef = {
  id: 'countertop', shapeLegend: 'Countertop shape',
  shapes: [
    { id: 'rectangle', label: 'Rectangle / island', diagram: 'countertop-rect', fields: [
      { kind: 'length', key: 'back', label: 'Full length', default: { value: 8, unit: 'ft' } },
    ] },
    { id: 'l', label: 'L shape', diagram: 'countertop-l', description: 'Measure both full runs along the outside edges; the shared corner is subtracted once.', fields: [
      { kind: 'length', key: 'back', label: 'Back run, outside edge', default: { value: 8, unit: 'ft' } },
      { kind: 'length', key: 'left', label: 'Return run, outside edge', default: { value: 6, unit: 'ft' } },
    ] },
    { id: 'u', label: 'U shape', diagram: 'countertop-u', description: 'Measure all three runs along the outside edges; the two shared corners are subtracted.', fields: [
      { kind: 'length', key: 'back', label: 'Back run, outside edge', default: { value: 10, unit: 'ft' } },
      { kind: 'length', key: 'left', label: 'Left return, outside edge', default: { value: 6, unit: 'ft' } },
      { kind: 'length', key: 'right', label: 'Right return, outside edge', default: { value: 6, unit: 'ft' } },
    ] },
  ],
  fields: [
    { kind: 'length', key: 'depth', label: 'Common countertop depth', default: { value: 25.5, unit: 'in' } },
    { kind: 'area', key: 'cutout', label: 'Total cutout area to deduct', default: { value: 0, unit: 'ft2' }, hint: 'Leave at zero if your fabricator bills the full area including openings.' },
  ],
  priceFields: [{ kind: 'money', key: 'priceArea', label: 'Price per square foot', placeholder: 'e.g. 65' }],
  priceNote: 'Uses the net area after the cutout deduction you entered. Confirm how your quote treats openings, edges, seams, fabrication, and installation.',
  project: { format: n => `${fmt(n, 2)} ft²` }, measure: v => geometry(v).netFt2,
  compute(v, total) {
    const g = geometry(v);
    const area = total ?? g.netFt2;
    const valid = total === undefined ? g.valid : Number.isFinite(total) && total >= 0;
    const p = price(v, 'priceArea');
    return {
      label: 'Countertop surface area', value: valid ? fmt(area, 2) : 'Check dimensions', unit: valid ? 'ft²' : '',
      sub: valid ? `${fmt(area * 0.09290304, 3)} m² after your cutout deduction` : 'Runs must fit the depth; cutouts cannot exceed the measured surface.',
      blocks: valid ? [
        ...(total === undefined ? [{ title: 'Area breakdown', rows: [
          { label: 'Gross surface, corners counted once', value: `${fmt(g.grossFt2, 2)} ft²` },
          { label: 'Cutout deduction', value: `${fmt(g.cutoutFt2, 2)} ft²` },
        ] }] : []),
        { title: 'Area-based cost estimate', rows: p ? [{ label: `${fmt(area, 2)} ft² at your supplied rate`, value: money(area * p) }] : [] },
      ] : [],
      advice: 'Measure the finished top, including overhangs. Add a separate island or run as another project item. Area does not determine slab count; seams, grain, and slab layout affect the quote.',
      summary: valid ? `${fmt(area, 2)} ft² countertop${p ? ` · ${money(area * p)}` : ''}` : 'Check countertop dimensions and cutouts',
    };
  },
};
export default def;
