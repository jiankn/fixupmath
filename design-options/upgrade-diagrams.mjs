import fs from 'node:fs';
const path='src/components/calc/Diagram.astro';
let s=fs.readFileSync(path,'utf8');
s=s.replace("const { name } = Astro.props as { name: string };","import Measurement from './Measurement.astro';\nimport '../../styles/measurement.css';\nconst { name } = Astro.props as { name: string };");
s=s.replace("const labels: Record<string, string> = {","const labels: Record<string, string> = {\n house: 'Wall elevation: rectangular wall and triangular gable, with separate width and height measurements. Doors and windows are deducted.',\n room: 'Room: length, width and floor-to-ceiling height. Openings are deducted where applicable.',\n roof: 'Roof cross section: building span between outside walls, horizontal overhang, and pitch as rise per 12 inches of horizontal run.',\n brick: 'Brick wall elevation with wall length and height.',");
const dims={
rect:[['length','Length',150,16,70,25,230,25],['width','Width',265,80,244,30,244,120]],
circle:[['diameter','Diameter',150,65,92,75,208,75]],
triangle:[['base','Base',150,149,70,135,230,135],['height','Height',216,77,170,25,170,125]],
deck:[['length','Length',150,16,40,25,260,25],['width','Width',290,80,270,30,270,120]],
fence:[['spacing','Post spacing',200,153,145,137,255,137],['height','Height',292,80,272,30,272,130]],
room:[['length','Length',160,154,100,141,240,141],['width','Width',64,25,60,32,100,62],['height','Height',288,105,253,70,253,135]],
roof:[['span','Building span',150,155,60,141,240,141],['overhang','Overhang',12,119,40,100,60,100],['pitch','Pitch: rise / 12',160,18,195,55,220,55]],
house:[['perimeter','Wall length*',145,154,40,140,250,140],['height','Wall height',288,111,258,78,258,132],['gableWidth','Gable width',145,70,40,78,250,78],['gableHeight','Gable height',145,8,145,20,145,78]],
brick:[['length','Wall length',150,16,40,24,256,24],['height','Height',290,83,268,30,268,129]],
'pool-rect':[['length','Length',150,18,40,27,260,27],['width','Width',292,57,270,40,270,70],['shallow','Shallow',48,118,30,70,30,90],['deep','Deep',231,146,273,70,273,120]],
'pool-round':[['diameter','Diameter',150,53,60,60,240,60],['depth','Water depth',275,145,253,60,253,110]],
'pool-oval':[['length','Length',150,18,30,26,270,26],['width','Width',150,58,150,36,150,84],['shallow','Shallow',38,145,20,60,20,106],['deep','Deep',264,145,280,60,280,106]]
};
s=s.replace('---\n\n<svg', '---\n\n<svg'); // CRLF handled below
s=s.replace(/\r\n/g,'\n');
s=s.replace('};\n---','};\nconst dimensions = '+JSON.stringify(dims)+' as Record<string, [string,string,number,number,number,number,number,number][]>;\n---');
s=s.replace('class="diagram" viewBox="0 0 300 150"','class="diagram measurement-diagram" viewBox="-35 -10 380 180"');
s=s.replace(/<text[\s\S]*?<\/text>/g,'');
s=s.replace('points="40,70 100,30 160,70"','points="40,78 145,20 250,78"');
s=s.replace('<rect x="40" y="70" width="120" height="65" class="siding" />','<rect x="40" y="78" width="210" height="54" class="siding" />');
s=s.replace('<polygon points="160,70 250,70 250,135 160,135" class="siding" />','');
s=s.replace('</svg>',`{dimensions[name]?.map(([field,label,x,y,x1,y1,x2,y2]) => <Measurement field={field} label={label} x={x} y={y} x1={x1} y1={y1} x2={x2} y2={y2} />)}
</svg>
<p class="measurement-caption">Not to scale{name === 'house' ? ' · *Add the lengths of all walls. Gable height starts at the eaves. Deduct door and window areas.' : name === 'roof' ? ' · Pitch uses a 12-inch reference run, not the full roof span. Overhang is measured horizontally.' : name === 'deck' ? ' · Boards run along the length; joists span the width.' : name === 'pool-oval' ? ' · Top view dimensions with shallow and deep water depths.' : ''}</p>
<script>import './measurement-client';</script>`);
s=s.slice(0,s.indexOf('<style>'));
fs.writeFileSync(path,s);
