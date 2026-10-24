import { ceilCount } from './format';

export function plywoodSheets(areaFt2: number, sheetLengthFt: number, sheetWidthFt: number, wastePct: number) {
  const valid = [areaFt2, sheetLengthFt, sheetWidthFt, wastePct].every(Number.isFinite)
    && areaFt2 > 0 && sheetLengthFt > 0 && sheetWidthFt > 0 && wastePct >= 0;
  const area = valid ? areaFt2 : 0;
  const sheetArea = valid ? sheetLengthFt * sheetWidthFt : 0;
  const orderArea = area * (1 + (valid ? wastePct : 0) / 100);
  const sheets = sheetArea > 0 ? ceilCount(orderArea / sheetArea) : 0;
  return { area, sheetArea, orderArea, sheets, purchasedArea: sheets * sheetArea, surplus: sheets * sheetArea - area };
}
