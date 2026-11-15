const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Run the real engine with a DOM/Canvas adapter. Only expose internals in this VM.
function engine(storageBlocked = false) {
  const elements = new Map();
  const events = {};
  const context = new Proxy({}, { get: (o, k) => o[k] ?? (() => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const el = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', style: {}, hidden: false, disabled: false, innerHTML: '', listeners: {},
      getContext: () => context, addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute() {}, appendChild() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 680 }), setPointerCapture() {} });
    return elements.get(id);
  };
  const storage = new Map();
  const sandbox = { console, Math, document: { getElementById: el, createElement: () => ({}), addEventListener(name, fn) { events[name] = fn; } },
    window: { addEventListener(name, fn) { events[name] = fn; } }, HTMLElement: class {}, requestAnimationFrame() {},
    localStorage: { getItem(k) { if (storageBlocked) throw Error('denied'); return storage.get(k) ?? null; }, setItem(k, v) { if (storageBlocked) throw Error('denied'); storage.set(k, v); } } };
  let source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `globalThis.game = {start,update,render,pause,useBomb,damagePlayer,spawnBoss,defeatBoss,drop,gameOver,enemyShot,
    state:()=>({mode,score,stage,player,boss,enemies,shots,pickups,bullets,stageTime}),keys,
    setScore:v=>score=v,setTransition:v=>transition=v};})();`);
  vm.runInNewContext(source, sandbox);
  return { game: sandbox.game, events, elements, storage, el };
}

test('start, movement boundaries, auto fire, and pause preserve simulation', () => {
  const { game: g } = engine(); g.start(); assert.equal(g.state().mode, 'playing');
  g.keys.add('a'); for (let i=0;i<180;i++) g.update(1/60);
  assert.equal(g.state().player.x,22); assert.ok(g.state().bullets.length>0);
  g.pause(); const before=g.state().stageTime; g.update(1); assert.equal(g.state().stageTime,before);
  g.pause(); assert.equal(g.state().mode,'playing'); assert.equal(g.keys.size,0);
});

test('enemy bullets damage once during invulnerability; three hits end the run and persist score', () => {
  const { game:g,storage }=engine();g.start();const p=g.state().player;
  p.invincible=0;g.enemyShot(p.x,p.y,0,0);g.update(1/60);assert.equal(p.lives,2);
  g.damagePlayer();assert.equal(p.lives,2);
  p.invincible=0;g.damagePlayer();p.invincible=0;g.setScore(1234);g.damagePlayer();
  assert.equal(g.state().mode,'over');assert.equal(storage.get('thunderbolt-best'),'1234');
  g.start();assert.equal(g.state().player.lives,3);assert.equal(g.state().score,0);
});

test('pickups upgrade weapons, replenish bombs, heal, and obey caps', () => {
  const {game:g}=engine();g.start();const p=g.state().player;p.bombs=0;p.lives=1;
  for(const type of ['P','P','P','B','+'])g.drop(p.x,p.y,type);
  g.update(1/60);assert.equal(p.level,3);assert.equal(p.bombs,1);assert.equal(p.lives,2);
  p.cooldown=0;g.update(1/60);assert.ok(g.state().bullets.length>=6);
});

test('bomb clears hazards, consumes stock and damages boss; boss clear advances stage', () => {
  const {game:g}=engine();g.start();g.spawnBoss();const hp=g.state().boss.hp;
  g.enemyShot(240,400,100,0);g.useBomb();assert.equal(g.state().shots.length,0);
  assert.equal(g.state().player.bombs,2);assert.equal(g.state().boss.hp,hp-100);
  g.defeatBoss();assert.equal(g.state().boss,null);assert.equal(g.state().score,5000);
  for(let i=0;i<241;i++)g.update(1/60);
  assert.equal(g.state().stage,2);assert.equal(g.state().player.bombs,3);
  g.state().player.bombs=0;g.useBomb();assert.equal(g.state().player.bombs,0);
});

test('a complete 40-second wave schedule reaches a boss; rendering and extended play stay bounded', () => {
  const {game:g}=engine();g.start();g.state().player.invincible=1000;
  for(let i=0;i<60*41;i++){g.update(1/60);if(i%60===0)g.render();}
  assert.ok(g.state().boss);assert.ok(g.state().enemies.length<40);
  for(let i=0;i<60*90;i++){g.update(1/60);if(i%120===0)g.render();}
  assert.ok(g.state().shots.length<400);assert.ok(g.state().bullets.length<100);
});

test('touch coordinates map to game space; focus loss pauses; blocked storage does not break game', () => {
  const {game:g,el,events}=engine(true);g.start();
  el('game').listeners.pointerdown({pointerId:1,clientX:100,clientY:300,preventDefault(){}});
  for(let i=0;i<60;i++)g.update(1/60);
  assert.equal(g.state().player.x,100);assert.equal(g.state().player.y,270);
  events.blur();assert.equal(g.state().mode,'paused');g.pause();g.setScore(999);g.gameOver();assert.equal(g.state().mode,'over');
});
