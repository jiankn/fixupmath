// 泳池化学品计算器：游离氯（含冲击）、总碱度、稳定剂、钙硬度。pH 不做计算，只在页面上给安全做法。
import type { CalculatorDef, FieldDef, ResultRow } from '../lib/calc-types';
import { num, str } from '../lib/calc-types';
import {
  CHLORINE_PRODUCTS,
  CALCIUM_PRODUCTS,
  chlorineDose,
  bakingSodaPounds,
  stabilizerPounds,
  calciumPounds,
  fcTargets,
  type Dose,
} from '../lib/pool-chem';
import { fmt, int } from '../lib/format';
import { targetComparison } from '../lib/result-visuals';

/** 剂量的显示：液体用液量盎司 / 加仑，干粉用盎司 / 磅 */
export function doseText(d: Dose): string {
  if (d.liquid) return d.ounces >= 128 ? `${fmt(d.gallons, 2)} gal (${int(d.ounces)} fl oz)` : `${fmt(d.ounces, 1)} fl oz`;
  return d.pounds >= 1 ? `${fmt(d.pounds, 2)} lb` : `${fmt(d.ounces, 1)} oz`;
}
const dryText = (lb: number) => doseText({ pounds: lb, ounces: lb * 16, gallons: 0, liquid: false });

const goal = (id: string): FieldDef['showWhen'] => ({ key: 'goal', equals: id });
const ppm = (key: string, label: string, def: number, g: string, hint?: string): FieldDef => ({
  kind: 'number',
  key,
  label,
  default: def,
  step: key.startsWith('fc') ? 0.5 : 10,
  suffix: 'ppm',
  hint,
  showWhen: goal(g),
});

