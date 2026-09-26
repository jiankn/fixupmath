// 露台用料：面板、龙骨、封边梁、螺丝。
// 约定：面板沿「长度」方向铺，龙骨垂直于面板、沿长度方向按间距排布，每根龙骨长 = 露台宽度（跨度方向）。
import { ceilCount } from './format';

export interface DeckInput {
  lengthFt: number; // 沿面板方向
  widthFt: number; // 龙骨方向（从房子往外伸的深度）
  boardWidthIn: number; // 面板实际宽度，如 5.5
  gapIn: number; // 板缝
  boardLengthFt: number; // 采购板长
  joistSpacingIn: number; // 龙骨中心距
  wastePct: number;
}

export interface DeckResult {
  areaFt2: number;
  rows: number; // 面板排数
  boardsPerRow: number;
  boards: number; // 含损耗
  linearFt: number; // 面板总延米（不含损耗）
  joists: number;
  joistLengthFt: number;
  rimJoistLf: number; // 两侧封边梁总长
  screws: number;
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function deckMaterials(i: DeckInput): DeckResult {
  const L = pos(i.lengthFt);
  const W = pos(i.widthFt);
  const bw = pos(i.boardWidthIn);
  const gap = Math.max(0, Number.isFinite(i.gapIn) ? i.gapIn : 0);
  const B = pos(i.boardLengthFt);
  const spacing = pos(i.joistSpacingIn);
  const waste = pos(i.wastePct);
  if (!L || !W || !bw || !B || !spacing) {
    return { areaFt2: L * W, rows: 0, boardsPerRow: 0, boards: 0, linearFt: 0, joists: 0, joistLengthFt: W, rimJoistLf: 0, screws: 0 };
  }
  // 最后一排可能要纵向锯窄，也算一整块
  const rows = ceilCount((W * 12) / (bw + gap));
  // 长度超过板长时，每排要接板（接缝落在龙骨上）
  const boardsPerRow = ceilCount(L / B);
  const boards = ceilCount(rows * boardsPerRow * (1 + waste / 100));
  const joists = Math.floor((L * 12) / spacing + 1e-9) + 1;
  return {
    areaFt2: L * W,
    rows,
    boardsPerRow,
    boards,
    linearFt: rows * L,
    joists,
    joistLengthFt: W,
    rimJoistLf: 2 * L,
    // 每排面板在每根龙骨上打 2 颗螺丝
    screws: rows * joists * 2,
  };
}
