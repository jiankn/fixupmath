// 沙子计算器
import { bulkCalculator } from './shared';

export const SAND_MATERIALS = [
  { id: 'dry', label: 'Dry sand', tonsPerYd3: 1.35 },
  { id: 'damp', label: 'Damp sand', tonsPerYd3: 1.6 },
];

export default bulkCalculator({
  id: 'sand',
  name: 'sand',
  materials: SAND_MATERIALS,
  depthDefault: { value: 2, unit: 'in' },
  depthHint: '1 in under pavers, 2 in under an above-ground pool',
  wasteDefault: 5,
  wasteHint: 'Sand compacts, so round up for base layers',
  bags: [{ ft3: 0.5, label: '0.5 cu ft (≈50 lb)' }],
  showTons: true,
  bagsBelowYd3: 0.5,
  shapeDefaults: { length: { value: 12, unit: 'ft' }, width: { value: 12, unit: 'ft' } },
});
