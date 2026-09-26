// 第二批公式：每个都用手算例子核对
import { describe, it, expect } from 'vitest';
import { unitsForArea, tilesFor, wallAreaFt2, wallpaperRolls, pitchFactor, bricksPerFt2 } from './finish';

describe('按面积算件数', () => {
  it('180 ft² + 10%，每箱 20 ft² → 198 ft²、10 箱', () => {
    const r = unitsForArea(180, 10, 20);
    expect(r.need).toBeCloseTo(198, 10);
    expect(r.units).toBe(10);
  });
  it('正好整除不多算一箱', () => {
    expect(unitsForArea(200, 0, 20).units).toBe(10);
  });
});

describe('瓷砖', () => {
  it('12×12 in 砖、1/8 in 缝：100 ft² 需要 98 块', () => {
    const r = tilesFor(100, 0, 12, 12, 0.125);
    expect(r.perTileFt2).toBeCloseTo((12.125 * 12.125) / 144, 10);
    expect(r.tiles).toBe(98); // 100 / 1.0209 = 97.95
  });
  it('4×8 in 铺路砖无缝：每 ft² 4.5 块', () => {
    expect(tilesFor(100, 0, 8, 4, 0).tiles).toBe(450);
  });
});

describe('墙面积', () => {
  it('12×12 ft 房间、8 ft 高，一门一窗：384 − 21 − 15 = 348 ft²', () => {
    expect(wallAreaFt2(48, 8, 1, 1)).toBe(348);
  });
  it('门窗扣得比墙还多时为 0', () => {
    expect(wallAreaFt2(10, 2, 3, 3)).toBe(0);
  });
});

describe('壁纸', () => {
  it('12×12 ft 房间、8 ft 高、20.5 in × 33 ft 卷、无对花、一扇门 → 28 条、每卷 3 条、10 卷', () => {
    const r = wallpaperRolls({ perimeterFt: 48, heightFt: 8, rollWidthIn: 20.5, rollLengthFt: 33, repeatIn: 0, doors: 1 });
    expect(r.stripIn).toBe(100); // 96 + 0 + 4
    expect(r.stripsPerRoll).toBe(3); // 396 / 100
    expect(r.strips).toBe(28); // 576 / 20.5 = 28.1 → 29，门扣 1 条
    expect(r.rolls).toBe(10);
  });
  it('对花 21 in 时每卷只能裁 3 条（121 in）', () => {
    const r = wallpaperRolls({ perimeterFt: 48, heightFt: 8, rollWidthIn: 20.5, rollLengthFt: 33, repeatIn: 21, doors: 0 });
    expect(r.stripsPerRoll).toBe(3);
    expect(r.rolls).toBe(10);
  });
});

describe('屋面坡度系数', () => {
  it('0/12 = 1，6/12 ≈ 1.118，12/12 ≈ 1.414', () => {
    expect(pitchFactor(0)).toBe(1);
    expect(pitchFactor(6)).toBeCloseTo(1.118, 3);
    expect(pitchFactor(12)).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe('砖', () => {
  it('模数砖 7⅝ × 2¼ in、⅜ in 灰缝 ≈ 6.86 块/ft²', () => {
    expect(bricksPerFt2(7.625, 2.25, 0.375)).toBeCloseTo(6.857, 3);
  });
  it('标准砖 8 × 2¼ in ≈ 6.55 块/ft²', () => {
    expect(bricksPerFt2(8, 2.25, 0.375)).toBeCloseTo(6.55, 2);
  });
});
