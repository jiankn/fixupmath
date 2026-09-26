import fs from 'node:fs';
const file='src/pages/index.astro';
let s=fs.readFileSync(file,'utf8');
s=s.replace("const icons: Record<string, string>", "const materials = [{ image: 'concrete', summary: 'Slabs, footings, walls' }, { image: 'gravel', summary: 'Driveways, paths, base' }, { image: 'flooring', summary: 'Tile, hardwood, laminate' }, { image: 'deck', summary: 'Posts, beams, boards' }];\nconst icons: Record<string, string>");
const start=s.indexOf('        {featured.map');
const end=s.indexOf('\n',start);
s=s.slice(0,start)+`        {featured.map((c, i) => <a class="featured-tool" href={\`/\${c.slug}/\`}><img class="material-image" src={\`/images/home/\${materials[i].image}.webp\`} width="320" height="320" alt="" loading="lazy" decoding="async" /><div class="material-copy"><h3>{c.name.replace(' Calculator', '')}</h3><p>{materials[i].summary}</p><span class="tool-open"><span class="visually-hidden">Start calculating</span><Icon name="arrow" size={22} /></span></div></a>)}`+s.slice(end);
s=s.replace('</style>',`
/* Photographic scene and material samples share a compact editorial layout. */
.hero-inner{padding-top:28px}
.hero-label{margin-bottom:12px}
.hero-copy h1{font-size:clamp(2.75rem,4.7vw,4rem);margin-bottom:14px}
.hero-description{margin-bottom:18px}
.hero-panorama{margin-top:20px}
.featured-section{padding:20px 0 36px}
.featured-section .section-heading{margin-bottom:12px}
.featured-section .section-heading h2{font-size:1rem;margin:0}
.featured-section .section-heading p{display:none}
.featured-tools{gap:12px}
.featured-tool{display:grid;grid-template-columns:42% minmax(0,1fr);align-items:center;gap:10px;padding:12px;min-height:134px;background:transparent}
.material-image{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain}
.featured-tool h3{font-size:1.15rem;margin:0 0 5px}
.featured-tool p{font-size:.8125rem;line-height:1.4;margin:0 0 8px}
.tool-open{margin:0}
@media(max-width:1050px){.featured-tools{grid-template-columns:repeat(2,minmax(0,1fr))}.featured-tool{grid-template-columns:110px minmax(0,1fr)}}
@media(max-width:700px){.hero-inner{padding-top:24px}.hero-panorama{margin-top:20px}.featured-tool{grid-template-columns:minmax(0,1fr);gap:2px;padding:12px;align-content:start}.material-image{height:110px}.featured-tool h3{font-size:1rem}.featured-section .section-heading{flex-direction:row;align-items:center}.featured-section .section-heading>.text-link{font-size:.75rem}.search-meta{font-size:.75rem}}
</style>`);
fs.writeFileSync(file,s);
