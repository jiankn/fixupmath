// 结果面板里按计算结果画的施工示意图，全部按实际比例。
// 只用数字生成 SVG（文字只有固定英文和格式化后的数字），不拼接用户输入的文字。
// 样式类：sf 实体填充、sb 构件（强调色实线）、sk 粗边框、sg 细辅助线、sl 虚线、sd 尺寸线、st 标注文字、sa 强调文字
import { ftIn } from './framing';

const VW = 360;
const r1 = (n: number) => n.toFixed(1).replace(/\.0$/, '');
const ok = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);

/** 水平尺寸线，文字在线下方（above = true 时在上方） */
function hDim(x1: number, x2: number, y: number, label: string, above = false): string {
  return (
    `<path class="sd" d="M${r1(x1)} ${r1(y)}H${r1(x2)}M${r1(x1)} ${r1(y - 5)}v10M${r1(x2)} ${r1(y - 5)}v10"/>` +
    `<text class="st" x="${r1((x1 + x2) / 2)}" y="${r1(above ? y - 9 : y + 20)}" text-anchor="middle">${label}</text>`
  );
}

/** 竖直尺寸线，文字竖排在线左侧 */
function vDim(x: number, y1: number, y2: number, label: string): string {
  return (
    `<path class="sd" d="M${r1(x)} ${r1(y1)}V${r1(y2)}M${r1(x - 5)} ${r1(y1)}h10M${r1(x - 5)} ${r1(y2)}h10"/>` +
    `<text class="st" transform="translate(${r1(x - 9)} ${r1((y1 + y2) / 2)}) rotate(-90)" text-anchor="middle">${label}</text>`
  );
}

const line = (cls: string, x1: number, y1: number, x2: number, y2: number) =>
  `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
const rect = (cls: string, x: number, y: number, w: number, h: number) =>
  `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(w, 1))}" height="${r1(Math.max(h, 1))}"/>`;
const svg = (h: number, label: string, body: string) =>
  `<svg viewBox="0 0 ${VW} ${Math.round(h)}" role="img" aria-label="${label}">${body}</svg>`;
const key = (items: [string, string][]) =>
  `<div class="fig-key">${items.map(([k, v]) => `<span>${k}<strong>${v}</strong></span>`).join('')}</div>`;
const note = (s: string) => `<p class="visual-note">${s}</p>`;

