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
  const room = { wallWidthsFt: [12, 12, 12, 12], heightFt: 8, rollWidthIn: 20.5, rollLengthFt: 33, repeatIn: 0 };

  it('12×12×8 ft、20.5 in × 33 ft 卷、无对花：每墙 8 条、每卷 3 条、11 卷', () => {
    expect(wallpaperRolls(room)).toMatchObject({ stripIn: 100, stripsPerRoll: 3, strips: 32, rolls: 11 });
  });

  it('9 ft 墙、21 in 直对花：预留卷首 21 in，三条至 385 in，适合 396 in 的卷', () => {
    const inputs = { ...room, heightFt: 9, repeatIn: 21 };
    expect(wallpaperRolls({ ...inputs, match: 'straight' })).toMatchObject({
      stripIn: 112, spacingIn: 126, startAllowanceIn: 21, stripsPerRoll: 3, rolls: 11,
    });
    expect(wallpaperRolls(inputs)).toMatchObject({ stripsPerRoll: 2, rolls: 16 });
  });

  it('无对花模式忽略留在表单的循环值，并正确处理恰好装满卷的边界', () => {
    const inputs = { ...room, rollLengthFt: 25, repeatIn: 21 };
    expect(wallpaperRolls({ ...inputs, match: 'plain' }).stripsPerRoll).toBe(3);
    expect(wallpaperRolls({ ...inputs, match: 'straight' }).stripsPerRoll).toBe(2);
  });

  it('裁切尺寸加对花余量超出卷长时，没有可用的整条', () => {
    const inputs = { ...room, heightFt: 9, rollLengthFt: 10, repeatIn: 21 };
    expect(wallpaperRolls({ ...inputs, match: 'straight' }).stripsPerRoll).toBe(0);
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
