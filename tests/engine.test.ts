import test from 'node:test';import assert from 'node:assert/strict';
import {allRecipes,pool,mix,similarity,total,lab,distance,validRecipe,target} from '../src/colorEngine';
import {createGame,applyAction,finish,normalize,type Game,type Action} from '../src/gameEngine';
function act(g:Game,kind:Action['kind']='pass',rest:Partial<Action>={}){return applyAction(g,{id:`action-${g.revision}`,revision:g.revision,seat:g.turn,kind,dish:(g.count===4?Math.floor(g.turn/2):0) as 0|1,...rest});}
test('all 461 combinations reproduce targets exactly and bounded finals',()=>{assert.equal(allRecipes.length,461);assert.ok(pool.length>50);for(const r of allRecipes){assert.equal(similarity(mix(r),mix([...r])),100);assert.ok(validRecipe(r));}for(const t of pool){assert.equal(t.color,mix(t.recipe));assert.ok(t.minDrops<=total(t.recipe));}for(let i=0;i<100;i++)assert.ok(total(target(91,i,[],5).recipe)<=5);});
test('secondary pigment hue directions, ratio, white and black',()=>{const orange=lab(mix([1,1,0,0,0])),green=lab(mix([0,1,1,0,0])),purple=lab(mix([1,0,1,0,0]));assert.ok(orange[1]>0&&orange[2]>0);assert.ok(green[1]<0&&green[2]>0);assert.ok(purple[1]>0&&purple[2]<0);assert.notEqual(mix([1,1,0,0,0]),mix([2,1,0,0,0]));assert.ok(lab(mix([1,0,0,1,0]))[0]>lab(mix([1,0,0,0,0]))[0]);assert.ok(lab(mix([1,0,0,0,1]))[0]<lab(mix([1,0,0,0,0]))[0]);});
test('recipe counts remove ordering and scalar duplicates',()=>{assert.equal(mix([1,1,1,0,0]),mix([2,2,2,0,0]));const a=[0,1,2,0],b=[2,0,0,1];const count=(x:number[])=>x.reduce((r,i)=>{r[i]++;return r;},[0,0,0,0,0] as [number,number,number,number,number]);assert.equal(mix(count(a)),mix(count(b)));});
test('initial cards distinct and deterministic for 100 games',()=>{for(let s=1;s<=100;s++){const a=createGame(s),b=createGame(s);assert.deepEqual(a,b);for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(distance(a.targets[i].color,a.targets[j].color)>.06);}});
test('successful exact claim updates score once, replaces target, preserves other dish',()=>{let g=createGame(23);g.dishes[0][0]=g.targets[0].recipe;g.dishes[0][1]=[0,0,1,0,0];const id=g.targets[0].id;const points=g.targets[0].points;const pending=act(g,'submit',{targetId:id});assert.equal(pending.scores[0],0);assert.equal(pending.targets[0].id,id);const n=act(pending);assert.equal(n.scores[0],points+25);assert.equal(n.remaining[0],13);assert.equal(total(n.dishes[0][0]),0);assert.equal(total(n.dishes[0][1]),1);assert.notEqual(n.targets[0].id,id);assert.equal(n.turn,0);assert.throws(()=>applyAction(n,{id:'action-0',revision:0,seat:0,kind:'submit',dish:0,targetId:id}));assert.equal(g.revision,0);});
test('failed submission consumes one action, clears only submitted dish',()=>{let g=createGame(6);g.dishes[0][0]=allRecipes.find(r=>similarity(mix(r),g.targets[0].color)<80)!;const n=act(g,'submit',{targetId:g.targets[0].id});assert.equal(n.scores[0],0);assert.equal(n.targets[0].id,g.targets[0].id);assert.equal(n.remaining[0],13);assert.equal(total(n.dishes[0][0]),0);});
test('reject invalid actions, wrong turn, full or empty dishes, stale targets',()=>{const g=createGame(1);assert.throws(()=>act(g,'submit',{targetId:g.targets[0].id}));assert.throws(()=>act(g,'reset'));assert.throws(()=>act(g,'add',{seat:1,pigment:0}));assert.throws(()=>act(g,'add',{pigment:5}));assert.throws(()=>act(g,'add',{pigment:-1}));g.dishes[0][0]=[6,0,0,0,0];assert.throws(()=>act(g,'add',{pigment:0}));assert.throws(()=>act(g,'submit',{targetId:'stale'}));assert.throws(()=>act(g,'add',{revision:2,pigment:0}));});
test('complete 1v1 round and tied final, no actions after result',()=>{let g=createGame(4);for(let i=0;i<28;i++)g=act(g);assert.equal(g.phase,'final');assert.deepEqual(g.remaining,[0,0]);assert.throws(()=>act(g));g=finish(g,[g.finalTarget.recipe,g.finalTarget.recipe]);assert.equal(g.phase,'result');assert.deepEqual(g.scores,[100,100]);assert.deepEqual(g.finalAccuracy,[100,100]);assert.throws(()=>finish(g,[g.finalTarget.recipe,g.finalTarget.recipe]));});
test('2v2 guarantees eight turns each, owned dishes, team average final',()=>{let g=createGame(27,4);assert.throws(()=>act(g,'add',{dish:1,pigment:0}));const turns=[0,0,0,0];for(let i=0;i<32;i++){turns[g.turn]++;g=act(g);}assert.deepEqual(turns,[8,8,8,8]);assert.equal(g.phase,'final');const wrong=allRecipes.find(r=>total(r)<=5&&similarity(mix(r),g.finalTarget.color)<80)!;g=finish(g,[g.finalTarget.recipe,wrong,g.finalTarget.recipe,wrong]);assert.deepEqual(g.scores,[200,0]);});
test('final rejects empty/over capacity, serialized Firebase empty arrays normalize',()=>{let g=createGame(8);g.phase='final';assert.throws(()=>finish(g,[[0,0,0,0,0],[1,0,0,0,0]]));assert.throws(()=>finish(g,[[7,0,0,0,0],[1,0,0,0,0]]));const raw={...g,captures:null,finalRecipes:null,finalAccuracy:null};assert.deepEqual(normalize(raw as any).captures,[]);});
test('threshold boundaries and scores cover normal and precise awards',()=>{const g=createGame(18);let found=false;for(const t of pool){const r=allRecipes.find(r=>{const s=similarity(mix(r),t.color);return s>=80&&s<95;});if(r){g.targets[0]={...t,id:'test'};g.dishes[0][0]=r;assert.equal(act(act(g,'submit',{targetId:'test'})).scores[0],t.points);found=true;break;}}assert.ok(found);});
test('equal exact claims split the award and replace the card only once',()=>{
 for(const count of [2,4] as const){
  const g=createGame(31,count),card=g.targets[0];
  for(const dishes of g.dishes)dishes[0]=card.recipe;
  const pending=act(g,'submit',{targetId:card.id});
  const resolved=act(pending,'submit',{targetId:card.id});
  assert.deepEqual(resolved.scores,Array(2).fill((card.points+25)/2));
  assert.equal(resolved.serial,g.serial+1);
  assert.equal(resolved.pending,undefined);
 }
});
test('later higher accuracy wins a contested card',()=>{
 const g=createGame(18),card=g.targets[0];
 g.dishes[0][0]=allRecipes.find(r=>{const s=similarity(mix(r),card.color);return s>=80&&s<100;})!;
 g.dishes[1][0]=card.recipe;
 const n=act(act(g,'submit',{targetId:card.id}),'submit',{targetId:card.id});
 assert.deepEqual(n.scores,[0,card.points+25]);
});
