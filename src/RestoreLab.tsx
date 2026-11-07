import {useId} from 'react';
import {stages} from './questEngine';

const departments=['물감 탱크','혼합 장치','광섬유 회로','코어 결정','홀로그램 간판'];
export const partName=(id:number)=>departments[Math.floor((id-1)/6)]+' '+String((id-1)%6+1).padStart(2,'0');

function shape(group:number,i:number){
 const side=i<3?-1:1,offset=i%3;
 if(group===0)return <g transform={`translate(${side<0?44+i*42:465+offset*42},143)`}>
  <rect width="32" height="68" rx="12" fill="#142443"/><rect x="4" y="15" width="24" height="48" rx="8" fill="currentColor" opacity=".79"/>
  <ellipse cx="16" cy="16" rx="12" ry="4" fill="currentColor"/><path className="detail" d="M8 24v27M21 31h7m-6 8h6m-6 8h6"/><path d="M3 7h26M3 65h26" strokeWidth="3"/>
 </g>;
 if(group===1)return <g transform={`translate(${65+i*96},245)`}><path d="M-7 0h14v12l12 19q2 6-5 6h-28q-7 0-4-6l11-19Z" fill="#172849"/><path d="M-11 23q7-3 13 0t11 0l6 10h-36Z" fill="currentColor"/><path className="detail" d="M-10 26l-3 5m14-16h5"/></g>;
 if(group===2)return <g transform={`translate(${side<0?23:587},${70+offset*20}) scale(${side<0?1:-1},1)`}><path d="M0 0h74l14 14h47" fill="none" strokeWidth="4"/><circle cx="136" cy="14" r="4" fill="currentColor"/><path className="detail" d="M4 5h50" /></g>;
 if(group===3)return <g transform={`translate(305,164) rotate(${i*60})`}><path d="M0-65 17-40 6-12-8-18-17-43Z" fill="currentColor"/><path className="detail" d="M0-65l-3 33 9 20M-17-43l14 11 20-8"/></g>;
 return <g transform={`translate(${208+i*32},35)`}><path d="M-12 0h26v26h-28V4Z" fill="#152944"/><text x="0" y="20" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Clash Arcade, sans-serif" fontSize="15">{['C','OL','OR','CL','A','SH'][i]}</text><path className="detail" d="M-9 4h8m5 19h7"/></g>;
}
export function RestoreLab({progress,highlight}:{progress:Record<string,number>;highlight?:number}){
 const uid=useId().replace(/:/g,'');
 return <svg className="restore-art" viewBox="0 0 610 302" role="img" aria-label="별 기록으로 복원한 네온 컬러 연구실">
  <defs><radialGradient id={uid+'bg'}><stop stopColor="#34305c"/><stop offset="1" stopColor="#090e25"/></radialGradient><linearGradient id={uid+'bench'} x2="0" y2="1"><stop stopColor="#475174"/><stop offset=".2" stopColor="#222c4d"/><stop offset="1" stopColor="#101426"/></linearGradient></defs>
  <rect width="610" height="302" rx="14" fill={`url(#${uid}bg)`}/><g fill="none" stroke="#354468"><path d="M0 0l64 30h482L610 0M0 232l52-20h505l53 20M20 55v125m570-125v125"/><circle cx="305" cy="164" r="79"/><circle cx="305" cy="164" r="68" strokeDasharray="8 4"/></g>
  <path d="M0 244l45-25h520l45 25v58H0Z" fill={`url(#${uid}bench)`} stroke="#464e73"/><path d="M0 289h610" stroke="#677294"/><ellipse cx="305" cy="225" rx="62" ry="9" fill="#0e1026"/>
  {stages.map((stage,index)=>{const level=progress[stage.id]||0;const color=level?stage.targets[0]:'#45506c';return <g key={stage.id} className={`part tier-${level} ${highlight===stage.id?'spotlight':''}`} style={{color}} stroke="currentColor" strokeWidth="1.4">
  <title>{partName(stage.id)} · 별 {level}개</title>{shape(Math.floor(index/6),index%6)}</g>;})}
 </svg>;
}
