// 袋装混凝土和混凝土板的计算：纯函数，页面构建、浏览器和测试共用。
import { ceilCount } from './format';

/**
 * 普通袋装混凝土每袋出方量（立方英尺）。
 * 来源：QUIKRETE Concrete Mix No. 1101 技术数据表（Revised October 2022）的 YIELD 一节；
 * Sakrete High-Strength Concrete Mix 官网产品页 40/60/80 lb 数值相同（Sakrete 官网没有列 50 lb）。
 * 托盘袋数：QUIKRETE 1101 产品页（40 lb 80 袋、60 lb 56 袋、80 lb 42 袋）；50 lb 没有公开数，留空。
 * 核实日期 2026-11-08。
 */
export const BAG_YIELDS = [
  { lb: 40, ft3: 0.3, perPallet: 80 },
  { lb: 50, ft3: 0.375, perPallet: undefined },
  { lb: 60, ft3: 0.45, perPallet: 56 },
  { lb: 80, ft3: 0.6, perPallet: 42 },
] as const satisfies readonly { lb: number; ft3: number; perPallet?: number }[];

export type BagLb = (typeof BAG_YIELDS)[number]['lb'];

export const BAG_SOURCES = {
  verified: '2026-11-08',
  quikreteTds: 'https://www.quikrete.com/pdfs/data_sheet-concrete%20mix%201101.pdf',
  quikretePallets: 'https://www.quikrete.com/lowes/product_1101.asp',
  sakrete: 'https://www.sakrete.com/product/high-strength-concrete-mix/',
};

export const bagOf = (lb: number) => BAG_YIELDS.find((b) => b.lb === lb);

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** 体积（ft³，已含损耗）÷ 每袋出方量，向上取整 */
export function bagsFor(volumeFt3: number, yieldFt3: number): number {
  const v = pos(volumeFt3);
  const y = pos(yieldFt3);
  return v > 0 && y > 0 ? ceilCount(v / y) : 0;
}

/** 每立方码要几袋（27 ft³ ÷ 出方量，向上取整），以及一袋等于多少立方码 */
export function bagsPerYard(yieldFt3: number) {
  return { bags: bagsFor(27, yieldFt3), yardsPerBag: pos(yieldFt3) / 27 };
}

/** 袋数拆成整托盘 + 散袋 */
export function palletSplit(bags: number, perPallet: number | undefined) {
  if (!perPallet || !(bags > 0)) return { pallets: 0, loose: Math.max(0, Math.round(bags) || 0) };
  return { pallets: Math.floor(bags / perPallet), loose: bags % perPallet };
}

export interface SlabInput {
  lengthFt: number;
  widthFt: number;
  thicknessFt: number;
  /** 加厚边：边缘总厚度（含板厚），0 或不大于板厚表示没有加厚边 */
  edgeDepthFt?: number;
  /** 加厚边宽度（沿四周向内量） */
  edgeWidthFt?: number;
}

/**
 * 长方形混凝土板体积。加厚边按四周一圈矩形截面计算：
 * 加厚带面积 = L×W − (L−2B)(W−2B)，额外深度 = 边缘总厚 − 板厚。
 * 实际加厚边多为斜坡（梯形截面），按矩形算会略多，偏安全。
 */
export function slabVolume(s: SlabInput) {
  const L = pos(s.lengthFt);
  const W = pos(s.widthFt);
  const t = pos(s.thicknessFt);
  const area = L * W;
  const slabFt3 = area * t;
  const extraDepth = Math.max(0, pos(s.edgeDepthFt ?? 0) - t);
  const B = pos(s.edgeWidthFt ?? 0);
  const inner = Math.max(0, L - 2 * B) * Math.max(0, W - 2 * B);
  const bandArea = extraDepth > 0 && B > 0 ? area - inner : 0;
  const edgeFt3 = bandArea * extraDepth;
  return { areaFt2: area, slabFt3, edgeFt3, bandAreaFt2: bandArea, netFt3: slabFt3 + edgeFt3 };
}

/** 1 立方码在某厚度下能铺多少平方英尺 */
export const sqftPerYard = (thicknessIn: number) => (thicknessIn > 0 ? 27 / (thicknessIn / 12) : 0);
