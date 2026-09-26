// 长度与体积单位换算。所有计算内部统一用「英尺」和「立方英尺」。

export type LengthUnit = 'in' | 'ft' | 'yd' | 'cm' | 'm';

export const LENGTH_UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
  { value: 'yd', label: 'yd' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
];

// 1 单位等于多少英尺
const TO_FEET: Record<LengthUnit, number> = {
  in: 1 / 12,
  ft: 1,
  yd: 3,
  cm: 1 / 30.48,
  m: 1 / 0.3048,
};

export function toFeet(value: number, unit: LengthUnit): number {
  return value * TO_FEET[unit];
}

export function fromFeet(feet: number, unit: LengthUnit): number {
  return feet / TO_FEET[unit];
}

export const CUBIC_FEET_PER_CUBIC_YARD = 27;
export const CUBIC_METERS_PER_CUBIC_FOOT = 0.3048 ** 3; // 0.0283168…

export function cubicFeetToCubicYards(ft3: number): number {
  return ft3 / CUBIC_FEET_PER_CUBIC_YARD;
}

export function cubicFeetToCubicMeters(ft3: number): number {
  return ft3 * CUBIC_METERS_PER_CUBIC_FOOT;
}

export function isLengthUnit(v: unknown): v is LengthUnit {
  return typeof v === 'string' && v in TO_FEET;
}

// 面积单位：内部统一用平方英尺
export type AreaUnit = 'ft2' | 'yd2' | 'm2' | 'acre';

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: 'ft2', label: 'ft²' },
  { value: 'yd2', label: 'yd²' },
  { value: 'm2', label: 'm²' },
  { value: 'acre', label: 'acres' },
];

const AREA_TO_FT2: Record<AreaUnit, number> = {
  ft2: 1,
  yd2: 9,
  m2: 1 / 0.09290304, // 10.7639…
  acre: 43560,
};

export function areaToFt2(value: number, unit: AreaUnit): number {
  return value * AREA_TO_FT2[unit];
}

export function ft2To(ft2: number, unit: AreaUnit): number {
  return ft2 / AREA_TO_FT2[unit];
}

export function isAreaUnit(v: unknown): v is AreaUnit {
  return typeof v === 'string' && v in AREA_TO_FT2;
}

export interface AreaValue {
  value: number;
  unit: AreaUnit;
}
