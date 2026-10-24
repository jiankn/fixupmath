import type { CalculatorDef } from '../lib/calc-types';
import { lenIn, num, price, str } from '../lib/calc-types';
import { areaToFt2, type AreaValue } from '../lib/units';
import { GROUT_PRODUCTS, GROUT_TILES, GROUT_JOINTS, groutCoverage, groutBags, groutJointVolume } from '../lib/grout';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

const def: CalculatorDef = {
  id: 'grout', shapeLegend: 'Estimate using',
  shapes: [
    { id: 'coverage', label: 'Published product coverage', fields: [
      { kind: 'select', key: 'product', label: 'Grout product and package', default: 'mapei-25', options: GROUT_PRODUCTS.map(({ value, label }) => ({ value, label })) },
      { kind: 'select', key: 'tile', label: 'Tile size and joint depth', default: '12x24', options: GROUT_TILES, hint: 'Exact published profiles only. For other sizes use custom dimensions.' },
      { kind: 'select', key: 'joint', label: 'Grout joint width', default: '1/8', options: GROUT_JOINTS },
    ] },
    { id: 'dimensions', label: 'Custom tile dimensions', diagram: 'grout', description: 'Use the mixed yield for your grout. The yield and bag size below are examples, not a brand preset.', fields: [
      { kind: 'length', key: 'tileLength', label: 'Tile length', default: { value: 12, unit: 'in' } },
      { kind: 'length', key: 'tileWidth', label: 'Tile width', default: { value: 24, unit: 'in' } },
      { kind: 'length', key: 'jointWidth', label: 'Grout joint width', default: { value: 0.125, unit: 'in' } },
      { kind: 'length', key: 'depth', label: 'Filled joint depth', default: { value: 0.375, unit: 'in' } },
      { kind: 'number', key: 'yield', label: 'Mixed grout yield per bag', default: 0.25, suffix: 'ft³', hint: 'Example only: replace with a product-specific yield.' },
      { kind: 'number', key: 'bagLb', label: 'Dry grout in one bag', default: 25, suffix: 'lb' },
    ] },
  ],
  fields: [
    { kind: 'area', key: 'area', label: 'Area to grout', default: { value: 100, unit: 'ft2' } },
    wasteField(10, 'Extra product for mixing, cleanup, and installation losses.'),
  ],
  priceFields: [{ kind: 'money', key: 'priceBag', label: 'Price per selected bag', placeholder: 'e.g. 35' }],
  compute(v) {
    const a = v.area as AreaValue;
    const area = areaToFt2(a.value, a.unit);
    const product = GROUT_PRODUCTS.find(p => p.value === str(v, 'product'));
    const custom = v.shape === 'dimensions';
    const volume = custom ? groutJointVolume(area, lenIn(v, 'tileLength'), lenIn(v, 'tileWidth'), lenIn(v, 'jointWidth'), lenIn(v, 'depth')) : 0;
    const coverage = custom ? (volume > 0 ? area * num(v, 'yield') / volume : 0) : groutCoverage(str(v, 'product'), str(v, 'tile'), str(v, 'joint'));
    const bagLb = custom ? num(v, 'bagLb') : product?.bagLb ?? 0;
    const r = groutBags(area, coverage ?? 0, bagLb, num(v, 'waste'));
    const p = price(v, 'priceBag');
    return {
      label: 'Whole bags to buy', value: r.valid ? int(r.bags) : 'Check inputs', unit: r.valid ? (r.bags === 1 ? 'bag' : 'bags') : '',
      sub: r.valid ? `${fmt(r.pounds, 2)} lb (${fmt(r.pounds * 0.45359237, 2)} kg) dry grout including waste` : 'Choose a supported profile or supply a positive product yield and tile dimensions.',
      blocks: r.valid ? [
        { title: 'Quantity basis', rows: [
          { label: 'Coverage per bag', value: `${fmt(coverage!, 2)} ft²`, note: custom ? 'Calculated from your dimensions and supplied yield.' : 'Manufacturer chart, before the waste allowance.' },
          { label: 'Package size', value: `${bagLb} lb` },
          { label: 'Equivalent full bags before rounding', value: fmt(r.equivalentBags, 3) },
          ...(custom ? [{ label: 'Geometric joint volume before waste', value: `${fmt(volume, 3)} ft³` }] : []),
        ] },
        { title: 'Estimated material cost', rows: p ? [{ label: `${r.bags} bags`, value: money(r.bags * p) }] : [] },
      ] : [],
      advice: custom ? 'Rectangular tile grid only; enter the manufacturer’s mixed yield. Curved mosaics, uneven depth, and unusual layouts need a product-specific estimate.' : 'Coverage is approximate. MAPEI and LATICRETE use their own published package tables. The PERMACOLOR values do not apply to PERMACOLOR Select.',
      summary: r.valid ? `${int(r.bags)} ${r.bags === 1 ? 'bag' : 'bags'} · ${fmt(r.pounds, 2)} lb dry grout` : 'Check grout profile and inputs',
    };
  },
};
export default def;
