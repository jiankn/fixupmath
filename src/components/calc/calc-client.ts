// 通用计算器的浏览器端逻辑：读表单 → 调配置里的公式 → 渲染结果；同步网址参数、项目合计、手机悬浮栏。
import { fieldVisible, type CalculatorDef, type FieldDef, type Values } from '../../lib/calc-types';
import { resultHTML } from '../../lib/render';
import { syncSelectDisplays } from './select-display';
import { validateInputs, keyboardIsOpen, markEdited } from './interaction';
import { printSheet } from './print-sheet';
import { isLengthUnit, isAreaUnit, AREA_UNITS } from '../../lib/units';

// 每个计算器的配置单独打包，页面只加载自己那一个
const modules = import.meta.glob<{ default: CalculatorDef }>([
  '../../calculators/*.ts',
  '!../../calculators/*.test.ts',
  '!../../calculators/shared.ts',
]);

export function boot() {
  document.querySelectorAll<HTMLFormElement>('form[data-calc]').forEach(async (form) => {
    const load = modules[`../../calculators/${form.dataset.calc}.ts`];
    if (!load) return;
    initCalculator(form, (await load()).default);
  });
}

interface ProjectItem {
  label: string;
  measure: number;
}

export function initCalculator(form: HTMLFormElement, def: CalculatorDef) {
  const results = form.querySelector('.results') as HTMLElement;
  const resBox = form.querySelector('[data-res]') as HTMLElement;
  const pieceLine = form.querySelector('[data-piece]') as HTMLElement;
  const mbar = document.querySelector(`[data-mbar="${def.id}"]`) as HTMLElement | null;
  const storeKey = `hc-${def.id}-project`;
  let project: ProjectItem[] = def.project ? loadProject() : [];

  const activeShape = () =>
    (form.querySelector('input[name="shape"]:checked') as HTMLInputElement | null)?.value ?? def.shapes?.[0]?.id;
  const shapeDef = () => def.shapes?.find((s) => s.id === activeShape());

  // 找到字段对应的 DOM：形状字段在当前形状的 fieldset 里，通用字段在 fieldset 外
  function fieldEl(f: FieldDef, inShape: boolean): HTMLElement | null {
    if (inShape) return form.querySelector(`fieldset.dims[data-shape="${activeShape()}"] [data-field="${f.key}"]`);
    return [...form.querySelectorAll<HTMLElement>(`[data-field="${f.key}"]`)].find((el) => !el.closest('fieldset.dims')) ?? null;
  }
  const allFields = (): [FieldDef, boolean][] => [
    ...(shapeDef()?.fields ?? []).map((f): [FieldDef, boolean] => [f, true]),
    ...def.fields.map((f): [FieldDef, boolean] => [f, false]),
    ...(def.priceFields ?? []).map((f): [FieldDef, boolean] => [f, false]),
  ];
  const q = <T extends Element>(el: Element, sel: string) => el.querySelector(sel) as T;

  function readField(el: HTMLElement, f: FieldDef): unknown {
    const main = parseFloat(q<HTMLInputElement>(el, `[name="${f.key}"]`).value);
    switch (f.kind) {
      case 'length': {
        const unit = q<HTMLSelectElement>(el, `[name="${f.key}Unit"]`).value;
        if (unit === 'ftin') {
          const inch = parseFloat(q<HTMLInputElement>(el, `[name="${f.key}In"]`).value);
          return { value: (Number.isFinite(main) ? main : 0) + (Number.isFinite(inch) ? inch : 0) / 12, unit: 'ft' };
        }
        return { value: main, unit: isLengthUnit(unit) ? unit : f.default.unit };
      }
      case 'area': {
        const unit = q<HTMLSelectElement>(el, `[name="${f.key}Unit"]`).value;
        return { value: main, unit: isAreaUnit(unit) ? unit : f.default.unit };
      }
      case 'select':
        return q<HTMLSelectElement>(el, `[name="${f.key}"]`).value;
      default:
        return main; // number / money，没填是 NaN
    }
  }

  function read(): Values {
    const v: Values = { shape: activeShape() };
    for (const [f, inShape] of allFields()) {
      const el = fieldEl(f, inShape);
      if (el) v[f.key] = readField(el, f);
    }
    return v;
  }

  // 「英尺 + 英寸」单位时显示英寸框；showWhen 条件字段的显隐
  function updateVisibility(v: Values) {
    form.querySelectorAll<HTMLSelectElement>('.field select[name$="Unit"]').forEach((sel) => {
      const inch = sel.parentElement?.querySelector<HTMLInputElement>('input.inch');
      if (inch) inch.hidden = sel.value !== 'ftin';
    });
    for (const [f, inShape] of allFields()) {
      if (!f.showWhen) continue;
      const el = fieldEl(f, inShape);
      if (el) el.hidden = !fieldVisible(f, v);
    }
  }

  // 项目里每一项的文字说明，如「Rectangle: 12 ft × 10 ft 6 in」
  function describe(): string {
    const s = shapeDef();
    if (!s) return 'Item';
    const parts = s.fields.map((f) => {
      const el = fieldEl(f, true);
      if (!el) return '';
      const val = q<HTMLInputElement>(el, `[name="${f.key}"]`).value;
      const unitSel = el.querySelector<HTMLSelectElement>(`[name="${f.key}Unit"]`);
      if (!unitSel) return val;
      if (unitSel.value === 'ftin') {
        const inch = q<HTMLInputElement>(el, `[name="${f.key}In"]`).value;
        return `${val || 0} ft${inch ? ` ${inch} in` : ''}`;
      }
      const label = f.kind === 'area' ? AREA_UNITS.find((u) => u.value === unitSel.value)?.label : unitSel.value;
      return `${val} ${label}`;
    });
    return `${s.label}: ${parts.filter(Boolean).join(' × ')}`;
  }

  function render() {
    syncSelectDisplays(form);
    const v = read();
    updateVisibility(v);
    if (!validateInputs(form)) return;
    const total = project.length ? project.reduce((s, p) => s + p.measure, 0) : undefined;
    let r = def.compute(v, total);
    if (project.length) r = { ...r, label: 'Project total' };
    resBox.innerHTML = resultHTML(r);
    if (mbar) q<HTMLElement>(mbar, '[data-mbar-text]').textContent = r.summary;

    if (def.project && def.measure) {
      pieceLine.hidden = project.length === 0;
      pieceLine.textContent = `This one: ${def.project.format(def.measure(v))} (not yet added)`;
      renderProject();
    }
    syncUrl();
  }

  function renderProject() {
    const box = form.querySelector('[data-project]') as HTMLElement;
    const list = form.querySelector('[data-project-list]') as HTMLElement;
    box.hidden = project.length === 0;
    list.innerHTML = '';
    project.forEach((p, i) => {
      const li = document.createElement('li');
      li.textContent = `${p.label} — ${def.project!.format(p.measure)} `;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = 'remove';
      rm.addEventListener('click', () => {
        project.splice(i, 1);
        saveProject();
        render();
      });
      li.append(rm);
      list.append(li);
    });
    (form.querySelector('[data-add]') as HTMLElement).textContent = project.length ? '+ Add this one too' : '+ Add to project';
  }

  // ---- 网址参数：分享链接能还原所有输入 ----
  function syncUrl() {
    const p = new URLSearchParams();
    const shape = activeShape();
    if (shape && def.shapes && def.shapes.length > 1) p.set('shape', shape);
    for (const [f, inShape] of allFields()) {
      const el = fieldEl(f, inShape);
      if (!el || el.hidden) continue; // 隐藏的条件字段（如非自定义时的密度）不进链接
      const val = q<HTMLInputElement>(el, `[name="${f.key}"]`).value;
      if (f.kind === 'length' || f.kind === 'area') {
        const unit = q<HTMLSelectElement>(el, `[name="${f.key}Unit"]`).value;
        if (unit === 'ftin') p.set(f.key, `${val || 0}ft${q<HTMLInputElement>(el, `[name="${f.key}In"]`).value || 0}in`);
        else if (val !== '') p.set(f.key, `${val}${unit}`);
      } else if (val !== '') {
        p.set(f.key, val);
      }
    }
    history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
  }

  function restoreFromUrl() {
    const p = new URLSearchParams(location.search);
    if (![...p.keys()].length) return;
    const shape = p.get('shape');
    if (shape && def.shapes?.some((s) => s.id === shape)) {
      q<HTMLInputElement>(form, `input[name="shape"][value="${shape}"]`).checked = true;
      showShape();
    }
    for (const [f, inShape] of allFields()) {
      const raw = p.get(f.key);
      const el = fieldEl(f, inShape);
      if (raw === null || !el) continue;
      const input = q<HTMLInputElement>(el, `[name="${f.key}"]`);
      if (f.kind === 'length' || f.kind === 'area') {
        const unitSel = q<HTMLSelectElement>(el, `[name="${f.key}Unit"]`);
        const ftin = /^([\d.]+)ft([\d.]+)in$/.exec(raw);
        const m = /^([\d.]+)([a-z0-9]+)$/.exec(raw);
        if (f.kind === 'length' && ftin) {
          input.value = ftin[1];
          q<HTMLInputElement>(el, `[name="${f.key}In"]`).value = ftin[2];
          unitSel.value = 'ftin';
        } else if (m && (f.kind === 'length' ? isLengthUnit(m[2]) : isAreaUnit(m[2]))) {
          input.value = m[1];
          unitSel.value = m[2];
        }
      } else if (f.kind === 'select') {
        const sel = q<HTMLSelectElement>(el, `[name="${f.key}"]`);
        if ([...sel.options].some((o) => o.value === raw)) sel.value = raw;
      } else if (/^[\d.]+$/.test(raw)) {
        input.value = raw;
      }
    }
  }

  function showShape() {
    const active = activeShape();
    form.querySelectorAll<HTMLFieldSetElement>('fieldset.dims').forEach((fs) => (fs.hidden = fs.dataset.shape !== active));
  }

  function loadProject(): ProjectItem[] {
    try {
      const arr = JSON.parse(localStorage.getItem(storeKey) ?? '[]');
      return Array.isArray(arr) ? arr.filter((x) => typeof x?.label === 'string' && Number.isFinite(x?.measure)) : [];
    } catch {
      return [];
    }
  }
  function saveProject() {
    try {
      localStorage.setItem(storeKey, JSON.stringify(project));
    } catch {
      /* 隐私模式等存不了，不影响计算 */
    }
  }

  form.addEventListener('input', () => { markEdited(form); render(); });
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'shape') showShape();
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  form.querySelector('[data-add]')?.addEventListener('click', () => {
    if (!validateInputs(form)) return;
    const m = def.measure?.(read()) ?? 0;
    if (!(m > 0)) return;
    project.push({ label: describe(), measure: m });
    saveProject();
    render();
  });
  form.querySelector('[data-clear]')?.addEventListener('click', () => {
    project = [];
    saveProject();
    render();
  });
  form.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Link copied';
    } catch {
      btn.textContent = 'Copy failed — use the address bar';
    }
    setTimeout(() => (btn.textContent = 'Copy link to results'), 2000);
  });
  form.querySelector('[data-print]')?.addEventListener('click', () => printSheet(form));

  // 手机悬浮摘要：输入区在屏幕内、结果面板不在屏幕内时显示
  const inputs = form.querySelector('.calc-inputs') as HTMLElement;
  // 露出至少 120px（能看到大数字）才算「看得到」，只露一条边不算
  const onScreen = (el: HTMLElement, minPx = 0) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight - minPx && r.bottom > minPx;
  };
  const updateBar = () => {
    if (mbar) mbar.hidden = keyboardIsOpen() || results.dataset.invalid === 'true' || !(onScreen(inputs) && !onScreen(results, 120));
  };
  form.addEventListener('focusin', updateBar);
  form.addEventListener('focusout', () => requestAnimationFrame(updateBar));
  form.addEventListener('input', updateBar);
  window.visualViewport?.addEventListener('resize', updateBar);
  window.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);

  restoreFromUrl();
  showShape();
  render();
  updateBar();
}

