// 椽子计算器：跨度 + 坡度 + 挑檐 → 椽子长度、根数
import type { CalculatorDef } from '../lib/calc-types';
import { lenFt, lenIn, num } from '../lib/calc-types';
import { rafter, rafterCount, ftIn } from '../lib/framing';
import { fmt } from '../lib/format';
import { rafterSvg } from '../lib/figures';
import { PITCHES } from './shingle';

const def: CalculatorDef = {
  id: 'rafter',
  diagram: 'roof',
  fields: [
    { kind: 'length', key: 'span', label: 'Building span', default: { value: 24, unit: 'ft' }, hint: 'Outside of wall to outside of wall' },
    { kind: 'select', key: 'pitch', label: 'Roof pitch', default: '6', options: PITCHES.map((p) => ({ value: String(p), label: `${p}/12` })) },
    { kind: 'length', key: 'overhang', label: 'Overhang (level)', default: { value: 12, unit: 'in' }, hint: 'Measured horizontally past the wall' },
    { kind: 'length', key: 'ridge', label: 'Ridge board thickness', default: { value: 1.5, unit: 'in' }, hint: '1.5 in for a 2× ridge; 0 if rafters meet' },
    { kind: 'length', key: 'buildingLength', label: 'Building length', default: { value: 40, unit: 'ft' }, hint: 'For the rafter count' },
    {
      kind: 'select',
      key: 'spacing',
      label: 'Rafter spacing',
      default: '16',
      options: ['12', '16', '24'].map((s) => ({ value: s, label: `${s} in on center` })),
    },
  ],
  compute(v) {
    const pitch = num(v, 'pitch', 6);
    const r = rafter(lenFt(v, 'span'), pitch, lenIn(v, 'overhang'), lenIn(v, 'ridge'));
    const perSide = rafterCount(lenFt(v, 'buildingLength'), num(v, 'spacing', 16));
    return {
      label: 'Rafter length',
      value: ftIn(r.totalIn),
      unit: '',
      sub: `${pitch}/12 pitch (${fmt(r.angle, 1)}°) · buy ${r.stockFt} ft boards`,
      figure: rafterSvg(lenIn(v, 'span'), pitch, lenIn(v, 'overhang'), lenIn(v, 'ridge'), r.riseIn, r.totalIn),
      blocks: [
        {
          title: 'Rafter',
          rows: [
            { label: 'Ridge to wall (along slope)', value: ftIn(r.mainIn) },
            { label: 'Overhang tail (along slope)', value: ftIn(r.tailIn) },
            { label: 'Rise at the ridge', value: ftIn(r.riseIn), note: 'Height gained from the wall to the ridge' },
            { label: 'Plumb cut angle', value: `${fmt(r.angle, 1)}°` },
          ],
        },
        { title: 'Count', rows: [{ label: 'Rafters', value: String(perSide * 2), note: `${perSide} per side, including both ends` }] },
      ],
      advice:
        r.totalIn > 0
          ? 'Rafter size depends on span, spacing, lumber grade, and snow load. Check the span tables in your local code before buying.'
          : 'Enter the building span to size the rafters.',
      summary: `${ftIn(r.totalIn)} · ${perSide * 2} rafters`,
    };
  },
};
export default def;
