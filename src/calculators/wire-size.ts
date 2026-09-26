// 线径计算器：同时满足载流量（NEC 310.16 + 240.4(D)）和电压降的最小线径
import type { CalculatorDef, Values } from '../lib/calc-types';
import { lenFt, num, str } from '../lib/calc-types';
import { sizeWire, voltageDrop, usableAmps, gaugeLabel, type Metal, type Phase } from '../lib/electrical';
import { fmt } from '../lib/format';
import { circuitResult, limitMeter } from '../lib/result-visuals';

export const circuitFields = [
  { kind: 'number' as const, key: 'amps', label: 'Load current', default: 20, step: 1, suffix: 'amps' },
  { kind: 'length' as const, key: 'distance', label: 'One-way distance', default: { value: 100, unit: 'ft' as const }, hint: 'From the panel to the load, not round trip' },
  {
    kind: 'select' as const,
    key: 'volts',
    label: 'Voltage',
    default: '120',
    options: ['12', '24', '48', '120', '208', '240', '277', '480'].map((x) => ({ value: x, label: `${x} V` })),
  },
  {
    kind: 'select' as const,
    key: 'phase',
    label: 'Phase',
    default: '1',
    options: [
      { value: '1', label: 'Single phase AC' },
      { value: '3', label: 'Three phase AC' },
      { value: 'dc', label: 'DC (solar, RV, boat, 12/24/48 V)' },
    ],
  },
  {
    kind: 'select' as const,
    key: 'metal',
    label: 'Conductor',
    default: 'cu',
    options: [
      { value: 'cu', label: 'Copper' },
      { value: 'al', label: 'Aluminum' },
    ],
  },
];

const phaseOf = (v: Values): Phase => (str(v, 'phase') === '3' ? '3' : str(v, 'phase') === 'dc' ? 'dc' : '1');
const metalOf = (v: Values): Metal => (str(v, 'metal') === 'al' ? 'al' : 'cu');

const def: CalculatorDef = {
  id: 'wire-size',
  diagram: 'circuit',
  fields: [
    ...circuitFields,
    {
      kind: 'select',
      key: 'column',
      label: 'Terminal temperature rating',
      default: '60',
      options: [
        { value: '60', label: '60°C (most circuits 100 A and under)' },
        { value: '75', label: '75°C (terminals rated 75°C)' },
      ],
      hint: 'NEC 110.14(C): use 60°C unless every termination is rated 75°C',
    },
    {
      kind: 'select',
      key: 'maxDrop',
      label: 'Maximum voltage drop',
      default: '3',
      options: ['2', '3', '5'].map((x) => ({ value: x, label: `${x}%` })),
      hint: 'NEC recommends 3% for a branch circuit',
    },
    {
      kind: 'select',
      key: 'continuous',
      label: 'Continuous load (3+ hours)',
      default: 'no',
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes, size at 125%' },
      ],
    },
  ],
  compute(v) {
    const metal = metalOf(v);
    const phase = phaseOf(v);
    const amps = num(v, 'amps', 0);
    const volts = num(v, 'volts', 120);
    const dist = lenFt(v, 'distance');
    const col = str(v, 'column') === '75' ? '75' : '60';
    const r = sizeWire({ metal, amps, oneWayFt: dist, volts, phase, maxDropPct: num(v, 'maxDrop', 3), column: col, continuous: str(v, 'continuous') === 'yes' });
    const vd = r.pick ? voltageDrop(metal, r.pick, amps, dist, phase) ?? 0 : 0;
    const metalName = metal === 'al' ? 'aluminum' : 'copper';
    if (!(amps > 0)) {
      return { label: 'Wire size', value: '—', unit: '', blocks: [], advice: 'Enter the load current and distance.', summary: 'Enter the load' };
    }
    if (!r.pick) {
      return {
        label: 'Wire size',
        value: 'Over 500',
        unit: 'kcmil',
        sub: 'No single conductor up to 500 kcmil meets both limits',
        blocks: [],
        advice: 'Consider parallel conductors, a higher voltage, or a shorter run. Have an electrician design this circuit.',
        summary: 'Over 500 kcmil',
      };
    }
    return {
      label: 'Minimum wire size',
      figure: circuitResult(volts, vd, dist) + limitMeter(vd / volts * 100, num(v, 'maxDrop', 3), 'Voltage drop', `Sizing constraint: ${r.pick === r.byAmpacity && r.pick === r.byDrop ? 'ampacity and voltage drop' : r.pick === r.byDrop ? 'voltage drop' : 'ampacity'}`, Math.max(10, num(v, 'maxDrop', 3))),
      value: gaugeLabel(r.pick).split(' ')[0],
      unit: `${gaugeLabel(r.pick).split(' ')[1]} ${metalName}`,
      sub: `Voltage drop ${fmt(vd, 2)} V (${fmt((vd / volts) * 100, 2)}%) at ${fmt(amps)} A over ${fmt(dist)} ft`,
      blocks: [
        {
          title: 'What decided it',
          rows: [
            { label: 'Smallest by ampacity', value: r.byAmpacity ? gaugeLabel(r.byAmpacity) : 'over 500 kcmil', note: `${fmt(r.designAmps)} A needed at ${col}°C${r.designAmps !== amps ? ' (125% continuous)' : ''}` },
            { label: `Smallest for ${num(v, 'maxDrop', 3)}% drop`, value: r.byDrop ? gaugeLabel(r.byDrop) : 'over 500 kcmil' },
            { label: `Ampacity of ${gaugeLabel(r.pick)}`, value: `${usableAmps(metal, col, r.pick)} A` },
          ],
        },
      ],
      advice:
        phase === 'dc'
          ? 'Low-voltage DC runs are usually limited by voltage drop. Ampacity here uses NEC building-wire tables; boats (ABYC) and vehicles use their own cable ratings, so check those for marine or automotive wiring.'
          : 'Assumes up to three current-carrying conductors in a raceway or cable at 30°C ambient. More conductors, hot attics, or rooftops require derating. Confirm with your local code or an electrician.',
      summary: `${gaugeLabel(r.pick)} ${metalName}`,
    };
  },
};
export default def;
