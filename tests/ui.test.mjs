import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
const html=readFileSync('PLAY.html','utf8');
const wait=()=>new Promise(r=>setTimeout(r,30));
async function mount(storage={}){const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css-parsing'&&e.type!=='not-implemented')errors.push(e.message);});const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://color-clash.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});for(const[k,v]of Object.entries(storage))w.localStorage.setItem(k,v);}});await wait();const doc=dom.window.document;async function click(query){const el=typeof query==='string'?doc.querySelector(query):query;assert.ok(el,'Button exists: '+query);assert.ok(!el.disabled,'Button enabled: '+query);el.click();await wait();}return {dom,doc,click,errors};}
test('offline DOM: menu, tutorial real mixing, success and replay',async()=>{const {dom,doc,click,errors}=await mount();try{assert.ok(doc.querySelector('.hero-art img').src.startsWith('data:image/png'));await click('.hero-secondary button:nth-child(2)');assert.ok(doc.querySelector('.game-guide'));await click('.guide-tabs button:nth-child(2)');assert.match(doc.querySelector('.guide-copy').textContent,/14회/);await click('.guide-practice');await click('[aria-label="RED 물감 추가"]');await click('[aria-label="YELLOW 물감 추가"]');assert.match(doc.querySelector('.drop-count').textContent,/2 \/ 6/);await click('[aria-label="색 비교 후 다음"]');await click('[aria-label="튜토리얼 목표 선택"]');await click('.tutorial > .primary');assert.match(doc.querySelector('.tutorial-win').textContent,/100%/);await click('.tutorial-win .primary');assert.ok(doc.querySelector('.mode-grid'));assert.equal(doc.querySelector('.battle'),null);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: local battle turns, dishes, reset, final and replay',async()=>{const{dom,doc,click,errors}=await mount();try{await click('.play');await click('.mode-local');assert.equal(doc.querySelectorAll('.target').length,3);assert.equal(doc.querySelectorAll('.plates .plate').length,2);assert.ok(doc.querySelector('.submit').disabled);await click('[aria-label="RED 물감 추가"]');assert.match(doc.querySelector('.round-label').textContent,/2/);await click('[aria-label="BLUE 물감 추가"]');assert.match(doc.querySelector('.plates .selected .drop-count').textContent,/1 \/ 6/);await click('[aria-label="MIX 02"]');assert.match(doc.querySelector('.plates .selected .drop-count').textContent,/0 \/ 6/);await click('[aria-label="YELLOW 물감 추가"]');await click('.action-buttons > div > button:last-child');await click('[aria-label="MIX 02"]');await click('.action-buttons > div > button:first-child');for(let i=5;i<28;i++)await click('.action-buttons > div > button:last-child');assert.ok(doc.querySelector('.final-page'));await click('.handoff .primary');assert.match(doc.querySelector('.drop-count').textContent,/0 \/ 6/);await click('[aria-label="RED 물감 추가"]');await click('.final-actions .primary');await click('.handoff .primary');await click('[aria-label="RED 물감 추가"]');await click('.final-actions .primary');assert.ok(doc.querySelector('.result-page'));await click('.final-actions .primary');assert.match(doc.querySelector('.round-label').textContent,/1/);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: team assigned dish and full 32-turn game',async()=>{const{dom,doc,click,errors}=await mount();try{await click('.play');await click('#team-mode .team-buttons button');assert.ok(doc.querySelector('[aria-label="MIX 02"]').disabled);for(let i=0;i<32;i++){assert.equal(doc.querySelectorAll('.plate-wrap:disabled').length,1);await click('.action-buttons > div > button:last-child');}for(let i=0;i<4;i++){await click('.handoff .primary');await click('[aria-label="YELLOW 물감 추가"]');await click('.final-actions .primary');}assert.equal(doc.querySelectorAll('.final-chips > div').length,5);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: lab save, restore, delete and corrupt saved data',async()=>{const{dom,doc,click,errors}=await mount({'cc-recipes':'{"broken":true}'});try{await click('.hero-secondary button:nth-child(1)');await click('[aria-label="RED 물감 추가"]');await click('[aria-label="BLUE 물감 추가"]');await click('.lab-mixer .primary');assert.equal(doc.querySelectorAll('.recipe-grid>div').length,1);await click('.lab-mixer .secondary');assert.match(doc.querySelector('.drop-count').textContent,/0 \/ 6/);await click('.recipe-grid>div>button:first-child');assert.match(doc.querySelector('.drop-count').textContent,/2 \/ 6/);await click('[aria-label="저장 색 1 삭제"]');assert.equal(doc.querySelectorAll('.recipe-grid>div').length,0);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: exact submission awards points and replaces target',async()=>{const {pool,names}=await import('../src/colorEngine.ts');const{dom,doc,click,errors}=await mount();try{await click('.play');await click('.mode-local');const swatch=doc.querySelector('.target-swatch').style.background;const normalize=hex=>{const e=doc.createElement('i');e.style.background=hex;return e.style.background;};const target=pool.find(t=>normalize(t.color)===swatch);assert.ok(target);const expected=Number(doc.querySelector('.target-meta strong').textContent.replace(/\D/g,''))+25;await click('[aria-label="목표 1 선택"]');for(let i=0;i<5;i++)for(let n=0;n<target.recipe[i];n++){await click(`[aria-label="${names[i]} 물감 추가"]`);await click('.action-buttons>div>button:last-child');}await click('.submit');assert.match(doc.querySelector('.feedback').textContent,/판정 대기/);await click('.action-buttons>div>button:last-child');assert.equal(Number(doc.querySelector('.score-panel.red>strong').textContent),expected);assert.notEqual(doc.querySelector('.target-swatch').style.background,swatch);assert.match(doc.querySelector('.feedback').textContent,/100%/);assert.equal(doc.querySelectorAll('.mini-captures i').length,1);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: six drops disable adding and reset clears own dish',async()=>{const{dom,doc,click,errors}=await mount();try{await click('.play');await click('.mode-local');for(let i=0;i<6;i++){await click('[aria-label="RED 물감 추가"]');await click('.action-buttons>div>button:last-child');}assert.equal(doc.querySelectorAll('.pigment:disabled').length,5);assert.match(doc.querySelector('.selected .drop-count').textContent,/6 \/ 6/);await click('.action-buttons>div>button:first-child');await click('.action-buttons>div>button:last-child');assert.match(doc.querySelector('.selected .drop-count').textContent,/0 \/ 6/);assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('offline DOM: quest exact clear, unlock, persisted stars and replay',async()=>{
 const {stages}=await import('../src/questEngine.ts');
 const {dom,doc,click,errors}=await mount();
 try{
  await click('.play');await click('[aria-label="COLOR QUEST 혼자 도전"]');assert.equal(doc.querySelectorAll('.atlas-pin').length,5);await click('.region-0');await click('.region-enter');assert.equal(doc.querySelectorAll('.quest-node').length,6);
  assert.equal(doc.querySelectorAll('.quest-node:not(:disabled)').length,1);
  await click('[aria-label="스테이지 1"]');
  for(let i=0;i<5;i++)for(let n=0;n<stages[0].solutions[0][i];n++)await click(`[aria-label="${['RED','YELLOW','BLUE','WHITE','BLACK'][i]} 물감 추가"]`);
  await click('.quest-page .submit');assert.match(doc.querySelector('.quest-result').textContent,/MISSION CLEAR/);
  assert.match(doc.querySelector('.quest-stars').textContent,/★★★/);
  await click('[aria-label="홈으로"]');await click('.play');await click('[aria-label="COLOR QUEST 혼자 도전"]');
  await click('.region-0');await click('.region-enter');assert.equal(doc.querySelectorAll('.quest-node:not(:disabled)').length,2);
  assert.equal(JSON.parse(dom.window.localStorage.getItem('cc-quest-v1'))['1'],3);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
test('offline DOM: independent music, effects and reduced animation settings',async()=>{
 const {dom,doc,click,errors}=await mount({'cc-reduced':'false'});
 try{
  const button=name=>doc.querySelector(`[aria-label="${name}"]`);
  assert.equal(button('배경 음악 전환').getAttribute('aria-pressed'),'true');
  assert.equal(button('효과음 전환').getAttribute('aria-pressed'),'true');await click(button('배경 음악 전환'));await click(button('효과음 전환'));assert.equal(button('화면 효과 전환'),null);await click(button('소리와 화면 설정'));await click(button('화면 효과 전환'));
  assert.equal(button('배경 음악 전환').getAttribute('aria-pressed'),'false');
  assert.equal(button('효과음 전환').getAttribute('aria-pressed'),'false');
  assert.ok(doc.querySelector('.app.reduced'));
  assert.ok(doc.querySelector('[aria-label="배경 음악 음량"]'));
  assert.equal(dom.window.localStorage.getItem('cc-music'),'false');
  assert.equal(dom.window.localStorage.getItem('cc-sound'),'false');
  assert.ok(html.includes('data:audio/mpeg;base64,'));
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('offline DOM: system motion preference initializes OFF, explicit ON and preview persist',async()=>{
 const {dom,doc,click,errors}=await mount();
 try{
  assert.ok(doc.querySelector('.app.reduced'));
  await click('[aria-label="소리와 화면 설정"]');
  assert.ok([...doc.querySelectorAll('button')].find(e=>e.textContent==='효과 미리보기').disabled);
  await click('[aria-label="화면 효과 전환"]');
  assert.equal(doc.querySelector('.app.reduced'),null);
  await click([...doc.querySelectorAll('button')].find(e=>e.textContent==='효과 미리보기'));
  assert.ok(doc.querySelector('.light-preview'));
  assert.equal(dom.window.localStorage.getItem('cc-reduced'),'false');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
