import type { CalculatorDef } from '../lib/calc-types';
import { lenIn, num, str } from '../lib/calc-types';
import { DECK_SPECIES, MEMBER_SIZES, SPACINGS, deckSpanIn, spanFits, spanText } from '../lib/spans';
import { fmt } from '../lib/format';

const def: CalculatorDef = {
  id: 'joist-span', diagram: 'joist-span',
  fields: [
    { kind: 'select', key: 'species', label: 'Joist species group', default: 'southern-pine', options: DECK_SPECIES.map(({ value, label }) => ({ value, label })) },
    { kind: 'select', key: 'size', label: 'Nominal joist size', default: '2x8', options: MEMBER_SIZES.map(value => ({ value, label: value.replace('x', ' × ') })) },
    { kind: 'select', key: 'spacing', label: 'Joist spacing', default: '16', options: SPACINGS.map(n => ({ value: String(n), label: `${n} in on center` })) },
    { kind: 'length', key: 'span', label: 'Proposed clear span', default: { value: 10, unit: 'ft' }, hint: 'Between support faces; leave out any overhang.' },
  ],
  compute(v) {
    const limit = deckSpanIn(str(v, 'species'), str(v, 'size'), num(v, 'spacing'));
    const requested = lenIn(v, 'span');
    const within = limit !== undefined && spanFits(requested, limit);
    const status = requested <= 0 ? 'Enter a positive clear span' : within ? 'Within this table limit' : 'Exceeds this table limit';
    return {
      label: 'Maximum tabulated clear span', value: limit === undefined ? 'Unavailable' : spanText(limit), unit: '',
      sub: limit === undefined ? 'No published entry for these selections.' : 'AWC DCA 6-15 · Table 2 · No. 2 deck joists',
      blocks: limit === undefined ? [] : [
        { title: 'Your span', rows: [
          { label: 'Proposed clear span', value: `${fmt(requested / 12, 3)} ft` },
          { label: 'Comparison', value: status },
        ] },
        { title: 'Table conditions', rows: [
          { label: 'Live / dead load', value: '40 / 10 psf' },
          { label: 'Grade / service', value: 'No. 2 / wet' },
          { label: 'Deflection limit', value: 'L/360' },
        ] },
      ],
      advice: 'Deck-joist reference only. Loads, overhangs, beams, connections, and local approval need separate checks. Incising is assumed for the DF-L / HF / SPF group.',
      summary: limit === undefined ? 'No matching span entry' : `${spanText(limit)} max · ${status}`,
    };
  },
};
export default def;
