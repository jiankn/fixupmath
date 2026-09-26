// Highlight only the diagram belonging to the focused field's shape or form.
document.addEventListener('focusin', (event) => {
  document.querySelectorAll('.measurement.is-active').forEach(el => el.classList.remove('is-active'));
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const form = target.closest('form');
  if (!form) return;
  const key = target.name.replace(/(?:Unit|In)$/, '');
  const scope = target.closest('[data-shape]') ?? form;
  scope.querySelectorAll<SVGElement>('[data-measure]').forEach(el => {
    if (el.dataset.measure?.split(' ').includes(key)) el.classList.add('is-active');
  });
});
document.addEventListener('focusout', () => {
  document.querySelectorAll('.measurement.is-active').forEach(el => el.classList.remove('is-active'));
});
