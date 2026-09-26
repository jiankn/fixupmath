// Shared presentation behavior: explicit invalid states and keyboard-safe mobile summary.
export function validateInputs(form: HTMLFormElement): boolean {
  let valid = true;
  form.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(input => {
    const active = !input.closest('[hidden]') && !input.closest('details:not([open])');
    const optional = !!input.closest('.prices') || input.classList.contains('inch');
    const invalid = active && ((!optional && input.value === '') || !input.validity.valid);
    input.setAttribute('aria-invalid', String(invalid));
    let error = input.closest('.field')?.querySelector<HTMLElement>('.field-error');
    if (invalid && !error) {
      error = document.createElement('small');
      error.className = 'field-error';
      error.id = (input.id || input.name) + '-error';
      input.closest('.field')?.append(error);
      input.setAttribute('aria-describedby', error.id);
    }
    if (error) {
      error.hidden = !invalid;
      error.textContent = input.value === '' ? 'Enter a measurement.' : 'Check this value and its allowed range.';
    }
    valid &&= !invalid;
  });
  const results = form.querySelector<HTMLElement>('.results');
  if (results) results.dataset.invalid = String(!valid);
  const notice = form.querySelector<HTMLElement>('[data-result-invalid]');
  if (notice) notice.hidden = valid;
  return valid;
}

export function keyboardIsOpen(): boolean {
  return document.activeElement instanceof HTMLInputElement
    || document.activeElement instanceof HTMLSelectElement
    || !!(window.visualViewport && window.innerHeight - window.visualViewport.height > 150);
}

export function markEdited(form: HTMLFormElement) {
  const note = form.querySelector<HTMLElement>('[data-input-note]');
  if (note) note.textContent = 'Your project inputs · results update automatically.';
}

