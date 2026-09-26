// 「打印」按钮：临时生成一张干净的计算单（输入 + 结果 + 可复现链接），只打印这张单子。
// 直接读页面上的表单和结果面板，所以通用计算器和混凝土计算器共用这一份。
// 用户自己按 Ctrl+P 时不走这里，仍打印整页（导航、广告已由 global.css 隐藏）。

const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

// 字段是否在用：自身或祖先被隐藏（其他形状、showWhen 条件不满足）都算不在用
const inUse = (el: Element) => !el.closest('[hidden]');

/** 把一个输入项读成「显示给人看的值」，没填返回空串 */
function fieldValue(field: HTMLElement): string {
  const input = field.querySelector<HTMLInputElement>('input:not(.inch)');
  const unit = field.querySelector<HTMLSelectElement>('select');
  if (!input) return unit ? text(unit.selectedOptions[0]) : '';
  const v = input.value.trim();
  if (v === '') return '';
  if (field.querySelector('.money')) return `$${Number(v).toFixed(2)}`;
  if (unit) {
    if (unit.value === 'ftin') {
      const inch = field.querySelector<HTMLInputElement>('input.inch')?.value.trim();
      return `${v} ft${inch ? ` ${inch} in` : ''}`;
    }
    return `${v} ${text(unit.selectedOptions[0])}`;
  }
  const suffix = text(field.querySelector('.suffix'));
  return suffix ? `${v} ${suffix}` : v;
}

function row(label: string, value: string) {
  const div = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  div.append(dt, dd);
  return div;
}

function section(title: string, body: Node) {
  const s = document.createElement('section');
  const h = document.createElement('h2');
  h.textContent = title;
  s.append(h, body);
  return s;
}

function buildSheet(form: HTMLFormElement): { sheet: HTMLElement; link: string } {
  const sheet = document.createElement('div');
  sheet.className = 'print-sheet';

  const site = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content || location.hostname;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const head = document.createElement('header');
  head.className = 'ps-head';
  head.innerHTML = '<strong></strong><span></span>';
  head.children[0].textContent = site;
  head.children[1].textContent = date;
  const h1 = document.createElement('h1');
  h1.textContent = text(document.querySelector('main h1')) || document.title;
  sheet.append(head, h1);

  // 已加入项目时，各块尺寸在结果里的项目清单中；表单里的形状和尺寸只是还没加进去的那一块，不列
  const hasProject = !!form.querySelector('.project > :not(button):not([hidden])');

  // 输入：形状 + 用到的尺寸/选项；价格单独一组，只列填了的
  const inputs = document.createElement('dl');
  const prices = document.createElement('dl');
  inputs.className = prices.className = 'ps-list';
  const shapes = form.querySelector('.shapes');
  const shape = form.querySelector<HTMLInputElement>('.shape-opt input:checked');
  if (shapes && shape && !hasProject) inputs.append(row(text(shapes.querySelector('legend')) || 'Shape', text(shape.closest('.shape-opt'))));
  form.querySelectorAll<HTMLElement>('.field').forEach((f) => {
    if (!inUse(f) || (hasProject && f.closest('fieldset.dims, [data-per-piece]'))) return;
    const value = fieldValue(f);
    if (!value) return;
    (f.closest('.prices') ? prices : inputs).append(row(text(f.querySelector('label')), value));
  });
  if (inputs.children.length) sheet.append(section(hasProject ? 'Settings' : 'Your inputs', inputs));
  if (prices.children.length) sheet.append(section('Prices used', prices));

  // 结果：复制结果面板，去掉按钮、隐藏项和指向页面正文的脚注
  const content = form.querySelector('.result-content')?.cloneNode(true) as HTMLElement | undefined;
  if (content) {
    content.querySelectorAll('button, .actions, .no-print, [hidden], .result-footnote, .result-badge, [data-piece], #r-piece').forEach((el) => el.remove());
    content.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    // 项目清单紧跟在总数下面，先看到「总数由哪几块组成」
    const project = content.querySelector('.project');
    const anchor = content.querySelector('.res-sub') ?? content.querySelector('.res-main');
    if (project && anchor) anchor.after(project);
    content.className = 'ps-results';
    sheet.append(section('Your estimate', content));
  }

  const link = hasProject ? location.origin + location.pathname : location.href;
  const foot = document.createElement('footer');
  foot.className = 'ps-foot';
  foot.innerHTML = `<div><p>${hasProject ? 'Scan or visit to open the calculator' : 'Scan or visit to reopen and edit this estimate'}:<br><span class="ps-url"></span></p><p>Planning estimate only. Confirm quantities and prices with your supplier before ordering.</p></div><div class="ps-qr"></div>`;
  (foot.querySelector('.ps-url') as HTMLElement).textContent = link;
  sheet.append(foot);
  return { sheet, link };
}

// 二维码库单独打包，不阻塞页面加载；页面空闲时就预先下载好。
// 这样点「打印」不用等，也避免网站更新后，开着的旧页面再去下载时找不到这个文件
let qrLib: Promise<typeof import('uqr')> | undefined;
const loadQr = () => (qrLib ??= import('uqr').catch((e) => {
  qrLib = undefined; // 失败了下次点击再试
  throw e;
}));
const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
idle(() => loadQr().catch(() => {}));

async function qrSvg(link: string): Promise<string> {
  try {
    const { renderSVG } = await loadQr();
    return renderSVG(link, { border: 0 });
  } catch {
    return ''; // 加载失败（离线等）就只留文字链接，照样打印
  }
}

export async function printSheet(form: HTMLFormElement) {
  document.querySelector('.print-sheet')?.remove();
  const { sheet, link } = buildSheet(form);
  (sheet.querySelector('.ps-qr') as HTMLElement).innerHTML = await qrSvg(link);
  document.body.append(sheet);
  const root = document.documentElement;
  root.classList.add('printing-sheet');
  const cleanup = () => {
    root.classList.remove('printing-sheet');
    sheet.remove();
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
}
