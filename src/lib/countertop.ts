/** L/U runs are measured along outside edges; subtract shared corner squares once. */
export function countertopArea(shape: string, backFt: number, leftFt: number, rightFt: number, depthFt: number, cutoutFt2: number) {
  const runs = shape === 'u' ? [backFt, leftFt, rightFt] : shape === 'l' ? [backFt, leftFt] : shape === 'rectangle' ? [backFt] : [];
  const valid = runs.length > 0 && runs.every(n => Number.isFinite(n) && n > 0)
    && Number.isFinite(depthFt) && depthFt > 0 && Number.isFinite(cutoutFt2) && cutoutFt2 >= 0
    && (shape === 'rectangle' || runs.every(n => n >= depthFt)) && (shape !== 'u' || backFt >= depthFt * 2);
  const corners = shape === 'u' ? 2 : shape === 'l' ? 1 : 0;
  const grossFt2 = valid ? runs.reduce((sum, n) => sum + n * depthFt, 0) - corners * depthFt ** 2 : 0;
  const fits = valid && cutoutFt2 <= grossFt2;
  return { valid: fits, grossFt2, netFt2: fits ? grossFt2 - cutoutFt2 : 0, cutoutFt2 };
}
