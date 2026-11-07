import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationCells,restoredCells,territories,type Point} from '../src/mapRestoration';
const area=(p:Point[])=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
test('30 cells completely partition the atlas and each chapter',()=>{
 assert.equal(restorationCells.length,30);
 assert.ok(Math.abs(territories.reduce((n,p)=>n+area(p),0)-1536*1024)<.001);
 for(let c=0;c<5;c++){
  const cells=restorationCells.filter(s=>s.chapter===c),whole=area(territories[c]);
  assert.ok(cells.every(s=>area(s.polygon)>0&&area(s.polygon)<whole*.5));
  assert.ok(Math.abs(cells.reduce((n,s)=>n+area(s.polygon),0)-whole)<.001);
 }
});
test('one clear restores exactly one cell; stars never enlarge it; six clears restore chapter',()=>{
 for(let chapter=0;chapter<5;chapter++){
  const first=chapter*6+1;
  assert.deepEqual(restoredCells({[first]:1}),restoredCells({[first]:3}));
  assert.equal(restoredCells({[first]:3}).length,1);
  const p=Object.fromEntries(Array.from({length:6},(_,i)=>[first+i,1]));
  assert.equal(restoredCells(p).length,6);
  assert.ok(restoredCells(p).every(s=>s.chapter===chapter));
 }
 assert.equal(restoredCells({}).length,0);
});
