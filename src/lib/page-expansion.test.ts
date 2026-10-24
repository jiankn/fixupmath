import { describe, expect, it } from 'vitest';
import { deckSpanIn, rafterSpanIn, spanFits, spanText } from './spans';
import { plywoodSheets } from './plywood';
import { groutBags, groutCoverage, groutJointVolume } from './grout';
import { retainingWall, type RetainingWallInput } from './retaining-wall';
import { applicationPounds, fertilizerAmount, LB_PER_KG } from './fertilizer';
import { epoxyVolume, LITERS_PER_GALLON } from './epoxy';
import { countertopArea } from './countertop';

describe('published span data and boundaries', () => {
  it('matches AWC DCA 6-15 Table 2 across species and spacings', () => {
    expect(deckSpanIn('southern-pine', '2x10', 16)).toBe(14 * 12);
    expect(deckSpanIn('df-hf-spf', '2x8', 24)).toBe(9 * 12 + 1);
    expect(deckSpanIn('cedar-redwood', '2x12', 12)).toBe(17 * 12 + 5);
  });
  it('matches SFPA No. 2 column, rather than the neighboring No. 1 column', () => {
    expect(rafterSpanIn('20', '2x8', 16)).toBe(16 * 12 + 4);
    expect(rafterSpanIn('40', '2x10', 16)).toBe(15 * 12 + 1);
    expect(rafterSpanIn('20', '2x12', 12)).toBe(26 * 12);
  });
  it('does not interpolate unsupported lumber, loads, or spacing', () => {
    expect(deckSpanIn('unknown', '2x8', 16)).toBeUndefined();
    expect(deckSpanIn('southern-pine', '2x4', 16)).toBeUndefined();
    expect(rafterSpanIn('30', '2x8', 16)).toBeUndefined();
    expect(rafterSpanIn('20', '2x8', 18)).toBeUndefined();
  });
  it('compares before display rounding, allowing the exact boundary only', () => {
    expect(spanFits(168, 168)).toBe(true);
    expect(spanFits(168.01, 168)).toBe(false);
    expect(spanFits(0, 168)).toBe(false);
    expect(spanText(181)).toBe('15 ft 1 in');
  });
});

describe('plywood area estimate', () => {
  it('500 ft² plus 10% is 550 ft²: 18 full 4×8 sheets', () => {
    expect(plywoodSheets(500, 8, 4, 10)).toEqual({ area: 500, sheetArea: 32, orderArea: 550, sheets: 18, purchasedArea: 576, surplus: 76 });
  });
  it('does not add a sheet for floating point noise at a whole sheet', () => {
    expect(plywoodSheets(64, 8, 4, 0).sheets).toBe(2);
    expect(plywoodSheets(0, 8, 4, 10).sheets).toBe(0);
    expect(plywoodSheets(100, 0, 4, 10).sheets).toBe(0);
  });
});

describe('product-specific tile grout', () => {
  it('preserves the distinct 10 lb and 25 lb published MAPEI charts', () => {
    expect(groutCoverage('mapei-25', '12x24', '1/8')).toBe(518);
    expect(groutCoverage('mapei-10', '12x24', '1/8')).toBe(207);
    expect(groutCoverage('laticrete-25', '12x24', '1/8')).toBe(536);
    expect(groutCoverage('laticrete-25', '1x1', '1/4')).toBe(29);
  });
  it('518 ft² exactly consumes a published 25 lb bag, then waste adds a bag', () => {
    expect(groutBags(518, 518, 25, 0).bags).toBe(1);
    const r = groutBags(518, 518, 25, 10);
    expect(r.bags).toBe(2);
    expect(r.pounds).toBeCloseTo(27.5);
    expect(groutCoverage('mapei-25', 'unsupported', '1/8')).toBeUndefined();
  });
  it('geometric volume subtracts tile area and counts intersections once', () => {
    // 1 in squares and 1 in joints: 3/4 of the module is joint.
    expect(groutJointVolume(100, 1, 1, 1, 0.25)).toBeCloseTo(1.5625);
    expect(groutJointVolume(100, 12, 12, 0, 0.25)).toBe(0);
    expect(groutBags(100, 0, 25, 10).valid).toBe(false);
  });
});

