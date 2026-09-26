// 计算器注册表：分类、页面地址、上线状态都在这里维护。
// status: live = 已上线（会被链接和收录）；planned = 规划中（只显示名字，不链接）

export interface Category {
  slug: string;
  name: string;
  description: string;
}

export interface CalculatorEntry {
  slug: string; // 页面地址，如 concrete-calculator
  name: string;
  category: string;
  summary: string;
  status: 'live' | 'planned';
  /** 相关计算器（页面底部互链），只会链接到已上线的 */
  related?: string[];
  /** 搜索关键词、同义词与材料别名，用于智能模糊匹配 */
  keywords?: string[];
}

export const CATEGORIES: Category[] = [
  {
    slug: 'concrete-masonry',
    name: 'Concrete & Masonry',
    description: 'Concrete, rebar, brick, block, and paver quantities for slabs, footings, walls, and walkways.',
  },
  {
    slug: 'landscaping',
    name: 'Landscaping & Yard',
    description: 'Gravel, mulch, topsoil, sand, sod, and grass seed for beds, paths, and lawns.',
  },
  {
    slug: 'decks-fences-framing',
    name: 'Decks, Fences & Framing',
    description: 'Decking, fence posts and pickets, stairs, rafters, and lumber estimates.',
  },
  {
    slug: 'flooring-walls',
    name: 'Flooring & Walls',
    description: 'Square footage, flooring, carpet, tile, drywall, and wallpaper.',
  },
  {
    slug: 'roofing-siding',
    name: 'Roofing & Siding',
    description: 'Shingles, roofing squares, and siding for exterior projects.',
  },
  {
    slug: 'electrical-hvac',
    name: 'Electrical & HVAC',
    description: 'Wire size, voltage drop, conduit fill, BTU sizing, and insulation.',
  },
  {
    slug: 'pool',
    name: 'Pool',
    description: 'Pool volume, chemical doses, and salt for saltwater pools.',
  },
];

