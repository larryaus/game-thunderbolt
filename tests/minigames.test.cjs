const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function engine(id,blocked=false){
  const elements=new Map(),events={},storage=new Map();
  const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',style:{},dataset:{},hidden:false,listeners:{},classList:{add(){}},setAttribute(){},getContext:()=>ctx,
    addEventListener(n,f){this.listeners[n]=f;},getBoundingClientRect:()=>({left:0,top:0,width:240,height:320}),setPointerCapture(){}});return elements.get(id);};
  const buttons=['up','down','left','right','fire'].map(n=>{const e=element('button-'+n);e.dataset.control=n;return e;});
  const sandbox={URLSearchParams,Math,console,location:{search:'?game='+id},HTMLElement:class{},requestAnimationFrame(){},
    document:{body:{dataset:{}},getElementById:element,querySelector:()=>null,querySelectorAll:()=>buttons,addEventListener(n,f){events[n]=f;}},
    window:{addEventListener(n,f){events[n]=f;}},localStorage:{getItem(k){if(blocked)throw Error('denied');return storage.get(k)??null;},setItem(k,v){if(blocked)throw Error('denied');storage.set(k,v);}}};
  const source=fs.readFileSync(path.join(__dirname,'../minigames.js'),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.api={start,pause,update,draw,action,finish,keys,constructors,addScore,mode:()=>mode,game:()=>game,score:()=>score};})();`);
  vm.runInNewContext(source,sandbox);return{...sandbox.api,element,events,storage};
}
for(const id of ['breakout','snake','racer','tanks']){
  test(`${id}: ready, start, pause, record and fresh restart`,()=>{
    const e=engine(id);assert.equal(e.mode(),'ready');e.start();e.draw();const g=e.game();e.pause();assert.equal(e.mode(),'paused');e.update(.5);assert.equal(e.game(),g);e.pause();assert.equal(e.mode(),'playing');
    e.addScore(777);e.finish('test');assert.equal(e.mode(),'over');assert.equal(e.storage.get('arcade-best-'+id),'777');e.start();assert.equal(e.score(),0);assert.equal(e.game().level,1);e.events.blur();assert.equal(e.mode(),'paused');
  });
}
test('breakout: paddle edge changes rebound, brick clears score, missed ball costs a life',()=>{
  const e=engine('breakout');e.start();const g=e.game();g.launch=0;
  g.balls=[{x:g.paddle.x+30,y:576,vx:0,vy:350,r:6}];e.update(1/60);assert.ok(g.balls[0].vy<0);assert.ok(g.balls[0].vx>0);
  const b=g.bricks[40];g.balls=[{x:b.x+25,y:b.y+27,vx:0,vy:-350,r:6}];e.update(1/60);assert.equal(b.hp,0);assert.equal(e.score(),50);
  g.balls=[{x:200,y:660,vx:0,vy:100,r:6}];e.update(1/60);assert.equal(g.lives,2);assert.ok(g.launch>0);
});
test('breakout: powerups create multiball and lasers; clearing board advances level',()=>{
  const e=engine('breakout');e.start();const g=e.game();g.launch=0;g.drops=[{x:240,y:590,type:'×3'},{x:240,y:590,type:'L'}];e.update(1/60);assert.equal(g.balls.length,3);assert.equal(g.laser,8);e.update(1/60);assert.equal(g.lasers.length,2);
  g.bricks.forEach(b=>b.hp=0);e.update(1/60);assert.equal(g.level,2);assert.ok(g.bricks.some(b=>b.hp>0));
});
test('snake: direction queue prevents reverse and grows on food',()=>{
  const e=engine('snake');e.start();const g=e.game();e.action('left');assert.equal(g.queue.length,0);
  g.food={x:12,y:17,kind:'normal'};for(let i=0;i<10;i++)e.update(1/60);assert.equal(g.body.length,4);assert.equal(e.score(),100);
  e.action('up');e.action('left');e.action('down');assert.equal(g.queue.length,2);e.update(.16);assert.equal(g.dir.y,-1);e.update(.16);assert.equal(g.dir.x,-1);
});
test('snake: energy upgrades, warp boundary crossing, collision and speed boost',()=>{
  const e=engine('snake');e.start();const g=e.game();g.apples=4;g.food={x:12,y:17,kind:'warp'};e.update(.17);assert.equal(g.level,2);assert.equal(g.warp,8);assert.ok(g.obstacles.length>0);
  g.body=[{x:23,y:10},{x:22,y:10}];g.obstacles=[];g.dir={x:1,y:0};e.update(.16);assert.equal(g.body[0].x,0);assert.equal(e.mode(),'playing');
  g.warp=0;g.body=[{x:23,y:10},{x:22,y:10}];e.update(.16);assert.equal(e.mode(),'over');
  e.start();const x=e.game().body[0].x;e.keys.add('fire');e.update(.07);assert.equal(e.game().body[0].x,x+1);
});
test('snake: hitting body and an obstacle ends the game',()=>{
  const e=engine('snake');e.start();let g=e.game();g.body=[{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5},{x:7,y:5}];g.dir={x:1,y:0};e.update(.17);assert.equal(e.mode(),'over');
  e.start();g=e.game();g.obstacles=[{x:12,y:17}];e.update(.17);assert.equal(e.mode(),'over');
});
test('racer: lane boundaries, collision invulnerability, collecting a coin, progression',()=>{
  const e=engine('racer');e.start();const g=e.game();for(let i=0;i<5;i++)e.action('left');assert.equal(g.lane,0);for(let i=0;i<5;i++)e.action('right');assert.equal(g.lane,2);
  g.x=360;g.cars=[{x:360,y:537,w:45,h:76}];e.update(1/60);assert.equal(g.lives,2);assert.ok(g.inv>0);
  g.cars=[{x:360,y:537,w:45,h:76}];g.coins=[{x:360,y:537}];e.update(1/60);assert.equal(g.lives,2);assert.ok(e.score()>=100);
  g.cars=[];g.time=18;e.update(1/60);assert.equal(g.level,2);
});
test('racer: every traffic row leaves a safe lane and sustained play remains bounded',()=>{
  const e=engine('racer');e.start();const g=e.game();g.inv=1000;
  for(let i=0;i<60*120;i++){e.update(1/60);if(i%120===0)e.draw();const rows=new Map();for(const car of g.cars){const key=Math.round(car.y);rows.set(key,(rows.get(key)||0)+1);}assert.ok([...rows.values()].every(n=>n<=2));}
  assert.ok(g.cars.length<16);assert.ok(g.coins.length<12);
});
test('tanks: movement obeys walls, fire destroys brick but leaves steel',()=>{
  const e=engine('tanks');e.start();const g=e.game();const start=g.player.y;e.keys.add('up');e.update(.1);assert.ok(g.player.y<start);e.keys.clear();
  for(const type of ['brick','steel']){g.walls=[{x:176,y:530,w:32,h:32,type}];g.player.x=176;g.player.y=570;g.player.dir='up';g.player.cooldown=0;e.action('fire');for(let i=0;i<10;i++)e.update(1/60);assert.equal(g.walls.length,type==='brick'?0:1);}
  g.walls=[{x:176,y:530,w:32,h:32,type:'steel'}];g.player.y=560;e.keys.add('up');for(let i=0;i<60;i++)e.update(1/60);assert.ok(g.player.y>=559);
});
test('tanks: enemy hit, player hit, base destruction and wave transition',()=>{
  const e=engine('tanks');e.start();let g=e.game();g.walls=[];g.enemies=[{x:176,y:400,w:26,h:26,hp:1,dir:'down',cooldown:10,think:10,enemy:true}];g.bullets=[{x:176,y:400,w:5,h:5,vx:0,vy:0,enemy:false}];e.update(1/60);assert.equal(g.killed,1);assert.equal(e.score(),200);
  g.inv=0;g.bullets=[{x:g.player.x,y:g.player.y,w:5,h:5,vx:0,vy:0,enemy:true}];e.update(1/60);assert.equal(g.lives,2);assert.ok(g.inv>0);
  g.bullets=[{x:240,y:592,w:5,h:5,vx:0,vy:0,enemy:true}];e.update(1/60);assert.equal(e.mode(),'over');
  e.start();g=e.game();g.killed=g.target;g.spawned=g.target;g.enemies=[];e.update(1/60);assert.ok(g.transition>0);for(let i=0;i<151;i++)e.update(1/60);assert.equal(g.level,2);assert.equal(g.killed,0);
});
test('touch gestures use scaled coordinates, button release cancels held fire, storage denial is safe',()=>{
  const e=engine('tanks',true);e.start();const f=e.element('button-fire');f.listeners.pointerdown({pointerId:3,preventDefault(){}});assert.ok(e.keys.has('fire'));f.listeners.pointerup({pointerId:3});assert.equal(e.keys.has('fire'),false);e.addScore(100);e.finish('done');
  const b=engine('breakout');b.start();const c=b.element('mini-canvas');c.listeners.pointerdown({pointerId:1,clientX:50,clientY:100,preventDefault(){}});b.update(1/60);assert.equal(b.game().paddle.x,100);
  const s=engine('snake');s.start();const sc=s.element('mini-canvas');sc.listeners.pointerdown({pointerId:1,clientX:50,clientY:100,preventDefault(){}});sc.listeners.pointermove({pointerId:1,clientX:50,clientY:50});assert.equal(s.game().queue[0].y,-1);
});
test('unknown game identifiers use a playable default',()=>{const e=engine('__proto__');e.start();assert.ok(e.game().bricks.length>0);});

test('tanks: two fingers can hold movement and fire; lifting fire keeps movement active',()=>{
  const e=engine('tanks');e.start();const g=e.game();g.walls=[];g.spawn=100;
  const up=e.element('button-up'),fire=e.element('button-fire');
  up.listeners.pointerdown({pointerId:10,preventDefault(){}});
  fire.listeners.pointerdown({pointerId:11,preventDefault(){}});
  assert.ok(e.keys.has('up'));assert.ok(e.keys.has('fire'));
  const y=g.player.y;for(let i=0;i<30;i++)e.update(1/60);
  assert.ok(g.player.y<y-40);assert.ok(g.bullets.length>=2);
  fire.listeners.pointerup({pointerId:11});assert.equal(e.keys.has('fire'),false);assert.equal(e.keys.has('up'),true);
  const next=g.player.y;for(let i=0;i<10;i++)e.update(1/60);assert.ok(g.player.y<next);
  up.listeners.pointercancel({pointerId:10});assert.equal(e.keys.size,0);const stopped=g.player.y;e.update(1/60);assert.equal(g.player.y,stopped);
});

test('phone breakout: external drag strip controls the paddle without covering the ball',()=>{
  const e=engine('breakout');e.start();const strip=e.element('drag-strip');
  strip.listeners.pointerdown({pointerId:7,clientX:60,preventDefault(){}});e.update(1/60);assert.equal(e.game().paddle.x,120);
  strip.listeners.pointermove({pointerId:7,clientX:180});e.update(1/60);assert.equal(e.game().paddle.x,360);
  strip.listeners.pointerup({pointerId:7});strip.listeners.pointermove({pointerId:7,clientX:40});e.update(1/60);assert.equal(e.game().paddle.x,360);
  strip.listeners.pointerdown({pointerId:8,clientX:120,preventDefault(){}});e.pause();e.pause();strip.listeners.pointermove({pointerId:8,clientX:30});e.update(1/60);assert.equal(e.game().paddle.x,240);
});
test('phone tanks: automatically shoots with one thumb; sliding on captured direction changes heading',()=>{
  const e=engine('tanks');e.start();const g=e.game();g.walls=[];g.spawn=100;e.update(1/60);assert.ok(g.bullets.some(b=>!b.enemy));
  const up=e.element('button-up');up.listeners.pointerdown({pointerId:2,preventDefault(){}});for(let i=0;i<20;i++)e.update(1/60);assert.ok(g.player.y<592);
  up.listeners.pointermove({pointerId:2,clientX:220,clientY:160});assert.equal(g.player.dir,'right');assert.equal(e.keys.has('up'),false);assert.equal(e.keys.has('right'),true);
  const x=g.player.x;for(let i=0;i<20;i++)e.update(1/60);assert.ok(g.player.x>x);up.listeners.pointerup({pointerId:2});assert.equal(e.keys.size,0);
});
test('phone snake: direction pad and hold-to-boost work without a keyboard',()=>{
  const e=engine('snake');e.start();const up=e.element('button-up'),boost=e.element('button-fire');
  up.listeners.pointerdown({pointerId:1,preventDefault(){}});up.listeners.pointerup({pointerId:1});boost.listeners.pointerdown({pointerId:2,preventDefault(){}});
  const g=e.game(),y=g.body[0].y;e.update(.07);assert.equal(g.body[0].y,y-1);boost.listeners.pointercancel({pointerId:2});assert.equal(e.keys.has('fire'),false);
});
test('phone racer: large buttons and a swipe each move exactly one lane',()=>{
  const e=engine('racer');e.start();const left=e.element('button-left');left.listeners.pointerdown({pointerId:3,preventDefault(){}});assert.equal(e.game().lane,0);left.listeners.pointerup({pointerId:3});
  const c=e.element('mini-canvas');c.listeners.pointerdown({pointerId:4,clientX:50,clientY:100,preventDefault(){}});c.listeners.pointermove({pointerId:4,clientX:80,clientY:100});assert.equal(e.game().lane,1);c.listeners.pointerup({pointerId:4});c.listeners.pointermove({pointerId:4,clientX:120,clientY:100});assert.equal(e.game().lane,1);
  e.events.orientationchange();assert.equal(e.mode(),'paused');
});
