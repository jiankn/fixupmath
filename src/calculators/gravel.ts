// 碎石计算器
import { bulkCalculator } from './shared';

export const GRAVEL_MATERIALS = [
  { id: 'pea', label: 'Pea gravel', tonsPerYd3: 1.4 },
  { id: 'crushed', label: 'Crushed stone (#57)', tonsPerYd3: 1.4 },
  { id: 'crusher-run', label: 'Crusher run / road base', tonsPerYd3: 1.5 },
  { id: 'river', label: 'River rock', tonsPerYd3: 1.35 },
];

export default bulkCalculator({
  id: 'gravel',
  name: 'gravel',
  materials: GRAVEL_MATERIALS,
  depthDefault: { value: 3, unit: 'in' },
  depthHint: '2–3 in for paths, 4–6 in for driveways',
  wasteDefault: 5,
  wasteHint: 'Add more for compacted base layers',
  bags: [{ ft3: 0.5, label: '0.5 cu ft (≈50 lb)' }],
  showTons: true,
  bagsBelowYd3: 0.5,
});
