import sharp from 'sharp';
import fs from 'node:fs/promises';
const root='C:/Users/jiank/.codex/generated_images/01a0dbdf-0cdc-77d3-8dd3-ff8389a189bf/';
const paths={hero:'exec-b4831593-9315-4414-8eca-969d6a132da3.png',concrete:'exec-cef8f2ef-8a9c-4d4a-95e4-7bc0faeca323.png',gravel:'exec-76448105-c953-4400-be52-be91bc0ddb7e.png',flooring:'exec-c2aaec12-bb6a-4372-89bc-7a8e9a5829c9.png',deck:'exec-9c6b2ada-511e-49c7-a06c-f42f6f166eb4.png'};
await fs.mkdir('public/images/home',{recursive:true});
for(const [name,file] of Object.entries(paths)){
 console.log(name,await sharp(root+file).metadata());
 if(name==='hero'){
 for(const width of [800,1600]){
 await sharp(root+file).resize({width}).webp({quality:82}).toFile('public/images/home/hero-'+width+'.webp');
 await sharp(root+file).resize({width}).avif({quality:55}).toFile('public/images/home/hero-'+width+'.avif');
 }
 }else await sharp(root+file).resize(320,320).webp({quality:85}).toFile('public/images/home/'+name+'.webp');
}
