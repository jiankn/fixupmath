// 泳池化学品投放量。所有剂量都是「提高 x ppm」的线性计算：
// 需要的有效成分（磅）= 加仑 × 8.3454 × 1e-6 × ppm × 当量系数 ÷ 纯度
// pH 调节是非线性的（取决于碱度等），这里不计算。

export const LB_WATER_PER_GAL = 8.3454;
const G_PER_LB = 453.592;
const L_PER_GAL = 3.78541;

export interface ChlorineProduct {
  id: string;
  label: string;
  kind: 'liquid' | 'dry';
  /** 有效氯百分比 */
  pct: number;
  /** 液体：标签百分比是按重量（家用漂白水）时，实际每升有效氯约高 10%（溶液比重约 1.1） */
  byWeight?: boolean;
  /** 每 1 ppm 有效氯附带增加的稳定剂（CYA）或钙硬度（CH），ppm */
  addsCya?: number;
  addsCh?: number;
}

export const CHLORINE_PRODUCTS: ChlorineProduct[] = [
  { id: 'liquid10', label: 'Liquid chlorine 10%', kind: 'liquid', pct: 10 },
  { id: 'liquid125', label: 'Liquid chlorine 12.5%', kind: 'liquid', pct: 12.5 },
  { id: 'bleach6', label: 'Household bleach 6%', kind: 'liquid', pct: 6, byWeight: true },
  { id: 'bleach825', label: 'Household bleach 8.25%', kind: 'liquid', pct: 8.25, byWeight: true },
  { id: 'calhypo65', label: 'Cal-hypo shock 65%', kind: 'dry', pct: 65, addsCh: 0.7 },
  { id: 'calhypo73', label: 'Cal-hypo shock 73%', kind: 'dry', pct: 73, addsCh: 0.7 },
  { id: 'dichlor', label: 'Dichlor granules 56%', kind: 'dry', pct: 56, addsCya: 0.9 },
  { id: 'trichlor', label: 'Trichlor tabs 90%', kind: 'dry', pct: 90, addsCya: 0.6 },
];

/** 化学品本身的重量（磅）：有效成分 ÷ 纯度 */
export function activePounds(gallons: number, ppm: number): number {
  return gallons > 0 && ppm > 0 ? gallons * LB_WATER_PER_GAL * 1e-6 * ppm : 0;
}

export interface Dose {
  pounds: number; // 干粉重量；液体为 0
  ounces: number; // 干粉：重量盎司；液体：液量盎司
  gallons: number; // 液体体积（加仑）
  liquid: boolean;
}

export function chlorineDose(p: ChlorineProduct, gallons: number, ppm: number): Dose {
  const lb = activePounds(gallons, ppm);
  if (p.kind === 'liquid') {
    const gPerL = p.pct * 10 * (p.byWeight ? 1.1 : 1);
    const liters = (lb * G_PER_LB) / gPerL;
    const gal = liters / L_PER_GAL;
    return { pounds: 0, ounces: gal * 128, gallons: gal, liquid: true };
  }
  const dry = lb / (p.pct / 100);
  return { pounds: dry, ounces: dry * 16, gallons: 0, liquid: false };
}

/** 小苏打（碳酸氢钠）提高总碱度：1 ppm（以 CaCO3 计）需要 84/50 = 1.68 ppm 碳酸氢钠 */
export function bakingSodaPounds(gallons: number, ppm: number): number {
  return activePounds(gallons, ppm) * 1.68;
}

/** 稳定剂（氰尿酸，约 100%） */
export function stabilizerPounds(gallons: number, ppm: number): number {
  return activePounds(gallons, ppm);
}

/** 氯化钙提高钙硬度：1 ppm（以 CaCO3 计）需要 111/100 = 1.11 ppm 无水氯化钙；按产品纯度折算 */
export const CALCIUM_PRODUCTS = [
  { id: 'cacl-94', label: 'Calcium chloride 94–97% (anhydrous)', purity: 0.95 },
  { id: 'cacl-77', label: 'Calcium chloride flakes 77–80% (dihydrate)', purity: 0.78 },
];
export function calciumPounds(gallons: number, ppm: number, purity: number): number {
  return purity > 0 ? (activePounds(gallons, ppm) * 1.11) / purity : 0;
}

/** Trouble Free Pool 的 FC/CYA 关系：最低 FC ≈ CYA 的 7.5%，冲击（SLAM）≈ CYA 的 40% */
export function fcTargets(cya: number) {
  const c = Number.isFinite(cya) && cya > 0 ? cya : 0;
  return { minimum: c * 0.075, target: c * 0.115, shock: c * 0.4 };
}