/** 线太密时隔几根画一根，保证至少画出首尾 */
function thin(count: number, max = 60): { step: number; pick: (i: number) => boolean } {
  const step = Math.max(1, Math.ceil(count / max));
  return { step, pick: (i) => i % step === 0 || i === count - 1 };
}
const ordinal = (n: number) => `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

// ---- 钢筋网：板的平面图 ----
export function rebarSvg(
  lengthIn: number,
  widthIn: number,
  edgeIn: number,
  spacingIn: number,
  alongLength: { count: number },
  alongWidth: { count: number },
  spliced: boolean,
): string {
  if (!ok(lengthIn, widthIn, spacingIn) || !alongLength.count || !alongWidth.count) return '';
  const top = 12, bottom = 44;
  const s = Math.min((VW - 56) / lengthIn, 230 / widthIn);
  const w = lengthIn * s, h = widthIn * s;
  const left = Math.max(44, (VW - w) / 2 + 16); // 画得比可用宽度窄时居中（左侧留出竖向尺寸线的位置）
  const e = Math.max(0, edgeIn);
  const X = (x: number) => left + x * s;
  const Y = (y: number) => top + y * s;
  let bars = '';
  // 沿长度方向的钢筋：横线，沿宽度排布
  const a = thin(alongLength.count);
  for (let i = 0; i < alongLength.count; i++) if (a.pick(i)) bars += line('sb', X(e), Y(e + i * spacingIn), X(lengthIn - e), Y(e + i * spacingIn));
  const b = thin(alongWidth.count);
  for (let j = 0; j < alongWidth.count; j++) if (b.pick(j)) bars += line('sb', X(e + j * spacingIn), Y(e), X(e + j * spacingIn), Y(widthIn - e));
  const step = Math.max(a.step, b.step);
  return (
    svg(top + h + bottom, 'Plan view of the rebar grid drawn to scale',
      rect('sf', X(0), Y(0), w, h) + bars +
      hDim(X(0), X(lengthIn), Y(widthIn) + 14, `Length ${ftIn(lengthIn)}`) +
      vDim(left - 14, Y(0), Y(widthIn), `Width ${ftIn(widthIn)}`)) +
    key([['Bar spacing', `${r1(spacingIn)} in on center`], ['Edge distance', ftIn(e)]]) +
    note(`Plan view drawn to scale${step > 1 ? ` · every ${ordinal(step)} bar drawn` : ''}${spliced ? ' · lap splices not shown' : ''}.`)
  );
}

// ---- 椽子：屋顶剖面 ----
export function rafterSvg(spanIn: number, pitch: number, overhangIn: number, ridgeIn: number, riseIn: number, totalIn: number): string {
  if (!ok(spanIn, pitch, riseIn, totalIn)) return '';
  const oh = Math.max(0, overhangIn);
  const ridge = Math.max(0, ridgeIn);
  const p = pitch / 12;
  const drop = oh * p; // 挑檐尾端低于墙顶的高度
  const pad = 16, top = 34, wallPx = 30, bottom = 44;
  const s = Math.min((VW - 2 * pad) / (spanIn + 2 * oh), 170 / (riseIn + drop));
  const X = (x: number) => pad + (x + oh) * s;
  const Y = (y: number) => top + (riseIn - y) * s;
  const mid = spanIn / 2;
  const base = Y(0);
  const floor = Math.max(base, Y(-drop)) + wallPx;
  // 椽子沿坡面的方向角（屏幕坐标里向右上为负）
  const ang = (Math.atan(p) * 180) / Math.PI;
  // 两侧坡面标注都放在靠檐口 40% 处，屋脊上方留给屋脊高度
  const lx = X(-oh) * 0.6 + X(mid) * 0.4, ly = Y(-drop) * 0.6 + Y(riseIn) * 0.4;
  const px = X(spanIn + oh) * 0.6 + X(mid) * 0.4;
  return (
    svg(floor + bottom, 'Roof cross section drawn to scale',
      // 墙和墙顶线
      rect('sf', X(0) - 3, base, 6, floor - base) + rect('sf', X(spanIn) - 3, base, 6, floor - base) +
      line('sl', X(0), base, X(spanIn), base) +
      // 两侧椽子和脊木
      line('sk', X(-oh), Y(-drop), X(mid - ridge / 2), Y(riseIn)) +
      line('sk', X(spanIn + oh), Y(-drop), X(mid + ridge / 2), Y(riseIn)) +
      (ridge > 0 ? rect('sf', X(mid - ridge / 2), Y(riseIn) - 4, ridge * s, 12) : '') +
      // 屋脊高度
      `<path class="sd" d="M${r1(X(mid))} ${r1(base)}V${r1(Y(riseIn) + 10)}"/>` +
      `<text class="st" x="${r1(X(mid))}" y="${r1(Y(riseIn) - 12)}" text-anchor="middle">Rise ${ftIn(riseIn)}</text>` +
      // 沿坡面的标注
      `<text class="sa" transform="translate(${r1(lx)} ${r1(ly - 10)}) rotate(${r1(-ang)})" text-anchor="middle">Rafter</text>` +
      `<text class="st" transform="translate(${r1(px)} ${r1(ly - 10)}) rotate(${r1(ang)})" text-anchor="middle">${r1(pitch)}/12</text>` +
      hDim(X(0), X(spanIn), floor + 12, `Span ${ftIn(spanIn)}`)) +
    key([['Overhang (level)', ftIn(oh)], ['Ridge board', ridge > 0 ? ftIn(ridge) : 'None']]) +
    note('Cross section drawn to scale · rafter length is measured along the slope, from the ridge to the tail. Wall height not to scale.')
  );
}

// ---- 露台：框架平面图 ----
export function deckSvg(lengthIn: number, widthIn: number, joists: number, spacingIn: number, rows: number, boardWidthIn: number, gapIn: number): string {
  if (!ok(lengthIn, widthIn, spacingIn) || joists < 2) return '';
  const top = 30, bottom = 44;
  const s = Math.min((VW - 56) / lengthIn, 210 / widthIn);
  const left = Math.max(44, (VW - lengthIn * s) / 2 + 16);
  const X = (x: number) => left + x * s;
  const Y = (y: number) => top + y * s;
  let body = rect('sf', X(0), Y(0), lengthIn * s, widthIn * s);
  // 面板：沿长度方向的细线，太密就不画
  const pitchIn = boardWidthIn + Math.max(0, gapIn);
  if (rows > 1 && pitchIn * s >= 3) for (let i = 1; i < rows; i++) body += line('sg', X(0), Y(i * pitchIn), X(lengthIn), Y(i * pitchIn));
  // 龙骨：按间距排布，最后一根落在端头
  const t = thin(joists);
  for (let i = 0; i < joists; i++) {
    if (!t.pick(i)) continue;
    const x = i === joists - 1 ? lengthIn : Math.min(i * spacingIn, lengthIn);
    body += line('sb', X(x), Y(0), X(x), Y(widthIn));
  }
  // 两侧边梁（靠房子一侧即 ledger）
  body += line('sk', X(0), Y(0), X(lengthIn), Y(0)) + line('sk', X(0), Y(widthIn), X(lengthIn), Y(widthIn));
  body += `<text class="st" x="${r1(X(lengthIn / 2))}" y="${top - 10}" text-anchor="middle">House side</text>`;
  body += hDim(X(0), X(lengthIn), Y(widthIn) + 14, `Length ${ftIn(lengthIn)} · boards run this way`);
  body += vDim(left - 14, Y(0), Y(widthIn), `Width ${ftIn(widthIn)}`);
  return (
    svg(top + widthIn * s + bottom, 'Plan view of the deck framing drawn to scale', body) +
    key([['Joist spacing', `${r1(spacingIn)} in on center`], ['Joist length', ftIn(widthIn)]]) +
    note(`Plan view drawn to scale · accent lines = joists, thin lines = board rows${t.step > 1 ? ` (every ${ordinal(t.step)} joist drawn)` : ''}. Posts and beams not shown.`)
  );
}

// ---- 围栏：一段的立面图 ----
export function fenceSvg(spacingFt: number, heightFt: number, rails: number, picketWidthIn: number, gapIn: number, postSizeIn: number, holeDiaIn: number, holeDepthFt: number): string {
  if (!ok(spacingFt, heightFt, picketWidthIn, postSizeIn)) return '';
  const S = spacingFt * 12, H = heightFt * 12, D = Math.max(0, holeDepthFt * 12);
  const hole = Math.max(postSizeIn, holeDiaIn || 0);
  const left = 58, right = 12, top = 38, bottom = 14;
  const s = Math.min((VW - left - right) / (S + hole), 250 / (H + D));
  const X = (x: number) => left + (x + hole / 2) * s;
  const Y = (y: number) => top + (H - y) * s;
  let body = '';
  // 地面以下：坑（浅填充）和埋入部分
  for (const c of [0, S]) if (D > 0) body += rect('sf', X(c - hole / 2), Y(0), hole * s, D * s);
  // 栅板：两根立柱之间按「板宽 + 缝」排布，离地 2 in
  const from = postSizeIn / 2, to = S - postSizeIn / 2, unit = picketWidthIn + Math.max(0, gapIn);
  const clear = Math.min(2, H / 10);
  for (let x = from; x < to - 0.01; x += unit) body += rect('sg', X(x), Y(H), Math.min(picketWidthIn, to - x) * s, (H - clear) * s);
  // 横杆：藏在栅板后面，用虚线；上下各离端头约 8 in，其余均分
  const n = Math.max(0, Math.floor(rails));
  const lo = Math.min(8, H / 4), hi = H - lo;
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? H / 2 : lo + ((hi - lo) * i) / (n - 1);
    body += line('sl', X(from), Y(y), X(to), Y(y));
  }
  for (const c of [0, S]) body += rect('sk', X(c - postSizeIn / 2), Y(H), postSizeIn * s, (H + D) * s);
  body += line('sd', X(-hole / 2) - 6, Y(0), X(S + hole / 2) + 6, Y(0));
  body += hDim(X(0), X(S), top - 14, `${r1(spacingFt)} ft on center`, true);
  body += vDim(left - 22, Y(H), Y(0), `${ftIn(H)} high`);
  // 埋深画出来很短时只写数字，免得竖排文字伸出尺寸线
  if (D > 0) body += vDim(left - 22, Y(0), Y(-D), D * s >= 75 ? `${ftIn(D)} deep` : ftIn(D));
  return (
    svg(top + (H + D) * s + bottom, 'One fence section drawn to scale', body) +
    key([['Post hole', `${r1(holeDiaIn)} in × ${ftIn(D)} deep`], ['Rails per section', String(n)]]) +
    note('One section drawn to scale · dashed lines = rails behind the pickets; rail heights shown are typical. Shaded = concrete-filled holes below ground.')
  );
}

// ---- 混凝土台阶：侧面剖面（实心浇筑） ----
export function concreteStairsSvg(widthIn: number, riseIn: number, runIn: number, landingIn: number, steps: number): string {
  const n = Math.floor(steps);
  if (!ok(widthIn, riseIn, runIn) || n < 1) return '';
  const L = Math.max(0, landingIn);
  const depth = n * runIn + L, height = n * riseIn;
  const left = 48, right = 12, top = 16, bottom = 44;
  const s = Math.min((VW - left - right) / depth, 200 / height);
  const X = (x: number) => left + x * s;
  const Y = (y: number) => top + (height - y) * s;
  // 第 i 级是一整块从地面起的实心块，轮廓是阶梯线 + 顶部（踏面 + 平台）+ 后墙
  const pts: string[] = [`${r1(X(0))},${r1(Y(0))}`];
  for (let i = 0; i < n; i++) pts.push(`${r1(X(i * runIn))},${r1(Y((i + 1) * riseIn))}`, `${r1(X(i === n - 1 ? depth : (i + 1) * runIn))},${r1(Y((i + 1) * riseIn))}`);
  pts.push(`${r1(X(depth))},${r1(Y(0))}`);
  let body = `<polygon class="sf" points="${pts.join(' ')}"/>`;
  body += line('sd', X(0) - 8, Y(0), X(depth) + 8, Y(0));
  if (L > 0) {
    body += line('sl', X(n * runIn), Y(height), X(n * runIn), Y(0));
    body += `<text class="st" x="${r1(X(n * runIn + L / 2))}" y="${r1(Y(height) + 20)}" text-anchor="middle">Landing</text>`;
  }
  body += vDim(left - 16, Y(height), Y(0), ftIn(height)); // 竖排空间有限，只写数字，含义见下方图例
  body += hDim(X(0), X(depth), Y(0) + 14, `Total depth ${ftIn(depth)}`);
  return (
    svg(top + height * s + bottom, 'Side view of the concrete steps drawn to scale', body) +
    key([['Steps', `${n} × ${ftIn(riseIn)} rise`], ['Tread depth', ftIn(runIn)], ['Total rise', ftIn(height)], ['Stair width', ftIn(widthIn)]]) +
    note(`Side view drawn to scale · shaded = solid concrete${L > 0 ? '; dashed line = where the landing begins' : ''}. Stair width runs into the page.`)
  );
}

// ---- 外墙挂板：山墙立面 ----
export function gableWallSvg(gableWidthIn: number, wallHeightIn: number, gableHeightIn: number, gables: number): string {
  const g = Math.floor(gables);
  if (!ok(gableWidthIn, wallHeightIn, gableHeightIn) || g < 1) return '';
  const H = wallHeightIn + gableHeightIn;
  const left = 48, right = 48, top = 16, bottom = 44;
  const s = Math.min((VW - left - right) / gableWidthIn, 200 / H);
  const w = gableWidthIn * s;
  const x0 = (VW - w) / 2;
  const X = (x: number) => x0 + x * s;
  const Y = (y: number) => top + (H - y) * s;
  const body =
    rect('sf', X(0), Y(wallHeightIn), w, wallHeightIn * s) +
    `<polygon class="sh" points="${r1(X(0))},${r1(Y(wallHeightIn))} ${r1(X(gableWidthIn / 2))},${r1(Y(H))} ${r1(X(gableWidthIn))},${r1(Y(wallHeightIn))}"/>` +
    vDim(X(0) - 16, Y(wallHeightIn), Y(0), `Wall ${ftIn(wallHeightIn)}`) +
    vDim(X(gableWidthIn) + 30, Y(H), Y(wallHeightIn), `Gable ${ftIn(gableHeightIn)}`) +
    hDim(X(0), X(gableWidthIn), Y(0) + 14, `Gable width ${ftIn(gableWidthIn)}`);
  return (
    svg(top + H * s + bottom, 'End wall with its gable drawn to scale', body) +
    note(`End wall drawn to scale · shaded triangle = gable (${g === 1 ? '1 gable' : `${g} gables`} like this), measured from the eave line to the peak. Wall height runs from the foundation to the eaves.`)
  );
}
