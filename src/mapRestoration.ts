// Partition the whole atlas into five territories, then six non-overlapping
// restoration cells per territory. Star upgrades never expand a cell.
export type Point=[number,number];
const centers:Point[]=[[369,666],[1167,737],[384,317],[1183,307],[799,133]];
const bounds:Point[]=[[0,0],[1536,0],[1536,1024],[0,1024]];
function clip(poly:Point[],a:number,b:number,c:number):Point[]{
 const out:Point[]=[];
 for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;
  if(dp<=0)out.push(p);
  if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
 }
 return out;
}
function cell(boundary:Point[],seeds:Point[],index:number){
 const p=seeds[index];return seeds.reduce((poly,q,i)=>i===index?poly:clip(poly,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]**2+q[1]**2-p[0]**2-p[1]**2),boundary);
}
export const territories=centers.map((_,i)=>cell(bounds,centers,i));
export const restorationCells=centers.flatMap(([x,y],chapter)=>{
 const seeds:Point[]=Array.from({length:6},(_,i)=>[x+(i%3-1)*105,y+(Math.floor(i/3)-.5)*135]);
 return seeds.map((center,i)=>({id:chapter*6+i+1,chapter,center,polygon:cell(territories[chapter],seeds,i)}));
});
export function restoredCells(progress:Record<string,number>){return restorationCells.filter(c=>(progress[c.id]||0)>0);}