describe('straight segmental retaining wall', () => {
  const wall: RetainingWallInput = { lengthFt: 20, visibleHeightFt: 3, buriedDepthFt: 0.5,
    blockLengthIn: 12, blockHeightIn: 6, capLengthIn: 12, baseWidthFt: 2, baseDepthFt: 0.5,
    drainageWidthFt: 1, coreFillFt3: 0, wastePct: 5 };
  it('counts whole courses and waste, with separate base and drainage volumes', () => {
    const r = retainingWall(wall);
    expect(r.courses).toBe(7);
    expect(r.installed).toBe(140);
    expect(r.blocks).toBe(147);
    expect(r.caps).toBe(21);
    expect(r.baseFt3).toBe(20);
    expect(r.drainageFt3).toBe(70);
    expect(r.rockYd3).toBeCloseTo(90 / 27);
  });
  it('bases core fill on installed blocks, excluding waste stock', () => {
    expect(retainingWall({ ...wall, coreFillFt3: 0.1 }).coreFt3).toBe(14);
    expect(retainingWall({ ...wall, blockHeightIn: 0 }).blocks).toBe(0);
    expect(retainingWall({ ...wall, visibleHeightFt: 0 }).caps).toBe(0);
  });
});

describe('fertilizer application amounts', () => {
  it('5,000 ft² at 0.5 lb N/1,000 ft² using 20-0-10 needs 12.5 lb product', () => {
    const r = fertilizerAmount(5000, 0.5, 'lb-1000', 'nitrogen', 20, 0, 10, 40);
    expect(r.valid).toBe(true);
    expect(r.productLb).toBe(12.5);
    expect(r.nitrogenLb).toBe(2.5);
    expect(r.potashLb).toBe(1.25);
    expect(r.bags).toBe(1);
  });
  it('supports product-label rates with zero nitrogen and converts metric units', () => {
    expect(fertilizerAmount(5000, 4, 'lb-1000', 'product', 0, 10, 10, 40).productLb).toBe(20);
    expect(applicationPounds(100 / 0.09290304, 2, 'kg-100m2')).toBeCloseTo(2 * LB_PER_KG);
    expect(applicationPounds(43560, 50, 'lb-acre')).toBe(50);
  });
  it('rejects zero-nitrogen targets and invalid percentage labels', () => {
    expect(fertilizerAmount(1000, 1, 'lb-1000', 'nitrogen', 0, 0, 10, 40).valid).toBe(false);
    expect(fertilizerAmount(1000, 1, 'lb-1000', 'nitrogen', 101, 0, 0, 40).valid).toBe(false);
    expect(fertilizerAmount(1000, Infinity, 'lb-1000', 'nitrogen', 20, 0, 0, 40).valid).toBe(false);
  });
});

describe('mixed epoxy volume', () => {
  it('231 in³ is a US gallon; a 2:1 volume mix divides the total into thirds', () => {
    const r = epoxyVolume(231 / 144, 1, 0, 2, 1, 1);
    expect(r.totalGal).toBe(1);
    expect(r.liters).toBe(LITERS_PER_GALLON);
    expect(r.resinGal).toBeCloseTo(2 / 3);
    expect(r.hardenerGal).toBeCloseTo(1 / 3);
    expect(r.kits).toBe(1);
  });
  it('adds waste to both components without changing the mixing ratio', () => {
    const r = epoxyVolume(8, 0.125, 10, 1, 1, 0.5);
    expect(r.totalGal).toBeCloseTo(0.6857142857);
    expect(r.resinGal).toBeCloseTo(r.hardenerGal);
    expect(r.kits).toBe(2);
    expect(epoxyVolume(8, 0.125, 10, 1, 0, 1).valid).toBe(false);
  });
});

describe('countertop surface area', () => {
  it('subtracts a shared L corner once and both U corners twice', () => {
    expect(countertopArea('l', 8, 6, 0, 2, 3).netFt2).toBe(21);
    expect(countertopArea('u', 10, 6, 6, 2, 3).netFt2).toBe(33);
    expect(countertopArea('rectangle', 8, 0, 0, 2, 0).netFt2).toBe(16);
  });
  it('rejects overlapping U legs, impossible cutouts, and zero measurements', () => {
    expect(countertopArea('u', 3, 6, 6, 2, 0).valid).toBe(false);
    expect(countertopArea('rectangle', 8, 0, 0, 2, 17).valid).toBe(false);
    expect(countertopArea('l', 8, 0, 0, 2, 0).valid).toBe(false);
  });
});
