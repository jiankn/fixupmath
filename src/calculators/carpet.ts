// 地毯计算器：分别估算面积预算和矩形房间的单块裁切长度。
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price } from '../lib/calc-types';
import { ceilTo, fmt, money } from '../lib/format';
import { areaShapes, areaFt2, wasteField } from './shared';

const trimPerWallIn = 3; // CRI 105 §5.3
const trimAcrossRoomFt = (2 * trimPerWallIn) / 12;

function singlePieceLength(runFt: number, acrossFt: number, rollFt: number): string {
  if (acrossFt + trimAcrossRoomFt > rollFt + 1e-9) return 'Needs a seam';
  return `${fmt(ceilTo(runFt + trimAcrossRoomFt, 0.01))} ft`;
}

const def: CalculatorDef = {
  id: 'carpet',
  shapeLegend: 'Shape of the room',
  shapes: areaShapes({ length: { value: 14, unit: 'ft' }, width: { value: 12, unit: 'ft' }, area: { value: 168, unit: 'ft2' } }),
  fields: [
    {
      kind: 'select',
      key: 'roll',
      label: 'Roll width',
      default: '12',
      options: [
        { value: '12', label: '12 ft (most common)' },
        { value: '13.5', label: '13.5 ft' },
        { value: '15', label: '15 ft' },
      ],
    },
    wasteField(10, 'Applies to the area estimate. Use the cut lengths to check the roll.'),
  ],
  priceFields: [
    { kind: 'money', key: 'priceSqyd', label: 'Carpet price per square yard', placeholder: 'e.g. 25' },
    { kind: 'money', key: 'pricePad', label: 'Pad price per square yard', placeholder: 'e.g. 5' },
    { kind: 'money', key: 'priceSqft', label: 'Or price per square foot', placeholder: 'e.g. 2.75' },
  ],
  project: { format: (a) => `${fmt(a, 1)} ft²` },
  measure: areaFt2,
  compute(v, total) {
    const area = total ?? areaFt2(v);
    const waste = num(v, 'waste', 10);
    const roll = num(v, 'roll', 12);
    const need = area * (1 + waste / 100);
    const sqyd = need / 9;
    const length = lenFt(v, 'length');
    const width = lenFt(v, 'width');
    const hasRoomDimensions = total === undefined && v.shape === 'rectangle' && length > 0 && width > 0;
    const cuts: ResultRow[] = hasRoomDimensions ? [
      { label: 'Pile along length', value: singlePieceLength(length, width, roll) },
      { label: 'Pile along width', value: singlePieceLength(width, length, roll) },
    ] : [];
    const cost: ResultRow[] = [];
    const py = price(v, 'priceSqyd');
    const pp = price(v, 'pricePad');
    const ps = price(v, 'priceSqft');
    if (py) cost.push({ label: `Carpet, ${fmt(sqyd, 1)} yd²`, value: money(sqyd * py) });
    if (pp) cost.push({ label: `Pad, ${fmt(area / 9, 1)} yd²`, value: money((area / 9) * pp) });
    if (ps) cost.push({ label: `Carpet, ${fmt(need, 0)} ft²`, value: money(need * ps) });
    return {
      label: 'Carpet area estimate',
      value: fmt(sqyd, 1),
      unit: 'square yards',
      sub: `${fmt(need, 1)} ft² including ${waste}% extra · ${fmt(area, 1)} ft² of floor`,
      blocks: [
        { title: `Single-piece cut from a ${roll} ft roll`, rows: cuts },
        { title: 'Pad', rows: [{ label: 'Carpet pad (no waste)', value: `${fmt(area / 9, 1)} yd²` }] },
        { title: 'Area-based cost estimate', rows: cost },
      ],
      advice:
        hasRoomDimensions
          ? 'Cut lengths include 3 in of trim at each wall. Confirm pile direction, pattern matching, and seam placement with your installer.'
          : 'Use the area for budgeting. Prepare a room-by-room cutting plan before ordering from a roll.',
      summary: `${fmt(sqyd, 1)} yd² · ${fmt(need, 0)} ft²`,
    };
  },
};
export default def;
