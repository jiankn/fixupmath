// 屋面：坡度换算（x/12、角度、百分比）和整套屋面材料（平方数、防水卷材、滴水边、屋脊瓦、起始瓦、钉子）
import { pitchFactor } from './finish';
import { ceilCount } from './format';

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** 坡度 rise/12 → 角度（度） */
export const pitchToDeg = (rise: number) => (Math.atan(pos(rise) / 12) * 180) / Math.PI;
/** 角度 → 坡度 rise/12 */
export const degToPitch = (deg: number) => (deg > 0 && deg < 90 ? Math.tan((deg * Math.PI) / 180) * 12 : 0);

export function pitchInfo(rise: number) {
  const r = pos(rise);
  return {
    rise: r,
    deg: pitchToDeg(r),
    percent: (r / 12) * 100,
    factor: pitchFactor(r),
    /** 最接近的整数坡度（屋面材料和施工规范都按整数 x/12 写） */
    nearest: Math.round(r),
  };
}

/** IRC R905.2.2：沥青瓦最低 2/12；2/12 到 4/12 之间要双层底衬 */
export type SlopeClass = 'flat' | 'low' | 'shingle-double' | 'conventional' | 'steep';
export function slopeClass(rise: number): SlopeClass {
  if (rise < 2) return rise < 0.25 ? 'flat' : 'low';
  if (rise < 4) return 'shingle-double';
  if (rise <= 9) return 'conventional';
  return 'steep';
}

/** 防水底衬每卷覆盖面积（ft²，扣除搭接后的实际覆盖） */
export const UNDERLAYMENTS = [
  { value: 'synthetic', label: 'Synthetic, 10-square roll', coverFt2: 1000 },
  { value: 'felt15', label: '#15 felt, 4-square roll', coverFt2: 400 },
  { value: 'felt30', label: '#30 felt, 2-square roll', coverFt2: 200 },
];

/** 屋脊瓦、起始瓦每捆的线性英尺（各品牌不同，取常见值） */
export const RIDGE_CAP_LF_PER_BUNDLE = 25;
export const STARTER_LF_PER_BUNDLE = 100;
export const DRIP_EDGE_PIECE_FT = 10;
/** 四钉法约每平方 320 根钉 */
export const NAILS_PER_SQUARE = 320;

export interface RoofInput {
  /** 水平投影长、宽（含挑檐），ft；按已知面积输入时为 0 */
  lengthFt: number;
  widthFt: number;
  /** 直接给斜面面积（ft²），优先于长宽 */
  slopedFt2?: number;
  pitch: number;
  type: 'gable' | 'hip';
  wastePct: number;
  bundlesPerSquare: number;
  underlayCoverFt2: number;
}

export function roofMaterials(i: RoofInput) {
  const L = pos(i.lengthFt);
  const W = pos(i.widthFt);
  const f = pitchFactor(i.pitch);
  const footprint = L * W;
  const sloped = i.slopedFt2 !== undefined ? pos(i.slopedFt2) : footprint * f;
  const withWaste = sloped * (1 + pos(i.wastePct) / 100);
  const squares = withWaste / 100;
  const bundles = ceilCount(squares * pos(i.bundlesPerSquare));
  const underlayRolls = i.underlayCoverFt2 > 0 ? ceilCount(sloped / i.underlayCoverFt2) : 0;

  // 线性构件只有知道长宽时才能算。长边为屋脊方向
  const hasPlan = i.slopedFt2 === undefined && L > 0 && W > 0;
  const long = Math.max(L, W);
  const short = Math.min(L, W);
  const run = short / 2;
  const rise = (run * pos(i.pitch)) / 12;
  let eaves = 0;
  let rakes = 0;
  let ridge = 0;
  let hips = 0;
  if (hasPlan) {
    if (i.type === 'gable') {
      eaves = 2 * long;
      rakes = 4 * run * f; // 两个山墙，每个两条斜边
      ridge = long;
    } else {
      eaves = 2 * (long + short);
      ridge = long - short;
      hips = 4 * Math.sqrt(2 * run * run + rise * rise);
    }
  }
  const dripEdgeFt = eaves + rakes;
  const ridgeCapFt = ridge + hips;
  return {
    footprint,
    factor: f,
    sloped,
    squares,
    bundles,
    underlayRolls,
    hasPlan,
    eavesFt: eaves,
    rakesFt: rakes,
    ridgeFt: ridge,
    hipsFt: hips,
    dripEdgeFt,
    dripEdgePieces: ceilCount(dripEdgeFt / DRIP_EDGE_PIECE_FT),
    starterBundles: ceilCount(eaves / STARTER_LF_PER_BUNDLE),
    ridgeCapFt,
    ridgeCapBundles: ceilCount(ridgeCapFt / RIDGE_CAP_LF_PER_BUNDLE),
    nails: ceilCount(squares * NAILS_PER_SQUARE),
  };
}
