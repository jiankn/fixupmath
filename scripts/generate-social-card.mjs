// Code-native brand graphic; matches the site's palette and existing tagline.
// Regeneration is optional: the PNG is committed and needs no build-time tooling.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../public/images/brand/', import.meta.url);
const ticks = Array.from({ length: 16 }, (_, i) => {
  const x = 700 + i * 26;
  return `<path d="M${x} 478v${i % 5 === 0 ? 24 : 12}"/>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f6f2"/>
  <path d="M0 0h1200v12H0z" fill="#ad3e1c"/>
  <g font-family="Segoe UI,Arial,sans-serif" fill="#26332c">
    <text x="64" y="112" font-size="46" font-weight="750" letter-spacing="-2">FixUp<tspan fill="#ad3e1c">Math.</tspan></text>
    <text x="64" y="246" font-size="55" font-weight="700" letter-spacing="-2">Less guesswork.</text>
    <text x="64" y="318" font-size="55" font-weight="700" letter-spacing="-2">More getting</text>
    <text x="64" y="390" font-size="55" font-weight="700" letter-spacing="-2">it done.</text>
    <text x="66" y="453" font-size="22" fill="#5d685f">Free calculators for home, yard,</text>
    <text x="66" y="485" font-size="22" fill="#5d685f">and building projects.</text>
    <text x="66" y="574" font-size="20" font-weight="600">fixupmath.com</text>
  </g>
  <g transform="translate(710 156)" stroke="#26332c" stroke-width="3" stroke-linejoin="round">
    <path d="M0 119L152 35l205 104-153 87z" fill="#eee9dd"/>
    <path d="M0 119v126l204 104V226z" fill="#d8d4c8"/>
    <path d="M204 226l153-87v127l-153 83z" fill="#a8b4a8"/>
    <path d="M22 99l153-84M23 93l-1 14M175 7v15M374 144v123M367 144h14M367 267h14" fill="none" stroke="#ad3e1c" stroke-width="2"/>
    <g font-family="Segoe UI,Arial,sans-serif" font-size="20" fill="#ad3e1c" stroke="none">
      <text x="62" y="40">length</text><text x="375" y="216" transform="rotate(90 375 216)">depth</text>
    </g>
  </g>
  <g stroke="#ad3e1c" stroke-width="2">${ticks}<path d="M700 478h390"/></g>
  <path d="M64 526h1072" stroke="#d3d8cf"/>
  <text x="1136" y="574" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="17" fill="#5d685f">MEASURE · CALCULATE · PLAN</text>
</svg>`;

await mkdir(output, { recursive: true });
await writeFile(new URL('social-card.svg', output), svg);
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('social-card.png', output)));
console.log('Saved 1200 × 630 SVG and PNG brand cards.');
