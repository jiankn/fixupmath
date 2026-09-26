// 电工数据与公式。数据取自美国电气规范 NEC：
// 导线直流电阻：Chapter 9 Table 8（75°C，无镀层铜 / 铝），Ω/1000 ft
// 载流量：Table 310.16（原 310.15(B)(16)），60°C 和 75°C 列，环境 30°C、同管不超过 3 根载流导线
// 导线截面积：Chapter 9 Table 5（THHN/THWN-2），in²
// 线管内截面积：Chapter 9 Table 4（100% 面积），in²
// 填充率上限：Chapter 9 Table 1

export const GAUGES = ['14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500'] as const;
export type Gauge = (typeof GAUGES)[number];
export type Metal = 'cu' | 'al';
/** 单相交流、三相交流、直流（直流电流同样一去一回，公式与单相相同） */
export type Phase = '1' | '3' | 'dc';

export const gaugeLabel = (g: string) => (Number(g) >= 250 ? `${g} kcmil` : `${g} AWG`);

// Ω / 1000 ft
export const RESISTANCE: Record<Metal, Partial<Record<Gauge, number>>> = {
  cu: { '14': 3.07, '12': 1.93, '10': 1.21, '8': 0.764, '6': 0.491, '4': 0.308, '3': 0.245, '2': 0.194, '1': 0.154, '1/0': 0.122, '2/0': 0.0967, '3/0': 0.0766, '4/0': 0.0608, '250': 0.0515, '300': 0.0429, '350': 0.0367, '400': 0.0321, '500': 0.0258 },
  al: { '12': 3.18, '10': 2.0, '8': 1.26, '6': 0.808, '4': 0.508, '3': 0.403, '2': 0.319, '1': 0.253, '1/0': 0.201, '2/0': 0.159, '3/0': 0.126, '4/0': 0.1, '250': 0.0847, '300': 0.0707, '350': 0.0605, '400': 0.0529, '500': 0.0424 },
};

