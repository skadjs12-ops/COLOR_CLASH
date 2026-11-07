import test from 'node:test';import assert from 'node:assert/strict';import {createMockUserToken} from '@firebase/util';import {createGame,applyAction,finish} from '../src/gameEngine';
const ns='demo-color-clash-default-rtdb';
async function req(uid:string|null,path:string,method='GET',data?:unknown,headers:Record<string,string>={}){const q=new URLSearchParams({ns});if(uid)q.set('auth',createMockUserToken({sub:uid},'demo-color-clash'));return fetch(`http://127.0.0.1:9000/${path}.json?${q}`,{method,headers:{'Content-Type':'application/json',...headers},...(data!==undefined?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(8000)});}
async function ok(p:Promise<Response>){const r=await p;assert.ok(r.ok,`${r.status}: ${await r.text()}`);}
async function deny(p:Promise<Response>){const r=await p;assert.ok(r.status===401||r.status===403,`expected denied, got ${r.status}: ${await r.text()}`);}
test('rules: room ownership, membership, all 28 turns, finals secrecy and result',async()=>{
 await deny(req(null,'cc/meta/123456'));await deny(req('red','cc'));
 await ok(req('red','cc/meta/123456','PUT',{owner:'red',count:2,created:Date.now(),closed:false}));
 await ok(req('red','cc/members/123456/0','PUT',{uid:'red',ready:true}));
 await deny(req('red','cc/members/123456/1','PUT',{uid:'red',ready:true}));
 await ok(req('blue','cc/members/123456/1','PUT',{uid:'blue',ready:true}));
 await deny(req('outsider','cc/members/123456/2','PUT',{uid:'outsider',ready:true}));
 let g=createGame(17,2,'match');await ok(req('red','cc/games/123456','PUT',g));
 await deny(req('outsider','cc/games/123456'));await ok(req('blue','cc/games/123456'));
 for(let i=0;i<28;i++){const n=applyAction(g,{id:'a'+i,revision:i,seat:g.turn,kind:'pass',dish:0});await deny(req(g.turn===0?'blue':'red','cc/games/123456','PUT',n));await ok(req(g.turn===0?'red':'blue','cc/games/123456','PUT',n));await deny(req(g.turn===0?'red':'blue','cc/games/123456','PUT',n));g=n;}
 const base='cc/finals/123456/match';await ok(req('red',base+'/commits/0','PUT','a'.repeat(64)));await deny(req('red',base+'/commits/0','PUT','b'.repeat(64)));await deny(req('blue',base+'/reveals'));
 const reveal={recipe:[1,0,0,0,0],salt:'s'.repeat(64)};
 await deny(req('red',base+'/reveals/0','PUT',reveal));await ok(req('blue',base+'/commits/1','PUT','b'.repeat(64)));await ok(req('red',base+'/reveals/0','PUT',reveal));await deny(req('blue',base+'/reveals/0','PUT',reveal));await ok(req('blue',base+'/reveals/1','PUT',reveal));await ok(req('blue',base+'/reveals'));await deny(req('outsider',base+'/reveals'));
 await ok(req('red','cc/games/123456','PUT',finish(g,[reveal.recipe as any,reveal.recipe as any])));
});
test('rules: 4 players, 32 turns and team ownership isolation',async()=>{
 const code='234567',ids=['ra','ba','rb','bb'];await ok(req('ra','cc/meta/'+code,'PUT',{owner:'ra',count:4,created:Date.now(),closed:false}));
 for(let i=0;i<4;i++)await ok(req(ids[i],`cc/members/${code}/${i}`,'PUT',{uid:ids[i],ready:true}));let g=createGame(18,4,'team');await ok(req('ra',`cc/games/${code}`,'PUT',g));
 for(let i=0;i<32;i++){const n=applyAction(g,{id:'t'+i,revision:i,seat:g.turn,kind:'pass',dish:Math.floor(g.turn/2) as 0|1});await ok(req(ids[g.turn],`cc/games/${code}`,'PUT',n));g=n;}
 await deny(req('ra',`cc/finals/${code}/team/commits/2`,'PUT','a'.repeat(64)));
});
test('rules: simultaneous conditional writes apply only one action',async()=>{
 const code='345678';await ok(req('red3',`cc/meta/${code}`,'PUT',{owner:'red3',count:2,created:Date.now(),closed:false}));await ok(req('red3',`cc/members/${code}/0`,'PUT',{uid:'red3',ready:true}));await ok(req('blue3',`cc/members/${code}/1`,'PUT',{uid:'blue3',ready:true}));const g=createGame(19,2,'race');await ok(req('red3',`cc/games/${code}`,'PUT',g));
 const snapshot=await req('red3',`cc/games/${code}`,'GET',undefined,{'X-Firebase-ETag':'true'});assert.ok(snapshot.ok);const etag=snapshot.headers.get('etag');assert.ok(etag);await snapshot.text();
 const n=applyAction(g,{id:'race-action',revision:0,seat:0,kind:'add',dish:0,pigment:0});const responses=await Promise.all([req('red3',`cc/games/${code}`,'PUT',n,{'if-match':etag!}),req('red3',`cc/games/${code}`,'PUT',n,{'if-match':etag!})]);assert.equal(responses.filter(r=>r.ok).length,1);assert.ok(responses.some(r=>r.status===412));await Promise.all(responses.map(r=>r.text()));const stored=await(await req('red3',`cc/games/${code}`)).json();assert.equal(stored.revision,1);assert.equal(stored.remaining[0],13);assert.equal(stored.dishes[0][0][0],1);
});
test('rules: round pending submission and equal half-point awards are accepted',async()=>{
 const code='456789',ids=['round-red','round-blue'];
 await ok(req(ids[0],`cc/meta/${code}`,'PUT',{owner:ids[0],count:2,created:Date.now(),closed:false}));
 for(let seat=0;seat<2;seat++)await ok(req(ids[seat],`cc/members/${code}/${seat}`,'PUT',{uid:ids[seat],ready:true}));
 let game=createGame(32,2,'round');
 game.dishes[0][0]=[...game.targets[0].recipe];game.dishes[1][0]=[...game.targets[0].recipe];
 await ok(req(ids[0],`cc/games/${code}`,'PUT',game));
 const id=game.targets[0].id;
 for(let seat=0;seat<2;seat++){
  game=applyAction(game,{id:'round-'+seat,revision:game.revision,seat,kind:'submit',dish:0,targetId:id});
  await ok(req(ids[seat],`cc/games/${code}`,'PUT',game));
 }
 assert.equal(game.scores[0],62.5);assert.equal(game.scores[1],62.5);
 const invalid={...game,scores:[62.25,62.5],revision:game.revision+1,actor:0,lastId:'invalid'};
 await deny(req(ids[0],`cc/games/${code}`,'PUT',invalid));
});
