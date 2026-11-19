// 第二批计算器的公式：按面积算件数、瓷砖、墙面积、壁纸、屋面坡度、砖
import { ceilCount } from './format';

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** 面积加损耗后，按每件覆盖面积算件数（地板箱数、托盘数等） */
export function unitsForArea(areaFt2: number, wastePct: number, unitFt2: number) {
  const need = pos(areaFt2) * (1 + pos(wastePct) / 100);
  return { need, units: pos(unitFt2) ? ceilCount(need / unitFt2) : 0 };
}

/** 瓷砖 / 铺路砖：每块连同灰缝占的面积 */
export function tileFt2(lengthIn: number, widthIn: number, jointIn: number): number {
  const j = Math.max(0, Number.isFinite(jointIn) ? jointIn : 0);
  return ((pos(lengthIn) + j) * (pos(widthIn) + j)) / 144;
}

export function tilesFor(areaFt2: number, wastePct: number, lengthIn: number, widthIn: number, jointIn: number) {
  const per = tileFt2(lengthIn, widthIn, jointIn);
  const need = pos(areaFt2) * (1 + pos(wastePct) / 100);
  return { need, perTileFt2: per, tiles: per > 0 ? ceilCount(need / per) : 0 };
}

/** 典型门窗面积：门 3×7 ft，窗 3×5 ft */
export const DOOR_FT2 = 21;
export const WINDOW_FT2 = 15;

/** 房间四面墙的净面积（扣门窗），不会小于 0 */
export function wallAreaFt2(perimeterFt: number, heightFt: number, doors: number, windows: number): number {
  const gross = pos(perimeterFt) * pos(heightFt);
  return Math.max(0, gross - Math.floor(pos(doors)) * DOOR_FT2 - Math.floor(pos(windows)) * WINDOW_FT2);
}

export type WallpaperMatch = 'plain' | 'straight' | 'allowance';

export interface WallpaperInput {
  wallWidthsFt: readonly number[];
  heightFt: number;
  rollWidthIn: number;
  rollLengthFt: number;
  repeatIn: number;
  match?: WallpaperMatch; // 旧参数链接继续使用每条预留一整个循环的估算
  trimIn?: number; // 上下裁切余量，默认 4 in
}

/** 每面墙分别向上取整。直对花把每条起点对齐到同一花纹位置。 */
export function wallpaperRolls(i: WallpaperInput) {
  const heightIn = pos(i.heightFt) * 12;
  const stripIn = heightIn ? heightIn + pos(i.trimIn ?? 4) : 0;
  const repeatIn = i.match === 'plain' ? 0 : pos(i.repeatIn);
  const straight = i.match === 'straight' && repeatIn > 0;
  const spacingIn = straight ? ceilCount(stripIn / repeatIn) * repeatIn : stripIn + repeatIn;
  const startAllowanceIn = straight ? repeatIn : 0;
  // 最后一条剪完就停止，不需要把卷尾留到下一个直对花起点。
  const lastStripIn = straight ? stripIn : spacingIn;
  const remainingIn = pos(i.rollLengthFt) * 12 - startAllowanceIn - lastStripIn;
  const stripsPerRoll = stripIn > 0 && remainingIn >= -1e-9
    ? 1 + Math.floor(remainingIn / spacingIn + 1e-9)
    : 0;
  const rollW = pos(i.rollWidthIn);
  const strips = rollW && heightIn
    ? i.wallWidthsFt.reduce((total, width) => total + ceilCount((pos(width) * 12) / rollW), 0)
    : 0;
  const rolls = stripsPerRoll > 0 ? ceilCount(strips / stripsPerRoll) : 0;
  return { stripIn, spacingIn, startAllowanceIn, stripsPerRoll, strips, rolls };
}

/** 屋面坡度系数：坡度 rise/12 时，斜面面积 = 水平投影面积 × 系数 */
export function pitchFactor(rise: number): number {
  const r = Math.max(0, Number.isFinite(rise) ? rise : 0);
  return Math.sqrt(1 + (r / 12) ** 2);
}

/** 每平方英尺墙面需要几块砖（含灰缝） */
export function bricksPerFt2(lengthIn: number, heightIn: number, jointIn: number): number {
  const a = tileFt2(lengthIn, heightIn, jointIn);
  return a > 0 ? 1 / a : 0;
}
