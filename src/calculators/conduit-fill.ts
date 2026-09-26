// 线管填充率计算器（THHN/THWN-2）
import type { CalculatorDef } from '../lib/calc-types';
import { num, str } from '../lib/calc-types';
import { conduitFill, maxWires, CONDUITS, CONDUIT_SIZES, GAUGES, gaugeLabel, type ConduitSize, type Gauge } from '../lib/electrical';
import { fmt } from '../lib/format';
import { limitMeter } from '../lib/result-visuals';

const gaugeOptions = GAUGES.map((g) => ({ value: g, label: gaugeLabel(g) }));

const def: CalculatorDef = {
  id: 'conduit-fill',
  diagram: 'conduit',
  fields: [
    { kind: 'select', key: 'type', label: 'Conduit type', default: 'emt', options: Object.entries(CONDUITS).map(([value, c]) => ({ value, label: c.label })) },
    { kind: 'select', key: 'size', label: 'Trade size', default: '3/4', options: CONDUIT_SIZES.map((s) => ({ value: s, label: `${s} in` })) },
    { kind: 'select', key: 'gauge1', label: 'Wire size', default: '12', options: gaugeOptions, hint: 'THHN / THWN-2' },
    { kind: 'number', key: 'count1', label: 'Number of wires', default: 4, step: 1 },
    { kind: 'select', key: 'gauge2', label: 'Second wire size (optional)', default: '12', options: gaugeOptions, hint: 'e.g. a ground of a different size' },
    { kind: 'number', key: 'count2', label: 'Number of second wires', default: 0, step: 1 },
  ],
  compute(v) {
    const type = str(v, 'type') || 'emt';
    const size = (str(v, 'size') || '3/4') as ConduitSize;
    const g1 = (str(v, 'gauge1') || '12') as Gauge;
    const r = conduitFill(type, size, [
      { gauge: g1, count: num(v, 'count1', 0) },
      { gauge: (str(v, 'gauge2') || '12') as Gauge, count: num(v, 'count2', 0) },
    ]);
    const max = maxWires(type, size, g1);
    // 能装下这些导线的最小管径
    const smallest = CONDUIT_SIZES.find((s) => conduitFill(type, s, [{ gauge: g1, count: num(v, 'count1', 0) }, { gauge: (str(v, 'gauge2') || '12') as Gauge, count: num(v, 'count2', 0) }]).ok);
    const typeLabel = CONDUITS[type]?.label ?? 'EMT';
    return {
      label: 'Conduit fill',
      value: fmt(r.fillPct, 1),
      unit: '% filled',
      figure: limitMeter(r.fillPct, r.limit, 'Conduit area used', !r.count ? 'No wires entered' : r.ok ? 'Within fill limit' : 'Over fill limit') + '<p class="visual-note">Marker = allowed fill. Area comparison, not a wire packing layout.</p>',
      sub: `${r.count} wires in ${size} in ${typeLabel} · ${r.ok ? 'within' : r.count ? 'over' : '—'} the NEC limit`,
      blocks: [
        {
          title: 'Areas',
          rows: [
            { label: 'Wire area', value: `${fmt(r.wireArea, 4)} in²` },
            { label: `Allowed at ${r.limit}%`, value: `${fmt(r.allowed, 3)} in²` },
            { label: 'Conduit area (100%)', value: `${fmt(r.conduitArea, 3)} in²` },
          ],
        },
        {
          title: 'Sizing',
          rows: [
            { label: `Max ${gaugeLabel(g1)} THHN in ${size} in`, value: String(max) },
            { label: 'Smallest conduit for these wires', value: smallest ? `${smallest} in` : 'larger than 4 in' },
          ],
        },
      ],
      advice: !r.count
        ? 'Enter the wires going into the conduit.'
        : r.ok
          ? 'Within the NEC Chapter 9 fill limit. Adjust ampacity if more than three current-carrying conductors share the conduit.'
          : `Over the ${r.limit}% limit. Use ${smallest ? `${smallest} in` : 'a larger'} conduit or split the circuits.`,
      summary: `${fmt(r.fillPct, 1)}% fill · ${r.ok ? 'OK' : 'over limit'}`,
    };
  },
};
export default def;
