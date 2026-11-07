import {initializeApp} from 'firebase/app';
import {getAuth,signInAnonymously,browserLocalPersistence,setPersistence} from 'firebase/auth';
import {getDatabase,ref,get,set,onValue,runTransaction,onDisconnect,serverTimestamp,remove} from 'firebase/database';
import {firebaseConfig} from './firebaseConfig';
import {applyAction,createGame,finish,normalize,type Game,type Action} from './gameEngine';
import {validRecipe,type Recipe} from './colorEngine';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
export interface Member {uid:string;ready:boolean}
export interface Meta {owner:string;count:2|4;created:number;closed:boolean}
export interface Session {code:string;uid:string;seat:number;meta:Meta}
export const timed=<T,>(p:Promise<T>,ms=12000):Promise<T>=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('연결 지연 · 네트워크와 Firebase 규칙을 확인하세요.')),ms);p.then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});});
async function user(){if(location.protocol==='file:')throw Error('온라인 대전은 배포된 HTTPS 주소에서 열어 주세요. 이 파일에서는 로컬 대전과 COLOR LAB을 이용할 수 있어요.');await setPersistence(auth,browserLocalPersistence);await auth.authStateReady();return auth.currentUser??(await timed(signInAnonymously(auth))).user;}
export async function createRoom(count:2|4):Promise<Session>{
 const u=await user();for(let trial=0;trial<8;trial++){
 const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const meta:Meta={owner:u.uid,count,created:Date.now(),closed:false};
 const result=await timed(runTransaction(ref(db,`cc/meta/${code}`),v=>v?undefined:meta,{applyLocally:false}));
 if(!result.committed)continue;
 await timed(set(ref(db,`cc/members/${code}/0`),{uid:u.uid,ready:false}));const s={code,uid:u.uid,seat:0,meta};localStorage.setItem('cc-session',JSON.stringify(s));return s;
 }throw Error('방 생성 실패. 다시 시도해 주세요.');
}
export async function joinRoom(code:string):Promise<Session>{
 if(!/^\d{6}$/.test(code))throw Error('6자리 코드를 입력하세요.');const u=await user();
 const meta=(await timed(get(ref(db,`cc/meta/${code}`)))).val() as Meta;
 if(!meta)throw Error('없는 방입니다. / ROOM NOT FOUND');if(meta.closed)throw Error('종료된 방입니다.');
 const members=(await timed(get(ref(db,`cc/members/${code}`)))).val()??{};
 const existing=Object.entries(members).find(([,m])=>(m as Member).uid===u.uid);
 if(existing){const s={code,uid:u.uid,seat:Number(existing[0]),meta};localStorage.setItem('cc-session',JSON.stringify(s));return s;}
 for(let seat=1;seat<meta.count;seat++){
  try{const result=await timed(runTransaction(ref(db,`cc/members/${code}/${seat}`),v=>v?undefined:{uid:u.uid,ready:false},{applyLocally:false}));
  if(result.committed){const s={code,uid:u.uid,seat,meta};localStorage.setItem('cc-session',JSON.stringify(s));return s;}}catch(e){if(seat===meta.count-1)throw e;}
 }throw Error('정원이 찼거나 이미 시작한 방입니다.');
}
export async function restoreSession(){const raw=localStorage.getItem('cc-session');if(!raw)return null;const old=JSON.parse(raw);return joinRoom(old.code);}
export function watch(s:Session,onGame:(g:Game|null)=>void,onMembers:(m:Record<string,Member>)=>void,onPresence:(p:Record<string,{online:boolean}>)=>void,onConnection:(v:boolean)=>void,onError:(e:Error)=>void){
 const base=`cc/presence/${s.code}/${s.seat}`;
 const stops=[onValue(ref(db,`cc/games/${s.code}`),v=>{try{onGame(v.exists()?normalize(v.val()):null);}catch(e){onError(e as Error);}},onError),onValue(ref(db,`cc/members/${s.code}`),v=>onMembers(v.val()??{}),onError),onValue(ref(db,`cc/presence/${s.code}`),v=>onPresence(v.val()??{}),onError),onValue(ref(db,'.info/connected'),v=>{onConnection(v.val()===true);if(v.val())onDisconnect(ref(db,base)).set({online:false,lastSeen:serverTimestamp()}).then(()=>set(ref(db,base),{online:true,lastSeen:serverTimestamp()})).catch(onError);})];
 return()=>{stops.forEach(f=>f());void set(ref(db,base),{online:false,lastSeen:serverTimestamp()}).catch(()=>{/* best-effort presence update after unsubscribe */});};
}
export async function ready(s:Session,value:boolean){await timed(set(ref(db,`cc/members/${s.code}/${s.seat}/ready`),value));}
export async function start(s:Session){const m=(await timed(get(ref(db,`cc/members/${s.code}`)))).val()??{};if(Object.keys(m).length!==s.meta.count||!Object.values(m).every(x=>(x as Member).ready))throw Error('모두 준비해야 시작할 수 있어요.');const seed=crypto.getRandomValues(new Uint32Array(1))[0]%2147483647;await timed(runTransaction(ref(db,`cc/games/${s.code}`),old=>old?undefined:createGame(seed,s.meta.count,crypto.randomUUID()),{applyLocally:false}));}
export async function act(s:Session,a:Action){const result=await timed(runTransaction(ref(db,`cc/games/${s.code}`),old=>{if(!old)return;try{return applyAction(normalize(old),a);}catch{return;}},{applyLocally:false}));if(!result.committed)throw Error('차례 또는 목표가 바뀌었습니다. 다시 확인하세요.');}
export interface Reveal {recipe:Recipe;salt:string}
export async function digest(r:Reveal){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(r)));return Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');}
const secretKey=(s:Session,g:Game)=>`cc-secret-${s.code}-${g.match}-${s.uid}`;
export async function commitFinal(s:Session,g:Game,recipe:Recipe){if(!validRecipe(recipe,6))throw Error('1–6 DROP');const key=secretKey(s,g);const saved=localStorage.getItem(key);const reveal:Reveal=saved?JSON.parse(saved):{recipe,salt:crypto.randomUUID()+crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(reveal));const hash=await digest(reveal);const r=await timed(runTransaction(ref(db,`cc/finals/${s.code}/${g.match}/commits/${s.seat}`),v=>v??hash,{applyLocally:false}));if(r.snapshot.val()!==hash)throw Error('이미 제출된 배합이 있습니다. 원래 기기로 돌아가세요.');}
export function watchFinal(s:Session,g:Game,onStatus:(commits:Record<string,string>)=>void,onError:(e:Error)=>void){
 let busy=false,stopReveal:(()=>void)|undefined,disposed=false;const path=`cc/finals/${s.code}/${g.match}`;
 const stop=onValue(ref(db,`${path}/commits`),async snapshot=>{
  const commits=snapshot.val()??{};onStatus(commits);if(Object.keys(commits).length!==g.count||disposed)return;
  if(!stopReveal)stopReveal=onValue(ref(db,`${path}/reveals`),async snapshot=>{
   const reveals=snapshot.val()??{};if(Object.keys(reveals).length!==g.count||busy||disposed)return;busy=true;
   try{const recipes:Recipe[]=[];for(let i=0;i<g.count;i++){if(!validRecipe(reveals[i]?.recipe,6)||await digest(reveals[i])!==commits[i])throw Error('결승전 검증 실패');recipes.push(reveals[i].recipe);}
    await runTransaction(ref(db,`cc/games/${s.code}`),old=>old?.phase==='final'?finish(normalize(old),recipes):undefined,{applyLocally:false});
   }catch(e){onError(e as Error);}finally{busy=false;}
  },onError);
  try{const secret=localStorage.getItem(secretKey(s,g));if(!secret){onError(Error('제출 원본이 이 브라우저에 없습니다. 제출했던 기기로 돌아가세요.'));return;}
   const r=JSON.parse(secret);if(await digest(r)!==commits[s.seat])throw Error('제출 확인 정보가 일치하지 않습니다.');
   const result=await runTransaction(ref(db,`${path}/reveals/${s.seat}`),old=>old?undefined:r,{applyLocally:false});
   if(!result.committed&&!result.snapshot.exists())throw Error('공개 실패 · 다시 연결해 주세요.');
  }catch(e){if(!disposed)onError(e as Error);}
 },onError);return()=>{disposed=true;stop();stopReveal?.();};
}
export async function leave(s:Session){try{localStorage.removeItem('cc-session');}catch{}await timed(set(ref(db,`cc/presence/${s.code}/${s.seat}`),{online:false,lastSeen:serverTimestamp()}));const g=await timed(get(ref(db,`cc/games/${s.code}`)));if(!g.exists())await timed(remove(ref(db,`cc/members/${s.code}/${s.seat}`)));}
export async function rematch(s:Session){return createRoom(s.meta.count);}
