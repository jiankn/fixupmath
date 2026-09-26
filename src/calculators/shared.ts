// 多个计算器共用的配置片段：平面形状、散装材料计算器工厂
import type { CalculatorDef, FieldDef, ResultRow, ShapeDef, Values } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import type { Length } from '../lib/concrete';
import type { AreaValue } from '../lib/units';
import { shapeAreaFt2 } from '../lib/area';
import { bulkResult, type Material } from '../lib/bulk';
import { fmt, int, money } from '../lib/format';

const ft = (value: number): Length => ({ value, unit: 'ft' });

/** 长方形 / 圆形 / 三角形 / 已知面积 四种形状 */
export function areaShapes(d: { length?: Length; width?: Length; diameter?: Length; area?: AreaValue } = {}): ShapeDef[] {
  return [
    {
      id: 'rectangle',
      label: 'Rectangle',
      diagram: 'rect',
      fields: [
        { kind: 'length', key: 'length', label: 'Length', default: d.length ?? ft(10) },
        { kind: 'length', key: 'width', label: 'Width', default: d.width ?? ft(10) },
      ],
    },
    {
      id: 'circle',
      label: 'Circle',
      diagram: 'circle',
      fields: [{ kind: 'length', key: 'diameter', label: 'Diameter', default: d.diameter ?? ft(10) }],
    },
    {
      id: 'triangle',
      label: 'Triangle',
      diagram: 'triangle',
      fields: [
        { kind: 'length', key: 'base', label: 'Base', default: ft(10) },
        { kind: 'length', key: 'height', label: 'Height', hint: 'Measured square to the base', default: ft(8) },
      ],
    },
    {
      id: 'area',
      label: 'I know the area',
      description: 'Already have the square footage? Enter it directly.',
      fields: [{ kind: 'area', key: 'area', label: 'Area', default: d.area ?? { value: 100, unit: 'ft2' } }],
    },
  ];
}

export const areaFt2 = (v: Values) => shapeAreaFt2(String(v.shape ?? 'rectangle'), v);

export const wasteField = (def: number, hint: string): FieldDef => ({
  kind: 'select',
  key: 'waste',
  label: 'Extra for waste',
  default: String(def),
  options: [0, 5, 10, 15, 20].map((w) => ({ value: String(w), label: `${w}%` })),
  hint,
});

export interface BulkSpec {
  id: string;
  name: string; // 显示用小写名，如 "gravel"
  materials: Material[];
  depthDefault: Length;
  depthHint: string;
  wasteDefault: number;
  wasteHint: string;
  bags: { ft3: number; label: string }[];
  showTons: boolean;
  /** 低于这个立方码数，建议买袋装 */
  bagsBelowYd3: number;
  shapeDefaults?: Parameters<typeof areaShapes>[0];
}

