import test,{before,after} from 'node:test';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {ref,get,set,runTransaction} from 'firebase/database';
import {createGame,applyAction} from '../src/gameEngine';
let env:RulesTestEnvironment;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-color-clash',database:{host:'127.0.0.1',port:9000,rules:readFileSync('database.rules.json','utf8')}});});
after(async()=>{await env?.cleanup();});
test('room join, access isolation, turn validation and commit-reveal protection',async()=>{
 const a=env.authenticatedContext('red').database(),b=env.authenticatedContext('blue').database(),c=env.authenticatedContext('outsider').database(),anon=env.unauthenticatedContext().database();
 await assertFails(get(ref(anon,'cc/meta/123456')));await assertFails(get(ref(a,'cc')));
 await assertSucceeds(set(ref(a,'cc/meta/123456'),{owner:'red',count:2,created:Date.now(),closed:false}));
 await assertSucceeds(set(ref(a,'cc/members/123456/0'),{uid:'red',ready:true}));
 await assertFails(set(ref(a,'cc/members/123456/1'),{uid:'red',ready:true}));
 await assertSucceeds(set(ref(b,'cc/members/123456/1'),{uid:'blue',ready:true}));
 await assertFails(set(ref(c,'cc/members/123456/2'),{uid:'outsider',ready:true}));
 let game=createGame(17,2,'match');await assertSucceeds(set(ref(a,'cc/games/123456'),game));
 await assertFails(get(ref(c,'cc/games/123456')));await assertSucceeds(get(ref(b,'cc/games/123456')));
 const action={id:'one',revision:0,seat:0,kind:'add' as const,dish:0 as const,pigment:1};const next=applyAction(game,action);
 await assertFails(set(ref(b,'cc/games/123456'),next));await assertSucceeds(set(ref(a,'cc/games/123456'),next));
 await assertFails(set(ref(a,'cc/games/123456'),next));game=next;
 for(let i=1;i<28;i++){const next=applyAction(game,{id:'p'+i,revision:game.revision,seat:game.turn,kind:'pass',dish:0});await assertSucceeds(set(ref(game.turn===0?a:b,'cc/games/123456'),next));game=next;}
 const base='cc/finals/123456/match';
 await assertSucceeds(set(ref(a,base+'/commits/0'),'a'.repeat(64)));
 await assertFails(set(ref(a,base+'/commits/0'),'b'.repeat(64)));
 await assertFails(get(ref(b,base+'/reveals')));
 await assertFails(set(ref(a,base+'/reveals/0'),{recipe:[1,0,0,0,0],salt:'s'.repeat(64)}));
 await assertSucceeds(set(ref(b,base+'/commits/1'),'b'.repeat(64)));
 await assertSucceeds(set(ref(a,base+'/reveals/0'),{recipe:[1,0,0,0,0],salt:'s'.repeat(64)}));
 await assertFails(set(ref(b,base+'/reveals/0'),{recipe:[0,1,0,0,0],salt:'s'.repeat(64)}));
 await assertSucceeds(get(ref(b,base+'/reveals')));await assertFails(get(ref(c,base+'/reveals')));
});
test('two transactions at one revision commit at most one action',async()=>{
 await env.withSecurityRulesDisabled(async context=>{const db=context.database();await set(ref(db,'cc/meta/456789'),{owner:'r2',count:2,created:Date.now(),closed:false});await set(ref(db,'cc/members/456789'),{0:{uid:'r2',ready:true},1:{uid:'b2',ready:true}});await set(ref(db,'cc/games/456789'),createGame(42));});
 const db=env.authenticatedContext('r2').database();let commits=0;
 const move=()=>runTransaction(ref(db,'cc/games/456789'),raw=>{if(!raw||raw.revision!==0)return;try{return applyAction({...raw,captures:raw.captures??[]},{id:'same',revision:0,seat:0,kind:'add',dish:0,pigment:0});}catch{return;}},{applyLocally:false}).then(r=>{if(r.committed)commits++;});
 await Promise.all([move(),move()]);if(commits!==1)throw Error('Expected exactly one commit');
});
