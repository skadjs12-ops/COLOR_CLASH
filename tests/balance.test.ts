import test from 'node:test';import assert from 'node:assert/strict';
import {competitionPool,allRecipes,pigments,similarity,mix,total,distance,target,winningRecipes} from '../src/colorEngine';
import {createGame,applyAction} from '../src/gameEngine';
test('all competition goals reject every single-pigment claim at the actual 80 threshold',()=>{
 assert.ok(competitionPool.length>100);for(const t of competitionPool){assert.ok(t.recipe.filter(Boolean).length>=2);for(const r of allRecipes.filter(r=>r.filter(Boolean).length===1))assert.ok(similarity(mix(r),t.color)<80,`${t.color} claimed by ${r}`);for(const c of pigments)assert.ok(similarity(c,t.color)<80);const winners=winningRecipes(t);assert.ok(winners.length);assert.ok(winners.every(r=>total(r)>=2&&r.filter(Boolean).length>=2));}
});
test('1000 opening sets for local, online-shared and team have three difficulties, distinct reachable mixed goals',()=>{
 for(let seed=1;seed<=1000;seed++){const g=createGame(seed,seed%2?2:4);assert.deepEqual(g.targets.map(t=>t.level),[0,1,2]);for(const t of g.targets){assert.ok(competitionPool.some(c=>c.color===t.color));assert.equal(mix(t.recipe),t.color);assert.ok(t.minDrops>=2);}for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(distance(g.targets[i].color,g.targets[j].color)>.045);}
});
test('all replacement difficulty slots and finals keep competition eligibility and drop limits',()=>{
 for(let serial=0;serial<100;serial++){const t=target(20261104,serial);assert.equal(t.level,serial%3);assert.ok(pigments.every(c=>similarity(c,t.color)<80));const final=target(20261104,serial,[],5);assert.ok(total(final.recipe)<=5);assert.equal(mix(final.recipe),final.color);}
 let g=createGame(99);g.dishes[0][0]=g.targets[0].recipe;const old=g.targets[0].id;g=applyAction(g,{id:'balanced-claim',revision:0,seat:0,kind:'submit',dish:0,targetId:old});g=applyAction(g,{id:'resolve',revision:1,seat:1,kind:'pass',dish:0});assert.notEqual(g.targets[0].id,old);assert.ok(pigments.every(c=>similarity(c,g.targets[0].color)<80));
});
test('adding any single pigment then submitting cannot score for either side at the opening',()=>{
 for(let seed=1;seed<=100;seed++)for(let seat=0;seat<2;seat++)for(let pigment=0;pigment<5;pigment++)for(let card=0;card<3;card++){
  let g=createGame(seed);g.turn=seat;const recipe=[0,0,0,0,0] as [number,number,number,number,number];recipe[pigment]=1;g.dishes[seat][0]=recipe;
  g=applyAction(g,{id:'single',revision:0,seat,kind:'submit',dish:0,targetId:g.targets[card].id});assert.equal(g.scores[seat],0);
 }
});
