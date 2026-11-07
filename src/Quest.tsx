import {useEffect,useRef,useState} from 'react';
import {Lock,Star,ArrowRight,RotateCcw} from 'lucide-react';
import WorldMap from './WorldMap';
import {mix,blank,names,pigments,symbols,total,type Recipe} from './colorEngine';
import {chapters,chapterOpen,chapterStars,stages,startQuest,questAction,questStars,cleanProgress,type QuestRun} from './questEngine';
import {load,save} from './storage';
interface Props {Plate:React.ComponentType<{r:Recipe;selected:boolean;onClick:()=>void;label:string;help?:boolean}>;beep:(success?:boolean)=>void;assist:boolean}
function RestoreDrop({color,index}:{color:string;index:number}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const drop=ref.current, source=document.querySelectorAll('.color-results>div i:last-of-type')[index],part=document.querySelector('.clear-restore .spotlight');
  if(!drop||!source||!part||typeof drop.animate!=='function'||drop.closest('.reduced'))return;
  const start=source.getBoundingClientRect(),end=part.getBoundingClientRect(),base=drop.offsetParent?.getBoundingClientRect();
  if(!base)return;
  const x=start.left+start.width/2,y=start.top+start.height/2;
  drop.style.left=x-base.left+'px';drop.style.top=y-base.top+'px';
  const dx=end.left+end.width/2-x,dy=end.top+end.height/2-y;
  const motion=drop.animate([{opacity:0,transform:'scale(.4)'},{opacity:1,offset:.2,transform:`translate(${dx*.12}px,${dy*.08-12}px) scale(1)`},{opacity:1,offset:.87,transform:`translate(${dx}px,${dy}px) scale(.9)`},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3)`}],{duration:650,delay:680,easing:'ease-in-out'});
  return ()=>motion.cancel();
 },[color,index]);
 return <span ref={ref} aria-hidden="true" className="restore-drop" style={{background:color,color}}/>;
}
export default function Quest({Plate,beep,assist}:Props){
 const [progress,setProgress]=useState(()=>cleanProgress(load('cc-quest-v1',{})));
 const [run,setRun]=useState<QuestRun|null>(null),[dish,setDish]=useState(0),[target,setTarget]=useState(0),[error,setError]=useState('');
 const [chapter,setChapter]=useState<number|null>(null);
 const [gallery,setGallery]=useState(false),[oldBest,setOldBest]=useState(0);
 const [submitted,setSubmitted]=useState<Record<number,string>>({});
 const totalStars=Object.values(progress).reduce((a,b)=>a+b,0);
 const stage=run?stages[run.stageId-1]:null;
 function start(id:number){if(!chapterOpen(progress,stages[id-1].chapter))return;setOldBest(progress[id]??0);setSubmitted({});setRun(startQuest(stages[id-1]));setDish(0);setTarget(0);setError('');}
 function act(kind:'add'|'reset'|'submit',pigment=0){
  if(!run||!stage)return;
  try{
   const next=questAction(stage,run,kind,dish,pigment,target);setRun(next);beep(kind==='submit'&&next.accuracy[target]>=80);
   const nextTarget=next.accuracy.findIndex(n=>n<80);if(nextTarget>=0)setTarget(nextTarget);
   if(kind==='submit'&&next.accuracy[target]>=80)setSubmitted(previous=>({...previous,[target]:mix(run.dishes[dish])}));
   const stars=questStars(next);
   if(next.done&&stars){const updated={...progress,[stage.id]:Math.max(progress[stage.id]??0,stars)};if(save('cc-quest-v1',updated))setProgress(updated);else setError('기록을 저장할 수 없어요. 브라우저 저장 설정을 확인해 주세요.');}
  }catch(e){setError((e as Error).message);}
 }
 if(gallery)return <main className="page gallery-page"><span className="eyebrow">SPECTRUM ARCHIVE</span><h2>세상의 색 <em>복원도</em></h2><WorldMap progress={progress}/><h3>{totalStars===90?'세상의 색 복원 완료!':`모은 별 ${totalStars} / 90`}</h3><p>별 하나로 색을 채우고, 둘로 세부 장식을, 셋으로 네온 조명을 켜세요.</p><button className="secondary" onClick={()=>setGallery(false)}>스테이지 목록</button></main>;
 if(stage&&run?.done){
  const stars=questStars(run),gain=Math.max(0,stars-oldBest);
  return <main className="clear-screen"><section className={gain?'quest-result new-restore':'quest-result'}>{gain>0&&<RestoreDrop index={target} color={submitted[target]||stage.targets[target]}/>}
   <span className="eyebrow">STAGE {String(stage.id).padStart(2,'0')} · {chapters[stage.chapter]}</span>
   <h2>{stars?'MISSION CLEAR!':'다시 도전!'}</h2><div className="quest-stars" aria-label={`획득한 별 ${stars}개`}>{[1,2,3].map(i=><span key={i} className={stars>=i?'lit':''} style={{animationDelay:(i-1)*130+'ms'}}>{stars>=i?'★':'☆'}</span>)}</div>
   <p>{gain>0?<b className="record-badge">NEW BEST · 별 +{gain}</b>:stars?'도전 완료 · 최고 기록 유지':'행동을 모두 사용했어요'}</p>
   <div className="color-results">{stage.targets.map((c,i)=><div key={c}><small>목표 {i+1}</small><i title="목표 색" style={{background:c}}/> → <i title="내가 완성한 색" style={{background:submitted[i]||'transparent'}}/><strong>{submitted[i]?`${run.accuracy[i]}%`:'미완성'}</strong></div>)}</div>
   {stars>0&&<div className="clear-restore"><WorldMap progress={progress} highlight={stage.id}/><b>{chapters[stage.chapter]}의 색 · {gain?'복원 진척!':'현재 복원 상태'}</b></div>}
   {error&&<p role="alert">{error}</p>}
   <div className="clear-actions">{stars>0&&stage.id<30&&chapterOpen(progress,stages[stage.id].chapter)&&<button className="primary" onClick={()=>start(stage.id+1)}>다음 스테이지 <ArrowRight/></button>}<button className="secondary" onClick={()=>start(stage.id)}><RotateCcw/> 다시 도전</button><button className="secondary" onClick={()=>setRun(null)}>스테이지 목록</button></div>
  </section></main>;
 }
 return <main className="page quest-page"><div className="eyebrow">SOLO ADVENTURE</div><h2>COLOR <em>QUEST</em></h2>{error&&<p role="alert">{error}</p>}
 {!run||!stage?<><p className="subtitle">잃어버린 세상의 색을 되찾아 주세요 · ★ {totalStars} / 90</p>{chapter===null?<WorldMap progress={progress} onSelect={setChapter}/>:<section className="quest-chapter"><button className="secondary" onClick={()=>setChapter(null)}>← 세계지도</button><h3>{chapters[chapter]} · ★ {chapterStars(progress,chapter)} / 18</h3><p>6개 스테이지 클리어와 별 12개로 다음 지역이 열려요.</p><WorldMap progress={progress} focus={chapter}/><div className="quest-grid">{stages.filter(s=>s.chapter===chapter).map(s=>{const unlocked=chapterOpen(progress,chapter)&&(s.id%6===1||!!progress[s.id-1]||!!progress[s.id]);return <button className={`quest-node ${progress[s.id]?'cleared':''}`} key={s.id} disabled={!unlocked} onClick={()=>start(s.id)} aria-label={`스테이지 ${s.id}`}><b>{unlocked?String(s.id).padStart(2,'0'):<Lock size={25}/>}</b><span>{s.title}</span><small>{'★'.repeat(progress[s.id]??0)}{'☆'.repeat(3-(progress[s.id]??0))}</small></button>;})}</div></section>}</>:<>
 <div className="quest-heading"><button className="secondary" onClick={()=>setRun(null)}>스테이지 목록</button><h3>{stage.id}. {chapters[stage.chapter]} · {stage.title}</h3><strong>남은 행동 {run.remaining}</strong></div>
 <p className="subtitle">{stage.chapter===3?'첫 접시의 물감에 색을 더해 목표를 복원하세요. 초기화하면 처음 배합으로 돌아갑니다.':'목표를 선택하고 색을 섞어 제출하세요. 추가·초기화·제출마다 행동 1회.'} 모든 목표 80% 이상이면 통과!</p>
 {stage.chapter===0&&<aside className="quest-beginner-hint"><strong>{stage.id<=3?'첫 혼합 · 한 방울씩 따라 해요':'비율 도전 · 어느 색을 더 넣을까요?'}</strong><p>{stage.solutions[0].map((n,i)=>n?`${['빨강','노랑','파랑','흰색','검정'][i]}${stage.id<=3?' '+n+'방울':''}`:null).filter(Boolean).join(' + ')} · 총 {total(stage.solutions[0])}방울</p><span>{stage.id<=3?'두 물감을 넣은 뒤 SUBMIT을 눌러 보세요.':'두 색 중 한 색은 2방울, 다른 색은 1방울이에요.'}</span></aside>}
 <div className="quest-targets">{stage.targets.map((color,i)=><button key={color} className={`quest-target ${target===i?'selected':''}`} disabled={run.done||run.accuracy[i]>=80} onClick={()=>setTarget(i)} aria-label={`퀘스트 목표 ${i+1}`} aria-pressed={target===i}><i style={{background:color}}/><strong>목표 {i+1}</strong><span>{run.accuracy[i]?`${run.accuracy[i]}% ✓`:'80% 이상'}</span></button>)}</div>
 <div className="quest-plates plates">{[0,1].map(i=><Plate key={i} r={run.dishes[i]??blank()} selected={dish===i} onClick={()=>setDish(i)} label={`MIX 0${i+1}`} help={assist}/>)}</div>
 <p className="quest-feedback" role="status">{run.message||'물감을 한 방울씩 더해 보세요.'}</p>
 <div className="palette quest-palette">{pigments.map((color,i)=><button key={i} className="pigment" style={{'--pigment':color} as React.CSSProperties} disabled={run.done||!stage.allowed.includes(i)||total(run.dishes[dish])>=6} onClick={()=>act('add',i)} aria-label={`${names[i]} 물감 추가`}><svg viewBox="0 0 60 72" aria-hidden="true"><path d="M30 3C25 18 5 32 5 46a25 25 0 0 0 50 0C55 32 35 18 30 3" fill={color}/><path d="M18 33q-10 15-2 23" stroke="white" strokeWidth="3" fill="none" opacity=".7"/></svg><span className="pigment-symbol">{symbols[i]}</span><small>{names[i]}</small></button>)}</div>
 <div className="final-actions"><button className="secondary" disabled={run.done||!total(run.dishes[dish])} onClick={()=>act('reset')}>RESET · 초기화</button><button className="primary submit" disabled={run.done||!total(run.dishes[dish])||run.accuracy[target]>=80} onClick={()=>act('submit')}>SUBMIT · 제출</button></div>

 </>}
 </main>;
}
