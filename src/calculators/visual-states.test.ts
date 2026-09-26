import { describe, it, expect } from 'vitest';
import { defaultValues } from '../lib/calc-types';
import pool from './pool-chemical';
import conduit from './conduit-fill';
import voltage from './voltage-drop';

describe('visual result states', () => {
  it.each(['fc', 'ta', 'cya', 'ch'])('does not claim an increase at or above the %s target', goal => {
    const keys = { fc: ['fcNow', 'fcTarget'], ta: ['taNow', 'taTarget'], cya: ['cyaNow', 'cyaTarget'], ch: ['chNow', 'chTarget'] }[goal]!;
    const v = { ...defaultValues(pool), goal, [keys[1]]: 40 };
    for (const current of [40, 50]) {
      const result = pool.compute({ ...v, [keys[0]]: current });
      expect(result.value).toBe('0');
      expect(result.sub).not.toContain('Raises');
      expect(result.figure).toContain(current === 40 ? 'Target reached' : 'Above target');
    }
  });
  it('keeps a conduit overload readable and caps the bar', () => {
    const result = conduit.compute({ ...defaultValues(conduit), count1: 1000 });
    expect(result.figure).toContain('Over fill limit');
    expect(result.figure).toContain('width:100%');
    expect(result.figure).toContain('bar capped');
  });
  it('updates voltage drop status when distance changes', () => {
    const v = defaultValues(voltage);
    expect(voltage.compute(v).figure).toContain('Above the 3%');
    expect(voltage.compute({ ...v, distance: { value: 1, unit: 'ft' } }).figure).toContain('Within the 3%');
  });
});
