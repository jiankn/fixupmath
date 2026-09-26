// 楼梯、椽子、板英尺、钢筋
import { ceilCount } from './format';
import { pitchFactor } from './finish';

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** 英寸 → 「14 ft 5 ⅝ in」，四舍五入到 1/8 英寸 */
export function ftIn(inches: number): string {
  if (!(inches > 0)) return '0 in';
  const eighths = Math.round(inches * 8);
  const ft = Math.floor(eighths / 96);
  const rem = eighths - ft * 96;
  const whole = Math.floor(rem / 8);
  const frac = rem % 8;
  const fracs = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];
  const inPart = `${whole}${frac ? ` ${fracs[frac]}` : ''} in`.replace(/^0 (?=[⅛¼⅜½⅝¾⅞])/, '');
  if (!ft) return inPart;
  return rem === 0 ? `${ft} ft` : `${ft} ft ${inPart}`;
}

// ---- 楼梯（美国住宅规范 IRC：踢面最高 7¾ in，踏面最少 10 in）----
export const IRC_MAX_RISER_IN = 7.75;
export const IRC_MIN_TREAD_IN = 10;

export function stairs(totalRiseIn: number, maxRiserIn: number, treadIn: number) {
  const rise = pos(totalRiseIn);
  const maxR = pos(maxRiserIn);
  const risers = rise && maxR ? ceilCount(rise / maxR) : 0;
  const riserIn = risers ? rise / risers : 0;
  const treads = Math.max(0, risers - 1); // 最上一级踏到楼面，不算踏板
  const runIn = treads * pos(treadIn);
  const stringerIn = Math.hypot(rise, runIn);
  // 楼梯坡度按「踢面 ÷ 踏面」定义，加不加平台都一样
  const angle = riserIn && pos(treadIn) ? (Math.atan(riserIn / pos(treadIn)) * 180) / Math.PI : 0;
  // 舒适度经验公式：2 × 踢面 + 踏面 在 24–25 in 之间
  const comfort = 2 * riserIn + pos(treadIn);
  return { risers, riserIn, treads, runIn, stringerIn, angle, comfort };
}

// ---- 椽子 ----
const STOCK_FT = [8, 10, 12, 14, 16, 18, 20, 22, 24];

export function rafter(spanFt: number, pitch: number, overhangIn: number, ridgeIn: number) {
  // 水平投影长度：半跨减去半个脊木厚度
  const runIn = Math.max(0, (pos(spanFt) * 12) / 2 - pos(ridgeIn) / 2);
  const f = pitchFactor(pitch);
  const mainIn = runIn * f;
  const tailIn = pos(overhangIn) * f;
  const totalIn = mainIn + tailIn;
  return {
    runIn,
    riseIn: (runIn * Math.max(0, pitch)) / 12,
    mainIn,
    tailIn,
    totalIn,
    angle: (Math.atan(Math.max(0, pitch) / 12) * 180) / Math.PI,
    stockFt: STOCK_FT.find((s) => s * 12 >= totalIn - 1e-9) ?? Math.ceil(totalIn / 12),
  };
}

/** 一侧屋面的椽子根数：建筑长度按间距排布 + 1 */
export function rafterCount(buildingLengthFt: number, spacingIn: number): number {
  const L = pos(buildingLengthFt) * 12;
  return L && pos(spacingIn) ? Math.floor(L / spacingIn + 1e-9) + 1 : 0;
}

// ---- 板英尺：1 BF = 12 × 12 × 1 in ----
export function boardFeet(thicknessIn: number, widthIn: number, lengthFt: number, qty = 1): number {
  return (pos(thicknessIn) * pos(widthIn) * pos(lengthFt) * Math.max(0, Math.floor(qty))) / 12;
}

// ---- 钢筋（ASTM A615 单位重量）----
export const REBAR = [
  { size: '#3', diaIn: 0.375, lbPerFt: 0.376 },
  { size: '#4', diaIn: 0.5, lbPerFt: 0.668 },
  { size: '#5', diaIn: 0.625, lbPerFt: 1.043 },
  { size: '#6', diaIn: 0.75, lbPerFt: 1.502 },
];

export interface RebarInput {
  lengthFt: number;
  widthFt: number;
  spacingIn: number;
  edgeIn: number; // 钢筋端头离板边的距离
  size: string;
  stockFt: number;
  lapDiameters: number; // 搭接长度 = 若干倍钢筋直径
  wastePct: number;
}

export function rebarGrid(i: RebarInput) {
  const bar = REBAR.find((b) => b.size === i.size) ?? REBAR[1];
  const L = pos(i.lengthFt) * 12;
  const W = pos(i.widthFt) * 12;
  const e = pos(i.edgeIn);
  const s = pos(i.spacingIn);
  const stock = pos(i.stockFt) * 12;
  const lap = pos(i.lapDiameters) * bar.diaIn;
  const dir = (runIn: number, acrossIn: number) => {
    const len = Math.max(0, runIn - 2 * e);
    const count = s && acrossIn > 2 * e ? Math.floor((acrossIn - 2 * e) / s + 1e-9) + 1 : 0;
    let sticks = 0;
    let lengthIn = 0;
    if (len > 0 && stock > 0) {
      if (len <= stock) {
        const perStick = Math.floor(stock / len + 1e-9);
        sticks = ceilCount(count / perStick);
        lengthIn = count * len;
      } else {
        // 超过一根料长，需要搭接：n 根拼一条
        const n = stock > lap ? ceilCount((len - lap) / (stock - lap)) : 0;
        sticks = count * n;
        lengthIn = count * (len + (n - 1) * lap);
      }
    }
    return { count, barIn: len, sticks, lengthIn };
  };
  const a = dir(L, W); // 沿长度方向的钢筋，沿宽度排布
  const b = dir(W, L);
  const totalFt = (a.lengthIn + b.lengthIn) / 12;
  const sticks = ceilCount((a.sticks + b.sticks) * (1 + pos(i.wastePct) / 100));
  return { bar, lapIn: lap, alongLength: a, alongWidth: b, totalFt, sticks, weightLb: totalFt * bar.lbPerFt };
}

