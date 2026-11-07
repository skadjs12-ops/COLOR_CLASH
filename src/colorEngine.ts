import {Color,mix as spectralMix} from 'spectral.js';
export type Recipe=[number,number,number,number,number];
export const blank=():Recipe=>[0,0,0,0,0];
export const pigments=['#E53166','#FCD200','#3375DA','#FFFFFF','#181820'];
export const symbols=['●','▲','◆','○','■'];
export const names=['RED','YELLOW','BLUE','WHITE','BLACK'];
const paints=pigments.map(x=>new Color(x));
const cache=new Map<string,string>();
export const total=(r:Recipe)=>r.reduce((a,b)=>a+b,0);
export function validRecipe(r:unknown,max=6):r is Recipe{return Array.isArray(r)&&r.length===5&&r.every(x=>Number.isInteger(x)&&x>=0)&&total(r as Recipe)>0&&total(r as Recipe)<=max;}
export function mix(r:Recipe):string {
 const k=r.join(',');if(cache.has(k))return cache.get(k)!;
 const parts=paints.map((c,i)=>[c,r[i]] as [Color,number]).filter(x=>x[1]>0);
 const result=parts.length?spectralMix(...parts).toString():'#151a32';cache.set(k,result);return result;
}
export function lab(hex:string):number[]{
 const rgb=hex.replace('#','').match(/../g)!.slice(0,3).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const [r,g,b]=rgb;const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
export function distance(a:string,b:string){const x=lab(a),y=lab(b);return Math.hypot(...x.map((v,i)=>v-y[i]));}
export const similarity=(a:string,b:string)=>Math.max(0,Math.min(100,Math.round(100-distance(a,b)*250)));
export interface Target {id:string;color:string;recipe:Recipe;level:0|1|2;points:number;minDrops:number}
const candidates:Recipe[]=[];
function enumerate(r:Recipe,i:number,left:number){if(i===4){r[4]=left;candidates.push([...r]);return;}for(let n=0;n<=left;n++){r[i]=n;enumerate(r,i+1,left-n);}}
for(let n=1;n<=6;n++)enumerate(blank(),0,n);
export const allRecipes=candidates;
// Enumerate in increasing drop count; collapse perceptually near-identical colors.
export const pool:Target[]=[];
for(const r of candidates){const color=mix(r);if(pool.some(t=>distance(t.color,color)<.012))continue;
 const near=candidates.filter(q=>total(q)<total(r)&&distance(mix(q),color)<.02);
 const simplest=near.sort((a,b)=>total(a)-total(b)||a.filter(Boolean).length-b.filter(Boolean).length)[0]??r;
 const kinds=simplest.filter(Boolean).length, n=total(simplest);
 const level:0|1|2=kinds<=2&&n<=2?0:kinds<=3&&n<=4?1:2;
 pool.push({id:'',color,recipe:[...r],minDrops:n,level,points:[100,150,200][level]});
}
export function random(seed:number){let x=seed|0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
// Competition eligibility uses the actual 80-point claim threshold, not only exact recipes.
// A target close enough to any single pigment is excluded, even if its source recipe has 6 drops.
export function winningRecipes(t:Target,threshold=80):Recipe[]{return allRecipes.filter(r=>similarity(mix(r),t.color)>=threshold);}
export const competitionPool:Target[]=pool.filter(t=>
 t.recipe.filter(Boolean).length>=2 && pigments.every(c=>similarity(c,t.color)<80)
).map(t=>{
 const precise=winningRecipes(t,95).sort((a,b)=>total(a)-total(b)||a.filter(Boolean).length-b.filter(Boolean).length);
 const simplest=precise[0]??t.recipe;
 const drops=total(simplest),kinds=simplest.filter(Boolean).length;
 const level:0|1|2=drops<=2&&kinds===2?0:drops<=4&&kinds<=3?1:2;
 return {...t,level,points:[100,150,200][level],minDrops:drops};
});
export function target(seed:number,serial:number,others:Target[]=[],max=6):Target{
 const rng=random((seed+Math.imul(serial+1,2654435761))|0);const level=serial%3;
 const candidates=competitionPool.filter(t=>total(t.recipe)<=max&&t.level===level);
 let options:Target[]=[];
 for(const gap of [.09,.075,.06,.045]){options=candidates.filter(t=>others.every(o=>distance(o.color,t.color)>gap));if(options.length)break;}
 if(!options.length)throw Error('No reachable, distinct competition target in this difficulty');
 const chosen=options[Math.floor(rng()*options.length)];return {...chosen,recipe:[...chosen.recipe],id:`${seed}-${serial}`};
}

export const finalPool=competitionPool.filter(t=>total(t.recipe)>=4&&t.recipe.filter(Boolean).length>=3&&t.minDrops>=4);
export function finalTarget(seed:number):Target {const t=finalPool[Math.floor(random(seed^73491)()*finalPool.length)];if(!t)throw Error('No final targets');return {...t,recipe:[...t.recipe],id:`${seed}-final`};}
