import fs from 'node:fs';
let p='src/components/concrete/ShapeDiagram.astro',s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
s=s.replace("import type { ShapeId }","import Measurement from '../calc/Measurement.astro';\nimport '../../styles/measurement.css';\nimport type { ShapeId }");
const dims={
slab:[['length','Length',138,171,65,130,210,152],['width','Width',287,135,225,145,305,89],['thickness','Thickness',42,70,48,93,48,111]],
footing:[['length','Length',127,138,50,131,200,91],['width','Width',40,62,20,70,50,78],['depth','Depth',244,70,212,48,212,82]],
column:[['diameter','Diameter',130,12,100,20,160,20],['height','Height',210,80,177,30,177,120]],
circle:[['diameter','Diameter',130,62,40,70,220,70],['thickness','Thickness',275,124,235,70,235,88]],
tube:[['outerDiameter','Outer diameter',130,7,90,17,170,17],['innerDiameter','Inner diameter',130,65,106,34,154,34],['height','Height',224,84,185,34,185,118]],
stairs:[['run','Tread depth',56,64,30,82,70,82],['rise','Step rise',3,99,20,96,20,120],['landing','Landing',144,13,110,28,170,28],['width','Stair width',240,45,177,35,197,25]]
};
s=s.replace('---\n\n<svg','const dimensions = '+JSON.stringify(dims)+' as Record<string, [string,string,number,number,number,number,number,number][]>;\n---\n\n<svg');
s=s.replace('class="diagram"','class="diagram measurement-diagram"').replace("'0 0 360 190' : '0 0 300 150'","'-20 -10 380 200' : '-35 -10 380 180'");
s=s.replace(/<text[\s\S]*?<\/text>/g,'').replace(/<g fill="none"[\s\S]*?<\/g>/,'');
s=s.replace('</svg>',`{dimensions[shape].map(([field,label,x,y,x1,y1,x2,y2]) => <Measurement field={field} label={label} x={x} y={y} x1={x1} y1={y1} x2={x2} y2={y2} />)}
</svg>
<p class="measurement-caption">Not to scale · Dimensions show where to measure.</p>
<script>import '../calc/measurement-client';</script>`);
s=s.slice(0,s.indexOf('<style>'));fs.writeFileSync(p,s);
