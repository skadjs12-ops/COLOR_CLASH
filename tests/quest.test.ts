import test from 'node:test';
import assert from 'node:assert/strict';
import {stages,startQuest,questAction,questStars,cleanProgress} from '../src/questEngine';
import {distance,mix,total,type Recipe} from '../src/colorEngine';
test('all 30 missions are solvable within action budget using permitted pigments',()=>{
 assert.equal(stages.length,30);
 for(const stage of stages){
  let run=startQuest(stage);
  for(let target=0;target<stage.targets.length;target++){
   const recipe=stage.solutions[target];
   assert.equal(mix(recipe),stage.targets[target]);
   assert.ok(total(recipe)<=6);
   const initial=run.dishes[0];
   for(let pigment=0;pigment<5;pigment++){
    assert.ok(recipe[pigment]>=initial[pigment]);
    for(let n=initial[pigment];n<recipe[pigment];n++)run=questAction(stage,run,'add',0,pigment);
   }
   run=questAction(stage,run,'submit',0,0,target);
  }
  assert.equal(questStars(run),3);
  assert.equal(run.done,true);
  assert.ok(run.remaining>=0);
  assert.throws(()=>questAction(stage,run,'add',0));
 }
});
test('quest colors do not repeat, and neighboring missions have distinct colors',()=>{
 const colors=stages.flatMap(stage=>stage.targets);
 assert.equal(new Set(colors).size,colors.length);
 for(let i=0;i<colors.length;i++)for(let j=i+1;j<colors.length;j++)assert.ok(distance(colors[i],colors[j])>.07);
 for(let i=1;i<stages.length;i++)assert.ok(distance(stages[i-1].targets[0],stages[i].targets[0])>.035);
});
test('quest restrictions, failed submissions, reset and malformed progress',()=>{
 const stage=stages[0];let run=startQuest(stage);
 assert.throws(()=>questAction(stage,run,'add',0,4));
 assert.throws(()=>questAction(stage,run,'submit',0));
 run=questAction(stage,run,'add',0,0);
 run=questAction(stage,run,'reset',0);
 assert.equal(total(run.dishes[0]),0);
 assert.equal(run.remaining,stage.actions-2);
 const restore=stages[18];run=startQuest(restore);
 const pigment=restore.solutions[0].findIndex(n=>n>0);
 run=questAction(restore,run,'add',0,pigment);
 run=questAction(restore,run,'reset',0);
 assert.deepEqual(run.dishes[0],restore.initial);
 assert.deepEqual(cleanProgress({'1':3,'2':4,'31':1,'3':'2'}),{'1':3});
});

test('chapter gate requires six clears and 12 best stars',async()=>{const {chapterOpen}=await import('../src/questEngine');const p:Record<string,number>={};for(let i=1;i<=6;i++)p[i]=1;assert.equal(chapterOpen(p,1),false);for(let i=1;i<=6;i++)p[i]=2;assert.equal(chapterOpen(p,1),true);delete p[6];p[1]=3;assert.equal(chapterOpen(p,1),false);});

test('beginner recipes progress from two drops to three with retry room',()=>{for(const s of stages.slice(0,6)){assert.equal(total(s.solutions[0]),s.id<=3?2:3);assert.equal(s.solutions[0].filter(Boolean).length,2);assert.ok(s.actions>=2*(total(s.solutions[0])+1)+1);}for(let c=1;c<5;c++){const prev=Math.max(...stages.filter(s=>s.chapter===c-1).flatMap(s=>s.solutions.map(total)));const next=Math.min(...stages.filter(s=>s.chapter===c).flatMap(s=>s.solutions.map(total)));assert.ok(next>=prev);}});
