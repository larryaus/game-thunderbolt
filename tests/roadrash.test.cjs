const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Input=require('../roadrash-controls.js');
const root=path.join(__dirname,'..');
function timers(){let id=0;const intervals=new Map(),timeouts=new Map();return{intervals,timeouts,setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(id){intervals.delete(id);},setTimeout(fn){timeouts.set(++id,fn);return id;},clearTimeout(id){timeouts.delete(id);}};}
test('MD throttle, brake, attack and kick retain the original three-button mapping',()=>{
  assert.deepEqual(Input.buttons('throttle'),[0]);assert.deepEqual(Input.buttons('brake'),[1]);
  assert.deepEqual(Input.buttons('attack'),[8]);assert.deepEqual(Input.buttons('kick'),[5,8]);
});
test('braking overrides finger throttle and locked throttle, then restores held sources on release',()=>{
  const sent=[],i=new Input((id,v)=>sent.push([id,v]),timers());
  i.setCruise(true);i.set('finger',[0]);i.set('brake',[1]);
  assert.ok(!i.down.has(0));assert.ok(i.down.has(1));assert.ok(sent.some(x=>x[0]===0&&x[1]===0));
  i.release('finger');i.release('brake');assert.ok(i.down.has(0));
  i.clear();assert.equal(i.cruise,false);assert.equal(i.down.size,0);
});
function player(){
  const els=new Map(),events={},scripts=[],sent=[],t=timers();let pauses=0,plays=0,reloads=0;
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},attrs:{},listeners:{},hidden:false,disabled:false,textContent:'',setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.listeners[k]=f;},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:132,height:132})});return els.get(id);}
  const actions=['throttle','brake','attack','kick'].map(id=>{el(id).dataset.action=id;return el(id);});
  const document={getElementById:el,querySelectorAll:()=>actions,createElement:()=>({}),head:{appendChild(s){scripts.push(s);}},addEventListener(k,f){events[k]=f;},documentElement:{},hidden:false};
  const window={addEventListener(k,f){events[k]=f;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'roadrash.js'),'utf8'),{window,document,location:{reload(){reloads++;}},RoadRashInput:class extends Input{constructor(fn){super(fn,t);}},WofInput:require('../wof-controls.js'),setInterval:t.setInterval,clearInterval:t.clearInterval});
  const emu={gameManager:{simulateInput(p,id,v){sent.push([p,id,v]);}},pause(){pauses++;},play(){plays++;},setVolume(){},toggleVirtualGamepad(){}};
  function boot(){el('boot').listeners.click();window.EJS_emulator=emu;window.EJS_onGameStart();}
  function pointer(id,pointerId=1,extra={}){el(id).listeners.pointerdown({pointerId,preventDefault(){},...extra});}
  function up(id,pointerId=1){el(id).listeners.pointerup({pointerId});}
  function key(type,code,extra={}){events[type]({code,preventDefault(){},stopPropagation(){},...extra});}
  return{el,events,window,document,scripts,sent,t,boot,pointer,up,key,counts:()=>({pauses,plays,reloads})};
}
test('MD player loads its own local Genesis core, ROM and control scheme with controls gated during boot',()=>{
  const p=player();assert.equal(p.el('throttle').disabled,true);p.boot();
  assert.equal(p.window.EJS_core,'genesis_plus_gx');assert.equal(p.window.EJS_controlScheme,'segaMD');
  assert.equal(p.window.EJS_gameUrl,'roms/roadrash.md');assert.equal(p.window.EJS_forceLegacyCores,true);assert.equal(p.window.EJS_threads,false);
  assert.equal(p.scripts[0].src,'vendor/emulatorjs/loader.js');assert.equal(p.el('throttle').disabled,false);
});
test('steering, throttle and combat work together and releasing kick preserves a held C attack',()=>{
  const p=player();p.boot();p.pointer('stick',1,{clientX:110,clientY:66});p.pointer('throttle',2);p.pointer('attack',3);p.pointer('kick',4);
  for(const id of [0,5,7,8])assert.ok(p.sent.some(x=>x[1]===id&&x[2]===1));
  p.up('kick',4);assert.ok(p.sent.some(x=>x[1]===5&&x[2]===0));assert.ok(!p.sent.some(x=>x[1]===8&&x[2]===0));
  p.up('attack',3);assert.ok(p.sent.some(x=>x[1]===8&&x[2]===0));
  assert.ok(!p.sent.some(x=>x[1]===0&&x[2]===0));p.up('throttle',2);assert.equal(p.t.intervals.size,0);
});
test('cancelled touches release their inputs; duplicate touches on one button release independently',()=>{
  const p=player();p.boot();p.pointer('throttle',1);p.pointer('throttle',2);p.up('throttle',1);
  assert.equal(p.el('throttle').dataset.held,'true');assert.ok(!p.sent.some(x=>x[1]===0&&x[2]===0));
  p.el('throttle').listeners.pointercancel({pointerId:2});assert.equal(p.el('throttle').dataset.held,'false');assert.equal(p.sent.at(-1)[2],0);
});
test('pause and backgrounding clear the throttle latch, directions and all pending start pulses',()=>{
  const p=player();p.boot();p.el('start').listeners.click();assert.equal(p.t.timeouts.size,1);
  p.el('cruise').listeners.click();p.pointer('stick',1,{clientX:20,clientY:66});p.pointer('kick',2);p.events.blur();
  for(const id of [0,3,5,6,8])assert.ok(p.sent.some(x=>x[1]===id&&x[2]===0));
  assert.equal(p.el('cruise').attrs['aria-pressed'],'false');assert.equal(p.el('kick').disabled,true);assert.equal(p.t.timeouts.size,0);
  p.el('resume').listeners.click();assert.deepEqual(p.counts(),{pauses:1,plays:1,reloads:0});
  const count=p.sent.length;p.events.keyup({code:'KeyJ',preventDefault(){},stopPropagation(){}});assert.equal(p.sent.length,count);
  p.el('cruise').listeners.click();p.document.hidden=true;p.events.visibilitychange();assert.equal(p.el('cruise').attrs['aria-pressed'],'false');assert.equal(p.counts().pauses,2);
});
test('keyboard maps original inputs, START cancels throttle lock, and focused controls avoid duplicate activation',()=>{
  const p=player();p.boot();p.key('keydown','KeyJ');p.key('keydown','KeyL');p.key('keydown','Space');
  for(const id of [0,5,8])assert.ok(p.sent.some(x=>x[1]===id&&x[2]===1));
  p.key('keyup','Space');assert.ok(!p.sent.some(x=>x[1]===8&&x[2]===0));p.key('keyup','KeyL');p.key('keyup','KeyJ');
  p.el('cruise').listeners.click();p.key('keydown','Enter');assert.equal(p.el('cruise').attrs['aria-pressed'],'false');assert.equal(p.sent.at(-1)[1],3);
  p.key('keyup','Enter');const n=p.sent.length;
  p.key('keydown','Space',{target:{closest:s=>s==='button,a'?{}:null}});assert.equal(p.sent.length,n);
  p.key('keydown','KeyP');assert.equal(p.counts().pauses,1);
});
test('loader errors expose retry and keep driving controls disabled',()=>{
  const p=player();p.el('boot').listeners.click();p.scripts[0].onerror();assert.equal(p.el('boot-cover').hidden,false);assert.equal(p.el('boot').disabled,false);assert.equal(p.el('throttle').disabled,true);
  p.el('boot').listeners.click();assert.equal(p.scripts.length,2);
});
test('all MD page assets resolve and the shipped ROM and core match validated hashes',()=>{
  const html=fs.readFileSync(path.join(root,'roadrash.html'),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[^"#]*)"/g))if(!m[1].includes(':'))assert.ok(fs.existsSync(path.join(root,m[1])),m[1]);
  for(const m of fs.readFileSync(path.join(root,'roadrash.js'),'utf8').matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes(`id="${m[1]}"`),m[1]);
  const rom=fs.readFileSync(path.join(root,'roms/roadrash.md'));assert.equal(rom.length,786432);assert.ok(rom.subarray(0x150,0x180).toString().includes('Road Rash'));
  assert.equal(crypto.createHash('sha256').update(rom).digest('hex'),'f7e95580baf30184d4d18a44042ea7a353308a8ed301d8421aed42f7b0f89663');
  const core=fs.readFileSync(path.join(root,'vendor/emulatorjs/cores/genesis_plus_gx-legacy-wasm.data'));
  assert.equal(crypto.createHash('sha256').update(core).digest('hex'),'2a1edeb68d7ec882149ed3cd5d3aa95a6ac231ebabaf82cdb56175a8b62967cc');
  assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="roadrash.html?v=md1"'));
});
