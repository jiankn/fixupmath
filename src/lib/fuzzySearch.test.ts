import { describe, it, expect } from 'vitest';
import { fuzzySearch, levenshtein, stem, highlightMatches } from './fuzzySearch';
import { live, categoryOf } from '../data/calculators';

describe('fuzzySearch engine', () => {
  const tools = live().map(t => ({
    ...t,
    categoryName: categoryOf(t.slug)?.name,
  }));

  it('calculates correct levenshtein distance', () => {
    expect(levenshtein('concrete', 'concerte')).toBe(2);
    expect(levenshtein('drywall', 'drywal')).toBe(1);
    expect(levenshtein('paver', 'paver')).toBe(0);
    expect(levenshtein('', 'deck')).toBe(4);
  });

  it('stems common English plurals and verbs', () => {
    expect(stem('pavers')).toBe('paver');
    expect(stem('decking')).toBe('deck');
    expect(stem('boxes')).toBe('box');
    expect(stem('calculators')).toBe('calculator');
  });

  it('handles exact title matches with top ranking', () => {
    const results = fuzzySearch('concrete', tools);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.slug).toBe('concrete-calculator');
  });

  it('handles common typos (e.g. concerte, drywal)', () => {
    const typoConcrete = fuzzySearch('concerte', tools);
    expect(typoConcrete.length).toBeGreaterThan(0);
    expect(typoConcrete[0].item.slug).toBe('concrete-calculator');

    const typoDrywall = fuzzySearch('drywal', tools);
    expect(typoDrywall.length).toBeGreaterThan(0);
    expect(typoDrywall[0].item.slug).toBe('drywall-calculator');

    const typoTile = fuzzySearch('tle', tools);
    expect(typoTile.some(r => r.item.slug === 'tile-calculator')).toBe(true);
  });

  it('handles synonyms and colloquial material terms via keywords', () => {
    // cement -> concrete
    const cement = fuzzySearch('cement', tools);
    expect(cement.length).toBeGreaterThan(0);
    expect(cement[0].item.slug).toBe('concrete-calculator');
    expect(cement[0].matchedKeyword).toBe('cement');

    // sheetrock -> drywall
    const sheetrock = fuzzySearch('sheetrock', tools);
    expect(sheetrock.length).toBeGreaterThan(0);
    expect(sheetrock[0].item.slug).toBe('drywall-calculator');

    // turf -> sod
    const turf = fuzzySearch('turf', tools);
    expect(turf.length).toBeGreaterThan(0);
    expect(turf.some(r => r.item.slug === 'sod-calculator')).toBe(true);

    // 2x4 -> board foot
    const lumber = fuzzySearch('2x4', tools);
    expect(lumber.length).toBeGreaterThan(0);
    expect(lumber[0].item.slug).toBe('board-foot-calculator');

    // sqft -> square footage
    const sqft = fuzzySearch('sqft', tools);
    expect(sqft.length).toBeGreaterThan(0);
    expect(sqft[0].item.slug).toBe('square-footage-calculator');
  });

  it('handles plural and suffix queries (e.g. pavers, decking)', () => {
    const pavers = fuzzySearch('pavers', tools);
    expect(pavers.length).toBeGreaterThan(0);
    expect(pavers[0].item.slug).toBe('paver-calculator');

    const decking = fuzzySearch('decking', tools);
    expect(decking.length).toBeGreaterThan(0);
    expect(decking[0].item.slug).toBe('deck-calculator');
  });

  it('handles multi-token queries', () => {
    const concreteSlab = fuzzySearch('concrete slab', tools);
    expect(concreteSlab.length).toBeGreaterThan(0);
    expect(concreteSlab[0].item.slug).toBe('concrete-calculator');
  });

  it('produces safe HTML highlighting for matches', () => {
    const highlighted = highlightMatches('Concrete Calculator', ['conc']);
    expect(highlighted).toContain('<mark>Conc</mark>rete');

    const safeEscaped = highlightMatches('<script>alert("xss")</script>', ['script']);
    expect(safeEscaped).not.toContain('<script>');
    expect(safeEscaped).toContain('&lt;<mark>script</mark>&gt;');
  });
});
