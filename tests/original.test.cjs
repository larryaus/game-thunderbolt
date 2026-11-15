const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Input=require('../wof-controls.js');
function timers(){let seq=0;const intervals=new Map(),timeouts=new Map();return{intervals,timeouts,setInterval(fn){intervals.set(++seq,fn);return seq;},clearInterval(id){intervals.delete(id);},setTimeout(fn){const id=++seq;timeouts.set(id,()=>{timeouts.delete(id);fn();});return id;},clearTimeout(id){timeouts.delete(id);}};}
test('physical arcade mapping supports diagonals, neutral position, and pointer deadzone',()=>{
  assert.deepEqual(Input.directions(0,0),[]);assert.deepEqual(Input.directions(60,0),[7]);assert.deepEqual(Input.directions(-60,0),[6]);assert.deepEqual(Input.directions(0,-60),[4]);assert.deepEqual(Input.directions(0,60),[5]);assert.deepEqual(Input.directions(40,-40),[4,7]);
});
test('releasing one touch preserves inputs still held by another touch',()=>{
  const sent=[],input=new Input((id,v)=>sent.push([id,v]),timers());input.set('stick',[4,7]);input.set('jump',[8]);input.set('special',[0,8]);input.release('special');assert.deepEqual([...input.down].sort((a,b)=>a-b),[4,7,8]);assert.ok(!sent.some(([id,v])=>id===8&&v===0));input.release('jump');assert.deepEqual([...input.down],[4,7]);input.clear();assert.equal(input.down.size,0);
});
test('holding attack produces repeat presses, and cancelling releases it and stops its timer',()=>{
  const t=timers(),sent=[],input=new Input((id,v)=>sent.push([id,v]),t);input.attack('finger',true);assert.equal(t.intervals.size,1);const tick=[...t.intervals.values()][0];tick();tick();assert.deepEqual(sent.slice(0,3),[[0,1],[0,0],[0,1]]);input.attack('finger',false);assert.equal(t.intervals.size,0);assert.equal(input.down.size,0);
  input.attack('finger',true);input.setTurbo(false);assert.equal(t.intervals.size,0);assert.equal(input.down.has(0),true);input.clear();assert.equal(input.down.size,0);
});
test('coin pulses expire and clearing inputs cancels all delayed events',()=>{
  const t=timers(),input=new Input(()=>{},t);input.pulse('coin',[2]);assert.equal(input.down.has(2),true);[...t.timeouts.values()][0]();assert.equal(input.down.has(2),false);input.pulse('coin',[2]);input.clear();assert.equal(t.timeouts.size,0);assert.equal(input.down.size,0);
});
function player(arcade='wof'){
  const els=new Map(),events={},scripts=[],sent=[],t=timers();let pauseCount=0,playCount=0;
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},attrs:{},listeners:{},hidden:false,disabled:false,textContent:'',setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.listeners[k]=f;},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:132,height:132})});return els.get(id);}
  const actions=['attack','jump','special'].map(id=>{el(id).dataset.action=id;return el(id);}),pulses=['coin','start'].map((id,i)=>{el(id).dataset.pulse=String(i+2);return el(id);});
  const document={body:{dataset:{arcade}},getElementById:el,querySelectorAll:s=>s==='[data-action]'?actions:pulses,createElement:()=>({}),head:{appendChild(s){scripts.push(s);}},addEventListener(k,f){events[k]=f;},documentElement:{},hidden:false};
  const window={addEventListener(k,f){events[k]=f;}};
  const sandbox={window,document,Blob,URL:{createObjectURL:()=>"blob:mslug-test",revokeObjectURL(){}},ArcadeRom:{load:async()=>({name:'mslug.zip',bytes:new Uint8Array([80,75])})},location:{reload(){}},WofInput:class extends Input{constructor(send){super(send,t);}},setInterval:t.setInterval,clearInterval:t.clearInterval,console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../wof.js'),'utf8'),sandbox);
  const emu={gameManager:{simulateInput(p,id,v){sent.push([p,id,v]);}},pause(){pauseCount++;},play(){playCount++;},setVolume(){},toggleVirtualGamepad(){}};
  function boot(){el('boot').listeners.click();window.EJS_emulator=emu;window.EJS_onGameStart();}
  async function bootAsync(){await el('boot').listeners.click();window.EJS_emulator=emu;window.EJS_onGameStart();}
  return{el,events,scripts,window,document,sent,t,boot,bootAsync,loader:sandbox.ArcadeRom,counts:()=>({pauseCount,playCount})};
}
test('original player config uses the real local ROM and a single-threaded FBNeo core',()=>{
  const p=player();assert.equal(p.el('coin').disabled,true);p.boot();assert.equal(p.window.EJS_core,'fbneo');assert.equal(p.window.EJS_gameUrl,'roms/wof.zip');assert.equal(p.window.EJS_forceLegacyCores,true);assert.equal(p.window.EJS_threads,false);assert.equal(p.scripts[0].src,'vendor/emulatorjs/loader.js');assert.equal(p.el('coin').disabled,false);
});
test('player can move, attack and jump together; pause releases every physical input',()=>{
  const p=player();p.boot();p.el('stick').listeners.pointerdown({pointerId:1,clientX:110,clientY:66,preventDefault(){}});p.el('attack').listeners.pointerdown({pointerId:2,preventDefault(){}});p.el('jump').listeners.pointerdown({pointerId:3,preventDefault(){}});
  assert.ok(p.sent.some(x=>x[1]===7&&x[2]===1));assert.ok(p.sent.some(x=>x[1]===0&&x[2]===1));assert.ok(p.sent.some(x=>x[1]===8&&x[2]===1));p.el('pause').listeners.click();assert.deepEqual(p.counts(),{pauseCount:1,playCount:0});for(const id of [0,7,8])assert.ok(p.sent.some(x=>x[1]===id&&x[2]===0));assert.equal(p.t.intervals.size,0);assert.equal(p.el('pause-cover').hidden,false);p.el('resume').listeners.click();assert.equal(p.counts().playCount,1);
});
test('original player accepts coin/start, keyboard inputs and pauses when backgrounded',()=>{
  const p=player();p.boot();p.el('coin').listeners.click();assert.ok(p.sent.some(x=>x[1]===2&&x[2]===1));p.el('start').listeners.click();assert.ok(p.sent.some(x=>x[1]===3&&x[2]===1));
  p.events.keydown({code:'KeyK',preventDefault(){},stopPropagation(){}});assert.ok(p.sent.some(x=>x[1]===8&&x[2]===1));p.events.keyup({code:'KeyK'});assert.ok(p.sent.some(x=>x[1]===8&&x[2]===0));p.events.blur();assert.equal(p.counts().pauseCount,1);
});
test('old warriors bookmarks route to the original game, other game URLs remain untouched',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../route-original.js'),'utf8');let next=null;vm.runInNewContext(source,{URLSearchParams,location:{search:'?game=warriors&v=war1',replace(v){next=v;}}});assert.equal(next,'wof.html?v=original1');next=null;vm.runInNewContext(source,{URLSearchParams,location:{search:'?game=snake',replace(v){next=v;}}});assert.equal(next,null);
});
test('all original player assets are present, ROM matches the validated source, and lobby points to original',()=>{
  const root=path.join(__dirname,'..'),rom=fs.readFileSync(path.join(root,'roms/wof.zip'));assert.equal(rom.length,3944835);assert.equal(crypto.createHash('sha256').update(rom).digest('hex'),'8004d789ee5c234e6252bd3adcbdb44cce1c7d175225091d7c38fa6564f056de');
  for(const file of ['wof.html','wof.js','wof.css','wof-controls.js','assets/wof-original.png','vendor/emulatorjs/loader.js','vendor/emulatorjs/emulator.min.js','vendor/emulatorjs/emulator.min.css','vendor/emulatorjs/compression/extract7z.js','vendor/emulatorjs/compression/extractzip.js','vendor/emulatorjs/localization/zh-CN.json','vendor/emulatorjs/cores/reports/fbneo.json','vendor/emulatorjs/cores/fbneo-legacy-wasm.data','vendor/emulatorjs/LICENSE'])assert.ok(fs.statSync(path.join(root,file)).size>0,file);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(html.includes('href="wof.html?v=original1"'));assert.ok(!/class="game-card[^>]*href="play\.html\?game=warriors/.test(html));
});

