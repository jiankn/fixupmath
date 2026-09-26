// 第三批公式。电工数据用 NEC 附录 C 等已公布的对照值核对，防止录入错误
import { describe, it, expect } from 'vitest';
import { ftIn, stairs, rafter, rafterCount, boardFeet, rebarGrid } from './framing';
import { voltageDrop, sizeWire, usableAmps, maxWires, conduitFill, fillLimitPct, GAUGES, RESISTANCE, AMPACITY } from './electrical';
import { coolingBtu, insulationNeeded } from './hvac';

describe('英尺英寸格式', () => {
  it('四舍五入到 1/8 英寸', () => {
    expect(ftIn(173.58)).toBe('14 ft 5 ⅝ in');
    expect(ftIn(96)).toBe('8 ft');
    expect(ftIn(7.714)).toBe('7 ¾ in');
    expect(ftIn(0.5)).toBe('½ in');
  });
});

describe('楼梯', () => {
  it('总高 108 in、踢面上限 7¾、踏面 10 in → 14 级踢面 7.71 in、13 块踏板、水平 130 in', () => {
    const s = stairs(108, 7.75, 10);
    expect(s.risers).toBe(14);
    expect(s.riserIn).toBeCloseTo(7.714, 3);
    expect(s.treads).toBe(13);
    expect(s.runIn).toBe(130);
    expect(s.stringerIn).toBeCloseTo(Math.hypot(108, 130), 6);
    expect(s.angle).toBeCloseTo((Math.atan(108 / 14 / 10) * 180) / Math.PI, 6); // 37.6°，按踢面 ÷ 踏面
  });
  it('正好整除时不多加一级', () => {
    expect(stairs(93, 7.75, 10).risers).toBe(12);
  });
});

describe('椽子', () => {
  it('跨度 24 ft、6/12、挑檐 12 in、脊木 1.5 in → 173.6 in，买 16 ft 料', () => {
    const r = rafter(24, 6, 12, 1.5);
    expect(r.runIn).toBe(143.25);
    expect(r.totalIn).toBeCloseTo(143.25 * Math.sqrt(1.25) + 12 * Math.sqrt(1.25), 6);
    expect(r.stockFt).toBe(16);
    expect(r.riseIn).toBeCloseTo(71.625, 6);
  });
  it('40 ft 长、16 in 间距 → 每侧 31 根', () => {
    expect(rafterCount(40, 16)).toBe(31);
  });
});

describe('板英尺', () => {
  it('2×6×8 = 8 BF；1×12×12 = 12 BF；数量相乘', () => {
    expect(boardFeet(2, 6, 8)).toBe(8);
    expect(boardFeet(1, 12, 12)).toBe(12);
    expect(boardFeet(2, 4, 10, 5)).toBeCloseTo(33.333, 3);
  });
});

describe('钢筋', () => {
  const base = { lengthFt: 20, widthFt: 20, spacingIn: 12, edgeIn: 3, size: '#4', stockFt: 20, lapDiameters: 40, wastePct: 0 };
  it('20×20 ft 板、#4、12 in 间距、边距 3 in → 每向 20 根 19.5 ft，共 780 ft、40 根料、521 lb', () => {
    const r = rebarGrid(base);
    expect(r.alongLength.count).toBe(20);
    expect(r.alongLength.barIn).toBe(234);
    expect(r.totalFt).toBeCloseTo(780, 6);
    expect(r.sticks).toBe(40);
    expect(r.weightLb).toBeCloseTo(521.04, 2);
  });
  it('30 ft 长时需要搭接：#4 搭接 40d = 20 in，每条 2 根料', () => {
    const r = rebarGrid({ ...base, lengthFt: 30 });
    expect(r.lapIn).toBe(20);
    expect(r.alongLength.sticks).toBe(20 * 2);
    expect(r.alongLength.lengthIn).toBe(20 * (354 + 20));
  });
  it('短钢筋一根料可裁多段：10×10 板每向 20 根 9.5 ft... 一根 20 ft 料裁 2 段', () => {
    const r = rebarGrid({ ...base, lengthFt: 10, widthFt: 10 });
    expect(r.alongLength.count).toBe(10);
    expect(r.alongLength.sticks).toBe(5);
  });
});

describe('NEC 数据表完整性', () => {
  it('铜线每个线径都有电阻和两列载流量，且随线径增大单调变化', () => {
    let lastR = Infinity;
    let lastA = 0;
    for (const g of GAUGES) {
      const r = RESISTANCE.cu[g]!;
      const a = AMPACITY.cu['75'][g]!;
      expect(r).toBeLessThan(lastR);
      expect(a).toBeGreaterThan(lastA);
      expect(AMPACITY.cu['60'][g]).toBeLessThanOrEqual(a);
      lastR = r;
      lastA = a;
    }
  });
  it('240.4(D) 小导线上限：12 铜 20A，14 铜 15A，10 铝 25A', () => {
    expect(usableAmps('cu', '75', '12')).toBe(20);
    expect(usableAmps('cu', '75', '14')).toBe(15);
    expect(usableAmps('al', '75', '10')).toBe(25);
    expect(usableAmps('cu', '75', '8')).toBe(50);
  });
});