// 载流量（A）
export const AMPACITY: Record<Metal, Record<'60' | '75', Partial<Record<Gauge, number>>>> = {
  cu: {
    '60': { '14': 15, '12': 20, '10': 30, '8': 40, '6': 55, '4': 70, '3': 85, '2': 95, '1': 110, '1/0': 125, '2/0': 145, '3/0': 165, '4/0': 195, '250': 215, '300': 240, '350': 260, '400': 280, '500': 320 },
    '75': { '14': 20, '12': 25, '10': 35, '8': 50, '6': 65, '4': 85, '3': 100, '2': 115, '1': 130, '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230, '250': 255, '300': 285, '350': 310, '400': 335, '500': 380 },
  },
  al: {
    '60': { '12': 15, '10': 25, '8': 35, '6': 40, '4': 55, '3': 65, '2': 75, '1': 85, '1/0': 100, '2/0': 115, '3/0': 130, '4/0': 150, '250': 170, '300': 195, '350': 210, '400': 225, '500': 260 },
    '75': { '12': 20, '10': 30, '8': 40, '6': 50, '4': 65, '3': 75, '2': 90, '1': 100, '1/0': 120, '2/0': 135, '3/0': 155, '4/0': 180, '250': 205, '300': 230, '350': 250, '400': 270, '500': 310 },
  },
};

// NEC 240.4(D) 小导线过流保护上限：14 铜 15A、12 铜 20A、10 铜 30A；12 铝 15A、10 铝 25A
export const SMALL_CONDUCTOR_MAX: Record<Metal, Partial<Record<Gauge, number>>> = {
  cu: { '14': 15, '12': 20, '10': 30 },
  al: { '12': 15, '10': 25 },
};

/** 实际可用载流量：取表值与 240.4(D) 上限的较小值 */
export function usableAmps(metal: Metal, col: '60' | '75', g: Gauge): number | undefined {
  const a = AMPACITY[metal][col][g];
  if (a === undefined) return undefined;
  const cap = SMALL_CONDUCTOR_MAX[metal][g];
  return cap !== undefined ? Math.min(a, cap) : a;
}

/** 电压降（V）：单相和直流 2 × L × I × R/1000，三相 √3 × L × I × R/1000；L 为单程长度（ft） */
export function voltageDrop(metal: Metal, g: Gauge, amps: number, oneWayFt: number, phase: Phase): number | undefined {
  const r = RESISTANCE[metal][g];
  if (r === undefined || !(amps > 0) || !(oneWayFt > 0)) return r === undefined ? undefined : 0;
  const k = phase === '3' ? Math.sqrt(3) : 2;
  return (k * oneWayFt * amps * r) / 1000;
}

export interface SizeInput {
  metal: Metal;
  amps: number;
  oneWayFt: number;
  volts: number;
  phase: Phase;
  maxDropPct: number;
  column: '60' | '75';
  continuous: boolean; // 连续负载按 125% 选线
}

/** 同时满足载流量和电压降的最小线径 */
export function sizeWire(i: SizeInput) {
  const designAmps = i.amps * (i.continuous ? 1.25 : 1);
  let byAmpacity: Gauge | undefined;
  let byDrop: Gauge | undefined;
  for (const g of GAUGES) {
    const a = usableAmps(i.metal, i.column, g);
    if (a === undefined) continue;
    if (!byAmpacity && a >= designAmps) byAmpacity = g;
    const vd = voltageDrop(i.metal, g, i.amps, i.oneWayFt, i.phase);
    if (!byDrop && vd !== undefined && i.volts > 0 && (vd / i.volts) * 100 <= i.maxDropPct) byDrop = g;
  }
  const idx = (g?: Gauge) => (g ? GAUGES.indexOf(g) : Infinity);
  const pick = byAmpacity && byDrop ? GAUGES[Math.max(idx(byAmpacity), idx(byDrop))] : undefined;
  return { designAmps, byAmpacity, byDrop, pick };
}

// ---- 线管填充 ----
export const WIRE_AREA_THHN: Record<Gauge, number> = {
  '14': 0.0097, '12': 0.0133, '10': 0.0211, '8': 0.0366, '6': 0.0507, '4': 0.0824, '3': 0.0973, '2': 0.1158, '1': 0.1562,
  '1/0': 0.1855, '2/0': 0.2223, '3/0': 0.2679, '4/0': 0.3237, '250': 0.397, '300': 0.4608, '350': 0.5242, '400': 0.5863, '500': 0.7073,
};

export const CONDUIT_SIZES = ['1/2', '3/4', '1', '1-1/4', '1-1/2', '2', '2-1/2', '3', '3-1/2', '4'] as const;
export type ConduitSize = (typeof CONDUIT_SIZES)[number];
export const CONDUITS: Record<string, { label: string; area: Record<ConduitSize, number> }> = {
  emt: {
    label: 'EMT',
    area: { '1/2': 0.304, '3/4': 0.533, '1': 0.864, '1-1/4': 1.496, '1-1/2': 2.036, '2': 3.356, '2-1/2': 5.858, '3': 8.846, '3-1/2': 11.545, '4': 14.753 },
  },
  pvc40: {
    label: 'PVC Schedule 40',
    area: { '1/2': 0.285, '3/4': 0.508, '1': 0.832, '1-1/4': 1.453, '1-1/2': 1.986, '2': 3.291, '2-1/2': 4.695, '3': 7.268, '3-1/2': 9.737, '4': 12.554 },
  },
  pvc80: {
    label: 'PVC Schedule 80',
    area: { '1/2': 0.217, '3/4': 0.409, '1': 0.688, '1-1/4': 1.237, '1-1/2': 1.711, '2': 2.874, '2-1/2': 4.119, '3': 6.442, '3-1/2': 8.688, '4': 11.258 },
  },
};

/** NEC 第 9 章表 1：1 根 53%，2 根 31%，3 根及以上 40% */
export function fillLimitPct(conductors: number): number {
  return conductors <= 1 ? 53 : conductors === 2 ? 31 : 40;
}

/** 允许的导线总面积：NEC 表 4 各百分比列按三位小数公布，附录 C 的根数也按此计算 */
export function allowedArea(conduitArea: number, pct: number): number {
  return Math.round(conduitArea * pct * 10) / 1000;
}

export function conduitFill(type: string, size: ConduitSize, groups: { gauge: Gauge; count: number }[]) {
  const c = CONDUITS[type] ?? CONDUITS.emt;
  const area = c.area[size];
  const wires = groups.filter((g) => g.count > 0);
  const count = wires.reduce((s, g) => s + Math.floor(g.count), 0);
  const wireArea = wires.reduce((s, g) => s + WIRE_AREA_THHN[g.gauge] * Math.floor(g.count), 0);
  const fillPct = area ? (wireArea / area) * 100 : 0;
  const limit = fillLimitPct(count);
  const allowed = allowedArea(area, limit);
  return { conduitArea: area, count, wireArea, fillPct, limit, allowed, ok: count > 0 && wireArea <= allowed + 1e-9 };
}

/** 某种线管尺寸最多能穿几根同规格 THHN（3 根及以上按 40%） */
export function maxWires(type: string, size: ConduitSize, gauge: Gauge): number {
  const area = (CONDUITS[type] ?? CONDUITS.emt).area[size];
  const w = WIRE_AREA_THHN[gauge];
  const n40 = Math.floor(allowedArea(area, 40) / w + 1e-9);
  if (n40 >= 3) return n40;
  if (w * 2 <= allowedArea(area, 31) + 1e-9) return 2;
  return w <= allowedArea(area, 53) + 1e-9 ? 1 : 0;
}