const def: CalculatorDef = {
  id: 'pool-chemical',
  fields: [
    { kind: 'number', key: 'gallons', label: 'Pool volume', default: 15000, step: 500, suffix: 'gallons', hint: 'Not sure? Work it out with the pool volume calculator' },
    {
      kind: 'select',
      key: 'goal',
      label: 'What do you want to adjust?',
      default: 'fc',
      options: [
        { value: 'fc', label: 'Free chlorine / shock' },
        { value: 'ta', label: 'Total alkalinity (raise)' },
        { value: 'cya', label: 'Stabilizer / CYA (raise)' },
        { value: 'ch', label: 'Calcium hardness (raise)' },
      ],
    },
    ppm('fcNow', 'Current free chlorine', 1, 'fc'),
    ppm('fcTarget', 'Target free chlorine', 4, 'fc', 'See the targets for your stabilizer level below'),
    ppm('cya', 'Current stabilizer (CYA)', 40, 'fc', 'Sets how much chlorine you need'),
    {
      kind: 'select',
      key: 'product',
      label: 'Chlorine product',
      default: 'liquid10',
      options: CHLORINE_PRODUCTS.map((p) => ({ value: p.id, label: p.label })),
      showWhen: goal('fc'),
    },
    ppm('taNow', 'Current total alkalinity', 60, 'ta'),
    ppm('taTarget', 'Target total alkalinity', 90, 'ta', 'Most pools do well at 60–120 ppm'),
    ppm('cyaNow', 'Current stabilizer (CYA)', 20, 'cya'),
    ppm('cyaTarget', 'Target stabilizer (CYA)', 40, 'cya', '30–50 ppm; 60–80 for salt pools'),
    ppm('chNow', 'Current calcium hardness', 150, 'ch'),
    ppm('chTarget', 'Target calcium hardness', 250, 'ch', 'About 250–350 ppm for plaster pools'),
    {
      kind: 'select',
      key: 'calcium',
      label: 'Calcium product',
      default: CALCIUM_PRODUCTS[0].id,
      options: CALCIUM_PRODUCTS.map((p) => ({ value: p.id, label: p.label })),
      showWhen: goal('ch'),
    },
  ],
  compute(v) {
    const gal = Math.max(0, num(v, 'gallons', 0));
    const g = str(v, 'goal') || 'fc';
    const safety = 'Add one chemical at a time with the pump running, never mix chemicals together, and retest before adding more.';
    const empty = (msg: string) => ({ label: 'Dose', value: '—', unit: '', blocks: [], advice: msg, summary: '—' });
    if (!(gal > 0)) return empty('Enter your pool volume in gallons.');

    if (g === 'fc') {
      const p = CHLORINE_PRODUCTS.find((x) => x.id === str(v, 'product')) ?? CHLORINE_PRODUCTS[0];
      const now = num(v, 'fcNow', 0);
      const target = num(v, 'fcTarget', 0);
      const cya = num(v, 'cya', 0);
      const t = fcTargets(cya);
      const delta = target - now;
      const d = chlorineDose(p, gal, delta);
      const shock = chlorineDose(p, gal, t.shock - now);
      const side: ResultRow[] = [];
      if (p.addsCya && delta > 0) side.push({ label: 'Also raises CYA by', value: `${fmt(delta * p.addsCya, 1)} ppm` });
      if (p.addsCh && delta > 0) side.push({ label: 'Also raises calcium by', value: `${fmt(delta * p.addsCh, 1)} ppm` });
      return {
        label: `${p.label} to add`,
        figure: targetComparison(now, target, 'Free chlorine'),
        value: delta > 0 ? doseText(d) : '0',
        unit: '',
        sub: delta > 0 ? `Raises free chlorine from ${fmt(now, 1)} to ${fmt(target, 1)} ppm in ${int(gal)} gallons` : `No addition needed in ${int(gal)} gallons. Current level is ${delta === 0 ? 'at' : 'above'} your target.`,
        blocks: [
          {
            title: `Free chlorine targets for CYA ${fmt(cya, 0)}`,
            rows: cya > 0
              ? [
                  { label: 'Minimum', value: `${fmt(t.minimum, 1)} ppm` },
                  { label: 'Target', value: `${fmt(t.target, 1)} ppm` },
                  { label: 'Shock (SLAM) level', value: `${fmt(t.shock, 1)} ppm`, note: t.shock > now ? `To reach it: ${doseText(shock)} of ${p.label.toLowerCase()}` : undefined },
                ]
              : [],
          },
          { title: 'Side effects', rows: side },
        ],
        advice:
          delta <= 0
            ? 'Free chlorine is already at or above your target. Sunlight and swimmers will bring it down; retest tomorrow.'
            : p.addsCya
              ? `${p.label} adds stabilizer every time you use it. Keep an eye on CYA, since the only way to lower it is to replace water. ${safety}`
              : safety,
        summary: delta > 0 ? `${doseText(d)} ${p.label.toLowerCase()}` : 'No chlorine needed',
      };
    }

    const cfg: Record<string, { now: string; target: string; name: string; product: string; lb: (delta: number) => number; lower: string; tip: string }> = {
      ta: {
        now: 'taNow', target: 'taTarget', name: 'total alkalinity', product: 'Baking soda (sodium bicarbonate)',
        lb: (d) => bakingSodaPounds(gal, d),
        lower: 'Lowering alkalinity takes acid plus aeration over several days; add acid in small doses and retest.',
        tip: 'Broadcast it across the deep end. Baking soda raises pH slightly as well.',
      },
      cya: {
        now: 'cyaNow', target: 'cyaTarget', name: 'stabilizer (CYA)', product: 'Stabilizer (cyanuric acid)',
        lb: (d) => stabilizerPounds(gal, d),
        lower: 'Stabilizer does not break down; the only way to lower it is to drain and refill part of the pool.',
        tip: 'It dissolves slowly: put it in a sock in the skimmer or a bucket of warm water, and wait several days before retesting.',
      },
      ch: {
        now: 'chNow', target: 'chTarget', name: 'calcium hardness', product: 'Calcium chloride',
        lb: (d) => calciumPounds(gal, d, (CALCIUM_PRODUCTS.find((x) => x.id === str(v, 'calcium')) ?? CALCIUM_PRODUCTS[0]).purity),
        lower: 'Calcium can only be lowered by replacing water.',
        tip: 'Pre-dissolve it in a bucket of pool water; it gets very hot. Add it slowly around the pool.',
      },
    };
    const c = cfg[g] ?? cfg.ta;
    const now = num(v, c.now, 0);
    const target = num(v, c.target, 0);
    const delta = target - now;
    const lb = delta > 0 ? c.lb(delta) : 0;
    return {
      label: `${c.product} to add`,
      figure: targetComparison(now, target, c.name),
      value: delta > 0 ? dryText(lb) : '0',
      unit: '',
      sub: delta > 0 ? `Raises ${c.name} from ${fmt(now, 0)} to ${fmt(target, 0)} ppm in ${int(gal)} gallons` : `No addition needed in ${int(gal)} gallons. Current level is ${delta === 0 ? 'at' : 'above'} your target.`,
      blocks: delta > 0 ? [{ title: 'Amount', rows: [{ label: 'Pounds', value: fmt(lb, 2) }, { label: 'Ounces', value: fmt(lb * 16, 1) }] }] : [],
      advice: delta > 0 ? `${c.tip} ${safety}` : delta === 0 ? 'Your current level matches your target. Nothing to add.' : c.lower,
      summary: delta > 0 ? `${dryText(lb)} ${c.product.toLowerCase()}` : 'Nothing to add',
    };
  },
};
export default def;
