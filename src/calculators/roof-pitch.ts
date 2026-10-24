// 屋面坡度计算器：升高/水平长度、角度、跨度/屋脊高度三种输入 → x/12、角度、百分比、坡度系数
import type { CalculatorDef, Values } from '../lib/calc-types';
import { lenFt, lenIn, num, str } from '../lib/calc-types';
import { pitchInfo, degToPitch, slopeClass, type SlopeClass } from '../lib/roof';
import { pitchSvg } from '../lib/figures';
import { fmt } from '../lib/format';

/** 当前输入方式下的坡度（每 12 in 水平长度的升高，英寸） */
export function riseFrom(v: Values): number {
  switch (str(v, 'shape')) {
    case 'angle':
      return degToPitch(num(v, 'angle', 0));
    case 'span': {
      const half = lenFt(v, 'span') / 2;
      return half > 0 ? (lenFt(v, 'height') / half) * 12 : 0;
    }
    default: {
      const run = lenIn(v, 'run');
      return run > 0 ? (lenIn(v, 'rise') / run) * 12 : 0;
    }
  }
}

/** 坡度写成 x/12：整数直接写，非整数保留 1–2 位 */
export const pitchLabel = (rise: number) => `${fmt(rise, Math.abs(rise - Math.round(rise)) < 0.005 ? 0 : 2)}/12`;

const ADVICE: Record<SlopeClass, string> = {
  flat: 'This is a flat roof. It needs a membrane such as TPO, EPDM, or modified bitumen, not shingles.',
  low: 'Below 2/12, asphalt shingles are not allowed under the IRC. Use a low-slope membrane or standing-seam metal rated for this pitch.',
  'shingle-double': 'Between 2/12 and 4/12, the IRC allows asphalt shingles only with two layers of underlayment.',
  conventional: 'A conventional pitch: asphalt shingles, metal, and most tile work with a single layer of underlayment.',
  steep: 'A steep roof. Roofers will need roof jacks or a harness, which usually adds to the labor price.',
};

const def: CalculatorDef = {
  id: 'roof-pitch',
  shapeLegend: 'What do you know?',
  shapes: [
    {
      id: 'rise-run',
      label: 'Rise and run',
      description: 'Hold a level against the roof, measure 12 in along it, and measure straight up to the roof.',
      fields: [
        { kind: 'length', key: 'rise', label: 'Rise', default: { value: 6, unit: 'in' } },
        { kind: 'length', key: 'run', label: 'Run (level distance)', default: { value: 12, unit: 'in' } },
      ],
    },
    {
      id: 'span',
      label: 'Span and height',
      description: 'From the attic or the plans: the span between outside walls and the height of the ridge above the wall top.',
      fields: [
        { kind: 'length', key: 'span', label: 'Building span', default: { value: 24, unit: 'ft' } },
        { kind: 'length', key: 'height', label: 'Ridge height above the walls', default: { value: 6, unit: 'ft' } },
      ],
    },
    {
      id: 'angle',
      label: 'Angle',
      description: 'From an angle finder or a phone level app laid on the roof.',
      fields: [{ kind: 'number', key: 'angle', label: 'Roof angle', default: 30, step: 0.1, min: 0, suffix: 'degrees' }],
    },
  ],
  fields: [],
  compute(v) {
    const p = pitchInfo(riseFrom(v));
    if (p.rise <= 0) {
      return {
        label: 'Roof pitch',
        value: '0/12',
        unit: '',
        blocks: [],
        advice: 'Enter a rise, a ridge height, or an angle to find the pitch.',
        summary: '0/12',
      };
    }
    const exact = Math.abs(p.rise - p.nearest) < 0.005;
    return {
      label: 'Roof pitch',
      value: pitchLabel(p.rise),
      unit: '',
      sub: `${fmt(p.deg, 1)}° · ${fmt(p.percent, 1)}% grade · pitch factor ${fmt(p.factor, 3)}`,
      figure: pitchSvg(p.rise, p.deg),
      blocks: [
        {
          title: 'Pitch',
          rows: [
            { label: 'Angle', value: `${fmt(p.deg, 2)}°` },
            { label: 'Slope as a percent', value: `${fmt(p.percent, 1)}%` },
            { label: 'Rise : run', value: `1 : ${fmt(12 / p.rise, 2)}` },
            ...(exact ? [] : [{ label: 'Nearest whole pitch', value: `${p.nearest}/12`, note: 'Material specs are written in whole pitches' }]),
          ],
        },
        {
          title: 'Roof area and rafters',
          rows: [
            { label: 'Pitch factor', value: `× ${fmt(p.factor, 3)}`, note: 'Flat footprint × factor = sloped roof area' },
            { label: 'Rafter length per foot of run', value: `${fmt(p.factor * 12, 2)} in` },
          ],
        },
      ],
      advice: ADVICE[slopeClass(p.rise)],
      summary: `${pitchLabel(p.rise)} · ${fmt(p.deg, 1)}°`,
    };
  },
};
export default def;
