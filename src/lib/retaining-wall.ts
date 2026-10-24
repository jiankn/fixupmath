import { ceilCount } from './format';

export interface RetainingWallInput {
  lengthFt: number; visibleHeightFt: number; buriedDepthFt: number;
  blockLengthIn: number; blockHeightIn: number; capLengthIn: number;
  baseWidthFt: number; baseDepthFt: number; drainageWidthFt: number;
  coreFillFt3: number; wastePct: number;
}
/** Straight wall on level grade. Height excludes the separate cap. */
export function retainingWall(i: RetainingWallInput) {
  const valid = Object.values(i).every(n => Number.isFinite(n) && n >= 0)
    && i.lengthFt > 0 && i.visibleHeightFt > 0 && i.blockLengthIn > 0 && i.blockHeightIn > 0 && i.capLengthIn > 0;
  const courses = valid ? ceilCount((i.visibleHeightFt + i.buriedDepthFt) * 12 / i.blockHeightIn) : 0;
  const perCourse = valid ? ceilCount(i.lengthFt * 12 / i.blockLengthIn) : 0;
  const installed = courses * perCourse;
  const factor = valid ? 1 + i.wastePct / 100 : 1;
  const blocks = ceilCount(installed * factor);
  const caps = valid ? ceilCount(ceilCount(i.lengthFt * 12 / i.capLengthIn) * factor) : 0;
  const builtHeightFt = valid ? courses * i.blockHeightIn / 12 : 0;
  const baseFt3 = valid ? i.lengthFt * i.baseWidthFt * i.baseDepthFt : 0;
  const drainageFt3 = valid ? i.lengthFt * builtHeightFt * i.drainageWidthFt : 0;
  const coreFt3 = valid ? installed * i.coreFillFt3 : 0;
  return { courses, perCourse, installed, blocks, caps, builtHeightFt, baseFt3, drainageFt3, coreFt3,
    rockYd3: (baseFt3 + drainageFt3 + coreFt3) / 27 };
}
