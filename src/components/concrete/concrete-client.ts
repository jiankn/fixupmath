// 混凝土计算器的浏览器端逻辑：读表单 → 调引擎 → 更新结果；同步网址参数，支持项目合计。
import {
  SHAPES,
  getShape,
  shapeVolumeFt3,
  concreteResult,
  costEstimate,
  readyMixOrder,
  adviceFor,
  fmt,
  type ShapeId,
  type Length,
  type ConcreteResult,
} from '../../lib/concrete';
import { isLengthUnit } from '../../lib/units';
import { validateInputs, keyboardIsOpen, markEdited } from '../calc/interaction';
import { printSheet } from '../calc/print-sheet';
import { concreteStairsSvg } from '../../lib/figures';
import { toFeet } from '../../lib/units';

interface ProjectItem {
  label: string;
  netFt3: number;
}

const STORE_KEY = 'hc-concrete-project';

export function initConcreteCalculator() {
  const maybeForm = document.getElementById('cc') as HTMLFormElement | null;
  if (!maybeForm) return;
  const form: HTMLFormElement = maybeForm;
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  let project: ProjectItem[] = loadProject();

  const activeShape = (): ShapeId =>
    ((form.querySelector('input[name="shape"]:checked') as HTMLInputElement)?.value as ShapeId) || 'slab';
  const fieldset = (shape: ShapeId) => form.querySelector(`fieldset.dims[data-shape="${shape}"]`) as HTMLFieldSetElement;
  const num = (el: Element | null, fallback = 0) => {
    const v = parseFloat((el as HTMLInputElement | null)?.value ?? '');
    return Number.isFinite(v) ? v : fallback;
  };

  function readDims(shape: ShapeId): Record<string, Length> {
    const fs = fieldset(shape);
    const dims: Record<string, Length> = {};
    for (const d of getShape(shape).dims) {
      const input = fs.querySelector(`[name="${d.key}"]`);
      const unit = (fs.querySelector(`[name="${d.key}Unit"]`) as HTMLSelectElement).value;
      dims[d.key] = { value: num(input), unit: isLengthUnit(unit) ? unit : d.default.unit };
    }
    return dims;
  }

  function currentPiece() {
    const shape = activeShape();
    const dims = readDims(shape);
    const steps = Math.max(1, Math.floor(num(form.querySelector('[name="steps"]'), 3)));
    const qty = Math.max(1, Math.floor(num(form.querySelector('[name="quantity"]'), 1)));
    const netFt3 = shapeVolumeFt3(shape, dims, steps) * qty;
    const dimText = getShape(shape)
      .dims.filter((d) => dims[d.key].value > 0)
      .map((d) => `${fmt(dims[d.key].value)} ${dims[d.key].unit}`)
      .join(' × ');
    const label = `${getShape(shape).label}${shape === 'stairs' ? ` (${steps} steps)` : ''}: ${dimText}${qty > 1 ? `, ×${qty}` : ''}`;
    return { shape, dims, steps, qty, netFt3, label };
  }

  const waste = () => num(form.querySelector('[name="waste"]'), 10);

  function render() {
    if (!validateInputs(form)) return;
    const piece = currentPiece();
    const w = waste();
    // 有项目时，结果显示「项目合计」；没有项目时显示当前这一块
    const netFt3 = project.length ? project.reduce((s, p) => s + p.netFt3, 0) : piece.netFt3;
    const r = concreteResult(netFt3, w);
    paint(r, w);
    // 有项目时，另外显示当前这一块自己的用量，免得用户以为输入没生效
    $('r-label').textContent = project.length ? 'Project total' : 'Concrete needed';
    const pieceLine = $('r-piece');
    pieceLine.hidden = project.length === 0;
    pieceLine.textContent = `This pour: ${fmt(concreteResult(piece.netFt3, w).cubicYards)} yd³ (not yet added)`;
    renderFigure(piece);
    renderProject(r);
    syncUrl(piece);
  }

  // 台阶按比例画侧面剖面；其他形状尺寸一目了然，不出图。已有项目时结果是合计，也不画单块的图
  function renderFigure(piece: ReturnType<typeof currentPiece>) {
    const box = $('r-figure');
    const inch = (k: string) => (piece.dims[k] ? toFeet(piece.dims[k].value, piece.dims[k].unit) * 12 : 0);
    const html =
      piece.shape === 'stairs' && project.length === 0
        ? concreteStairsSvg(inch('width'), inch('rise'), inch('run'), inch('landing'), piece.steps)
        : '';
    box.innerHTML = html;
    box.hidden = !html;
  }

  function paint(r: ConcreteResult, w: number) {
    $('r-yd').textContent = fmt(r.cubicYards);
    $('r-ft3').textContent = fmt(r.totalFt3);
    $('r-m3').textContent = fmt(r.cubicMeters);
    $('r-waste').textContent = String(w);
    $('r-weight').textContent = `${fmt(r.weightLb, 0)} lb (${fmt(r.weightLb / 2000, 2)} tons)`;
    const order = readyMixOrder(r.cubicYards);
    $('r-order').textContent = fmt(order);

    const prices = {
      readyMixPerYd3: num(form.querySelector('[name="priceReadyMix"]')),
      bagPrice: {
        40: num(form.querySelector('[name="priceBag40"]')),
        60: num(form.querySelector('[name="priceBag60"]')),
        80: num(form.querySelector('[name="priceBag80"]')),
      },
    };
    const cost = costEstimate({ ...r, cubicYards: order }, prices);
    for (const b of cost.bags) {
      const count = r.bags.find((x) => x.lb === b.lb)!.count;
      form.querySelector(`[data-bag="${b.lb}"]`)!.textContent = count.toLocaleString('en-US');
      const bagCost = b.cost !== undefined ? count * prices.bagPrice[b.lb as 40 | 60 | 80] : undefined;
      form.querySelector(`[data-bag-cost="${b.lb}"]`)!.textContent = bagCost !== undefined ? `≈ $${fmt(bagCost, 0)}` : '';
    }
    const rm = $('r-rm-cost');
    if (cost.readyMix !== undefined && order > 0) {
      rm.hidden = false;
      rm.textContent = `≈ $${fmt(cost.readyMix, 0)} before delivery and short-load fees`;
    } else {
      rm.hidden = true;
    }

    const bags80 = r.bags.find((b) => b.lb === 80)!.count.toLocaleString('en-US');
    $('mb-yd').textContent = fmt(r.cubicYards);
    $('mb-bags').textContent = bags80;
    const advice = adviceFor(r.cubicYards);
    $('r-advice').textContent = {
      empty: 'Enter your dimensions to see how much concrete you need.',
      bags: `Premixed bags are the practical choice for a pour this size (${bags80} 80-lb bags).`,
      'bags-or-mixer': `Bags work, but that is ${bags80} 80-lb bags to mix. Consider renting a mixer, or ask local plants about short-load delivery.`,
      'ready-mix': `Order ready-mix. Hand-mixing ${bags80} 80-lb bags is slow and risks cold joints. Ask the plant about minimum orders and short-load fees.`,
    }[advice];
  }

  function renderProject(total: ConcreteResult) {
    const box = $('project');
    const list = $('project-list');
    box.hidden = project.length === 0;
    list.innerHTML = '';
    project.forEach((p, i) => {
      const li = document.createElement('li');
      li.textContent = `${p.label} — ${fmt(p.netFt3 / 27)} yd³ `;
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
    $('project-total').textContent = `${fmt(total.cubicYards)} yd³ including ${waste()}% extra`;
    $('add-project').textContent = project.length ? '+ Add this pour to the project' : '+ Add to project';
  }

  function syncUrl(piece: ReturnType<typeof currentPiece>) {
    const p = new URLSearchParams();
    p.set('shape', piece.shape);
    for (const [k, v] of Object.entries(piece.dims)) p.set(k, `${v.value}${v.unit}`);
    if (piece.shape === 'stairs') p.set('steps', String(piece.steps));
    if (piece.qty > 1) p.set('qty', String(piece.qty));
    p.set('waste', String(waste()));
    history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
  }

  // 从网址参数恢复（分享链接打开时）
  function restoreFromUrl() {
    const p = new URLSearchParams(location.search);
    const shape = p.get('shape') as ShapeId | null;
    if (!shape || !SHAPES.some((s) => s.id === shape)) return;
    (form.querySelector(`input[name="shape"][value="${shape}"]`) as HTMLInputElement).checked = true;
    const fs = fieldset(shape);
    for (const d of getShape(shape).dims) {
      const m = /^([\d.]+)(in|ft|yd|cm|m)$/.exec(p.get(d.key) ?? '');
      if (!m) continue;
      (fs.querySelector(`[name="${d.key}"]`) as HTMLInputElement).value = m[1];
      (fs.querySelector(`[name="${d.key}Unit"]`) as HTMLSelectElement).value = m[2];
    }
    if (p.get('steps')) (form.querySelector('[name="steps"]') as HTMLInputElement).value = p.get('steps')!;
    if (p.get('qty')) (form.querySelector('[name="quantity"]') as HTMLInputElement).value = p.get('qty')!;
    if (p.get('waste')) (form.querySelector('[name="waste"]') as HTMLSelectElement).value = p.get('waste')!;
  }

  function showShape() {
    const active = activeShape();
    form.querySelectorAll<HTMLFieldSetElement>('fieldset.dims').forEach((fs) => {
      fs.hidden = fs.dataset.shape !== active;
    });
  }

  function loadProject(): ProjectItem[] {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x?.label === 'string' && Number.isFinite(x?.netFt3)) : [];
    } catch {
      return [];
    }
  }
  function saveProject() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(project));
    } catch {
      /* 隐私模式等情况下存不了，不影响计算 */
    }
  }

  form.addEventListener('input', () => { markEdited(form); render(); });
  const resetQuantity = () => ((form.querySelector('[name="quantity"]') as HTMLInputElement).value = '1');
  form.addEventListener('change', (e) => {
    // 换形状时数量回到 1：8 个柱孔的数量不应该带到板上
    if ((e.target as HTMLInputElement).name === 'shape') {
      showShape();
      resetQuantity();
    }
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  $('add-project').addEventListener('click', () => {
    if (!validateInputs(form)) return;
    const piece = currentPiece();
    if (piece.netFt3 <= 0) return;
    project.push({ label: piece.label, netFt3: piece.netFt3 });
    resetQuantity();
    saveProject();
    render();
  });
  $('clear-project').addEventListener('click', () => {
    project = [];
    saveProject();
    render();
  });
  $('copy-link').addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Link copied';
    } catch {
      btn.textContent = 'Copy failed — use the address bar';
    }
    setTimeout(() => (btn.textContent = 'Copy link to results'), 2000);
  });
  $('print').addEventListener('click', () => printSheet(form));

  // 悬浮摘要：用户在填表（输入区在屏幕内）但结果面板不在屏幕内时才显示
  const mbar = $('mbar');
  const results = $('cc-results');
  const inputs = form.querySelector('.cc-inputs') as HTMLElement;
  // 露出至少 120px（能看到大数字）才算「看得到」，只露一条边不算
  const onScreen = (el: HTMLElement, minPx = 0) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight - minPx && r.bottom > minPx;
  };
  const updateBar = () => (mbar.hidden = keyboardIsOpen() || results.dataset.invalid === 'true' || !(onScreen(inputs) && !onScreen(results, 120)));
  form.addEventListener('focusin', updateBar);
  form.addEventListener('focusout', () => requestAnimationFrame(updateBar));
  form.addEventListener('input', updateBar);
  window.visualViewport?.addEventListener('resize', updateBar);
  window.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);
  updateBar();

  restoreFromUrl();
  showShape();
  render();
}