describe('电压降与线径', () => {
  it('12 AWG 铜、20 A、单程 100 ft、单相 → 7.72 V', () => {
    expect(voltageDrop('cu', '12', 20, 100, '1')).toBeCloseTo(7.72, 2);
  });
  it('直流 12 V、10 A、单程 20 ft、12 AWG → 0.772 V（6.4%）；限 3% 要 8 AWG', () => {
    expect(voltageDrop('cu', '12', 10, 20, 'dc')).toBeCloseTo(0.772, 3);
    const r = sizeWire({ metal: 'cu', amps: 10, oneWayFt: 20, volts: 12, phase: 'dc', maxDropPct: 3, column: '60', continuous: false });
    expect(r.pick).toBe('8'); // R ≤ 0.36 V × 1000 / (2 × 20 × 10) = 0.9 Ω
  });
  it('三相用 √3 代替 2', () => {
    expect(voltageDrop('cu', '12', 20, 100, '3')).toBeCloseTo(Math.sqrt(3) * 100 * 20 * 1.93 / 1000, 6);
  });
  it('20 A、120 V、100 ft、限 3% → 载流量只要 12 AWG，但电压降要求 8 AWG', () => {
    const r = sizeWire({ metal: 'cu', amps: 20, oneWayFt: 100, volts: 120, phase: '1', maxDropPct: 3, column: '75', continuous: false });
    expect(r.byAmpacity).toBe('12');
    expect(r.byDrop).toBe('8');
    expect(r.pick).toBe('8');
  });
  it('连续负载 16 A × 125% = 20 A → 12 AWG', () => {
    const r = sizeWire({ metal: 'cu', amps: 16, oneWayFt: 10, volts: 120, phase: '1', maxDropPct: 3, column: '75', continuous: true });
    expect(r.designAmps).toBe(20);
    expect(r.pick).toBe('12');
  });
});

describe('线管填充（对照 NEC 附录 C 表 C.1 EMT 中 THHN 根数）', () => {
  it('½ in EMT：12 AWG 9 根、14 AWG 12 根、10 AWG 5 根', () => {
    expect(maxWires('emt', '1/2', '12')).toBe(9);
    expect(maxWires('emt', '1/2', '14')).toBe(12);
    expect(maxWires('emt', '1/2', '10')).toBe(5);
  });
  it('¾ in EMT：12 AWG 16 根；1 in EMT：12 AWG 26 根', () => {
    expect(maxWires('emt', '3/4', '12')).toBe(16);
    expect(maxWires('emt', '1', '12')).toBe(26);
  });
  it('填充率上限：1 根 53%、2 根 31%、3 根以上 40%', () => {
    expect([1, 2, 3, 10].map(fillLimitPct)).toEqual([53, 31, 40, 40]);
  });
  it('½ in EMT 穿 3 根 12 AWG + 1 根 12 AWG 地线：13.1%，合格', () => {
    const r = conduitFill('emt', '1/2', [{ gauge: '12', count: 3 }, { gauge: '12', count: 1 }]);
    expect(r.fillPct).toBeCloseTo((4 * 0.0133 / 0.304) * 100, 6);
    expect(r.ok).toBe(true);
  });
  it('½ in EMT 穿 10 根 12 AWG 超标', () => {
    expect(conduitFill('emt', '1/2', [{ gauge: '12', count: 10 }]).ok).toBe(false);
  });
});

describe('空调制冷量（ENERGY STAR 方法）', () => {
  it('400 ft² 正常日照 → 9,000 BTU；日晒 +10%；4 人 +1,200；厨房 +4,000', () => {
    expect(coolingBtu({ areaFt2: 400, sun: 'normal', people: 2, kitchen: false }).btu).toBe(9000);
    expect(coolingBtu({ areaFt2: 400, sun: 'sunny', people: 2, kitchen: false }).btu).toBeCloseTo(9900, 6);
    expect(coolingBtu({ areaFt2: 400, sun: 'normal', people: 4, kitchen: true }).btu).toBe(14200);
  });
  it('表格边界：150 ft² 属于 5,000 档，151 ft² 属于 6,000 档', () => {
    expect(coolingBtu({ areaFt2: 150, sun: 'normal', people: 1, kitchen: false }).base).toBe(5000);
    expect(coolingBtu({ areaFt2: 151, sun: 'normal', people: 1, kitchen: false }).base).toBe(6000);
  });
});

describe('保温', () => {
  it('1,000 ft² 阁楼从 R11 补到 R49，纤维素 R3.5/in → 10.86 in', () => {
    const r = insulationNeeded(1000, 49, 11, 3.5);
    expect(r.addR).toBe(38);
    expect(r.inches).toBeCloseTo(10.857, 3);
    expect(r.cubicFt).toBeCloseTo(904.76, 2);
  });
  it('现有已达标时需要 0', () => {
    expect(insulationNeeded(1000, 30, 38, 3.5).inches).toBe(0);
  });
});
