import type { CalculatorDef } from '../lib/calc-types';
import { lenIn, num, str } from '../lib/calc-types';
import { MEMBER_SIZES, SPACINGS, rafterSpanIn, spanFits, spanText } from '../lib/spans';
import { fmt } from '../lib/format';

const def: CalculatorDef = {
  id: 'rafter-span', diagram: 'rafter-span',
  fields: [
    { kind: 'select', key: 'load', label: 'Published snow-load case', default: '20', options: [
      { value: '20', label: '20 psf roof live/snow + 10 psf dead (Table 17)' },
      { value: '40', label: '40 psf roof live/snow + 10 psf dead (Table 19)' },
    ], hint: 'Use the roof load from your plans; this is not ground snow load.' },
    { kind: 'select', key: 'size', label: 'Nominal rafter size', default: '2x8', options: MEMBER_SIZES.map(value => ({ value, label: value.replace('x', ' × ') })) },
    { kind: 'select', key: 'spacing', label: 'Rafter spacing', default: '16', options: SPACINGS.map(n => ({ value: String(n), label: `${n} in on center` })) },
    { kind: 'length', key: 'span', label: 'Horizontal clear span to compare', default: { value: 14, unit: 'ft' }, hint: 'Horizontal distance between bearing faces, not sloped board length.' },
  ],
  compute(v) {
    const limit = rafterSpanIn(str(v, 'load'), str(v, 'size'), num(v, 'spacing'));
    const requested = lenIn(v, 'span');
    const within = limit !== undefined && spanFits(requested, limit);
    const status = requested <= 0 ? 'Enter a positive horizontal span' : within ? 'Within this table limit' : 'Exceeds this table limit';
    return {
      label: 'Maximum tabulated horizontal span', value: limit === undefined ? 'Unavailable' : spanText(limit), unit: '',
      sub: 'Southern Pine · No. 2 · dry service · L/240 · CD 1.15',
      blocks: limit === undefined ? [] : [
        { title: 'Your span', rows: [
          { label: 'Horizontal clear span', value: `${fmt(requested / 12, 3)} ft` },
          { label: 'Comparison', value: status },
        ] },
        { title: 'Reference', rows: [
          { label: 'SFPA table', value: str(v, 'load') === '20' ? '17 (2013)' : '19 (2013)' },
          { label: 'Live/snow + dead load', value: `${str(v, 'load')} + 10 psf` },
          ...(limit === 312 ? [{ label: 'Table footnote', value: '26 ft stock-length cap' }] : []),
        ] },
      ],
      advice: 'Only the Southern Pine No. 2 snow cases shown are supported. Point loads and wind uplift are outside these tables. Confirm the applicable load case and roof design locally.',
      summary: limit === undefined ? 'No matching rafter entry' : `${spanText(limit)} max · ${status}`,
    };
  },
};
export default def;
