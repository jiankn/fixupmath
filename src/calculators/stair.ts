// 楼梯计算器：总高 → 踢面数、踢面高、踏板、水平长度、斜梁（长度、根数、采购长度），可加中间平台；按 IRC 检查，并画按比例示意图
import type { CalculatorDef } from '../lib/calc-types';
import { lenIn, num, str } from '../lib/calc-types';
import {
  stairFlights,
  stringerCount,
  stockLengthFt,
  stairSvg,
  ftIn,
  IRC_MAX_RISER_IN,
  IRC_MIN_TREAD_IN,
  IRC_MAX_FLIGHT_RISE_IN,
} from '../lib/framing';
import { fmt } from '../lib/format';

const def: CalculatorDef = {
  id: 'stair',
  fields: [
    { kind: 'length', key: 'rise', label: 'Total rise', default: { value: 108, unit: 'in' }, hint: 'Finished floor to finished floor' },
    { kind: 'length', key: 'maxRiser', label: 'Maximum riser height', default: { value: 7.75, unit: 'in' }, hint: 'IRC limit is 7¾ in; 7–7½ in is more comfortable' },
    { kind: 'length', key: 'tread', label: 'Tread depth (run)', default: { value: 10, unit: 'in' }, hint: 'IRC minimum is 10 in, not counting the nosing' },
    { kind: 'length', key: 'width', label: 'Stair width', default: { value: 36, unit: 'in' }, hint: 'IRC minimum is 36 in' },
    {
      kind: 'select',
      key: 'landing',
      label: 'Landing',
      default: 'none',
      options: [
        { value: 'none', label: 'None, one straight run' },
        { value: 'mid', label: 'One landing halfway up' },
      ],
    },
    {
      kind: 'length',
      key: 'landingDepth',
      label: 'Landing depth',
      default: { value: 36, unit: 'in' },
      hint: 'At least the stair width, and 36 in minimum',
      showWhen: { key: 'landing', equals: 'mid' },
    },
    {
      kind: 'select',
      key: 'stringerSpacing',
      label: 'Max stringer spacing',
      default: '16',
      options: ['12', '16', '18'].map((s) => ({ value: s, label: `${s} in` })),
      hint: 'Check the span rating of your tread material',
    },
  ],
  compute(v) {
    const tread = lenIn(v, 'tread');
    const width = lenIn(v, 'width');
    const landing = str(v, 'landing') === 'mid';
    const s = stairFlights(lenIn(v, 'rise'), lenIn(v, 'maxRiser'), tread, landing, lenIn(v, 'landingDepth'));
    const perFlight = stringerCount(width, num(v, 'stringerSpacing', 16));
    const longest = Math.max(0, ...s.flights.map((f) => f.stringerIn));
    const totalTreads = s.flights.reduce((n, f) => n + f.treads, 0);

    const issues: string[] = [];
    if (s.riserIn > IRC_MAX_RISER_IN + 1e-9) issues.push(`risers taller than ${IRC_MAX_RISER_IN} in`);
    if (tread > 0 && tread < IRC_MIN_TREAD_IN - 1e-9) issues.push(`treads shallower than ${IRC_MIN_TREAD_IN} in`);
    if (landing && s.landingIn > 0 && s.landingIn < Math.max(36, width) - 1e-9) issues.push('a landing shallower than the stair width');
    let advice = `2 × riser + tread = ${fmt(s.comfort, 1)} in. Stairs feel most natural between 24 and 25 in.`;
    if (!landing && s.risers && s.risers * s.riserIn > IRC_MAX_FLIGHT_RISE_IN + 1e-9)
      advice = `A single flight can rise at most ${IRC_MAX_FLIGHT_RISE_IN} in (12 ft 7 in) under the IRC. Add a landing.`;
    if (issues.length) advice = `Check your local code: ${issues.join(', ')} ${issues.length > 1 ? 'are' : 'is'} outside IRC limits for homes.`;
    if (!s.risers) advice = 'Enter the total rise to lay out the stairs.';

    return {
      label: 'Risers',
      value: String(s.risers),
      unit: `× ${ftIn(s.riserIn)}`,
      sub: `${totalTreads} treads at ${ftIn(tread)}${landing ? ' + landing' : ''} · total run ${ftIn(s.totalRunIn)} · ${fmt(s.angle, 1)}°`,
      figure: stairSvg(s.riserIn, tread, s.flights, s.landingIn, s.risers * s.riserIn, s.totalRunIn),
      blocks: [
        {
          title: 'Layout',
          rows: [
            { label: 'Riser height', value: `${fmt(s.riserIn, 3)} in`, note: ftIn(s.riserIn) },
            { label: 'Number of treads', value: String(totalTreads), note: landing ? 'Not counting the landing; each flight tops out on a landing or floor' : 'The top step is the upper floor' },
            { label: 'Total run', value: ftIn(s.totalRunIn), note: landing ? `Includes the ${ftIn(s.landingIn)} landing` : undefined },
            ...(landing && s.flights.length > 1 ? [{ label: 'Landing height', value: ftIn(s.landingHeightIn), note: 'Top of the landing above the lower floor' }] : []),
          ],
        },
        {
          title: 'Stringers',
          rows: [
            ...s.flights.map((f, i) => ({
              label: s.flights.length > 1 ? `Flight ${i + 1}: ${f.risers} risers, ${f.treads} treads` : 'Stringer length (min.)',
              value: ftIn(f.stringerIn),
              note: s.flights.length > 1 ? `Run ${ftIn(f.runIn)}` : 'Along the slope before end cuts',
            })),
            { label: 'Stringers per flight', value: String(perFlight), note: `For a ${ftIn(width)} wide stair` },
            { label: 'Buy', value: `${perFlight * s.flights.length} × 2×12 at ${stockLengthFt(longest + 6)} ft`, note: 'Longest stringer plus 6 in for end cuts' },
          ],
        },
      ],
      advice,
      summary: `${s.risers} risers × ${ftIn(s.riserIn)} · run ${ftIn(s.totalRunIn)}`,
    };
  },
};
export default def;
