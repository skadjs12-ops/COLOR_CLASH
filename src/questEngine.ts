import {allRecipes,blank,distance,mix,total,similarity,type Recipe} from './colorEngine';
export interface QuestStage {id:number;chapter:number;title:string;targets:string[];solutions:Recipe[];initial:Recipe;allowed:number[];actions:number}
export const chapters=['빛을 잃은 숲','잠든 바다','멈춰버린 도시','빛바랜 하늘','무지개 중심부'];
// Farthest-color selection is deterministic. Previously used targets are excluded globally.
const used:string[]=[];
function choose(candidates:Recipe[]):Recipe {
 const ranked=candidates.map(recipe=>({recipe,color:mix(recipe)})).filter(t=>!used.includes(t.color)).map(t=>({
  ...t,gap:used.length?Math.min(...used.map(previous=>distance(previous,t.color))):distance(t.color,'#151a32')
 }));
 ranked.sort((a,b)=>b.gap-a.gap);
 if(!ranked.length)throw Error('퀘스트 목표 후보 부족');
 used.push(ranked[0].color);
 return [...ranked[0].recipe];
}
export const stages:QuestStage[]=Array.from({length:30},(_,index)=>{
 const chapter=Math.floor(index/6),slot=index%6;
 const candidates=allRecipes.filter(r=>{
  const kinds=r.filter(Boolean).length;
  if(chapter===0)return kinds===2&&total(r)===(slot<3?2:3)&&r[3]===0&&r[4]===0;
  if(chapter===1)return kinds===2&&total(r)===(slot<3?3:4)&&(r[3]>0||r[4]>0);
  if(chapter===2)return kinds>=2&&kinds<=3&&total(r)===4&&Math.max(...r)>=2;
  if(chapter===3)return kinds>=3&&total(r)===5;
  return kinds>=3&&total(r)===(slot<3?5:6);
 });
 const solutions=Array.from({length:chapter===4?2+(slot===5?1:0):1},()=>choose(candidates));
 const initial=blank();
 if(chapter===3){const pigment=solutions[0].findIndex(n=>n>0);initial[pigment]=1;}
 const allowed=chapter===0?[0,1,2]:chapter===4&&slot%2===0?[...new Set(solutions.flatMap(r=>r.flatMap((n,i)=>n?[i]:[])))]:[0,1,2,3,4];
 const required=solutions.reduce((sum,r)=>sum+total(r)+1,0)-total(initial);
 return {id:index+1,chapter,title:slot===5?'종합 도전':chapter===3?'남은 색을 찾아서':chapter===4?'두 접시의 전략':`컬러 미션 ${slot+1}`,targets:solutions.map(mix),solutions,initial,allowed,actions:required+(chapter===0?10:chapter===1?7:4)};
});
export interface QuestRun {stageId:number;dishes:Recipe[];accuracy:number[];remaining:number;message:string;done:boolean}
export function startQuest(stage:QuestStage):QuestRun{return {stageId:stage.id,dishes:[[...stage.initial],blank()],accuracy:stage.targets.map(()=>0),remaining:stage.actions,message:'',done:false};}
export function questAction(stage:QuestStage,run:QuestRun,kind:'add'|'reset'|'submit',dish:number,pigment=0,target=0):QuestRun {
 if(run.stageId!==stage.id||run.done||run.remaining<=0||![0,1].includes(dish))throw Error('새로 도전해 주세요.');
 const next=structuredClone(run),recipe=next.dishes[dish];
 if(kind==='add'){
  if(!stage.allowed.includes(pigment)||total(recipe)>=6)throw Error('추가할 수 없는 물감입니다.');
  recipe[pigment]++;
 }else if(kind==='reset'){
  if(!total(recipe))throw Error('빈 접시입니다.');
  next.dishes[dish]=dish===0?[...stage.initial]:blank();
 }else{
  if(!total(recipe)||!stage.targets[target]||next.accuracy[target]>=80)throw Error('다른 목표를 선택해 주세요.');
  const score=similarity(mix(recipe),stage.targets[target]);
  next.message=`${score}% · ${score>=80?'목표 완성!':'배합을 바꿔 다시 도전해 보세요.'}`;
  if(score>=80)next.accuracy[target]=score;
  next.dishes[dish]=blank();
 }
 next.remaining--;
 next.done=next.accuracy.every(n=>n>=80)||next.remaining===0;
 return next;
}
export function questStars(run:QuestRun){const worst=Math.min(...run.accuracy);return worst>=95?3:worst>=90?2:worst>=80?1:0;}
export function cleanProgress(raw:unknown):Record<string,number>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw).filter(([id,n])=>/^([1-9]|[12][0-9]|30)$/.test(id)&&Number.isInteger(n)&&Number(n)>=1&&Number(n)<=3));
}

export function chapterStars(progress:Record<string,number>,chapter:number){return stages.filter(s=>s.chapter===chapter).reduce((n,s)=>n+(progress[s.id]||0),0);}
export function chapterOpen(progress:Record<string,number>,chapter:number):boolean {return chapter===0||(chapterOpen(progress,chapter-1)&&chapterStars(progress,chapter-1)>=12&&stages.filter(s=>s.chapter===chapter-1).every(s=>!!progress[s.id]));}
