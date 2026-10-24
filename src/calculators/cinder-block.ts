// 砌块（cinder block / CMU）计算器：墙面积 → 块数、皮数、砂浆袋数、灌芯混凝土
import type { CalculatorDef, ResultRow } from '../lib/calc-types';
import { lenFt, num, price, str } from '../lib/calc-types';
import { BLOCKS, CORE_FILL, BLOCKS_PER_MORTAR_BAG, blockWall, blockCourses } from '../lib/sitework';
import { BAG_SIZES } from '../lib/concrete';
import { areaToFt2, type AreaValue } from '../lib/units';
import { fmt, int, money, ceilCount } from '../lib/format';
import { wasteField } from './shared';

const BAG80 = BAG_SIZES.find((b) => b.lb === 80)!;

const def: CalculatorDef = {
  id: 'cinder-block',
  shapeLegend: 'Measure by',
  shapes: [
    {
      id: 'wall',
      label: 'Wall size',
      diagram: 'brick',
      fields: [
        { kind: 'length', key: 'length', label: 'Wall length', default: { value: 20, unit: 'ft' } },
        { kind: 'length', key: 'height', label: 'Wall height', default: { value: 6, unit: 'ft' } },
      ],
    },
    {
      id: 'area',
      label: 'Wall area',
      fields: [{ kind: 'area', key: 'area', label: 'Wall area', default: { value: 120, unit: 'ft2' } }],
    },
  ],
  fields: [
    { kind: 'select', key: 'block', label: 'Block size', default: BLOCKS[0].value, options: BLOCKS.map(({ value, label }) => ({ value, label })), hint: 'Nominal size, width × height × length' },
    { kind: 'number', key: 'openings', label: 'Openings to subtract', default: 0, step: 1, suffix: 'sq ft', hint: 'Doors and windows in the wall' },
    wasteField(5, '5% for breakage and cut blocks'),
    { kind: 'select', key: 'fill', label: 'Fill the cores', default: 'none', options: CORE_FILL.map(({ value, label }) => ({ value, label })), hint: 'Retaining and foundation walls are usually grouted at the rebar' },
  ],
  priceFields: [
    { kind: 'money', key: 'priceBlock', label: 'Price per block', placeholder: 'e.g. 2.25' },
    { kind: 'money', key: 'priceMortar', label: 'Price per 80-lb mortar bag', placeholder: 'e.g. 9' },
    { kind: 'money', key: 'priceConcrete', label: 'Price per 80-lb concrete bag', placeholder: 'e.g. 6' },
  ],
  compute(v) {
    const byWall = str(v, 'shape') !== 'area';
    const gross = byWall ? lenFt(v, 'length') * lenFt(v, 'height') : areaToFt2((v.area as AreaValue)?.value || 0, (v.area as AreaValue)?.unit ?? 'ft2');
    const area = Math.max(0, gross - Math.max(0, num(v, 'openings', 0)));
    const b = BLOCKS.find((x) => x.value === str(v, 'block')) ?? BLOCKS[0];
    const fill = CORE_FILL.find((x) => x.value === str(v, 'fill')) ?? CORE_FILL[0];
    const waste = num(v, 'waste', 5);
    const r = blockWall(area, b.faceH, b.faceL, b.widthIn, waste, fill.fraction);
    const c = byWall ? blockCourses(lenFt(v, 'length'), lenFt(v, 'height'), b.faceH, b.faceL) : null;
    const concreteBags = ceilCount(r.groutFt3 / BAG80.yieldFt3);

    const cost: ResultRow[] = [];
    const pb = price(v, 'priceBlock');
    const pm = price(v, 'priceMortar');
    const pc = price(v, 'priceConcrete');
    if (pb) cost.push({ label: `${int(r.blocks)} blocks`, value: money(r.blocks * pb) });
    if (pm) cost.push({ label: `${r.mortarBags} bags of mortar`, value: money(r.mortarBags * pm) });
    if (pc && concreteBags > 0) cost.push({ label: `${concreteBags} bags of concrete`, value: money(concreteBags * pc) });

    return {
      label: 'Blocks needed',
      value: int(r.blocks),
      unit: 'blocks',
      sub: `${fmt(area, 1)} ft² of wall · ${fmt(r.perFt2, 3)} blocks per ft² · includes ${waste}% extra`,
      blocks: [
        ...(c ? [{ title: 'Layout', rows: [{ label: 'Blocks per course', value: String(c.perCourse) }, { label: 'Courses', value: String(c.courses), note: `${b.faceH} in per course, including the joint` }] }] : []),
        { title: 'Mortar', rows: [{ label: '80-lb bags of mortar mix', value: int(r.mortarBags), note: `About ${BLOCKS_PER_MORTAR_BAG} standard blocks per bag; varies with joint size` }] },
        ...(r.groutFt3 > 0
          ? [
              {
                title: 'Core fill',
                rows: [
                  { label: 'Grout or concrete', value: `${fmt(r.groutYd3)} yd³`, note: `${fmt(r.groutFt3, 1)} ft³` },
                  { label: '80-lb bags', value: int(concreteBags), note: `at ${BAG80.yieldFt3} ft³ per bag` },
                ],
              },
            ]
          : []),
        { title: 'Estimated cost', rows: cost },
      ],
      advice:
        r.blocks <= 0
          ? 'Enter the wall size to see how many blocks you need.'
          : 'Corners and wall ends need half blocks or cut blocks; most suppliers sell matching halves and corner units. A retaining or foundation wall needs rebar and grout as specified by local code.',
      summary: `${int(r.blocks)} blocks · ${r.mortarBags} bags mortar`,
    };
  },
};
export default def;
