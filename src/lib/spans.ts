// Published span lookups, in whole inches. Never interpolate structural tables.
// Verified against the source PDFs on 2026-10-24.
export const DECK_SOURCE = 'https://web-media.awc.org/wp-content/uploads/2022/02/17210514/AWC-DCA62015-DeckGuide-1804.pdf';
export const RAFTER_SOURCES = {
  '20': 'https://www.southernpine.com/wp-content/uploads/2023/11/SPtable17_060113.pdf',
  '40': 'https://www.southernpine.com/wp-content/uploads/2023/11/SPtable19_060113.pdf',
};
export const SPACINGS = [12, 16, 24] as const;
export const MEMBER_SIZES = ['2x6', '2x8', '2x10', '2x12'] as const;
export type MemberSize = typeof MEMBER_SIZES[number];
type SpanRows = Record<MemberSize, readonly [number, number, number]>;

// AWC DCA 6-15 Table 2, allowable clear span LJ only (not overhang LO).
// No. 2, wet service, 40 psf live + 10 psf dead, L/360.
export const DECK_SPECIES: { value: string; label: string; spans: SpanRows }[] = [
  { value: 'southern-pine', label: 'Southern Pine', spans: {
    '2x6': [119, 108, 91], '2x8': [157, 142, 116],
    '2x10': [194, 168, 137], '2x12': [216, 198, 162],
  } },
  { value: 'df-hf-spf', label: 'Douglas Fir-Larch / Hem-Fir / Spruce-Pine-Fir (incised)', spans: {
    '2x6': [114, 100, 82], '2x8': [150, 133, 109],
    '2x10': [188, 163, 133], '2x12': [216, 189, 154],
  } },
  { value: 'cedar-redwood', label: 'Redwood / Western Cedars / Ponderosa Pine / Red Pine', spans: {
    '2x6': [106, 96, 82], '2x8': [140, 127, 104],
    '2x10': [179, 156, 127], '2x12': [209, 181, 148],
  } },
];

// SFPA 2013 Tables 17 and 19, Southern Pine No. 2 only.
// Snow load duration CD=1.15, 10 psf dead, L/240, dry service.
// 26 ft in Table 17 is capped by stock availability, not an extrapolated span.
export const RAFTER_SPANS: Record<string, SpanRows> = {
  '20': { '2x6': [177, 155, 127], '2x8': [227, 196, 160], '2x10': [269, 233, 190], '2x12': [312, 274, 224] },
  '40': { '2x6': [139, 120, 98], '2x8': [176, 152, 124], '2x10': [208, 181, 147], '2x12': [245, 213, 174] },
};

function lookup(rows: SpanRows | undefined, size: string, spacing: number): number | undefined {
  const col = SPACINGS.findIndex(s => s === spacing);
  if (!rows || !MEMBER_SIZES.includes(size as MemberSize) || col < 0) return undefined;
  return rows[size as MemberSize][col];
}
export const deckSpanIn = (species: string, size: string, spacing: number) =>
  lookup(DECK_SPECIES.find(s => s.value === species)?.spans, size, spacing);
export const rafterSpanIn = (load: string, size: string, spacing: number) => lookup(RAFTER_SPANS[load], size, spacing);
export function spanText(inches: number): string {
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
}
export function spanFits(requestedIn: number, limitIn: number): boolean {
  return Number.isFinite(requestedIn) && requestedIn > 0 && requestedIn <= limitIn + 1e-8;
}