test('Metal Slug selects the assembled original ZIP and keeps grenade separate from jump and shoot',async()=>{
  const p=player('mslug');await p.bootAsync();assert.equal(p.window.EJS_gameUrl,'blob:mslug-test');assert.equal(p.window.EJS_gameName,'mslug.zip');assert.ok(!p.el('status').textContent.includes('选将'));
  p.el('jump').listeners.pointerdown({pointerId:2,preventDefault(){}});p.el('special').listeners.pointerdown({pointerId:3,preventDefault(){}});
  assert.ok(p.sent.some(x=>x[1]===8&&x[2]===1));assert.ok(p.sent.some(x=>x[1]===1&&x[2]===1));assert.ok(!p.sent.some(x=>x[1]===0&&x[2]===1));p.el('special').listeners.pointerup({pointerId:3});assert.ok(!p.sent.some(x=>x[1]===8&&x[2]===0));
  p.events.keydown({code:'KeyL',preventDefault(){},stopPropagation(){}});assert.equal(p.sent.at(-1)[1],1);p.events.keyup({code:'KeyL'});p.el('pause').listeners.click();
});
test('old Commando bookmarks now open original Metal Slug',()=>{
  let next;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../route-original.js'),'utf8'),{URLSearchParams,location:{search:'?game=commando',replace(v){next=v;}}});assert.equal(next,'mslug.html?v=original1');
});

test('Metal Slug loading failure is visible and can be retried without enabling controls',async()=>{
  const p=player('mslug');p.loader.load=async()=>{throw Error('游戏文件校验失败');};await p.el('boot').listeners.click();assert.equal(p.el('boot-cover').hidden,false);assert.equal(p.el('boot').disabled,false);assert.equal(p.el('attack').disabled,true);assert.ok(p.el('status').textContent.includes('校验失败'));assert.equal(p.scripts.length,0);
  p.loader.load=async()=>({name:'mslug.zip',bytes:new Uint8Array([80,75])});await p.bootAsync();assert.equal(p.el('attack').disabled,false);
});
test('shared player retains the original Three Kingdoms A+B special',()=>{
  const p=player();p.boot();p.el('special').listeners.pointerdown({pointerId:9,preventDefault(){}});assert.ok(p.sent.some(x=>x[1]===0&&x[2]===1));assert.ok(p.sent.some(x=>x[1]===8&&x[2]===1));assert.ok(!p.sent.some(x=>x[1]===1&&x[2]===1));p.el('special').listeners.pointerup({pointerId:9});
});