export const CALCULATORS: CalculatorEntry[] = [
  { slug: 'concrete-calculator', name: 'Concrete Calculator', category: 'concrete-masonry', status: 'live', summary: 'Cubic yards and bags for slabs, footings, columns, and stairs.', related: ['gravel-calculator', 'rebar-calculator', 'fence-calculator', 'deck-calculator', 'sand-calculator'], keywords: ['cement', 'ready mix', 'slab', 'footing', 'quikrete', 'pour', 'yardage', 'post hole', 'patio', 'driveway'] },
  { slug: 'rebar-calculator', name: 'Rebar Calculator', category: 'concrete-masonry', status: 'live', summary: 'Rebar length and bar count for a slab grid.', related: ['concrete-calculator', 'gravel-calculator'], keywords: ['reinforcing steel', 'grid', 'slab', 'mesh', 'concrete reinforcement', 're-bar', 'bar count'] },
  { slug: 'brick-calculator', name: 'Brick Calculator', category: 'concrete-masonry', status: 'live', summary: 'Bricks and mortar for a wall.', related: ['concrete-calculator', 'paver-calculator'], keywords: ['masonry', 'mortar', 'brick wall', 'cinder block', 'masonry block', 'brickwork'] },
  { slug: 'paver-calculator', name: 'Paver Calculator', category: 'concrete-masonry', status: 'live', summary: 'Pavers, base gravel, and sand for a patio.', related: ['gravel-calculator', 'sand-calculator', 'concrete-calculator'], keywords: ['patio', 'walkway', 'cobblestone', 'paving', 'driveway', 'stepping stones', 'paver base'] },
  { slug: 'gravel-calculator', name: 'Gravel Calculator', category: 'landscaping', status: 'live', summary: 'Cubic yards and tons of gravel.', related: ['landscape-rock-calculator', 'sand-calculator', 'topsoil-calculator', 'concrete-calculator', 'paver-calculator'], keywords: ['crushed stone', 'pea gravel', 'aggregate', 'driveway gravel', 'drainage rock', 'base gravel'] },
  { slug: 'cubic-yard-calculator', name: 'Cubic Yard Calculator', category: 'landscaping', status: 'live', summary: 'Cubic yards and tons of dirt, gravel, sand, mulch, or concrete.', related: ['gravel-calculator', 'topsoil-calculator', 'mulch-calculator', 'concrete-calculator', 'sand-calculator'], keywords: ['cu yd', 'cubic yards', 'volume', 'bulk materials', 'dirt volume', 'gravel volume', 'truckload'] },
  { slug: 'landscape-rock-calculator', name: 'Landscape Rock Calculator', category: 'landscaping', status: 'live', summary: 'Yards, tons, and bags of river rock, lava rock, and other decorative stone.', related: ['gravel-calculator', 'cubic-yard-calculator', 'mulch-calculator'], keywords: ['river rock', 'decorative stone', 'boulders', 'lava rock', 'drain rock', 'pebbles', 'rip rap'] },
  { slug: 'mulch-calculator', name: 'Mulch Calculator', category: 'landscaping', status: 'live', summary: 'Cubic yards and bags of mulch.', related: ['topsoil-calculator', 'gravel-calculator', 'square-footage-calculator'], keywords: ['wood chips', 'bark', 'flower bed', 'garden mulch', 'cypress mulch', 'cedar mulch'] },
  { slug: 'topsoil-calculator', name: 'Topsoil Calculator', category: 'landscaping', status: 'live', summary: 'Topsoil for beds and lawns.', related: ['sod-calculator', 'mulch-calculator', 'grass-seed-calculator', 'sand-calculator'], keywords: ['dirt', 'loam', 'garden bed', 'raised bed', 'planting soil', 'lawn soil', 'fill dirt'] },
  { slug: 'sand-calculator', name: 'Sand Calculator', category: 'landscaping', status: 'live', summary: 'Cubic yards and tons of sand.', related: ['gravel-calculator', 'paver-calculator', 'concrete-calculator', 'salt-pool-calculator'], keywords: ['play sand', 'masonry sand', 'paver base', 'sandbox', 'leveling sand', 'torpedo sand'] },
  { slug: 'sod-calculator', name: 'Sod Calculator', category: 'landscaping', status: 'live', summary: 'Sod rolls and pallets.', related: ['topsoil-calculator', 'grass-seed-calculator', 'square-footage-calculator'], keywords: ['turf', 'lawn rolls', 'grass sod', 'instant lawn', 'sod pallets', 'bermuda sod', 'st augustine'] },
  { slug: 'grass-seed-calculator', name: 'Grass Seed Calculator', category: 'landscaping', status: 'live', summary: 'Pounds of seed by grass type.', related: ['topsoil-calculator', 'sod-calculator', 'square-footage-calculator'], keywords: ['overseeding', 'lawn seed', 'turfgrass', 'fescue', 'bermuda', 'kentucky bluegrass', 'ryegrass'] },
  { slug: 'deck-calculator', name: 'Deck Calculator', category: 'decks-fences-framing', status: 'live', summary: 'Deck boards, joists, and fasteners.', related: ['concrete-calculator', 'stair-calculator', 'fence-calculator', 'board-foot-calculator'], keywords: ['decking', 'patio deck', 'composite deck', 'treated lumber', 'joists', 'framing', 'deck boards', 'trex'] },
  { slug: 'fence-calculator', name: 'Fence Calculator', category: 'decks-fences-framing', status: 'live', summary: 'Posts, rails, and pickets.', related: ['concrete-calculator', 'deck-calculator', 'gravel-calculator'], keywords: ['pickets', 'posts', 'privacy fence', 'rails', 'wood fence', 'chain link', 'fence gate'] },
  { slug: 'stair-calculator', name: 'Stair Calculator', category: 'decks-fences-framing', status: 'live', summary: 'Risers, treads, and stringer length to code.', related: ['deck-calculator', 'rafter-calculator', 'board-foot-calculator'], keywords: ['steps', 'risers', 'treads', 'stringer', 'staircase', 'rise and run', 'step height'] },
  { slug: 'rafter-calculator', name: 'Rafter Calculator', category: 'decks-fences-framing', status: 'live', summary: 'Rafter length from span and pitch.', related: ['shingle-calculator', 'stair-calculator', 'board-foot-calculator'], keywords: ['roof framing', 'truss', 'ridge board', 'pitch', 'slope', 'roof rafters', 'rafter span'] },
  { slug: 'board-foot-calculator', name: 'Board Foot Calculator', category: 'decks-fences-framing', status: 'live', summary: 'Board feet of lumber.', related: ['deck-calculator', 'rafter-calculator', 'stair-calculator'], keywords: ['lumber', 'hardwood', 'timber', '2x4', 'dimensional lumber', 'wood volume', 'bf', 'mbf'] },
  { slug: 'square-footage-calculator', name: 'Square Footage Calculator', category: 'flooring-walls', status: 'live', summary: 'Area of rooms and irregular shapes.', related: ['flooring-calculator', 'sod-calculator', 'concrete-calculator', 'mulch-calculator'], keywords: ['sq ft', 'sqft', 'square feet', 'area', 'room size', 'flooring area', 'wall area'] },
  { slug: 'flooring-calculator', name: 'Flooring Calculator', category: 'flooring-walls', status: 'live', summary: 'Flooring boxes with waste.', related: ['square-footage-calculator', 'carpet-calculator', 'tile-calculator'], keywords: ['hardwood', 'laminate', 'vinyl plank', 'lvp', 'engineered wood', 'floors', 'subfloor'] },
  { slug: 'carpet-calculator', name: 'Carpet Calculator', category: 'flooring-walls', status: 'live', summary: 'Carpet by roll width.', related: ['flooring-calculator', 'square-footage-calculator', 'tile-calculator'], keywords: ['rug', 'carpeting', 'underlayment', 'carpet pad', 'broadloom', 'carpet roll'] },
  { slug: 'tile-calculator', name: 'Tile Calculator', category: 'flooring-walls', status: 'live', summary: 'Tiles and boxes by tile size and grout joint.', related: ['flooring-calculator', 'square-footage-calculator', 'carpet-calculator'], keywords: ['ceramic', 'porcelain', 'backsplash', 'grout', 'subway tile', 'thinset', 'bathroom tile'] },
  { slug: 'drywall-calculator', name: 'Drywall Calculator', category: 'flooring-walls', status: 'live', summary: 'Drywall sheets and screws for walls and ceilings.', related: ['wallpaper-calculator', 'square-footage-calculator', 'insulation-calculator'], keywords: ['sheetrock', 'gypsum board', 'wallboard', 'plasterboard', 'drywall mud', 'drywall screws'] },
  { slug: 'wallpaper-calculator', name: 'Wallpaper Calculator', category: 'flooring-walls', status: 'live', summary: 'Wallpaper rolls with pattern repeat.', related: ['drywall-calculator', 'square-footage-calculator'], keywords: ['wallcovering', 'wallpaper rolls', 'accent wall', 'pattern repeat', 'peel and stick'] },
  { slug: 'shingle-calculator', name: 'Shingle Calculator', category: 'roofing-siding', status: 'live', summary: 'Roofing squares and bundles.', related: ['siding-calculator', 'rafter-calculator'], keywords: ['roofing', 'asphalt shingles', 'roof squares', 'underlayment', 'ridge cap', 'roof bundles'] },
  { slug: 'siding-calculator', name: 'Siding Calculator', category: 'roofing-siding', status: 'live', summary: 'Siding squares minus openings.', related: ['shingle-calculator', 'square-footage-calculator'], keywords: ['vinyl siding', 'clapboard', 'exterior walls', 'hardie board', 'facade', 'siding squares'] },
  { slug: 'wire-size-calculator', name: 'Wire Size Calculator', category: 'electrical-hvac', status: 'live', summary: 'Wire gauge by load and distance.', related: ['voltage-drop-calculator', 'conduit-fill-calculator'], keywords: ['awg', 'wire gauge', 'electrical wire', 'ampacity', 'copper wire', 'circuit breaker', 'romex'] },
  { slug: 'voltage-drop-calculator', name: 'Voltage Drop Calculator', category: 'electrical-hvac', status: 'live', summary: 'Voltage drop over a circuit run.', related: ['wire-size-calculator', 'conduit-fill-calculator'], keywords: ['resistance', 'wire run', 'electrical distance', 'voltage loss', 'line drop', 'circuit distance'] },
  { slug: 'conduit-fill-calculator', name: 'Conduit Fill Calculator', category: 'electrical-hvac', status: 'live', summary: 'Conduit fill percentage.', related: ['wire-size-calculator', 'voltage-drop-calculator'], keywords: ['emt', 'pvc conduit', 'electrical tubing', 'wire pull', 'pipe fill', 'raceway'] },
  { slug: 'btu-calculator', name: 'BTU Calculator', category: 'electrical-hvac', status: 'live', summary: 'Heating and cooling BTUs for a room.', related: ['insulation-calculator', 'square-footage-calculator'], keywords: ['air conditioning', 'ac sizing', 'heater', 'hvac', 'cooling load', 'heating load', 'furnace', 'heat pump', 'tonnage'] },
  { slug: 'insulation-calculator', name: 'Insulation Calculator', category: 'electrical-hvac', status: 'live', summary: 'Insulation by R-value and area.', related: ['btu-calculator', 'drywall-calculator'], keywords: ['r-value', 'fiberglass batts', 'blown-in', 'attic insulation', 'wall insulation', 'mineral wool', 'foam board'] },
  { slug: 'pool-calculator', name: 'Pool Chemical Calculator', category: 'pool', status: 'live', summary: 'Chlorine, shock, alkalinity, stabilizer, and calcium doses.', related: ['pool-volume-calculator', 'salt-pool-calculator'], keywords: ['chlorine', 'pool shock', 'alkalinity', 'stabilizer', 'cyanuric acid', 'calcium hardness', 'pool chemicals', 'ph balance'] },
  { slug: 'pool-volume-calculator', name: 'Pool Volume Calculator', category: 'pool', status: 'live', summary: 'Gallons, liters, and fill time for any pool.', related: ['pool-calculator', 'salt-pool-calculator', 'sand-calculator'], keywords: ['pool gallons', 'swimming pool', 'cubic feet', 'water volume', 'liters', 'inground pool', 'above ground pool'] },
  { slug: 'salt-pool-calculator', name: 'Salt Pool Calculator', category: 'pool', status: 'live', summary: 'Pounds and bags of salt for a saltwater pool.', related: ['pool-volume-calculator', 'pool-calculator', 'sand-calculator'], keywords: ['saltwater pool', 'salinity', 'salt generator', 'pool salt bags', 'chlorine generator', 'ppm salt'] },
];

export const live = () => CALCULATORS.filter((c) => c.status === 'live');
export const byCategory = (slug: string) => CALCULATORS.filter((c) => c.category === slug);
export const categoryOf = (calcSlug: string) => {
  const c = CALCULATORS.find((x) => x.slug === calcSlug);
  return CATEGORIES.find((x) => x.slug === c?.category);
};
// 至少有一个已上线计算器的分类才生成分类页，避免空页面被收录
export const liveCategories = () => CATEGORIES.filter((cat) => byCategory(cat.slug).some((c) => c.status === 'live'));
