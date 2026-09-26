// 电压降计算器
import type { CalculatorDef } from '../lib/calc-types';
import { lenFt, num, str } from '../lib/calc-types';
import { voltageDrop, GAUGES, RESISTANCE, gaugeLabel, type Gauge, type Metal } from '../lib/electrical';
import { fmt } from '../lib/format';
import { circuitFields } from './wire-size';
import { circuitResult, limitMeter } from '../lib/result-visuals';

const def: CalculatorDef = {
  id: 'voltage-drop',
  diagram: 'circuit',
  fields: [
    { kind: 'select', key: 'gauge', label: 'Wire size', default: '12', options: GAUGES.map((g) => ({ value: g, label: gaugeLabel(g) })) },
    ...circuitFields,
  ],
  compute(v) {
    const metal: Metal = str(v, 'metal') === 'al' ? 'al' : 'cu';
    const g = str(v, 'gauge') as Gauge;
    const amps = num(v, 'amps', 0);
    const volts = num(v, 'volts', 120);
    const dist = lenFt(v, 'distance');
    const phase = str(v, 'phase') === '3' ? '3' : str(v, 'phase') === 'dc' ? 'dc' : '1';
    const vd = voltageDrop(metal, g, amps, dist, phase);
    if (vd === undefined) {
      return {
        label: 'Voltage drop',
        value: '—',
        unit: '',
        blocks: [],
        advice: `${gaugeLabel(g)} aluminum isn't used for building wiring. Pick 12 AWG or larger, or copper.`,
        summary: 'Pick another size',
      };
    }
    const pct = volts > 0 ? (vd / volts) * 100 : 0;
    // 能满足 3% 的最小线径，给用户一个参考
    const for3 = GAUGES.find((x) => {
      const d = voltageDrop(metal, x, amps, dist, phase);
      return d !== undefined && volts > 0 && (d / volts) * 100 <= 3;
    });
    return {
      label: 'Voltage drop',
      value: fmt(pct, 2),
      figure: circuitResult(volts, vd, dist) + limitMeter(pct, 3, 'Voltage drop', pct <= 3 ? 'Within the 3% branch-circuit reference' : 'Above the 3% branch-circuit reference', 10),
      unit: '%',
      sub: `${fmt(vd, 2)} V lost · ${fmt(volts - vd, 1)} V at the load`,
      blocks: [
        {
          title: 'Details',
          rows: [
            { label: 'Resistance used', value: `${RESISTANCE[metal][g]} Ω / 1,000 ft`, note: 'NEC Chapter 9, Table 8, at 75°C' },
            { label: 'Smallest size for 3% drop', value: for3 ? gaugeLabel(for3) : 'over 500 kcmil' },
          ],
        },
      ],
      advice:
        pct <= 3
          ? 'Within the 3% the NEC recommends for a branch circuit. Also confirm the wire is large enough for the current (ampacity).'
          : pct <= 5
            ? 'Over 3% for this run. The NEC recommends no more than 3% on a branch circuit and 5% combined with the feeder.'
            : 'Over 5%. Motors and electronics may misbehave; use a larger wire, a higher voltage, or a shorter run.',
      summary: `${fmt(pct, 2)}% · ${fmt(vd, 2)} V`,
    };
  },
};
export default def;
