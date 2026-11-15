(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const W = 480, H = 680, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const hit = (a, b, r) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < r ** 2;
  const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* Private browsing can disable storage. */ } };
  let best = Math.max(0, Number(read('thunderbolt-best', 0)) || 0);
  let sound = read('thunderbolt-sound', 'off') === 'on', audio;
  let mode = 'ready', score = 0, stage = 1, elapsed = 0, stageTime = 0, waveTime = 0;
  let bullets = [], enemies = [], shots = [], particles = [], pickups = [], boss = null;
  let kills = 0, bossSpawned = false, transition = 0, flash = 0, shake = 0, world = 0, messageTime = 0;
  let player = makePlayer(), lastTime = 0, accumulator = 0, pointer = null;
  const keys = new Set();
  const islands = [{x:65,y:35,s:1.05},{x:410,y:380,s:.8},{x:110,y:790,s:.65},{x:345,y:1100,s:1.2}];
  function makePlayer() { return { x: W / 2, y: H - 105, lives: 3, bombs: 3, level: 1, cooldown: 0, invincible: 2.5 }; }
  function unlockAudio() {
    if (!sound) return;
    try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch { sound = false; updateSound(); }
  }
  function tone(freq, duration, type = 'square', volume = .025, end = freq) {
    if (!sound || !audio || audio.state !== 'running') return;
    const o = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    o.connect(gain); gain.connect(audio.destination); o.start(now); o.stop(now + duration);
  }
  function updateSound() { $('sound').innerHTML = `声音 ${sound ? 'ON' : 'OFF'} <span>♪</span>`; $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? '关闭声音' : '开启声音'); }
  function toggleSound() { sound = !sound; save('thunderbolt-sound', sound ? 'on' : 'off'); updateSound(); unlockAudio(); tone(520, .1); }
  function hud() {
    $('score').textContent = String(score).padStart(6, '0'); $('best').textContent = String(Math.max(best, score)).padStart(6, '0');
    $('lives').textContent = '♥ '.repeat(player.lives) + '♡ '.repeat(3 - player.lives); $('lives').setAttribute('aria-label', `剩余生命 ${player.lives}`);
    $('weapon').textContent = `FIRE LV. 0${player.level}`; $('bombs').textContent = player.bombs;
    $('bomb').setAttribute('aria-label', `释放炸弹，剩余${player.bombs}枚`); $('bomb').disabled = mode !== 'playing' || player.bombs === 0;
    $('pause').disabled = mode !== 'playing' && mode !== 'paused'; $('pause').textContent = mode === 'paused' ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', mode === 'paused' ? '继续游戏' : '暂停游戏');
    $('boss-hud').hidden = !boss; if (boss) $('boss-health').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
  }
  function announce(text, seconds = 2.1) { $('announcement').textContent = text; messageTime = seconds; }
  function persistBest() { if (score > best) { best = score; save('thunderbolt-best', best); } }
  function start() {
    unlockAudio(); mode = 'playing'; score = 0; stage = 1; elapsed = stageTime = 0; waveTime = .6;
    bullets = []; enemies = []; shots = []; particles = []; pickups = []; boss = null; kills = 0;
    bossSpawned = false; transition = flash = shake = 0; player = makePlayer(); pointer = null; keys.clear();
    $('overlay').hidden = true; announce('STAGE 01\n太平洋前线'); hud(); tone(440, .25, 'sawtooth', .04, 880);
  }
  function showOverlay(title, subtitle, description, button, kicker, hint) {
    $('overlay-title').textContent = title;
    const sub = document.createElement('span'); sub.textContent = subtitle; $('overlay-title').appendChild(sub);
    $('overlay-description').textContent = description; $('start').innerHTML = `${button} <span>↗</span>`;
    $('overlay-kicker').textContent = kicker; $('overlay-hint').textContent = hint; $('overlay').hidden = false;
  }
  function pause() {
    if (mode === 'playing') { mode = 'paused'; keys.clear(); pointer = null; showOverlay('稍作休整', 'MISSION PAUSED', '深呼吸，下一次出击更从容。', '继续飞行', 'TAKE A BREATH, PILOT.', '按 P / ESC / ENTER 继续'); }
    else if (mode === 'paused') { mode = 'playing'; $('overlay').hidden = true; unlockAudio(); }
    hud();
  }
  function gameOver() {
    mode = 'over'; persistBest(); pointer = null; keys.clear(); $('announcement').textContent = ''; messageTime = 0;
    showOverlay('任务结束', 'UNTIL NEXT FLIGHT', `本次得分 ${String(score).padStart(6, '0')} · 到达第 ${stage} 战区`, '再次出击', score >= best && score > 0 ? 'NEW HIGH SCORE. WELL FLOWN!' : 'THE SKY IS WAITING FOR YOU.', '按 ENTER 再来一局'); hud();
  }
  function burst(x, y, color, count = 15, size = 1) {
    for (let i = 0; i < count; i++) { const a = rand(0, TAU), speed = rand(20, 150) * size; particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:rand(.2,.7),color,size:rand(2,6)*size}); }
  }
  function damagePlayer() {
    if (player.invincible > 0 || mode !== 'playing') return;
    player.lives--; player.level = Math.max(1, player.level - 1); player.invincible = 2.4;
    shake = 8; flash = .13; burst(player.x, player.y, '#f3b269', 24); tone(130,.25,'sawtooth',.07,35);
    if (player.lives <= 0) gameOver(); hud();
  }
  function destroyEnemy(e, award = true) {
    if (e.dead) return; e.dead = true; burst(e.x,e.y,'#f7bd72',e.type === 'heavy' ? 28 : 15); shake = Math.max(shake, 2);
    tone(100,.12,'sawtooth',.035,30);
    if (award) { score += e.type === 'heavy' ? 350 : 100; kills++;
      if (kills % 7 === 0) drop(e.x,e.y,'P'); else if (kills % 19 === 0) drop(e.x,e.y,'+'); else if (kills % 13 === 0) drop(e.x,e.y,'B');
    }
  }
  function drop(x,y,type) { pickups.push({x,y,type,t:0}); }
  function useBomb() {
    if (mode !== 'playing' || !player.bombs) return;
    player.bombs--; flash = .65; shake = 12; player.invincible = Math.max(player.invincible, 1.6); shots = [];
    enemies.forEach(e => destroyEnemy(e)); if (boss) { boss.hp -= 100; if (boss.hp <= 0) defeatBoss(); }
    burst(player.x,player.y,'#eaffb5',55,2); tone(60,.7,'sawtooth',.1,25); hud();
  }
  function spawnWave() {
    const type = Math.floor(stageTime / 3) % 4;
    if (type === 2) { const x = rand(90,W-90); enemies.push({x,y:-60,baseX:x,type:'heavy',hp:9+stage*2,t:0,cooldown:1.1,speed:48+stage*3,r:27,dead:false}); }
    else { const count = 3 + Math.min(stage, 3), base = rand(70,150); for (let i=0;i<count;i++) { const x = clamp(base+i*62,35,W-35); enemies.push({x,y:-45-i*35,baseX:x,type:type===1?'sweeper':'scout',hp:stage>2?3:2,t:i*.3,cooldown:rand(.8,2),speed:82+stage*8,r:17,dead:false}); } }
  }
  function spawnBoss() {
    bossSpawned = true; enemies.forEach(e => { e.dead = true; burst(e.x,e.y,'#e4ad6d'); }); shots = [];
    boss = {x:240,y:-100,hp:350+stage*100,maxHp:350+stage*100,t:0,cooldown:1.3,r:65};
    announce('WARNING\n空中要塞接近',3); tone(180,.5,'sawtooth',.05,120); hud();
  }
  function defeatBoss() {
    const old = boss; if (!old) return;
    score += 5000 * stage; burst(old.x,old.y,'#ffd89a',65,2); boss = null; shots = []; flash = .5; shake = 16;
    transition = 4; drop(old.x-45,old.y,'P'); drop(old.x+45,old.y,'B'); drop(old.x,old.y+45,'+');
    announce(`STAGE CLEAR\n+${5000*stage}`,3); tone(360,.6,'triangle',.06,1080); persistBest(); hud();
  }
  function enemyShot(x,y,speed,angle) { shots.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:4}); }
  function fire() {
    const level = player.level;
    bullets.push({x:player.x-6,y:player.y-27,vx:0,vy:-590,damage:1},{x:player.x+6,y:player.y-27,vx:0,vy:-590,damage:1});
    if (level>=2) for (const side of [-1,1]) bullets.push({x:player.x+side*17,y:player.y-10,vx:side*65,vy:-555,damage:1});
    if (level>=3) for (const side of [-1,1]) bullets.push({x:player.x+side*22,y:player.y-3,vx:side*150,vy:-520,damage:1});
    tone(880,.045,'square',.008,440);
  }
  function update(dt) {
    world += dt * (mode === 'playing' ? 42 : mode === 'ready' ? 16 : 0);
    if (mode !== 'playing') return;
    elapsed += dt; stageTime += dt; player.invincible = Math.max(0,player.invincible-dt); player.cooldown -= dt;
    flash = Math.max(0,flash-dt); shake = Math.max(0,shake-dt*24);
    if (messageTime > 0) { messageTime -= dt; if (messageTime <= 0) $('announcement').textContent = ''; }
    let dx = Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
    let dy = Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
    if (dx || dy) { const length = Math.hypot(dx,dy); player.x += dx/length*290*dt; player.y += dy/length*290*dt; pointer = null; }
    if (pointer) { const distance = Math.hypot(pointer.x-player.x,pointer.y-player.y), step = Math.min(1,520*dt/(distance||1)); player.x += (pointer.x-player.x)*step; player.y += (pointer.y-player.y)*step; }
    player.x = clamp(player.x,22,W-22); player.y = clamp(player.y,35,H-30);
    if (player.cooldown <= 0) { fire(); player.cooldown = .12; }
    if (transition > 0) { transition -= dt; if (transition <= 0) { stage++; stageTime = 0; bossSpawned = false; waveTime = 1.2; player.bombs = Math.min(5,player.bombs+1); announce(`STAGE ${String(stage).padStart(2,'0')}\n${['太平洋前线','群岛突袭','深海防线'][(stage-1)%3]}`); } }
    else if (!bossSpawned) { waveTime -= dt; if (stageTime >= 40) spawnBoss(); else if (waveTime <= 0) { spawnWave(); waveTime = Math.max(1.35,2.8-stage*.15); } }
    for (const b of bullets) { b.x += b.vx*dt; b.y += b.vy*dt; }
    for (const e of enemies) {
      if (e.dead) continue; e.t += dt; e.y += e.speed*dt; e.x = e.baseX + Math.sin(e.t*1.8)*(e.type === 'sweeper'?54:14); e.cooldown -= dt;
      if (e.cooldown <= 0 && e.y>10 && e.y<H-100) { const a = Math.atan2(player.y-e.y,player.x-e.x); if(e.type==='heavy') for(let i=-1;i<=1;i++)enemyShot(e.x,e.y+15,130+stage*7,a+i*.22); else enemyShot(e.x,e.y+12,125+stage*7,a); e.cooldown = e.type==='heavy'?1.5:2.2; }
      for (const b of bullets) if (!b.dead && hit(e,b,e.r+3)) { b.dead = true; e.hp -= b.damage; burst(b.x,b.y,'#d7edaa',2,.4); if (e.hp<=0) { destroyEnemy(e); break; } }
      if (!e.dead && hit(player,e,e.r+10)) { destroyEnemy(e,false); damagePlayer(); }
    }
    if (boss) {
      const b = boss; b.t += dt; b.y = Math.min(108,b.y+48*dt); b.x = 240+Math.sin(b.t*.65)*115; b.cooldown -= dt;
      if (b.y>=80 && b.cooldown <= 0) { const aim = Math.atan2(player.y-b.y,player.x-b.x); for(let i=-3;i<=3;i++)enemyShot(b.x,b.y+45,145+stage*6,aim+i*.18); for(const side of [-1,1])enemyShot(b.x+side*60,b.y+25,160,Math.PI/2); b.cooldown = b.hp<b.maxHp/2?.65:1; tone(150,.1,'triangle',.025); }
      for (const bullet of bullets) if (!bullet.dead && Math.abs(bullet.x-b.x)<77 && Math.abs(bullet.y-b.y)<42) { bullet.dead = true; b.hp -= bullet.damage; burst(bullet.x,bullet.y,'#edce8d',2,.5); }
      if (hit(player,b,76)) damagePlayer(); if (b.hp<=0) defeatBoss();
    }
    for (const s of shots) { s.x+=s.vx*dt; s.y+=s.vy*dt; if (hit(player,s,10)) { s.dead=true; damagePlayer(); } }
    for (const p of pickups) { p.t+=dt; p.y+=65*dt; if (hit(player,p,30)) { p.dead=true; if(p.type==='P'){player.level=Math.min(3,player.level+1);score+=200;announce(player.level===3?'MAX FIREPOWER':'POWER UP',1);} else if(p.type==='B'){player.bombs=Math.min(5,player.bombs+1);score+=100;announce('BOMB +1',1);} else {player.lives=Math.min(3,player.lives+1);score+=100;announce('机体修复',1);} tone(650,.2,'triangle',.05,1300); } }
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.97;p.vy*=.97;});
    bullets=bullets.filter(b=>!b.dead&&b.y>-30&&b.x>-20&&b.x<W+20); shots=shots.filter(b=>!b.dead&&b.y>-30&&b.y<H+30&&b.x>-30&&b.x<W+30);
    enemies=enemies.filter(e=>!e.dead&&e.y<H+60); pickups=pickups.filter(p=>!p.dead&&p.y<H+25); particles=particles.filter(p=>p.life>0);
    hud();
  }
  // Original procedural sprites: no network assets, fonts, or licensed game graphics.
  function poly(points,color) { ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill(); }
  function plane(x,y,type='player',t=0) {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    if(type==='boss') {
      poly([[-94,12],[-74,-14],[-37,-21],[-30,-39],[30,-39],[37,-21],[74,-14],[94,12],[94,28],[43,19],[32,42],[-32,42],[-43,19],[-94,28]],'#162c30');
      poly([[-90,8],[-69,-12],[-30,-18],[-24,-34],[24,-34],[30,-18],[69,-12],[90,8],[90,20],[30,12],[24,33],[-24,33],[-30,12],[-90,20]],'#88907c');
      ctx.fillStyle='#bac0a2';ctx.fillRect(-22,-31,44,55);ctx.fillStyle='#596b63';ctx.fillRect(-12,-17,24,48);
      for(const side of [-1,1]){ctx.fillStyle='#45574e';ctx.fillRect(side*54-11,-8,22,32);ctx.fillStyle='#e8ac70';ctx.fillRect(side*54-6,22,12,8);ctx.fillStyle='#b5ae8a';ctx.fillRect(side*72-5,2,10,9);}
      ctx.fillStyle='#d68058';ctx.fillRect(-7,-23,14,17);ctx.fillStyle='#f2be7c';ctx.fillRect(-4,-20,8,7);
    } else {
      const friendly=type==='player', heavy=type==='heavy', scale=heavy?1.5:1;
      ctx.scale(scale,friendly?scale:-scale);
      if(friendly){ctx.fillStyle='#efba70';ctx.fillRect(-10,23,6,9+Math.sin(t*50)*4);ctx.fillRect(4,23,6,9+Math.cos(t*50)*4);ctx.fillStyle='#f6e6ac';ctx.fillRect(-8,23,2,9);ctx.fillRect(6,23,2,9);}
      poly([[0,-30],[6,-17],[8,-4],[29,12],[29,20],[9,14],[9,24],[17,29],[17,33],[0,28],[-17,33],[-17,29],[-9,24],[-9,14],[-29,20],[-29,12],[-8,-4],[-6,-17]],'#122f33');
      poly([[0,-28],[5,-15],[6,-2],[26,13],[26,17],[6,10],[6,24],[14,29],[0,25],[-14,29],[-6,24],[-6,10],[-26,17],[-26,13],[-6,-2],[-5,-15]],friendly?'#dde4bb':heavy?'#b0a47a':'#c17f65');
      ctx.fillStyle=friendly?'#8fa99b':'#825d51';ctx.fillRect(-4,-10,8,31);ctx.fillStyle=friendly?'#5ec9c0':'#e9bb7c';ctx.fillRect(-3,-15,6,11);
      ctx.fillStyle=friendly?'#a83235':'#e5cbb0';ctx.fillRect(-20,11,9,4);ctx.fillRect(11,11,9,4);ctx.fillStyle='#f1edca';ctx.fillRect(-1,-27,2,11);
      if(friendly){ctx.fillStyle='#e1b769';ctx.fillRect(-16,-2,3,14);ctx.fillRect(13,-2,3,14);}
    }
    ctx.restore();
  }
  function island(x,y,s) {
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    const outline=[[-78,-83],[-39,-105],[-10,-81],[15,-88],[61,-43],[53,-9],[82,23],[52,79],[3,112],[-42,75],[-56,30],[-81,8],[-69,-27]];
    ctx.save();ctx.scale(1.1,1.08);poly(outline,'#438078');ctx.restore();poly(outline,'#b7b98a');ctx.scale(.87,.9);poly(outline,'#637f58');
    poly([[-50,-69],[-14,-63],[20,-68],[43,-24],[21,7],[42,39],[2,80],[-28,38],[-31,-8],[-55,-19]],'#506f50');
    ctx.fillStyle='#8d956c';ctx.fillRect(-13,-45,19,86);ctx.fillStyle='#c0bd8f';for(let i=0;i<5;i++)ctx.fillRect(-5,-39+i*16,3,8);
    for(let i=0;i<9;i++){const px=Math.sin(i*4)*42,py=i*17-65;ctx.fillStyle='#385d49';ctx.fillRect(px,py,8,7);ctx.fillStyle='#78935e';ctx.fillRect(px-2,py-2,7,5);}
    ctx.restore();
  }
  function background() {
    ctx.fillStyle='#205762';ctx.fillRect(0,0,W,H);
    // Repeating current lines provide movement without expensive image generation.
    for(let row=-1;row<25;row++) for(let col=0;col<12;col++) {const x=col*47+Math.sin(row*13+col)*20,y=(row*37+world*.72)%760-40;ctx.fillStyle=(row+col)%3===0?'#397178':'#2b646c';ctx.fillRect(x,y,12+(col%3)*7,1);if((row+col)%4===0)ctx.fillRect(x+7,y+5,9,1);}
    islands.forEach(i=>island(i.x,((i.y+world) % 1500)-320,i.s));
    ctx.fillStyle='#d1ddc511';for(let i=0;i<4;i++){const x=(i*173+world*.13)%650-70,y=(i*197+world*.4)%850-90;ctx.fillRect(x,y,100,16);ctx.fillRect(x+20,y-14,58,45);}
  }
  function render() {
    ctx.save();if(shake>0&&mode==='playing')ctx.translate(rand(-shake,shake),rand(-shake,shake));background();
    if(mode==='ready'){plane(105,150,'scout');plane(385,275,'scout');plane(240,550,'player',world);}
    else {
      pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y+Math.sin(p.t*5)*3);ctx.fillStyle=p.type==='P'?'#d9ea88':p.type==='B'?'#edc083':'#abd5a5';ctx.fillRect(-13,-14,26,28);ctx.strokeStyle='#f4f5c8';ctx.strokeRect(-10,-11,20,22);ctx.fillStyle='#344637';ctx.font='bold 19px monospace';ctx.textAlign='center';ctx.fillText(p.type,0,7);ctx.restore();});
      enemies.forEach(e=>plane(e.x,e.y,e.type,e.t));if(boss)plane(boss.x,boss.y,'boss',boss.t);
      bullets.forEach(b=>{ctx.fillStyle='#75dbcd';ctx.fillRect(b.x-3,b.y-10,6,17);ctx.fillStyle='#eeffd1';ctx.fillRect(b.x-1,b.y-10,2,13);});
      shots.forEach(b=>{ctx.fillStyle='#743a3f';ctx.fillRect(b.x-5,b.y-5,10,10);ctx.fillStyle='#ffc08d';ctx.fillRect(b.x-3,b.y-3,6,6);ctx.fillStyle='#ffe4ae';ctx.fillRect(b.x-1,b.y-2,2,3);});
      if(player.lives>0 && (player.invincible<=0 || Math.floor(player.invincible*12)%2===0))plane(player.x,player.y,'player',elapsed);
      if(player.invincible>0&&player.lives>0){ctx.strokeStyle='#d7edaa55';ctx.beginPath();ctx.arc(player.x,player.y,35,0,TAU);ctx.stroke();}
      particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;
    }
    if(flash>0&&mode==='playing'){ctx.fillStyle=`rgba(236,255,210,${Math.min(.8,flash*1.8)})`;ctx.fillRect(0,0,W,H);}
    ctx.restore();
  }
  function frame(time) { const dt=Math.min((time-lastTime)/1000||0, .05); lastTime=time;accumulator+=dt;while(accumulator>=1/60){update(1/60);accumulator-=1/60;}render();requestAnimationFrame(frame); }
  $('start').addEventListener('click',()=>mode==='paused'?pause():start());
  $('pause').addEventListener('click',pause);$('sound').addEventListener('click',toggleSound);$('bomb').addEventListener('click',()=>{unlockAudio();useBomb();});
  window.addEventListener('keydown',e=>{
    const key=e.key.length===1?e.key.toLowerCase():e.key;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','p','m','Escape'].includes(key))e.preventDefault();
    if(key==='Enter'&&e.target instanceof HTMLElement&&e.target.closest('button,a'))return;
    if(e.repeat){if(mode==='playing')keys.add(key);return;}
    if(key==='m')toggleSound();else if(key==='p'||key==='Escape')pause();else if(key==='Enter'){if(mode==='ready'||mode==='over')start();else if(mode==='paused')pause();}else if(key===' '){unlockAudio();useBomb();}else if(mode==='playing')keys.add(key);
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  function pointerPosition(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width*W,22,W-22),y:clamp((e.clientY-r.top)/r.height*H-30,35,H-30)};}
  let pointerId=null;
  canvas.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();unlockAudio();pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);pointer=pointerPosition(e);});
  canvas.addEventListener('pointermove',e=>{if(mode==='playing'&&e.pointerId===pointerId)pointer=pointerPosition(e);});
  function releasePointer(e){if(e.pointerId===pointerId){pointerId=null;pointer=null;}}
  canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
  window.addEventListener('blur',()=>{if(mode==='playing')pause();keys.clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
  window.addEventListener('pagehide',persistBest);
  updateSound();hud();requestAnimationFrame(frame);
})();
