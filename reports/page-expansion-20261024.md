# Eight focused calculator pages

User constraint: one page serves one search intent and has one primary keyword. Supporting tables, examples, units, and product choices must help complete that same task.

| Primary keyword | Route | Single user task | Boundary with existing pages |
| --- | --- | --- | --- |
| joist span calculator | /joist-span-calculator/ | Look up a residential deck joist's supported span and compare it with a proposed clear span. | Deck Calculator counts materials; this page looks up AWC deck span limits. |
| grout calculator | /grout-calculator/ | Estimate tile grout quantity and packages for an installation. | Tile Calculator counts tiles. MAPEI and LATICRETE are product options, not separate landing pages. |
| plywood calculator | /plywood-calculator/ | Estimate full sheets to cover an area, with waste and user-supplied prices. | Board Foot Calculator measures lumber volume. No separate thickness-chart intent is added here. |
| retaining wall calculator | /retaining-wall-calculator/ | Estimate straight segmental retaining-wall blocks, caps, base, and drainage aggregate. | Cinder Block Calculator estimates mortared CMU walls. This page does not design wall stability. |
| fertilizer calculator | /fertilizer-calculator/ | Convert an application rate or nitrogen target into the amount of fertilizer to apply and bags to buy. | Grass Seed Calculator estimates seed, not fertilizer. |
| rafter span chart | /rafter-span-chart/ | Read published Southern Pine rafter spans for the supported load cases. | Rafter Calculator gives sloped cutting length; this chart gives horizontal supported span. |
| epoxy calculator | /epoxy-calculator/ | Estimate mixed epoxy volume and split resin/hardener using a volume ratio. | No weight-based mixing or product recommendations without the needed product data. |
| countertop calculator | /countertop-calculator/ | Measure countertop surface area and estimate cost using a supplied square-foot price. | Epoxy Calculator estimates coating volume. No invented market prices or slab-nesting claim. |

## Implementation and acceptance

- Reuse the site's existing accessible forms, unit selectors, live results, print, and share-link behavior.
- Give each route a unique title starting with its primary keyword, an exact matching H1, a self-canonical, and static explanatory HTML.
- Register tools in the relevant existing category and add contextual links from closely related existing pages.
- Keep tabulated engineering/product data separate from geometric estimates. Record the source, edition, units, assumptions, and verification date (2026-10-24).
- Do not interpolate or extrapolate structural span tables. Unsupported combinations must return an unavailable state.
- Tests: independent hand calculations, published table spot checks, boundary and unit conversion cases; then existing suite, Astro check, production build, and browser checks of the built site at desktop/mobile sizes.
- Preserve the unrelated existing `reports/backlink-plan/` work.

## Primary references

- AWC DCA 6-15 (2018 PDF), Table 2: https://web-media.awc.org/wp-content/uploads/2022/02/17210514/AWC-DCA62015-DeckGuide-1804.pdf
- SFPA 2013, Tables 17 and 19: https://www.southernpine.com/resources/span-tables/joists-rafters/
- MAPEI Ultracolor Plus FA technical data: https://cdnmedia.mapei.com/docs/librariesprovider10/products-documents/1_3000144_ultracolor-plus-fa_en-us_3884d11a557d4684aeb2348441183365.pdf
- LATICRETE grout coverage card DS254.3-1123 (2023): https://www.laticrete.com/-/media/project/laticrete-international/north-america/product-documents/marketing-information/catalogs-and-brochures/ds2540524_color_card_grout_caulks_sealants_profiles_trims.pdf
- Penn State fertilizer calculation method: https://extension.psu.edu/calculations-used-to-determine-the-amount-of-fertilizer-needed-to-treat-turf
- WSU fertilizer label calculation: https://extension.wsu.edu/pnw-gardeners-handbook/chapter-4-plant-mineral-nutrition-and-fertilizers/
- Allan Block material components: https://new.allanblock.com/installation/residential-installation/basic-installation
- TotalBoat mixing basis: https://support.totalboat.com/hc/en-us/articles/27800508684059-Mixing-Any-Epoxy-by-Weight-Explained

## Completed implementation

All eight routes are implemented locally with working calculators/lookups, static explanations and examples, unique keyword-led titles and H1s, source notes where needed, and contextual incoming links. The existing category directory, homepage search, and generated sitemap include them. No additional chart, brand, or price landing pages were created.

Published-data boundaries:

- Joist lookup: AWC DCA 6-15 Table 2; No. 2 deck joists; three species groups; 12/16/24 in spacing; 40 psf live + 10 psf dead; wet service; L/360. It does not check a complete deck design.
- Rafter chart: SFPA 2013 Tables 17/19; Southern Pine No. 2; dry service; 20 or 40 psf roof live/snow + 10 psf dead; L/240; snow load-duration factor 1.15. It does not infer a load from a location.
- Grout presets: MAPEI Ultracolor Plus FA 10 lb and 25 lb, and LATICRETE PERMACOLOR Grout 25 lb, with exact shared published tile profiles. Other rectangular tile sizes use the custom geometry mode and a user-supplied mixed yield. PERMACOLOR Select data is not substituted.

## Verification results

- `npm test`: 16 files / 225 tests passed, including 35 new formula, source-data, configuration, conversion, and boundary tests.
- `npm run check`: 0 errors, 0 warnings, 5 existing hints.
- `npm run build`: successful static production build, including all eight new routes.
- Built HTML: one exact primary-keyword H1 per page; unique title/description; self-canonical; sitemap entry; no noindex; valid JSON-LD; no duplicate IDs; local links and anchors resolve. Titles are 56–60 characters including the brand.
- Browser: all eight defaults initialize; each full primary-keyword search returns its intended route first; a search-result link opens the target.
- Browser interactions: joist boundary and share URL; rafter load switch; grout product/package and custom geometry; metric plywood and project sum; wall length and partial prices; fertilizer zero-N and metric rates; epoxy volume ratios and invalid inputs; countertop L/U geometry, cutouts, price, project sum, and share URL.
- Mobile at 375 px: all eight pages fit the viewport; active inputs stay in bounds. Both span charts show all four columns without horizontal scrolling. Light/dark result display inspected.
- `git diff --check`: passed. Existing unrelated backlink-plan files preserved.

Local verification preview: http://127.0.0.1:4322/

Publication requested on 2026-10-25: commit and push these pages to `main`, then deploy through the repository's existing GitHub Actions `Deploy` workflow. Live deployment status is tracked in the repository's Actions history.
