import {offlineCss} from './css-tools.mjs';
import {build} from 'esbuild';import{readFile,writeFile}from'node:fs/promises';
const result=await build({entryPoints:['src/main.tsx'],bundle:true,write:false,format:'iife',target:['es2022'],minify:true,outfile:'offline.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof',external:['/fonts/*']});
let js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;
let css=offlineCss(result.outputFiles.find(f=>f.path.endsWith('.css')).text);
for(const font of ['arcade-latin','arcade-korean','quest-hangul']){const uri='data:font/woff2;base64,'+(await readFile(`public/fonts/${font}.woff2`)).toString('base64');css=css.replaceAll(`/fonts/${font}.woff2`,uri);}
for(const track of ['menu','battle']){
 const uri='data:audio/mpeg;base64,'+(await readFile(`public/audio/${track}.mp3`)).toString('base64');
 js=js.replaceAll(`/audio/${track}.mp3`,uri);
}
js=js.replaceAll('/world/atlas.webp','data:image/webp;base64,'+(await readFile('public/world/atlas.webp')).toString('base64'));
const logo='data:image/png;base64,'+(await readFile('public/logo.png')).toString('base64');
js='const __CC_LOGO__='+JSON.stringify(logo)+';'+js.replaceAll('"/logo.png"','__CC_LOGO__').replaceAll("'/logo.png'",'__CC_LOGO__').replaceAll('</script','<\\/script');
await writeFile('PLAY.html',`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COLOR CLASH — Local Edition</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Built PLAY.html — bundled app, CSS and logo; local modes require no server.');
