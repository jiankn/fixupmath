// 立方码计算器：任意散装材料的通用版（泥土、碎石、沙子、覆盖物、混凝土）
import { bulkCalculator } from './shared';

export const CUBIC_YARD_MATERIALS = [
  { id: 'dirt', label: 'Dirt / topsoil', tonsPerYd3: 1.1 },
  { id: 'gravel', label: 'Gravel / crushed stone', tonsPerYd3: 1.4 },
  { id: 'sand', label: 'Sand', tonsPerYd3: 1.35 },
  { id: 'mulch', label: 'Mulch', tonsPerYd3: 0.3 },
  { id: 'concrete', label: 'Concrete', tonsPerYd3: 2.03 },
];

export default bulkCalculator({
  id: 'cubic-yard',
  name: 'material',
  materials: CUBIC_YARD_MATERIALS,
  depthDefault: { value: 4, unit: 'in' },
  depthHint: 'Thickness or depth of the fill',
  wasteDefault: 5,
  wasteHint: 'Add more for material that settles or compacts',
  bags: [
    { ft3: 0.5, label: '0.5 cu ft' },
    { ft3: 2, label: '2 cu ft' },
  ],
  showTons: true,
  bagsBelowYd3: 0.5,
  shapeDefaults: { length: { value: 10, unit: 'ft' }, width: { value: 10, unit: 'ft' } },
});
