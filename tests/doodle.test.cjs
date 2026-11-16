const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Motion=require('../doodle-motion.js'),root=path.join(__dirname,'..');
function environment(Device=function(){}){
  let seq=0;const events={},timeouts=new Map();
  const env={DeviceOrientationEvent:Device,isSecureContext:true,screen:{orientation:{angle:0}},
    addEventListener(k,f){events[k]=f;},removeEventListener(k,f){if(events[k]===f)delete events[k];},
    setTimeout(fn){timeouts.set(++seq,fn);return seq;},clearTimeout(id){timeouts.delete(id);}};
  return{env,events,timeouts,sample(gamma,beta=50){events.deviceorientation?.({gamma,beta});},expire(){const jobs=[...timeouts.values()];timeouts.clear();jobs.forEach(fn=>fn());}};
}
test('tilt requests Safari permission in the initiating gesture and starts only after grant',async()=>{
  let resolve,calls=0;const Device={requestPermission(){calls++;return new Promise(r=>resolve=r);}},e=environment(Device),m=new Motion(e.env);
  const pending=m.enable();assert.equal(calls,1);assert.equal(m.state,'requesting');assert.equal(e.events.deviceorientation,undefined);
  resolve('granted');assert.equal(await pending,true);e.sample(10);assert.equal(m.state,'on');assert.equal(m.value,0);
  for(let i=0;i<20;i++)e.sample(25);assert.ok(m.value>10);assert.ok(m.value<=18);
});
test('denied, unavailable and throwing permissions preserve safe neutral touch fallback',async()=>{
  for(const Device of [undefined,{requestPermission:async()=>'denied'},{requestPermission:async()=>{throw Error('blocked');}}]){
    const e=environment();e.env.DeviceOrientationEvent=Device;const m=new Motion(e.env);
    assert.equal(await m.enable(),false);assert.equal(m.value,0);assert.equal(e.events.deviceorientation,undefined);
  }
  const e=environment();e.env.isSecureContext=false;assert.equal(await new Motion(e.env).enable(),false);
});
test('missing sensor samples time out without accepting null angles or leaving steering enabled',async()=>{
  const e=environment(),m=new Motion(e.env);await m.enable();e.sample(null,null);assert.equal(m.state,'waiting');e.expire();assert.equal(m.state,'unavailable');assert.equal(m.value,0);assert.equal(e.events.deviceorientation,undefined);
});
test('rotation axes, deadzone and calibration work for portrait, both landscapes and upside-down screens',async()=>{
  assert.equal(Motion.axis({gamma:15,beta:30},0),15);assert.ok(Math.abs(Motion.axis({gamma:15,beta:30},90)-30)<1e-6);
  assert.ok(Math.abs(Motion.axis({gamma:15,beta:30},270)+30)<1e-6);assert.equal(Motion.axis({gamma:null,beta:30}),null);
  const e=environment(),m=new Motion(e.env);await m.enable();e.sample(0);e.sample(2);assert.equal(m.value,0);
  e.sample(-20);assert.ok(m.value<0);m.calibrate();assert.equal(m.value,0);e.sample(-20);assert.equal(m.value,0);e.sample(0);assert.ok(m.value>0);
});
test('pause clears steering and resume waits for a fresh neutral angle; stalled sensors stop but can recover',async()=>{
  const e=environment(),m=new Motion(e.env);await m.enable();e.sample(0);e.sample(20);assert.ok(m.value>0);
  m.suspend();e.sample(-20);assert.equal(m.value,0);assert.equal(e.timeouts.size,0);m.resume();assert.equal(m.value,0);
  e.sample(-20);assert.equal(m.value,0);e.sample(0);assert.ok(m.value>0);e.expire();assert.equal(m.value,0);assert.equal(m.state,'waiting');
  e.sample(0);assert.equal(m.state,'on');assert.ok(m.value>0);m.disable();assert.equal(e.events.deviceorientation,undefined);
});
test('disabling while permission is pending prevents late grants from attaching a listener',async()=>{
  let resolve;const e=environment({requestPermission:()=>new Promise(r=>resolve=r)}),m=new Motion(e.env);
  const pending=m.enable();m.disable();resolve('granted');assert.equal(await pending,false);assert.equal(m.state,'off');assert.equal(e.events.deviceorientation,undefined);
});
function player(blocked=false,permission='granted',bootMode='deferred'){
  const e=environment({requestPermission:async()=>permission}),els=new Map(),events=e.events,storage=new Map(),scripts=[];
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},hidden:false,disabled:false,attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.listeners[k]=f;},setPointerCapture(){}});return els.get(id);}
  const buttons=['left','right'].map(id=>{el(id).dataset.direction=id;return el(id);});
  const document={hidden:false,getElementById:el,querySelectorAll:()=>buttons,createElement:()=>({}),head:{appendChild(s){scripts.push(s);s.onload();}},addEventListener(k,f){events[k]=f;},documentElement:{}};
  function signal(){const listeners=[];return{add:f=>listeners.push(f),emit:()=>listeners.forEach(f=>f())};}
  let game,shots=0,updates=0,reloads=0;
  const window=e.env;const D={};
  D.BootState={init(){}};D.PreloadState={};D.MenuState={create(){}};
  D.GameState={create(){this.player={alive:true,frame:0,scale:{setTo(){}},body:{velocity:{x:0,y:0}}};this.cursors={left:{isDown:false},right:{isDown:false}};this.score=0;this.GYRO_SENSE=40;},update(){updates++;},playerShoot(){shots++;},gameOver(){this.player.alive=false;}};
  D.CalibrateState={create(){},update(){}};D.SettingsState={};D.ScoresState={};window.Doodle=D;
  class Game{
    constructor(){game=this;this.isBooted=false;this.height=955;this.sound=null;this.input={keyboard:{reset(){}}};this.scale={refresh(){}};this.onPause=null;this.onResume=null;
      this.load={onFileError:signal(),onFileComplete:signal()};this.state={current:'',states:{},add:(n,o)=>{o.game=this;o.state=this.state;o.load=this.load;this.state.states[n]=o;},getCurrentState:()=>this.state.states[this.state.current],start:n=>{
        if(n==='Boot'&&!this.isBooted){if(bootMode!=='hang')setImmediate(()=>{this.isBooted=true;this.onPause=signal();this.onResume=signal();this.sound={};this.state.start(n);});return;}
        this.state.current=n;const s=this.state.states[n];s.init?.();s.create?.();if(n==='Boot')this.state.start('Menu');
      }};
    }
    set paused(on){if(!this.isBooted)throw Error('Phaser components not initialized');const before=this._paused;this._paused=on;if(before!==on)(on?this.onPause:this.onResume).emit();}
    get paused(){return !!this._paused;}
  }
  vm.runInNewContext(fs.readFileSync(path.join(root,'doodle.js'),'utf8'),{window,document,Phaser:{Game,CANVAS:1},DoodleMotion:Motion,localStorage:{getItem:k=>{if(blocked)throw Error('denied');return storage.get(k)??null;},setItem(k,v){if(blocked)throw Error('denied');storage.set(k,v);}},location:{reload(){reloads++;}},setTimeout:e.env.setTimeout});
  async function boot(tilt=false){el(tilt?'tilt-start':'touch-start').listeners.click();await new Promise(setImmediate);await new Promise(setImmediate);}
  function pointer(id,pointerId=1){el(id).listeners.pointerdown({pointerId,preventDefault(){}});}
  return{...e,el,window,document,scripts,storage,boot,pointer,game:()=>game,state:()=>game.state.getCurrentState(),update:()=>game.state.getCurrentState().update(),counts:()=>({shots,updates,reloads}),events};
}
test('classic player loads local Phaser and engine, scopes assets to vendor and starts the native game',async()=>{
  const p=player();assert.equal(p.el('left').disabled,true);await p.boot();assert.deepEqual(p.scripts.map(s=>s.src),['vendor/doodle/phaser.min.js','vendor/doodle/game.js']);
  assert.equal(p.game().load.baseURL,'vendor/doodle/');assert.equal(p.game().state.current,'Game');assert.equal(p.el('cover').hidden,true);assert.equal(p.el('left').disabled,false);
});
test('shipped Phaser constructor really defers signal initialization; host waits for Boot.init',()=>{
  const source=fs.readFileSync(path.join(root,'vendor/doodle/phaser.min.js'),'utf8'),start=source.indexOf('c.Game=function'),end=source.indexOf(',c.Game.prototype=',start);
  const c={GAMES:[],AUTO:0,Device:{whenReady(){}},Signal:function(){},RandomDataGenerator:function(){},StateManager:function(){}};
  vm.runInNewContext(source.slice(start,end),{c});const game=new c.Game(635,955,1,'game');
  assert.equal(game.isBooted,false);assert.equal(game.onPause,null);assert.equal(game.sound,null);
});
test('a stalled engine can time out or report an async error before Phaser components exist, with usable retry',async()=>{
  for(const error of [false,true]){
    const p=player(false,'granted','hang');await p.boot(true);assert.equal(p.game().isBooted,false);
    if(error)p.events.error({filename:'vendor/doodle/phaser.min.js'});else p.expire();
    assert.equal(p.el('cover').hidden,false);assert.equal(p.el('touch-start').disabled,false);assert.equal(p.el('paused').hidden,true);
    p.el('touch-start').listeners.click();assert.equal(p.counts().reloads,1);
  }
});
test('sound and leaving the page are safe while the real engine components are still uninitialized',async()=>{
  const p=player(false,'granted','hang');await p.boot();p.el('sound').listeners.click();p.events.pagehide();assert.equal(p.game().sound,null);
});
test('tilt drives native velocity and touch temporarily overrides it without disabling tilt',async()=>{
  const p=player();await p.boot(true);p.sample(0);for(let i=0;i<10;i++)p.sample(18);p.update();assert.ok(p.state().player.body.velocity.x>400);
  p.pointer('left',1);p.update();assert.equal(p.state().cursors.left.isDown,true);assert.equal(p.state().cursorContr,true);
  p.el('left').listeners.pointercancel({pointerId:1});p.update();assert.equal(p.state().cursors.left.isDown,false);assert.equal(p.state().cursorContr,false);assert.ok(p.state().player.body.velocity.x>400);
});
test('touches release independently and shoot coexists with movement',async()=>{
  const p=player();await p.boot();p.pointer('left',1);p.pointer('left',2);p.pointer('shoot',3);p.el('left').listeners.pointerup({pointerId:1});p.update();assert.equal(p.state().cursors.left.isDown,true);assert.equal(p.counts().shots,1);
  p.el('left').listeners.lostpointercapture({pointerId:2});p.update();assert.equal(p.state().cursors.left.isDown,false);
});
test('background and native canvas pause both release inputs, pause the engine and require fresh sensor calibration',async()=>{
  const p=player();await p.boot(true);p.sample(0);p.sample(20);p.update();p.pointer('right',1);p.events.blur();assert.equal(p.game().paused,true);assert.equal(p.state().player.body.velocity.x,0);assert.equal(p.el('paused').hidden,false);assert.equal(p.el('shoot').disabled,true);
  p.el('resume').listeners.click();p.sample(-10);p.update();assert.equal(p.state().player.body.velocity.x,0);assert.equal(p.state().cursors.right.isDown,false);
  p.game().paused=true;assert.equal(p.el('paused').hidden,false);p.state().pausePanelGroup={y:0};p.el('resume').listeners.click();assert.equal(p.state().pausePanelGroup.y,955);assert.equal(p.el('paused').hidden,true);
});
test('blocked storage and denied motion remain playable using touch; highest score persists when storage works',async()=>{
  for(const blocked of [false,true]){
    const p=player(blocked,'denied');await p.boot(true);assert.equal(p.el('left').disabled,false);p.state().score=432;p.update();assert.equal(p.el('best').textContent,'432');
    if(!blocked)assert.equal(p.storage.get('arcade-best-doodle'),'432');
    p.el('restart').listeners.click();assert.equal(p.state().score,0);assert.equal(p.el('best').textContent,'432');
    p.window.DoodleStorage.setItem('DJ_stats','invalid json');assert.equal(p.window.DoodleStorage.getItem('DJ_stats'),null);
  }
});
function native(){const sandbox={window:{DoodleStorage:{}},Phaser:{Sprite:function(){},Timer:{SECOND:1000}},console};vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/doodle/game.js'),'utf8'),sandbox);return sandbox.window.Doodle;}
test('resource failures keep retry visible, release the engine and prevent driving a partially loaded game',async()=>{
  const p=player();await p.boot();p.game().load.onFileError.emit();assert.equal(p.el('cover').hidden,false);assert.equal(p.el('paused').hidden,true);assert.equal(p.el('touch-start').disabled,false);assert.equal(p.el('left').disabled,true);
  p.el('touch-start').listeners.click();assert.equal(p.counts().reloads,1);
});
test('upstream engine bounces only when descending, breaks brown platforms and consumes white platforms',()=>{
  const D=native(),stats=JSON.parse(fs.readFileSync(path.join(root,'vendor/doodle/assets/data/statachieve.json'))),s={stats,platformPool:{y:0},sounds:{jump:{play(){}},white:{play(){}},beake_platfrom:{play(){}}},achieveMentUnlock(){}};
  const player={alive:true,bottom:90,frame:1,body:{velocity:{y:100}},playerTimer:{add(){}}};s.player=player;
  function platform(type){return{alive:true,type,y:100,height:20,body:{velocity:{x:10}},animations:{add(){}},play(){},kill(){this.alive=false;}};}
  const green=platform(0);D.GameState.jumpState.call(s,player,green);assert.equal(player.body.velocity.y,-1080);
  player.body.velocity.y=-200;D.GameState.jumpState.call(s,player,green);assert.equal(player.body.velocity.y,-200);
  const brown=platform(2);player.body.velocity.y=100;D.GameState.jumpState.call(s,player,brown);assert.equal(brown.alive,false);assert.equal(brown.body.allowGravity,true);assert.equal(player.body.velocity.y,100);
  const white=platform(3);D.GameState.jumpState.call(s,player,white);assert.equal(white.alive,false);assert.equal(player.body.velocity.y,-1080);
});
test('upstream spring and rocket backpack keep their distinct boosts and the rocket restores normal gravity',()=>{
  const D=native();
  for(const type of ['bonus0','bonus2']){
    const jobs=[],stats=JSON.parse(fs.readFileSync(path.join(root,'vendor/doodle/assets/data/statachieve.json'))),timer={start(){},add(ms,fn,ctx){jobs.push({ms,fn,ctx});}},b={stats,reset(){},game:{time:{create:()=>timer}}};
    const sounds={spring:{play(){}},jetpack:{play(){}}};D.Bonus.call(b,b.game,0,0,type,{},0,sounds,stats);
    const player={alive:true,bottom:0,frame:1,x:100,y:100,scale:{x:1},body:{velocity:{x:0,y:100},gravity:{y:0}},playerTimer:timer,addChild(){}},bonus={y:0,height:20,type,used:false,body:{velocity:{x:0,y:0},gravity:{}},animations:{add(){},stop(){}},loadTexture(){},play(){}};
    b.bonusAction(player,bonus,{y:0,add(){}});
    if(type==='bonus0')assert.equal(player.body.velocity.y,-1800);
    else{assert.equal(player.withBonus,true);assert.equal(player.body.gravity.y,-2952);assert.equal(stats.stats[18][1],1);const end=jobs.find(j=>j.ms===3000);assert.ok(end);end.fn.call(end.ctx);assert.equal(player.withBonus,false);assert.equal(player.body.gravity.y,0);}
  }
});
test('every upstream resource is local and hash-valid, and wrapper preserves upstream game logic',()=>{
  const r=path.join(root,'vendor/doodle'),manifest=JSON.parse(fs.readFileSync(path.join(r,'manifest.json'))),wrapped=fs.readFileSync(path.join(r,'game.js'),'utf8');
  const body=wrapped.slice(wrapped.indexOf('\n')+1,wrapped.lastIndexOf('\nwindow.Doodle=Doodle;'));
  assert.equal(crypto.createHash('sha256').update(body).digest('hex'),manifest.upstreamGameSha256);
  for(const f of manifest.files){const b=fs.readFileSync(path.join(r,f.path));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
  for(const m of body.matchAll(/["'](assets\/[^"']+)["']/g))assert.ok(fs.existsSync(path.join(r,m[1])),m[1]);
  const html=fs.readFileSync(path.join(root,'doodle.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[^"#]*)"/g))if(!m[1].includes(':'))assert.ok(fs.existsSync(path.join(root,m[1])),m[1]);
});
