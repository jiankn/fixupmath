// 第四批引擎：沥青、填方土、砌块、屋面坡度、屋面材料。数字都按手算核对
import { describe, it, expect } from 'vitest';
import { asphaltResult, asphaltFt2PerTon, fillDirtResult, blockWall, blockCourses, BLOCKS } from './sitework';
import { pitchInfo, degToPitch, slopeClass, roofMaterials } from './roof';

describe('沥青', () => {
  it('40 × 12 ft、3 in、145 lb/ft³、5% → 126 ft³、9.14 吨、下单 9.5 吨', () => {
    // 480 × 0.25 × 1.05 = 126 ft³；× 145 = 18,270 lb = 9.135 吨
    const r = asphaltResult(480, 3, 145, 5);
    expect(r.ft3).toBeCloseTo(126, 6);
    expect(r.tons).toBeCloseTo(9.135, 6);
    expect(r.orderTons).toBe(9.5);
    expect(r.squareYards).toBeCloseTo(53.333, 3);
  });
  it('一吨 2 in 厚约铺 82.8 ft²', () => {
    expect(asphaltFt2PerTon(2, 145)).toBeCloseTo(82.76, 2);
  });
  it('空值和负数不出错', () => {
    expect(asphaltResult(NaN, -3, 145, 5).tons).toBe(0);
  });
});

describe('填方土', () => {
  it('压实后 200 ft³、压实率 20%、1.2 t/yd³ → 8.89 yd³ 松土、10.67 吨、1 车', () => {
    const r = fillDirtResult(200, 20, 1.2, 10);
    expect(r.cubicYards).toBeCloseTo(8.889, 3);
    expect(r.tons).toBeCloseTo(10.667, 3);
    expect(r.orderYards).toBe(9);
    expect(r.truckloads).toBe(1);
  });
  it('超过一车向上取整', () => {
    expect(fillDirtResult(27 * 21, 0, 1.2, 10).truckloads).toBe(3);
  });
});

describe('砌块', () => {
  const std = BLOCKS[0];
  it('20 × 6 ft 墙、8 × 8 × 16、5% → 142 块、11 袋砂浆', () => {
    // 120 ft² × 1.125 = 135 块；× 1.05 = 141.75 → 142；135 / 13 = 10.4 → 11 袋
    const r = blockWall(120, std.faceH, std.faceL, std.widthIn, 5, 0);
    expect(r.perFt2).toBe(1.125);
    expect(r.blocks).toBe(142);
    expect(r.mortarBags).toBe(11);
    expect(r.groutFt3).toBe(0);
  });
  it('全灌芯：120 ft² × 7.625/12 ft × 0.43 = 32.79 ft³', () => {
    const r = blockWall(120, std.faceH, std.faceL, std.widthIn, 5, 1);
    expect(r.groutFt3).toBeCloseTo(32.79, 2);
    expect(r.groutYd3).toBeCloseTo(1.214, 3);
  });
  it('半高块每 ft² 2.25 块，砂浆按面积折算不变', () => {
    const half = BLOCKS.find((b) => b.value === '8x4x16')!;
    const r = blockWall(120, half.faceH, half.faceL, half.widthIn, 0, 0);
    expect(r.blocks).toBe(270);
    expect(r.mortarBags).toBe(11);
  });
  it('20 ft 长、6 ft 高 → 每皮 15 块、9 皮', () => {
    expect(blockCourses(20, 6, 8, 16)).toEqual({ perCourse: 15, courses: 9 });
  });
});

describe('屋面坡度', () => {
  it('6/12 = 26.57°、50%、系数 1.118', () => {
    const p = pitchInfo(6);
    expect(p.deg).toBeCloseTo(26.565, 3);
    expect(p.percent).toBe(50);
    expect(p.factor).toBeCloseTo(1.118, 3);
  });
  it('45° = 12/12', () => {
    expect(degToPitch(45)).toBeCloseTo(12, 9);
    expect(degToPitch(0)).toBe(0);
    expect(degToPitch(90)).toBe(0);
  });
  it('按 IRC 分档', () => {
    expect(slopeClass(0)).toBe('flat');
    expect(slopeClass(1)).toBe('low');
    expect(slopeClass(3)).toBe('shingle-double');
    expect(slopeClass(6)).toBe('conventional');
    expect(slopeClass(12)).toBe('steep');
  });
});

describe('屋面材料', () => {
  const base = { lengthFt: 50, widthFt: 30, pitch: 6, wastePct: 10, bundlesPerSquare: 3, underlayCoverFt2: 1000 };
  it('双坡 50 × 30 ft、6/12：56 捆（与屋面瓦计算器一致）、17 根滴水边、2 捆屋脊瓦', () => {
    const r = roofMaterials({ ...base, type: 'gable' });
    expect(r.sloped).toBeCloseTo(1677.05, 2);
    expect(r.squares).toBeCloseTo(18.448, 3);
    expect(r.bundles).toBe(56);
    expect(r.underlayRolls).toBe(2);
    expect(r.eavesFt).toBe(100);
    expect(r.rakesFt).toBeCloseTo(67.08, 2); // 4 × 15 × 1.118
    expect(r.dripEdgePieces).toBe(17);
    expect(r.ridgeCapBundles).toBe(2);
    expect(r.starterBundles).toBe(1);
    expect(r.nails).toBe(5904);
  });
  it('四坡 50 × 30 ft、6/12：屋脊 20 ft、斜脊 4 × 22.5 ft、檐口 160 ft', () => {
    const r = roofMaterials({ ...base, type: 'hip' });
    expect(r.ridgeFt).toBe(20);
    expect(r.hipsFt).toBeCloseTo(90, 9);
    expect(r.eavesFt).toBe(160);
    expect(r.ridgeCapBundles).toBe(5);
    expect(r.dripEdgePieces).toBe(16);
    expect(r.starterBundles).toBe(2);
  });
  it('只给斜面面积时不算线性构件', () => {
    const r = roofMaterials({ ...base, lengthFt: 0, widthFt: 0, slopedFt2: 2000, type: 'gable' });
    expect(r.hasPlan).toBe(false);
    expect(r.squares).toBeCloseTo(22, 9);
    expect(r.dripEdgePieces).toBe(0);
  });
});
