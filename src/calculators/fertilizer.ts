import type { CalculatorDef } from '../lib/calc-types';
import { num, price, str } from '../lib/calc-types';
import { areaToFt2, type AreaValue } from '../lib/units';
import { APPLICATION_UNITS, LB_PER_KG, fertilizerAmount } from '../lib/fertilizer';
import { fmt, int, money } from '../lib/format';

const def: CalculatorDef = {
  id: 'fertilizer', shapeLegend: 'Rate supplied by your label or soil-test recommendation',
  shapes: [
    { id: 'nitrogen', label: 'Target nitrogen', fields: [
      { kind: 'number', key: 'rate', label: 'Target nitrogen application rate', default: 0.5, hint: 'Example rate only; use your recommendation for this application.' },
    ] },
    { id: 'product', label: 'Product application rate', fields: [
      { kind: 'number', key: 'rate', label: 'Fertilizer product application rate', default: 4, hint: 'Weight of the whole fertilizer product, not nitrogen alone.' },
    ] },
  ],
  fields: [
    { kind: 'select', key: 'rateUnit', label: 'Application rate unit', default: 'lb-1000', options: APPLICATION_UNITS },
    { kind: 'area', key: 'area', label: 'Area to treat', default: { value: 5000, unit: 'ft2' } },
    { kind: 'number', key: 'n', label: 'Nitrogen (N) on label', default: 20, suffix: '%' },
    { kind: 'number', key: 'p', label: 'Phosphate (P₂O₅) on label', default: 0, suffix: '%' },
    { kind: 'number', key: 'k', label: 'Potash (K₂O) on label', default: 10, suffix: '%' },
    { kind: 'number', key: 'bag', label: 'Weight of one bag', default: 40 },
    { kind: 'select', key: 'bagUnit', label: 'Bag weight unit', default: 'lb', options: [{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }] },
  ],
  priceFields: [{ kind: 'money', key: 'priceBag', label: 'Price per bag', placeholder: 'e.g. 30' }],
  compute(v) {
    const a = v.area as AreaValue;
    const area = areaToFt2(a.value, a.unit);
    const bagLb = num(v, 'bag') * (str(v, 'bagUnit') === 'kg' ? LB_PER_KG : 1);
    const r = fertilizerAmount(area, num(v, 'rate'), str(v, 'rateUnit'), str(v, 'shape'), num(v, 'n'), num(v, 'p'), num(v, 'k'), bagLb);
    const p = price(v, 'priceBag');
    return {
      label: 'Fertilizer product to apply', value: r.valid ? fmt(r.productLb, 2) : 'Check inputs', unit: r.valid ? 'lb' : '',
      sub: r.valid ? `${fmt(r.productLb / LB_PER_KG, 2)} kg · ${int(r.bags)} whole ${r.bags === 1 ? 'bag' : 'bags'} to purchase` : 'Use a valid fertilizer analysis, positive bag weight, and nonzero N for a nitrogen target.',
      blocks: r.valid ? [
        { title: 'Nutrients applied', rows: [
          { label: 'Nitrogen (N)', value: `${fmt(r.nitrogenLb, 3)} lb` },
          { label: 'Phosphate (P₂O₅)', value: `${fmt(r.phosphateLb, 3)} lb` },
          { label: 'Potash (K₂O)', value: `${fmt(r.potashLb, 3)} lb` },
        ] },
        { title: 'Purchase', rows: [
          { label: 'Whole bags', value: int(r.bags) },
          { label: 'Product left after this application', value: `${fmt(r.bags * bagLb - r.productLb, 2)} lb` },
          ...(p ? [{ label: 'Bag purchase cost', value: money(r.bags * p) }] : []),
        ] },
      ] : [],
      advice: 'Apply the calculated product weight, not every bag purchased. Use your soil-test recommendation and product label to choose the rate. No extra waste is added to the application amount.',
      summary: r.valid ? `${fmt(r.productLb, 2)} lb to apply · ${int(r.bags)} ${r.bags === 1 ? 'bag' : 'bags'} to buy` : 'Check fertilizer analysis and rate',
    };
  },
};
export default def;
