import type { CalculatorDef } from '../lib/calc-types';
import { lenIn, num, price, str } from '../lib/calc-types';
import { areaFt2, areaShapes, wasteField } from './shared';
import { epoxyVolume, LITERS_PER_GALLON } from '../lib/epoxy';
import { fmt, int, money } from '../lib/format';

const def: CalculatorDef = {
  id: 'epoxy', shapes: areaShapes({ length: { value: 4, unit: 'ft' }, width: { value: 2, unit: 'ft' } }),
  fields: [
    { kind: 'length', key: 'depth', label: 'Epoxy layer thickness', default: { value: 0.125, unit: 'in' }, hint: 'Calculate one planned layer at a time; use your product’s pour limits.' },
    wasteField(10, 'Allowance for mixing-cup residue, irregular edges, and handling.'),
    { kind: 'number', key: 'resinParts', label: 'Resin parts by volume', default: 1, hint: 'Copy the volume ratio from your product instructions.' },
    { kind: 'number', key: 'hardenerParts', label: 'Hardener parts by volume', default: 1 },
    { kind: 'number', key: 'kit', label: 'Combined mixed volume per kit', default: 1, hint: 'Resin plus hardener together, not the resin container alone.' },
    { kind: 'select', key: 'kitUnit', label: 'Kit volume unit', default: 'gal', options: [{ value: 'gal', label: 'US gallons' }, { value: 'l', label: 'liters' }] },
  ],
  priceFields: [{ kind: 'money', key: 'priceKit', label: 'Price per combined kit', placeholder: 'e.g. 65' }],
  compute(v) {
    const kitGal = num(v, 'kit') / (str(v, 'kitUnit') === 'l' ? LITERS_PER_GALLON : 1);
    const r = epoxyVolume(areaFt2(v), lenIn(v, 'depth'), num(v, 'waste'), num(v, 'resinParts'), num(v, 'hardenerParts'), kitGal);
    const p = price(v, 'priceKit');
    return {
      label: 'Mixed epoxy including allowance', value: r.valid ? fmt(r.totalGal, 3) : 'Check inputs', unit: r.valid ? 'US gal' : '',
      sub: r.valid ? `${fmt(r.liters, 3)} L · ${fmt(r.totalGal * 128, 1)} US fl oz` : 'Area, depth, both volume-ratio parts, and kit volume must be positive.',
      blocks: r.valid ? [
        { title: 'Mix by volume', rows: [
          { label: 'Resin (Part A)', value: `${fmt(r.resinGal * LITERS_PER_GALLON, 3)} L`, note: `${fmt(r.resinGal * 128, 1)} US fl oz` },
          { label: 'Hardener (Part B)', value: `${fmt(r.hardenerGal * LITERS_PER_GALLON, 3)} L`, note: `${fmt(r.hardenerGal * 128, 1)} US fl oz` },
          { label: 'Net geometric pour before allowance', value: `${fmt(r.netGal, 3)} US gal` },
        ] },
        { title: 'Purchase', rows: [
          { label: 'Combined kits to buy', value: int(r.kits) },
          ...(p ? [{ label: 'Kit purchase cost', value: money(r.kits * p) }] : []),
        ] },
      ] : [],
      advice: 'These parts are volumes, not weights. Keep the manufacturer’s exact ratio. Follow the product’s maximum batch size and layer depth; the total project quantity is not a single-batch recommendation.',
      summary: r.valid ? `${fmt(r.totalGal, 3)} US gal mixed · ${int(r.kits)} ${r.kits === 1 ? 'kit' : 'kits'}` : 'Check epoxy dimensions and volume ratio',
    };
  },
};
export default def;
