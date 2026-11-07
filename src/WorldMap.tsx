import {useId,useState} from 'react';
import {restorationCells,restoredCells} from './mapRestoration';
import {Lock,ArrowLeft,Eye,MapPin,Star} from 'lucide-react';
import {chapters,chapterStars,chapterOpen} from './questEngine';
const regions=[{x:24,y:65,color:'#91f4ad',view:'0 355 800 600',desc:'고목의 숨결을 깨우고 숲의 초록을 돌려주세요.'},{x:76,y:72,color:'#74e8ff',view:'700 430 800 594',desc:'빛을 잃은 산호와 항구에 바다의 색을 돌려주세요.'},{x:25,y:31,color:'#ffd087',view:'0 80 800 590',desc:'멈춘 시계 도시의 지붕과 거리에 온기를 채워주세요.'},{x:77,y:30,color:'#ddbcff',view:'735 0 800 590',desc:'설산 너머의 하늘과 구름 다리에 빛을 돌려주세요.'},{x:52,y:13,color:'#ffe99e',view:'400 0 800 590',desc:'마지막 색을 모아 세계의 무지개를 완성하세요.'}];
export default function WorldMap({progress,onSelect,highlight,focus}:{progress:Record<string,number>;onSelect?:(n:number)=>void;highlight?:number;focus?:number}){
 const id=useId().replace(/:/g,''),[preview,setPreview]=useState(false),[selected,setSelected]=useState<number|null>(null);
 const stars=Object.values(progress).reduce((a,b)=>a+b,0),active=focus??selected;
 const masks=restoredCells(progress);
 return <section className={`atlas ${focus!==undefined?'atlas-focused':''} ${highlight?'atlas-restored':''}`} aria-label="세상의 잃어버린 색 지도">
 <div className="atlas-bar"><div><small>THE LOST SPECTRUM</small><h3>{focus===undefined?'색을 잃어버린 세계':chapters[focus]}</h3></div><div className="atlas-total"><Star size={19}/><b>{stars}</b><span>/ 90</span></div></div>
 <div className="atlas-viewport"><div className="atlas-canvas"><svg className="atlas-art" viewBox={active===null?'0 0 1536 1024':regions[active].view} role="img" aria-label="강과 산맥으로 이어진 숲, 항구, 시계 도시, 설산과 수정 성역">
 <defs><filter id={id+'gray'}><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".55" intercept=".03"/><feFuncG type="linear" slope=".62" intercept=".04"/><feFuncB type="linear" slope=".78" intercept=".07"/></feComponentTransfer></filter><mask id={id+'mask'} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><rect width="1536" height="1024" fill="black"/>{masks.map(m=><polygon key={m.id} data-restored-stage={m.id} points={m.polygon.map(p=>p.join(',')).join(' ')} fill="white"/>)}</mask></defs>
 <image href="/world/atlas.webp" width="1536" height="1024" filter={preview?undefined:`url(#${id}gray)`}/>
 {!preview&&<image href="/world/atlas.webp" width="1536" height="1024" mask={`url(#${id}mask)`}/>}
 {highlight&&<circle className="spotlight atlas-ripple" cx={restorationCells[highlight-1].center[0]} cy={restorationCells[highlight-1].center[1]} r="60" fill="none" stroke="#ffe7a5" strokeWidth="3"/>}
 </svg>
 {active===null&&<div className="atlas-pins">{regions.map((r,c)=>{const open=chapterOpen(progress,c);return <button key={c} className={`atlas-pin region-${c} ${open?'available':'locked'}`} style={{left:r.x+'%',top:r.y+'%','--region':r.color} as React.CSSProperties} onClick={()=>setSelected(c)} aria-label={`${chapters[c]} 지역 살펴보기`}><span className="pin-jewel">{open?<MapPin size={24}/>:<Lock size={19}/>}</span><span className="pin-caption"><b>{chapters[c]}</b><span>★ {chapterStars(progress,c)} / 18</span></span></button>;})}</div>}
 <div className="atlas-compass" aria-hidden="true"><span>N</span>✧</div>
 <button className="atlas-preview" onClick={()=>setPreview(!preview)} aria-pressed={preview}><Eye size={17}/>{preview?'복원 현황 보기':'완성된 세계 보기'}</button>
 {selected!==null&&focus===undefined&&<button className="atlas-back" onClick={()=>setSelected(null)}><ArrowLeft size={18}/> 전체 지도</button>}
 </div></div>
 {active!==null?<div className="atlas-detail" style={{'--region':regions[active].color} as React.CSSProperties}><div><small>CHAPTER 0{active+1} · ★ {chapterStars(progress,active)} / 18</small><h3>{chapters[active]}</h3><p>{regions[active].desc}</p></div>{onSelect&&(chapterOpen(progress,active)?<button className="primary region-enter" onClick={()=>onSelect(active)}>이 지역 탐험 →</button>:<div className="atlas-gate"><Lock size={20}/><b>이전 지역 6개 클리어 + 별 12개</b><span>현재 별 {chapterStars(progress,active-1)} / 12</span></div>)}</div>:<div className="atlas-footer"><span><i/> 색을 되찾을 지역을 선택하세요</span><span>복원한 색 <b>{Object.keys(progress).length} / 30</b></span></div>}
 </section>;
}
