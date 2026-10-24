import { describe, expect, it } from 'vitest';
import { defaultValues, type CalculatorDef, type Values } from '../lib/calc-types';
import { CALCULATORS } from '../data/calculators';
import joist from './joist-span';
import rafter from './rafter-span';
import grout from './grout';
import plywood from './plywood';
import wall from './retaining-wall';
import fertilizer from './fertilizer';
import epoxy from './epoxy';
import countertop from './countertop';
const all = [joist, rafter, grout, plywood, wall, fertilizer, epoxy, countertop];
const run = (def: CalculatorDef, patch: Values = {}) => def.compute({ ...defaultValues(def), ...patch });
const row = (def: CalculatorDef, title: string, label: string, patch: Values = {}) =>
  run(def, patch).blocks.find(b => b.title === title)?.rows.find(r => r.label === label)?.value;

describe('eight focused tools', () => {
  it.each(all.map(def => [def.id, def] as const))('%s has finite default results and a single registered route', (id, def) => {
    const r = run(def);
    expect(r.value).not.toMatch(/NaN|Infinity|Check|Unavailable/);
    expect(r.value).not.toBe('0');
    expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity/);
    expect(r.summary).toBeTruthy();
    const slug = id === 'rafter-span' ? 'rafter-span-chart' : `${id}-calculator`;
    expect(CALCULATORS.filter(c => c.slug === slug && c.status === 'live')).toHaveLength(1);
  });
  it('compares a metric joist measurement without rounding away an exceedance', () => {
    expect(row(joist, 'Your span', 'Comparison', { size: '2x10', span: { value: 4.2672, unit: 'm' } })).toBe('Within this table limit');
    expect(row(joist, 'Your span', 'Comparison', { size: '2x10', span: { value: 4.268, unit: 'm' } })).toBe('Exceeds this table limit');
  });
  it('updates the rafter result when the roof load case changes', () => {
    expect(run(rafter).value).toBe('16 ft 4 in');
    expect(run(rafter, { load: '40' }).value).toBe('12 ft 8 in');
    expect(row(rafter, 'Your span', 'Comparison', { load: '40' })).toBe('Exceeds this table limit');
  });
  it('uses each grout product chart and changes bag counts', () => {
    expect(run(grout, { area: { value: 500, unit: 'ft2' }, waste: '0' }).value).toBe('1');
    expect(run(grout, { product: 'mapei-10', area: { value: 500, unit: 'ft2' }, waste: '0' }).value).toBe('3');
    expect(row(grout, 'Quantity basis', 'Coverage per bag', { product: 'laticrete-25' })).toBe('536 ft²');
  });
  it('custom grout uses joint geometry and the supplied yield, not a brand density', () => {
    const result = run(grout, { shape: 'dimensions', tileLength: { value: 1, unit: 'in' }, tileWidth: { value: 1, unit: 'in' },
      jointWidth: { value: 1, unit: 'in' }, depth: { value: 0.25, unit: 'in' }, yield: 0.25, bagLb: 25, waste: '0' });
    expect(result.value).toBe('7'); // 1.5625 ft³ / 0.25 = 6.25 bags
  });
  it('uses metric sheet dimensions and applies waste once to a project total', () => {
    expect(run(plywood, { shape: 'area', area: { value: 12, unit: 'm2' }, sheetLength: { value: 2.4, unit: 'm' }, sheetWidth: { value: 1.2, unit: 'm' }, waste: '0' }).value).toBe('5');
    expect(plywood.compute(defaultValues(plywood), 500).value).toBe('18');
  });
  it('retaining wall default has 147 blocks and a partial cost subtotal', () => {
    expect(run(wall).value).toBe('147');
    expect(row(wall, 'Estimated material cost', 'Priced material subtotal', { priceBlock: 4 })).toBe('$588');
  });
  it('keeps fertilizer application weight separate from rounded bags', () => {
    expect(run(fertilizer).value).toBe('12.5');
    expect(row(fertilizer, 'Purchase', 'Product left after this application')).toBe('27.5 lb');
    expect(run(fertilizer, { shape: 'product', rate: 4, n: 0 }).value).toBe('20');
    expect(run(fertilizer, { n: 0 }).value).toBe('Check inputs');
  });
  it('epoxy handles liter-sized kits and a 2:1 volume ratio', () => {
    expect(run(epoxy, { kit: 1, kitUnit: 'l', resinParts: 2 }).value).toBe('0.686');
    expect(row(epoxy, 'Purchase', 'Combined kits to buy', { kit: 1, kitUnit: 'l' })).toBe('3');
  });
  it('countertop dimensions count corners once, reject impossible shapes, and total project items', () => {
    const v = { ...defaultValues(countertop), shape: 'l', back: { value: 8, unit: 'ft' }, left: { value: 6, unit: 'ft' }, depth: { value: 2, unit: 'ft' }, cutout: { value: 3, unit: 'ft2' } };
    expect(countertop.compute(v).value).toBe('21');
    expect(countertop.compute(v, 31).value).toBe('31');
    expect(run(countertop, { cutout: { value: 99, unit: 'ft2' } }).value).toBe('Check dimensions');
  });
});