// ---- 楼梯：带中间平台、斜梁数量、示意图 ----

/** IRC R311.7.3：两个平台之间单跑最大垂直高度 151 in（12 ft 7 in） */
export const IRC_MAX_FLIGHT_RISE_IN = 151;

export function stockLengthFt(inches: number): number {
  return STOCK_FT.find((s) => s * 12 >= inches - 1e-9) ?? Math.ceil(inches / 12);
}

export interface Flight {
  risers: number;
  treads: number;
  riseIn: number;
  runIn: number;
  stringerIn: number;
}

/** 楼梯分跑：landing 为 true 时在中间加一个平台，踢面尽量平均分到两跑 */
export function stairFlights(totalRiseIn: number, maxRiserIn: number, treadIn: number, landing: boolean, landingDepthIn: number) {
  const base = stairs(totalRiseIn, maxRiserIn, treadIn);
  const R = base.riserIn;
  const T = pos(treadIn);
  const split = landing && base.risers >= 2 ? [Math.ceil(base.risers / 2), Math.floor(base.risers / 2)] : [base.risers];
  const flights: Flight[] = split.map((n) => {
    const treads = Math.max(0, n - 1); // 每跑最上一级踏到平台或楼面
    return { risers: n, treads, riseIn: n * R, runIn: treads * T, stringerIn: Math.hypot(n * R, treads * T) };
  });
  const landingIn = split.length > 1 ? pos(landingDepthIn) : 0;
  const totalRunIn = flights.reduce((s, f) => s + f.runIn, 0) + landingIn;
  return { ...base, flights, landingIn, landingHeightIn: split.length > 1 ? flights[0].riseIn : 0, totalRunIn };
}

/** 斜梁根数：按最大间距排布，两边各一根 */
export function stringerCount(stairWidthIn: number, maxSpacingIn: number): number {
  const w = pos(stairWidthIn);
  const s = pos(maxSpacingIn);
  return w && s ? ceilCount(w / s) + 1 : 0;
}

/** 楼梯侧面示意图，按实际比例画。只使用数字，输出可直接插入的 SVG */
export function stairSvg(riserIn: number, treadIn: number, flights: { risers: number }[], landingIn: number, totalRiseIn: number, totalRunIn: number): string {
  if (!(riserIn > 0) || !(totalRunIn > 0 || totalRiseIn > 0)) return '';
  const W = 360, H = 240, m = 42, top = 32;
  const extra = 24; // 顶部楼面向右延伸
  const s = Math.min((W - 2 * m - extra) / Math.max(totalRunIn, 1), (H - m - top) / totalRiseIn);
  const X = (x: number) => (m + x * s).toFixed(1);
  const Y = (y: number) => (H - m - y * s).toFixed(1);
  let x = 0, y = 0;
  const pts: string[] = [`${X(0)},${Y(0)}`];
  const stringers: string[] = [];
  flights.forEach((f, i) => {
    const sx = x, sy = y;
    for (let k = 1; k <= f.risers; k++) {
      y += riserIn;
      pts.push(`${X(x)},${Y(y)}`);
      if (k < f.risers) {
        x += treadIn;
        pts.push(`${X(x)},${Y(y)}`);
      }
    }
    stringers.push(`<line class="sl" x1="${X(sx)}" y1="${Y(sy)}" x2="${X(x)}" y2="${Y(y)}"/>`);
    if (i < flights.length - 1 && landingIn > 0) {
      x += landingIn;
      pts.push(`${X(x)},${Y(y)}`);
    }
  });
  const endX = (m + x * s + extra).toFixed(1);
  pts.push(`${endX},${Y(y)}`, `${endX},${Y(0)}`);
  const r = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Side view of the stairs drawn to scale">` +
    `<polygon class="sf" points="${pts.join(' ')}"/>` +
    stringers.join('') +
    `<line class="sd" x1="${m - 12}" y1="${Y(0)}" x2="${m - 12}" y2="${Y(totalRiseIn)}"/>` +
    `<text class="st" x="8" y="20">Total rise: ${r(totalRiseIn)} in</text>` +
    `<path class="sd" d="M${X(0)} ${H - 23}H${X(totalRunIn)}M${X(0)} ${H - 28}v10M${X(totalRunIn)} ${H - 28}v10"/>` +
    `<text class="st" x="${W / 2}" y="${H - 9}" text-anchor="middle">Total run: ${r(totalRunIn)} in</text>` +
    `</svg><div class="stair-key"><span>Riser height<strong>${r(riserIn)} in</strong></span><span>Tread depth<strong>${r(treadIn)} in</strong></span>` +
    (landingIn > 0 ? `<span>Landing depth<strong>${r(landingIn)} in</strong></span>` : '') +
    `</div><p class="visual-note">Side view drawn to scale · dashed line = stringer. Stair width runs into the page.</p>`
  );
}
