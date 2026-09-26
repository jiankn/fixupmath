// 表土计算器
import { bulkCalculator } from './shared';

export const TOPSOIL_MATERIALS = [
  { id: 'topsoil', label: 'Screened topsoil', tonsPerYd3: 1.1 },
  { id: 'moist', label: 'Wet topsoil', tonsPerYd3: 1.3 },
  { id: 'compost', label: 'Compost', tonsPerYd3: 0.6 },
];

export default bulkCalculator({
  id: 'topsoil',
  name: 'topsoil',
  materials: TOPSOIL_MATERIALS,
  depthDefault: { value: 4, unit: 'in' },
  depthHint: '4–6 in for a new lawn, 6–12 in for garden beds',
  wasteDefault: 10,
  wasteHint: 'Loose soil settles 10–20% after watering',
  bags: [
    { ft3: 0.75, label: '0.75 cu ft' },
    { ft3: 1, label: '1 cu ft' },
  ],
  showTons: true,
  bagsBelowYd3: 0.5,
  shapeDefaults: { length: { value: 20, unit: 'ft' }, width: { value: 10, unit: 'ft' } },
});