/** 散装材料计算器（碎石、沙子、表土、覆盖物）共用一个模板 */
export function bulkCalculator(s: BulkSpec): CalculatorDef {
  const Name = s.name[0].toUpperCase() + s.name.slice(1);
  const densityOf = (v: Values) => {
    const m = s.materials.find((x) => x.id === str(v, 'material'));
    return m ? m.tonsPerYd3 : num(v, 'density', s.materials[0].tonsPerYd3);
  };
  const measure = (v: Values) => areaFt2(v) * lenFt(v, 'depth');

  const fields: FieldDef[] = [{ kind: 'length', key: 'depth', label: 'Depth', default: s.depthDefault, hint: s.depthHint }];
  if (s.showTons) {
    fields.push(
      {
        kind: 'select',
        key: 'material',
        label: 'Material',
        default: s.materials[0].id,
        options: [
          ...s.materials.map((m) => ({ value: m.id, label: `${m.label} (≈${m.tonsPerYd3} t/yd³)` })),
          { value: 'custom', label: 'Custom weight…' },
        ],
        hint: 'Typical weights. Your supplier can give you theirs.',
      },
      {
        kind: 'number',
        key: 'density',
        label: 'Weight per cubic yard',
        default: s.materials[0].tonsPerYd3,
        step: 0.05,
        suffix: 'tons/yd³',
        showWhen: { key: 'material', equals: 'custom' },
      },
    );
  }
  fields.push(wasteField(s.wasteDefault, s.wasteHint));

  const priceFields: FieldDef[] = [
    { kind: 'money', key: 'priceYard', label: 'Price per cubic yard', placeholder: 'e.g. 45' },
    ...(s.showTons ? [{ kind: 'money', key: 'priceTon', label: 'Price per ton', placeholder: 'e.g. 35' } as FieldDef] : []),
    { kind: 'money', key: 'priceBag', label: `Price per ${s.bags[0].label} bag`, placeholder: 'e.g. 5' },
  ];

  return {
    id: s.id,
    shapeLegend: 'Shape of the area',
    shapes: areaShapes(s.shapeDefaults),
    fields,
    priceFields,
    priceNote: 'Bulk prices usually exclude delivery. Ask about delivery fees and minimum orders.',
    project: { format: (ft3) => `${fmt(ft3 / 27)} yd³` },
    measure,
    compute(v, total) {
      const waste = num(v, 'waste', s.wasteDefault);
      const density = densityOf(v);
      const r = bulkResult(total ?? measure(v), waste, density, s.bags.map((b) => b.ft3));
      const firstBags = r.bags[0].count;
      const bagName = s.bags[0].label.split(' (')[0]; // 「0.5 cu ft」，去掉括号里的重量

      const cost: ResultRow[] = [];
      const py = price(v, 'priceYard');
      const pt = price(v, 'priceTon');
      const pb = price(v, 'priceBag');
      if (py) cost.push({ label: `Bulk, ${fmt(r.orderYards)} yd³`, value: money(r.orderYards * py) });
      if (pt && s.showTons) cost.push({ label: `Bulk, ${fmt(r.orderTons)} tons`, value: money(r.orderTons * pt) });
      if (pb) cost.push({ label: `${int(firstBags)} bags`, value: money(firstBags * pb) });

      const advice =
        r.cubicYards <= 0
          ? 'Enter your dimensions to see how much you need.'
          : r.cubicYards < s.bagsBelowYd3
            ? `Bags are practical for a job this size: ${int(firstBags)} bags of ${bagName}.`
            : `That is ${int(firstBags)} bags of ${bagName}. Bulk delivery by the yard is usually cheaper at this size. Ask about delivery fees and minimums.`;

      return {
        label: `${Name} needed`,
        value: fmt(r.cubicYards),
        unit: 'cubic yards',
        sub: `${fmt(r.totalFt3)} ft³ · ${fmt(r.cubicMeters)} m³ · includes ${waste}% extra`,
        blocks: [
          ...(s.showTons
            ? [
                {
                  title: 'Weight',
                  rows: [
                    { label: 'Tons', value: fmt(r.tons), note: `at ${fmt(density)} tons per cubic yard` },
                    { label: 'Pounds', value: int(r.pounds) },
                  ],
                },
              ]
            : []),
          {
            title: 'Bulk order',
            rows: [
              { label: 'Cubic yards', value: fmt(r.orderYards), note: 'rounded up to the next ½ yard' },
              ...(s.showTons ? [{ label: 'Tons', value: fmt(r.orderTons), note: 'rounded up to the next ½ ton' }] : []),
            ],
          },
          { title: 'Bags', rows: r.bags.map((b, i) => ({ label: `${s.bags[i].label} bags`, value: int(b.count) })) },
          { title: 'Estimated cost', rows: cost },
        ],
        advice,
        summary: s.showTons ? `${fmt(r.cubicYards)} yd³ · ${fmt(r.tons)} tons` : `${fmt(r.cubicYards)} yd³ · ${int(firstBags)} bags`,
      };
    },
  };
}
