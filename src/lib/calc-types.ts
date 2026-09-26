// 通用计算器框架的类型。每个计算器写一份 CalculatorDef（输入项 + 公式 + 结果格式），
// 界面、网址同步、项目合计、手机悬浮栏都由框架统一处理。
import type { Length } from './concrete';
import { toFeet, type AreaValue } from './units';

interface FieldBase {
  key: string;
  label: string;
  hint?: string;
  /** 只在另一个字段等于某值时显示，如「材料 = 自定义」时才显示密度 */
  showWhen?: { key: string; equals: string };
}

export type FieldDef =
  | (FieldBase & { kind: 'length'; default: Length })
  | (FieldBase & { kind: 'area'; default: AreaValue })
  | (FieldBase & { kind: 'number'; default: number; min?: number; step?: number; suffix?: string })
  | (FieldBase & { kind: 'select'; default: string; options: { value: string; label: string }[] })
  | (FieldBase & { kind: 'money'; placeholder?: string });

export interface ShapeDef {
  id: string;
  label: string;
  diagram?: string;
  description?: string;
  fields: FieldDef[];
}

/** 表单读出来的值：长度是 Length，面积是 AreaValue，数字是 number，下拉是 string，价格没填是 NaN */
export type Values = Record<string, unknown> & { shape?: string };

export interface ResultRow {
  label: string;
  value: string;
  note?: string;
}
export interface ResultBlock {
  title: string;
  rows: ResultRow[];
}
export interface CalcResult {
  label: string; // 大数字上方的小标题
  value: string; // 大数字
  unit: string;
  sub?: string;
  blocks: ResultBlock[];
  advice?: string;
  summary: string; // 手机底部悬浮栏的一句话摘要（纯文本）
  /** 按计算结果画的示意图（SVG）。只能由数字生成，不能拼接用户输入的文字 */
  figure?: string;
}

export interface CalculatorDef {
  id: string;
  shapeLegend?: string;
  shapes?: ShapeDef[];
  /** 没有形状选择时，显示在输入项上方的示意图 */
  diagram?: string;
  fields: FieldDef[];
  priceFields?: FieldDef[];
  priceNote?: string;
  /** 支持「加入项目」：measure 返回当前这一块的基础量（面积 ft² 或体积 ft³），项目合计时相加 */
  project?: { format: (measure: number) => string };
  measure?: (v: Values) => number;
  compute: (v: Values, measureTotal?: number) => CalcResult;
}

// ---- 配置里常用的取值工具 ----
export const lenFt = (v: Values, key: string): number => {
  const l = v[key] as Length | undefined;
  return l && Number.isFinite(l.value) && l.value > 0 ? toFeet(l.value, l.unit) : 0;
};
export const lenIn = (v: Values, key: string): number => lenFt(v, key) * 12;
export const num = (v: Values, key: string, fallback = 0): number => {
  const n = Number(v[key]);
  return Number.isFinite(n) ? n : fallback;
};
export const str = (v: Values, key: string): string => String(v[key] ?? '');
/** 价格：没填或非正数返回 undefined */
export const price = (v: Values, key: string): number | undefined => {
  const n = Number(v[key]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** 所有字段取默认值（默认形状 = 第一个），用于构建时渲染首屏结果 */
export function defaultValues(def: CalculatorDef): Values {
  const v: Values = {};
  const put = (f: FieldDef) => {
    v[f.key] = f.kind === 'money' ? NaN : f.default;
  };
  if (def.shapes?.length) {
    v.shape = def.shapes[0].id;
    def.shapes[0].fields.forEach(put);
  }
  def.fields.forEach(put);
  def.priceFields?.forEach(put);
  return v;
}

/** 字段当前是否该显示（showWhen 条件） */
export function fieldVisible(f: FieldDef, v: Values): boolean {
  return !f.showWhen || String(v[f.showWhen.key]) === f.showWhen.equals;
}
