// 场地与砌筑：沥青（吨数）、填方土（压实系数）、空心砌块（块数、砂浆、灌芯）
import { cubicFeetToCubicYards, cubicFeetToCubicMeters } from './units';
import { ceilTo, ceilCount } from './format';

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

// ---- 沥青 ----

/** 沥青混合料压实后的典型容重（lb/ft³）。各厂配比不同，页面允许用户改 */
export const ASPHALT_MATERIALS = [
  { id: 'hma', label: 'Hot mix asphalt, compacted', lbPerFt3: 145 },
  { id: 'millings', label: 'Asphalt millings, compacted', lbPerFt3: 125 },
];

export function asphaltResult(areaFt2: number, thicknessIn: number, lbPerFt3: number, wastePct: number) {
  const ft3 = pos(areaFt2) * (pos(thicknessIn) / 12) * (1 + pos(wastePct) / 100);
  const pounds = ft3 * pos(lbPerFt3);
  const tons = pounds / 2000;
  return {
    ft3,
    cubicYards: cubicFeetToCubicYards(ft3),
    tons,
    pounds,
    squareYards: pos(areaFt2) / 9,
    /** 沥青厂按吨卖，向上取整到 ½ 吨 */
    orderTons: ceilTo(tons, 0.5),
  };
}

/** 一吨沥青在某个压实厚度下能铺多少平方英尺 */
export function asphaltFt2PerTon(thicknessIn: number, lbPerFt3: number): number {
  return thicknessIn > 0 && lbPerFt3 > 0 ? 2000 / lbPerFt3 / (thicknessIn / 12) : 0;
}

// ---- 填方土 ----

/**
 * 填方土：压实后要达到的体积 → 要买的松散体积。
 * 松土压实会缩，压实率 c% 表示松土体积比压实后多 c%（按松散方量下单）。
 */
export function fillDirtResult(compactedFt3: number, compactionPct: number, tonsPerYd3: number, truckYd3: number) {
  const net = pos(compactedFt3);
  const looseFt3 = net * (1 + pos(compactionPct) / 100);
  const cubicYards = cubicFeetToCubicYards(looseFt3);
  const tons = cubicYards * pos(tonsPerYd3);
  return {
    compactedYd3: cubicFeetToCubicYards(net),
    looseFt3,
    cubicYards,
    cubicMeters: cubicFeetToCubicMeters(looseFt3),
    tons,
    pounds: tons * 2000,
    orderYards: ceilTo(cubicYards, 0.5),
    truckloads: truckYd3 > 0 ? ceilCount(cubicYards / truckYd3) : 0,
  };
}

// ---- 空心砌块（CMU / cinder block） ----

/** 常见美国砌块：名义尺寸（宽 × 高 × 长，英寸）与实际尺寸（各小 ⅜ in 灰缝） */
export const BLOCKS = [
  { value: '8x8x16', label: '8 × 8 × 16 in (standard)', widthIn: 7.625, faceH: 8, faceL: 16 },
  { value: '6x8x16', label: '6 × 8 × 16 in', widthIn: 5.625, faceH: 8, faceL: 16 },
  { value: '10x8x16', label: '10 × 8 × 16 in', widthIn: 9.625, faceH: 8, faceL: 16 },
  { value: '12x8x16', label: '12 × 8 × 16 in', widthIn: 11.625, faceH: 8, faceL: 16 },
  { value: '4x8x16', label: '4 × 8 × 16 in (partition)', widthIn: 3.625, faceH: 8, faceL: 16 },
  { value: '8x4x16', label: '8 × 4 × 16 in (half high)', widthIn: 7.625, faceH: 4, faceL: 16 },
];

/** 一袋 80 磅预拌砂浆大约能砌的 8 × 8 × 16 砌块数（按常见袋标） */
export const BLOCKS_PER_MORTAR_BAG = 13;

/** 标准空心砌块里空芯约占墙体实际体积的比例（估算值，用于灌芯方量） */
export const CORE_VOID_FRACTION = 0.43;

/** 灌芯方式：不灌 / 每 48 in 灌一个孔（配竖向钢筋，约 1/6 的孔）/ 全灌 */
export const CORE_FILL = [
  { value: 'none', label: 'No core fill', fraction: 0 },
  { value: 'rebar48', label: 'One cell every 48 in (rebar cells)', fraction: 1 / 6 },
  { value: 'full', label: 'Every cell (fully grouted)', fraction: 1 },
];

export function blockWall(wallFt2: number, faceHIn: number, faceLIn: number, widthIn: number, wastePct: number, fillFraction: number) {
  const area = pos(wallFt2);
  const perFt2 = faceHIn > 0 && faceLIn > 0 ? 144 / (faceHIn * faceLIn) : 0;
  const net = area * perFt2;
  const blocks = ceilCount(net * (1 + pos(wastePct) / 100));
  // 砂浆按 8 × 16 in 面的砌块换算；半高块灰缝长度相同、块数翻倍，按块面积折算
  const mortarBags = ceilCount((net * (faceHIn * faceLIn)) / (8 * 16) / BLOCKS_PER_MORTAR_BAG);
  const groutFt3 = area * (pos(widthIn) / 12) * CORE_VOID_FRACTION * Math.min(1, pos(fillFraction));
  return {
    perFt2,
    blocks,
    mortarBags,
    groutFt3,
    groutYd3: cubicFeetToCubicYards(groutFt3),
  };
}

/** 墙长、墙高 → 每皮块数和皮数（按名义尺寸，含灰缝） */
export function blockCourses(lengthFt: number, heightFt: number, faceHIn: number, faceLIn: number) {
  return {
    perCourse: faceLIn > 0 ? ceilCount((pos(lengthFt) * 12) / faceLIn) : 0,
    courses: faceHIn > 0 ? ceilCount((pos(heightFt) * 12) / faceHIn) : 0,
  };
}
