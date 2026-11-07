import {blank,mix,total,finalTarget,similarity,target,validRecipe,type Recipe,type Target} from './colorEngine';
export type Action={id:string;revision:number;seat:number;kind:'add'|'submit'|'reset'|'pass';dish:0|1;pigment?:number;targetId?:string};
export interface Capture {color:string;similarity:number;points:number;seat:number}
interface Submission {seat:number; targetId:string; recipe:Recipe}
export interface Game {pending?:Submission[];version:1;match:string;seed:number;revision:number;actor:number;phase:'battle'|'final'|'result';count:2|4;turn:number;remaining:number[];scores:number[];dishes:Recipe[][];targets:Target[];serial:number;captures:Capture[];lastId:string;feedback:string;finalTarget:Target;finalRecipes:Recipe[];finalAccuracy:number[]}
export function createGame(seed=Date.now()%2147483647,count:2|4=2,match=String(seed)):Game {
 const targets:Target[]=[];for(let i=0;i<3;i++)targets.push(target(seed,i,targets));
 return {version:1,match,seed,revision:0,actor:0,phase:'battle',count,turn:0,remaining:Array(count).fill(count===2?14:8),scores:[0,0],dishes:[[blank(),blank()],[blank(),blank()]],targets,serial:3,captures:[],lastId:'',feedback:'',finalTarget:finalTarget(seed),finalRecipes:[],finalAccuracy:[]};
}
function resolveRound(game:Game) {
 const entries=game.pending??[];
 const messages:string[]=[];
 for(const card of [...game.targets]){
  const attempts=entries.filter(entry=>entry.targetId===card.id).map(entry=>({
   seat:entry.seat, accuracy:similarity(mix(entry.recipe),card.color)
  }));
  if(!attempts.length)continue;
  const best=Math.max(...attempts.map(entry=>entry.accuracy));
  const winners=attempts.filter(entry=>entry.accuracy===best && best>=80);
  const points=winners.length?(card.points+(best>=95?25:0))/winners.length:0;
  for(const attempt of attempts){
   const award=winners.includes(attempt)?points:0;
   messages.push(`${attempt.seat%2?'BLUE':'RED'} ${attempt.accuracy}% · +${award}`);
   if(award){
    game.scores[attempt.seat%2]+=award;
    game.captures.push({seat:attempt.seat,color:card.color,similarity:best,points:award});
   }
  }
  if(winners.length){
   const index=game.targets.findIndex(target=>target.id===card.id);
   game.targets[index]=target(game.seed,game.serial++,game.targets);
  }
 }
 game.feedback=messages.join(' / ');
 delete game.pending;
}
export function applyAction(g:Game,a:Action):Game {
 if(g.phase!=='battle'||a.revision!==g.revision||a.id===g.lastId||a.seat!==g.turn||!g.remaining[a.seat])throw Error('이미 지난 차례입니다. / WAIT');
 if(a.dish!==0&&a.dish!==1)throw Error('Invalid dish');
 if(g.count===4&&a.dish!==Math.floor(a.seat/2))throw Error('내 접시를 선택하세요.');
 const n=structuredClone(g),team=a.seat%2,r=n.dishes[team][a.dish];
 if(a.kind==='add'){if(!Number.isInteger(a.pigment)||a.pigment!<0||a.pigment!>4||total(r)>=6)throw Error('6 DROP MAX');r[a.pigment!]++;}
 else if(a.kind==='reset'){if(!total(r))throw Error('EMPTY');n.dishes[team][a.dish]=blank();}
 else if(a.kind==='submit'){
  if(!total(r))throw Error('EMPTY');const i=n.targets.findIndex(t=>t.id===a.targetId);if(i<0)throw Error('목표가 변경되었습니다.');
  (n.pending??=[]).push({seat:a.seat,targetId:n.targets[i].id,recipe:[...r] as Recipe});
  n.dishes[team][a.dish]=blank();
 } else if(a.kind!=='pass')throw Error('Invalid action');
 if(team===1)resolveRound(n);
 else n.feedback=n.pending?.length?'판정 대기 · BLUE 행동 후 공개':'';
 n.remaining[a.seat]--;n.revision++;n.actor=a.seat;n.lastId=a.id;
 if(n.remaining.every(v=>v===0))n.phase='final';else{do{n.turn=(n.turn+1)%n.count;}while(!n.remaining[n.turn]);}
 return n;
}
export function finish(g:Game,recipes:Recipe[]):Game {
 if(g.phase!=='final'||recipes.length!==g.count||!recipes.every(r=>validRecipe(r,6)))throw Error('Invalid final');
 const n=structuredClone(g);n.finalRecipes=recipes;n.finalAccuracy=recipes.map(r=>similarity(mix(r),g.finalTarget.color));
 const red=n.finalAccuracy.filter((_,i)=>i%2===0),blue=n.finalAccuracy.filter((_,i)=>i%2===1);
 const mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;const delta=mean(red)-mean(blue);
 n.scores[0]+=delta>=0?(delta===0?100:200):0;n.scores[1]+=delta<=0?(delta===0?100:200):0;n.phase='result';n.revision++;return n;
}
export function normalize(g:Game):Game{if(!g||g.version!==1||![2,4].includes(g.count)||!g.targets||!g.dishes||!g.remaining)throw Error('게임 데이터 오류 · 나간 뒤 새 방을 만들어 주세요.');return {...g,captures:g.captures??[],finalRecipes:g.finalRecipes??[],finalAccuracy:g.finalAccuracy??[]};}
