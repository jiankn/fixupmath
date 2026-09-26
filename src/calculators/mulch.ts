// 覆盖物计算器（按体积和袋数卖，不按吨）
import { bulkCalculator } from './shared';

export default bulkCalculator({
  id: 'mulch',
  name: 'mulch',
  materials: [{ id: 'mulch', label: 'Mulch', tonsPerYd3: 0.3 }],
  depthDefault: { value: 3, unit: 'in' },
  depthHint: '2–3 in for beds; 2 in to top up old mulch',
  wasteDefault: 10,
  wasteHint: 'Mulch settles and breaks down over the season',
  bags: [
    { ft3: 2, label: '2 cu ft' },
    { ft3: 3, label: '3 cu ft' },
  ],
  showTons: false,
  bagsBelowYd3: 1,
  shapeDefaults: { length: { value: 20, unit: 'ft' }, width: { value: 4, unit: 'ft' } },
});
