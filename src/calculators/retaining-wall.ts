import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price } from '../lib/calc-types';
import { retainingWall } from '../lib/retaining-wall';
import { fmt, int, money } from '../lib/format';
import { wasteField } from './shared';

const def: CalculatorDef = {
  id: 'retaining-wall', diagram: 'retaining-wall',
  fields: [
    { kind: 'length', key: 'length', label: 'Wall length', default: { value: 20, unit: 'ft' } },
    { kind: 'length', key: 'height', label: 'Visible block height', default: { value: 3, unit: 'ft' }, hint: 'Above grade, excluding the separate cap.' },
    { kind: 'length', key: 'buried', label: 'Buried block depth', default: { value: 6, unit: 'in' }, hint: 'Use the embedment required by your approved plan.' },
    { kind: 'length', key: 'blockLength', label: 'Block face length', default: { value: 12, unit: 'in' } },
    { kind: 'length', key: 'blockHeight', label: 'Block face height', default: { value: 6, unit: 'in' } },
    { kind: 'length', key: 'capLength', label: 'Cap length', default: { value: 12, unit: 'in' } },
    { kind: 'length', key: 'baseWidth', label: 'Aggregate base width', default: { value: 24, unit: 'in' }, hint: 'Example dimension; replace with your wall-system detail.' },
    { kind: 'length', key: 'baseDepth', label: 'Compacted base depth', default: { value: 6, unit: 'in' } },
    { kind: 'length', key: 'drainage', label: 'Drainage rock width behind wall', default: { value: 12, unit: 'in' } },
    { kind: 'number', key: 'coreFill', label: 'Core fill per installed block', default: 0, suffix: 'ft³', hint: 'Optional: use the manufacturer’s void volume; zero leaves it out.' },
    wasteField(5, 'Applies to blocks and caps. Aggregate is shown as compacted geometric volume.'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceBlock', label: 'Price per wall block', placeholder: 'e.g. 4' },
    { kind: 'money', key: 'priceCap', label: 'Price per cap', placeholder: 'e.g. 5' },
    { kind: 'money', key: 'priceRock', label: 'Aggregate price per cubic yard', placeholder: 'e.g. 55' },
  ],
  priceNote: 'Material subtotal for the prices entered. Allow separately for compaction ordering, labor, pipe, geogrid, delivery, and tax.',
  compute(v) {
    const r = retainingWall({ lengthFt: lenFt(v, 'length'), visibleHeightFt: lenFt(v, 'height'), buriedDepthFt: lenFt(v, 'buried'),
      blockLengthIn: lenIn(v, 'blockLength'), blockHeightIn: lenIn(v, 'blockHeight'), capLengthIn: lenIn(v, 'capLength'),
      baseWidthFt: lenFt(v, 'baseWidth'), baseDepthFt: lenFt(v, 'baseDepth'), drainageWidthFt: lenFt(v, 'drainage'),
      coreFillFt3: num(v, 'coreFill'), wastePct: num(v, 'waste') });
    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBlock'), pc = price(v, 'priceCap'), pr = price(v, 'priceRock');
    if (pb) cost.push({ label: 'Wall blocks', value: money(r.blocks * pb) });
    if (pc) cost.push({ label: 'Caps', value: money(r.caps * pc) });
    if (pr) cost.push({ label: 'Aggregate', value: money(r.rockYd3 * pr) });
    if (cost.length) cost.push({ label: 'Priced material subtotal', value: money(r.blocks * (pb ?? 0) + r.caps * (pc ?? 0) + r.rockYd3 * (pr ?? 0)) });
    return {
      label: 'Wall blocks to buy', value: int(r.blocks), unit: 'blocks', sub: `${r.courses} courses · ${r.perCourse} blocks per course before waste`,
      blocks: [
        { title: 'Block layout', rows: [
          { label: 'Installed blocks before waste', value: int(r.installed) },
          { label: 'Caps to buy', value: int(r.caps) },
          { label: 'Rounded block height including burial', value: `${fmt(r.builtHeightFt, 2)} ft` },
        ] },
        { title: 'Aggregate volumes', rows: [
          { label: 'Base', value: `${fmt(r.baseFt3 / 27)} yd³` },
          { label: 'Drainage zone', value: `${fmt(r.drainageFt3 / 27)} yd³` },
          { label: 'Block core fill', value: `${fmt(r.coreFt3 / 27)} yd³` },
          { label: 'Total geometric aggregate', value: `${fmt(r.rockYd3)} yd³` },
        ] },
        { title: 'Estimated material cost', rows: cost },
      ],
      advice: 'Straight, level segmental wall quantity estimate. Use approved system dimensions. Wall stability, drainage design, reinforcement, curves, and stepped foundations need separate planning.',
      summary: `${int(r.blocks)} blocks · ${int(r.caps)} caps · ${fmt(r.rockYd3)} yd³ rock`,
    };
  },
};
export default def;
