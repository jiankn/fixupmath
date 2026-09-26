/** Keep the wrapping mobile label aligned with native selection, including URL restore. */
export function syncSelectDisplays(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('.select-wrap').forEach(wrap => {
    const select = wrap.querySelector('select');
    const label = wrap.querySelector('.select-value');
    if (!select || !label) return;
    label.textContent = select.selectedOptions[0]?.textContent?.trim() ?? '';
    wrap.dataset.enhanced = 'true';
  });
}
