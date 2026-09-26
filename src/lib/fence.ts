// 围栏用料：立柱、横杆、栅板、立柱坑混凝土。按一条直线围栏计算，每扇门单独占一个开口。
import { ceilCount } from './format';
import { BAG_SIZES } from './concrete';

export interface FenceInput {
  lengthFt: number; // 围栏总长（含门）
  postSpacingFt: number;
  heightFt: number;
  railsPerSection: number;
  picketWidthIn: number;
  picketGapIn: number;
  gates: number;
  gateWidthFt: number;
  holeDiameterIn: number;
  holeDepthFt: number;
  postSizeIn: number; // 立柱实际边长，4×4 为 3.5
  wastePct: number;
}

export interface FenceResult {
  runFt: number; // 扣掉门后的围栏长度
  sections: number;
  posts: number;
  rails: number;
  railLengthFt: number;
  pickets: number;
  postLengthFt: number; // 地上高度 + 埋深
  stockPostFt: number; // 建议采购的标准长度
  concreteFt3PerPost: number;
  concreteFt3: number;
  bags: { lb: number; count: number }[];
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const STOCK_POSTS = [6, 8, 10, 12, 14, 16];

export function fenceMaterials(i: FenceInput): FenceResult {
  const gates = Math.floor(pos(i.gates));
  const runFt = Math.max(0, pos(i.lengthFt) - gates * pos(i.gateWidthFt));
  const spacing = pos(i.postSpacingFt);
  const sections = runFt > 0 && spacing > 0 ? ceilCount(runFt / spacing) : 0;
  // 直线围栏：段数 + 1 根；每扇门把围栏断开一次，多 1 根
  const posts = sections > 0 ? sections + 1 + gates : gates * 2;
  const rails = sections * Math.floor(pos(i.railsPerSection));
  const unit = pos(i.picketWidthIn) + Math.max(0, pos(i.picketGapIn));
  const pickets = unit > 0 ? ceilCount(((runFt * 12) / unit) * (1 + pos(i.wastePct) / 100)) : 0;
  const postLengthFt = pos(i.heightFt) + pos(i.holeDepthFt);
  const stockPostFt = STOCK_POSTS.find((s) => s >= postLengthFt - 1e-9) ?? Math.ceil(postLengthFt);
  // 坑体积减去立柱占的体积
  const r = pos(i.holeDiameterIn) / 2 / 12;
  const post = pos(i.postSizeIn) / 12;
  const depth = pos(i.holeDepthFt);
  const concreteFt3PerPost = Math.max(0, Math.PI * r * r * depth - post * post * depth);
  const concreteFt3 = concreteFt3PerPost * posts;
  return {
    runFt,
    sections,
    posts,
    rails,
    railLengthFt: spacing,
    pickets,
    postLengthFt,
    stockPostFt,
    concreteFt3PerPost,
    concreteFt3,
    // 每个坑单独拌料，按「每坑袋数 × 坑数」算，更贴近实际
    bags: [...BAG_SIZES].reverse().map((b) => ({ lb: b.lb, count: ceilCount(concreteFt3PerPost / b.yieldFt3) * posts })),
  };
}
