// 景观石计算器：装饰用石材（河石、火山石、大理石碎等）
import { bulkCalculator } from './shared';

export const ROCK_MATERIALS = [
  { id: 'river', label: 'River rock', tonsPerYd3: 1.35 },
  { id: 'pea', label: 'Pea gravel', tonsPerYd3: 1.4 },
  { id: 'dg', label: 'Decomposed granite', tonsPerYd3: 1.35 },
  { id: 'marble', label: 'Marble chips', tonsPerYd3: 1.4 },
  { id: 'beach', label: 'Beach pebbles', tonsPerYd3: 1.4 },
  { id: 'lava', label: 'Lava rock', tonsPerYd3: 0.5 },
];

export default bulkCalculator({
  id: 'landscape-rock',
  name: 'rock',
  materials: ROCK_MATERIALS,
  depthDefault: { value: 3, unit: 'in' },
  depthHint: 'About twice the size of the largest stones',
  wasteDefault: 5,
  wasteHint: 'Rock settles into fabric and soil a little',
  bags: [{ ft3: 0.5, label: '0.5 cu ft' }],
  showTons: true,
  bagsBelowYd3: 0.5,
  shapeDefaults: { length: { value: 20, unit: 'ft' }, width: { value: 5, unit: 'ft' } },
});
