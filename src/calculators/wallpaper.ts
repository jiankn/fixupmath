// 壁纸计算器：按条计算，考虑对花和裁切余量
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, lenIn, num, price, str } from '../lib/calc-types';
import { wallpaperRolls, wallAreaFt2 } from '../lib/finish';
import { fmt, int, money } from '../lib/format';

export const ROLLS = [
  { value: '20.5x33', label: '20.5 in × 33 ft (standard double roll)', w: 20.5, l: 33 },
  { value: '20.5x16.5', label: '20.5 in × 16.5 ft (single roll)', w: 20.5, l: 16.5 },
  { value: '27x27', label: '27 in × 27 ft', w: 27, l: 27 },
  { value: '21x33', label: '21 in × 33 ft (European roll)', w: 21, l: 33 },
];

const def: CalculatorDef = {
  id: 'wallpaper',
  diagram: 'room',
  fields: [
    { kind: 'length', key: 'length', label: 'Room length', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'width', label: 'Room width', default: { value: 12, unit: 'ft' } },
    { kind: 'length', key: 'height', label: 'Wall height', default: { value: 8, unit: 'ft' } },
    { kind: 'number', key: 'doors', label: 'Doors', default: 1, step: 1, hint: 'For the net wall area only' },
    { kind: 'number', key: 'windows', label: 'Windows', default: 1, step: 1, hint: 'For the net wall area only' },
    { kind: 'select', key: 'roll', label: 'Roll size', default: '20.5x33', options: ROLLS.map(({ value, label }) => ({ value, label })), hint: 'Printed on the roll label' },
    {
      kind: 'select', key: 'match', label: 'Pattern match', default: 'allowance',
      options: [
        { value: 'allowance', label: 'Unsure or drop match' },
        { value: 'plain', label: 'No match (random)' },
        { value: 'straight', label: 'Straight match' },
      ],
      hint: 'Check the roll label. Drop match uses a rough allowance.',
    },
    { kind: 'length', key: 'repeat', label: 'Pattern repeat', default: { value: 0, unit: 'in' }, hint: 'Use the labeled repeat for patterned paper' },
  ],
  priceFields: [{ kind: 'money', key: 'priceRoll', label: 'Price per roll', placeholder: 'e.g. 60' }],
  compute(v) {
    const L = lenFt(v, 'length');
    const W = lenFt(v, 'width');
    const H = lenFt(v, 'height');
    const roll = ROLLS.find((r) => r.value === str(v, 'roll')) ?? ROLLS[0];
    const selectedMatch = str(v, 'match');
    const match = selectedMatch === 'plain' || selectedMatch === 'straight' ? selectedMatch : 'allowance';
    const wallWidthsFt = L > 0 && W > 0 ? [L, W, L, W] : [];
    const r = wallpaperRolls({ wallWidthsFt, heightFt: H, rollWidthIn: roll.w, rollLengthFt: roll.l, repeatIn: lenIn(v, 'repeat'), match });
    const wall = wallAreaFt2(wallWidthsFt.length ? 2 * (L + W) : 0, H, num(v, 'doors', 0), num(v, 'windows', 0));
    const strips: ResultRow[] = [
      { label: 'Full-height strips', value: int(r.strips), note: 'Rounds up separately for each wall' },
      { label: 'Cut length with trim', value: `${fmt(r.stripIn, 1)} in`, note: 'Includes 4 in for top and bottom trim' },
    ];
    if (r.startAllowanceIn > 0) {
      strips.push({ label: 'Straight-match spacing', value: `${fmt(r.spacingIn, 1)} in`, note: `Between cut starts. Allows up to ${fmt(r.startAllowanceIn, 1)} in at the start of each roll.` });
    } else if (r.spacingIn > r.stripIn) {
      strips.push({ label: 'Length allowed per strip', value: `${fmt(r.spacingIn, 1)} in`, note: 'Includes one full repeat for matching' });
    }
    const pricePerRoll = price(v, 'priceRoll');
    const cost = pricePerRoll && r.rolls > 0 ? [{ label: `${r.rolls} rolls`, value: money(r.rolls * pricePerRoll) }] : [];
    const rollTooShort = r.strips > 0 && r.stripsPerRoll === 0;
    let advice = 'Buy all rolls from one batch number, and one spare roll for repairs.';
    if (rollTooShort) advice = 'This roll is too short for a full strip with the matching allowance. Check the wall height, roll length, and match.';
    else if (r.strips === 0) advice = 'Enter the room length, width, and wall height for a roll estimate.';
    return {
      label: 'Wallpaper rolls',
      value: rollTooShort ? '—' : int(r.rolls),
      unit: rollTooShort ? '' : 'rolls',
      sub: `${int(r.strips)} strips · ${int(r.stripsPerRoll)} strips per roll`,
      blocks: [
        { title: 'Strips', rows: strips },
        { title: 'Wall area', rows: [{ label: 'Net wall area', value: `${fmt(wall, 0)} ft²`, note: 'Uses 3 × 7 ft doors and 3 × 5 ft windows' }] },
        { title: 'Estimated cost', rows: cost },
      ],
      advice,
      summary: rollTooShort ? 'Roll too short for a full strip' : `${int(r.rolls)} rolls · ${int(r.strips)} strips`,
    };
  },
};
export default def;
