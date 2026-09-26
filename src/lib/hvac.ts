// 空调功率（BTU）与保温材料

/** ENERGY STAR 房间空调选型表：面积上限（ft²）→ 制冷量（BTU/h） */
export const ENERGY_STAR_BTU: [number, number][] = [
  [150, 5000],
  [250, 6000],
  [300, 7000],
  [350, 8000],
  [400, 9000],
  [450, 10000],
  [550, 12000],
  [700, 14000],
  [1000, 18000],
  [1200, 21000],
  [1400, 23000],
  [1500, 24000],
  [2000, 30000],
  [2500, 34000],
];

export interface CoolingInput {
  areaFt2: number;
  sun: 'shady' | 'normal' | 'sunny';
  people: number;
  kitchen: boolean;
}

/** 按 ENERGY STAR 方法：查表 → 遮阳 −10% / 日晒 +10% → 超过 2 人每人 +600 → 厨房 +4,000 */
export function coolingBtu(i: CoolingInput) {
  const a = Number.isFinite(i.areaFt2) && i.areaFt2 > 0 ? i.areaFt2 : 0;
  const row = ENERGY_STAR_BTU.find(([max]) => a <= max);
  // 超出表格范围时按 2,000–2,500 ft² 档的每平方英尺比例外推
  const base = a === 0 ? 0 : row ? row[1] : Math.round((a * 34000) / 2500);
  let btu = base;
  if (i.sun === 'shady') btu *= 0.9;
  if (i.sun === 'sunny') btu *= 1.1;
  const extraPeople = Math.max(0, Math.floor(i.people) - 2);
  btu += extraPeople * 600;
  if (i.kitchen) btu += 4000;
  return { base, btu, tons: btu / 12000, outOfTable: a > 2500 };
}

/** 粗略采暖负荷：按气候区的每平方英尺 BTU 取区间 */
export const HEATING_BTU_PER_FT2: Record<string, [number, number, string]> = {
  hot: [30, 35, 'Hot (Zones 1–2: Florida, Gulf Coast, Southern Arizona)'],
  warm: [35, 40, 'Warm (Zone 3: much of the South and California)'],
  mixed: [40, 45, 'Mixed (Zone 4: Mid-Atlantic, Kentucky, Kansas)'],
  cool: [45, 50, 'Cool (Zone 5: Midwest, Northeast)'],
  cold: [50, 60, 'Cold (Zones 6–7: Northern states, mountains)'],
};

// ---- 保温 ----
export const INSULATION = [
  { id: 'batt', label: 'Fiberglass batts', rPerIn: 3.2 },
  { id: 'blown-fg', label: 'Blown fiberglass', rPerIn: 2.5 },
  { id: 'cellulose', label: 'Blown cellulose', rPerIn: 3.5 },
  { id: 'open-foam', label: 'Open-cell spray foam', rPerIn: 3.6 },
  { id: 'closed-foam', label: 'Closed-cell spray foam', rPerIn: 6.5 },
  { id: 'xps', label: 'Rigid foam board (XPS)', rPerIn: 5 },
  { id: 'polyiso', label: 'Rigid foam board (polyiso)', rPerIn: 6 },
];

/** 要从现有 R 值补到目标 R 值：需要的厚度、体积、板英尺（喷涂泡沫按板英尺计价） */
export function insulationNeeded(areaFt2: number, targetR: number, existingR: number, rPerIn: number) {
  const a = Number.isFinite(areaFt2) && areaFt2 > 0 ? areaFt2 : 0;
  const addR = Math.max(0, (Number.isFinite(targetR) ? targetR : 0) - (Number.isFinite(existingR) ? existingR : 0));
  const inches = rPerIn > 0 ? addR / rPerIn : 0;
  return { addR, inches, cubicFt: (a * inches) / 12, boardFeet: a * inches };
}

/** 美国能源部阁楼推荐 R 值（未保温阁楼） */
export const ATTIC_R_BY_ZONE: [string, string][] = [
  ['Zone 1', 'R30 to R49'],
  ['Zones 2–3', 'R30 to R60'],
  ['Zones 4–8', 'R49 to R60'],
];
