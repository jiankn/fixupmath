import { ceilCount } from './format';

export const MAPEI_SOURCE = 'https://cdnmedia.mapei.com/docs/librariesprovider10/products-documents/1_3000144_ultracolor-plus-fa_en-us_3884d11a557d4684aeb2348441183365.pdf';
export const LATICRETE_SOURCE = 'https://www.laticrete.com/-/media/project/laticrete-international/north-america/product-documents/marketing-information/catalogs-and-brochures/ds2540524_color_card_grout_caulks_sealants_profiles_trims.pdf';
export const GROUT_JOINTS = [
  { value: '1/16', label: '1/16 in' }, { value: '1/8', label: '1/8 in' }, { value: '1/4', label: '1/4 in' },
];
export const GROUT_TILES = [
  { value: '1x1', label: '1 × 1 in, 1/4 in deep' },
  { value: '12x24', label: '12 × 24 in, 3/8 in deep' },
  { value: '24x24', label: '24 × 24 in, 3/8 in deep' },
];
type CoverageRows = Record<string, readonly [number, number, number]>;
// Published square feet per package; each package's own chart is transcribed.
// MAPEI: edition August 28, 2026, pp. 7–9. LATICRETE: DS254.3-1123.
// The LATICRETE chart explicitly excludes PERMACOLOR Select.
export const GROUT_PRODUCTS: { value: string; label: string; bagLb: number; coverage: CoverageRows }[] = [
  { value: 'mapei-25', label: 'MAPEI Ultracolor Plus FA — 25 lb', bagLb: 25, coverage: {
    '1x1': [97, 49, 25], '12x24': [1035, 518, 259], '24x24': [1552, 776, 388],
  } },
  { value: 'mapei-10', label: 'MAPEI Ultracolor Plus FA — 10 lb', bagLb: 10, coverage: {
    '1x1': [39, 20, 10], '12x24': [414, 207, 104], '24x24': [621, 311, 156],
  } },
  { value: 'laticrete-25', label: 'LATICRETE PERMACOLOR Grout — 25 lb', bagLb: 25, coverage: {
    '1x1': [103, 53, 29], '12x24': [1070, 536, 269], '24x24': [1605, 804, 403],
  } },
];
export function groutCoverage(productId: string, tile: string, joint: string): number | undefined {
  const col = GROUT_JOINTS.findIndex(j => j.value === joint);
  const row = GROUT_PRODUCTS.find(p => p.value === productId)?.coverage[tile];
  return row && col >= 0 ? row[col] : undefined;
}
export function groutBags(areaFt2: number, coverageFt2: number, bagLb: number, wastePct: number) {
  const valid = [areaFt2, coverageFt2, bagLb, wastePct].every(Number.isFinite)
    && areaFt2 > 0 && coverageFt2 > 0 && bagLb > 0 && wastePct >= 0;
  const equivalentBags = valid ? areaFt2 * (1 + wastePct / 100) / coverageFt2 : 0;
  return { valid, equivalentBags, pounds: equivalentBags * (valid ? bagLb : 0), bags: ceilCount(equivalentBags) };
}
/** Rectangular repeating tile grid, including the joint intersection once. */
export function groutJointVolume(areaFt2: number, tileLengthIn: number, tileWidthIn: number, jointIn: number, depthIn: number) {
  if (![areaFt2, tileLengthIn, tileWidthIn, jointIn, depthIn].every(Number.isFinite)
    || areaFt2 <= 0 || tileLengthIn <= 0 || tileWidthIn <= 0 || jointIn < 0 || depthIn < 0) return 0;
  const jointFraction = 1 - tileLengthIn * tileWidthIn / ((tileLengthIn + jointIn) * (tileWidthIn + jointIn));
  return areaFt2 * depthIn / 12 * jointFraction;
}
