(() => {
  'use strict';
  const $ = id => document.getElementById(id), W = 480, H = 640;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const random = (a,b) => a + Math.random()*(b-a);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const overlap = (a,b) => Math.abs(a.x-b.x)<(a.w+b.w)/2 && Math.abs(a.y-b.y)<(a.h+b.h)/2;
  const configs = {
    breakout:{title:'霓虹打砖块',label:'02 / NEON BREAKOUT',description:'每一次反弹，都离清屏更近一步。',controls:'鼠标 / 触屏拖动挡板\n← → 或 A / D 移动\n接住道具，自动触发多球或激光',tip:'击中挡板边缘可以改变反弹角度。接住「×3」分裂球，接住「L」获得 8 秒激光。',touch:'左右拖动下方操作带\n手指不挡球，接球更轻松',hint:'左右拖动下方操作带控制挡板。\n接住小球，击碎所有砖块。'},
    snake:{title:'贪吃蛇进化',label:'03 / SNAKE EVOLUTION',description:'再吃一口，再长一点。别咬到自己。',controls:'方向键 / WASD 转向\n手机：滑动战场，或点击方向按钮\n按住空格加速',tip:'每吃 5 颗能量球会升级并增加障碍。蓝色能量球让你短暂穿越边界；仍要避开自身和障碍。',touch:'滑动转向 / 点方向键\n按住加速按钮可加速',hint:'在战场滑动或点方向键转向。\n吃能量球，避开障碍与自身。'},
    racer:{title:'极速闪避',label:'04 / HIGHWAY DASH',description:'眼睛看远一点，纪录就近一点。',controls:'← → / A D 左右变道\n手机：点击下方左右按钮\n也可在战场左右滑动',tip:'金币每枚加 100 分。每次受撞后短暂无敌；车速逐渐提高，提前选择安全车道。',touch:'点击左右按钮变道\n也可以左右滑动',hint:'左右变道，躲避车流，收集金币。\n三次碰撞后本局结束。'},
    tanks:{title:'坦克保卫战',label:'05 / BATTLE GUARD',description:'一辆坦克，一座不能失守的基地。',controls:'方向键 / WASD 移动与瞄准\n自动开火，无需按射击键\n手机：按住方向，滑动换向',tip:'砖墙可以击碎，钢墙会挡住炮弹。你的炮弹不会伤害基地；敌弹命中基地则立即结束，优先拦截下方敌军。',touch:'自动开火已开启\n按住方向，滑动换向',hint:'按住方向移动，滑动换向，自动开火。\n消灭敌军，守住 ★ 基地。'}
  };
  const requested = new URLSearchParams(location.search).get('game');
  const id = Object.hasOwn(configs,requested) ? requested : 'breakout', config = configs[id];
  const canvas = $('mini-canvas'), ctx = canvas.getContext('2d');
  const keys = new Set(), pointers = new Map();
  let mode='ready', score=0, best=0, game, clock=0, noticeTime=0, audio, audioEnabled=false, last=0, accumulator=0;
  let particles=[], swipe=null, stripPointer=null;
  function read(k,f){try{return localStorage.getItem(k)??f;}catch{return f;}}
  function save(k,v){try{localStorage.setItem(k,String(v));}catch{}}
  best=Math.max(0,Number(read(`arcade-best-${id}`,0))||0); audioEnabled=read('arcade-sound','off')==='on';
  function audioUnlock(){if(!audioEnabled)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{audioEnabled=false;}}
  function beep(f=500,t=.07){if(!audioEnabled||!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+t);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+t);}
  function soundUI(){$('audio-toggle').textContent=`声音 ${audioEnabled?'ON':'OFF'} ♪`;$('audio-toggle').setAttribute('aria-pressed',String(audioEnabled));}
  function toggleAudio(){audioEnabled=!audioEnabled;save('arcade-sound',audioEnabled?'on':'off');audioUnlock();soundUI();beep();}
  function record(){if(score>best){best=score;save(`arcade-best-${id}`,best);}}
  function addScore(n){score+=n;}
  function message(s,t=1.6){$('mini-message').textContent=s;noticeTime=t;}
  function finish(reason){if(mode!=='playing')return;mode='over';record();clearInput();noticeTime=0;$('mini-message').textContent='';$('mini-kicker').textContent=score>=best&&score>0?'NEW HIGH SCORE. NICELY PLAYED!':'ONE MORE ROUND?';showOverlay('本局结束',`${reason}\n得分 ${String(score).padStart(6,'0')} · 第 ${game.level} 关`,'再来一局 ↗');beep(130,.3);hud();}
  function showOverlay(title,text,button){$('mini-overlay-title').textContent=title;$('mini-overlay-text').textContent=text;$('mini-start').textContent=button;$('mini-overlay').hidden=false;}
  function start(){audioUnlock();clearInput();mode='playing';score=0;clock=0;particles=[];noticeTime=0;$('mini-message').textContent='';game=constructors[id]();$('mini-overlay').hidden=true;message('LET’S PLAY',1);hud();}
  function clearInput(){keys.clear();pointers.clear();swipe=null;stripPointer=null;document.querySelectorAll('[data-control]').forEach(b=>b.setAttribute('aria-pressed','false'));}
  function pause(){if(mode==='playing'){mode='paused';clearInput();showOverlay('稍作休整','深呼吸，下一局操作更从容。','继续游戏 ↗');}else if(mode==='paused'){mode='playing';$('mini-overlay').hidden=true;audioUnlock();}hud();}
  function hud(){
    $('mini-score').textContent=String(score).padStart(6,'0');$('mini-best').textContent=String(Math.max(best,score)).padStart(6,'0');
    $('mini-lives').textContent=id==='snake'?`长度 ${game.body.length}`:'♥ '.repeat(Math.max(0,game.lives));
    $('mini-stage').textContent=`STAGE ${String(game.level).padStart(2,'0')}`;$('mini-status').textContent=game.status();
    $('mini-pause').disabled=!['playing','paused'].includes(mode);$('mini-pause').textContent=mode==='paused'?'▶':'Ⅱ';$('mini-pause').setAttribute('aria-label',mode==='paused'?'继续游戏':'暂停游戏');
  }
  function spark(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:random(-100,100),vy:random(-110,110),life:random(.2,.55),color});}
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  function text(s,x,y,c='#ddefb9',size=14){ctx.fillStyle=c;ctx.font=`bold ${size}px monospace`;ctx.textAlign='center';ctx.fillText(s,x,y);}
  function background(c='#172d35',grid=32){rect(0,0,W,H,c);ctx.strokeStyle='#ffffff06';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=W;x+=grid){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=0;y<=H;y+=grid){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();}
  function action(name){if(mode!=='playing')return;audioUnlock();game.action?.(name);}

  function Breakout(){
    const g={level:1,lives:3,paddle:{x:240,y:593,w:94,h:12},balls:[],bricks:[],drops:[],lasers:[],laser:0,laserClock:0,launch:.8,broken:0,pointer:null};
    function ball(x,y,vx=155,vy=-310){return{x,y,vx,vy,r:6};}
    function board(){g.bricks=[];for(let r=0;r<6;r++)for(let c=0;c<8;c++){if(g.level>1&&(r+c)%7===0)continue;const hp=r<2?2:1;g.bricks.push({x:16+c*57,y:68+r*27,w:50,h:20,hp,color:['#b7a1ed','#bc9ce3','#dc93b2','#e3a88e','#edcc82','#b8d58b'][r]});}g.balls=[ball(g.paddle.x,570)];g.launch=.9;g.drops=[];g.lasers=[];g.laser=0;}
    function hitBrick(b){b.hp--;addScore(10);spark(b.x+b.w/2,b.y+b.h/2,b.color,5);beep(380+b.y);if(b.hp===0){g.broken++;addScore(40);if(g.broken%6===0)g.drops.push({x:b.x+b.w/2,y:b.y,type:g.broken%12===0?'L':'×3'});}}
    function movePaddle(x){g.paddle.x=clamp(x,g.paddle.w/2+5,W-g.paddle.w/2-5);}
    g.action=n=>{if(n==='left')movePaddle(g.paddle.x-28);if(n==='right')movePaddle(g.paddle.x+28);};
    g.pointer=(x)=>{g.pointerX=x;};
    g.update=dt=>{
      g.laser=Math.max(0,g.laser-dt);const direction=Number(keys.has('right'))-Number(keys.has('left'));if(direction){g.pointerX=null;movePaddle(g.paddle.x+direction*390*dt);}else if(g.pointerX!=null)movePaddle(g.pointerX);
      if(g.launch>0){g.launch-=dt;g.balls[0].x=g.paddle.x;g.balls[0].y=570;return;}
      if(g.laser>0){g.laserClock-=dt;if(g.laserClock<=0){g.laserClock=.22;g.lasers.push({x:g.paddle.x-35,y:580},{x:g.paddle.x+35,y:580});beep(1050,.03);}}
      for(const b of g.balls){const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);}if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx);}if(b.y<b.r+28){b.y=b.r+28;b.vy=Math.abs(b.vy);}
        if(b.vy>0&&b.y+b.r>=g.paddle.y-g.paddle.h/2&&oldY<=g.paddle.y&&Math.abs(b.x-g.paddle.x)<g.paddle.w/2+b.r){const angle=clamp((b.x-g.paddle.x)/(g.paddle.w/2),-.95,.95)*1.05,speed=Math.min(530,350+g.level*18);b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=g.paddle.y-g.paddle.h/2-b.r;beep(250,.035);}
        for(const brick of g.bricks){if(brick.hp<=0||b.x+b.r<brick.x||b.x-b.r>brick.x+brick.w||b.y+b.r<brick.y||b.y-b.r>brick.y+brick.h)continue;
          hitBrick(brick);if(oldY+b.r<=brick.y){b.y=brick.y-b.r;b.vy=-Math.abs(b.vy);}else if(oldY-b.r>=brick.y+brick.h){b.y=brick.y+brick.h+b.r;b.vy=Math.abs(b.vy);}else{b.vx=oldX<brick.x?-Math.abs(b.vx):Math.abs(b.vx);}break;}
      }
      for(const l of g.lasers){l.y-=540*dt;for(const b of g.bricks){if(b.hp>0&&l.x>=b.x&&l.x<=b.x+b.w&&l.y>=b.y&&l.y<=b.y+b.h){hitBrick(b);l.dead=true;break;}}}
      for(const d of g.drops){d.y+=125*dt;if(Math.abs(d.x-g.paddle.x)<g.paddle.w/2+10&&Math.abs(d.y-g.paddle.y)<17){d.dead=true;addScore(100);beep(900,.15);if(d.type==='L'){g.laser=8;message('LASER READY');}else{const b=g.balls[0];if(b){for(const sign of [-1,1]){if(g.balls.length<9)g.balls.push(ball(b.x,b.y,sign*210,-330));}message('MULTI BALL ×3');}}}}
      g.drops=g.drops.filter(d=>!d.dead&&d.y<H+20);g.lasers=g.lasers.filter(l=>!l.dead&&l.y>0);g.balls=g.balls.filter(b=>b.y<H+10);
      if(!g.bricks.some(b=>b.hp>0)){g.level++;addScore(500);board();message(`STAGE ${g.level} · +500`,2);}
      else if(!g.balls.length){g.lives--;if(g.lives<=0)finish('小球飞走了，下次一定接住！');else{g.balls=[ball(g.paddle.x,570)];g.launch=1;g.laser=0;message('还有机会，稳住！');}}
    };
    g.status=()=>g.laser>0?`LASER ${Math.ceil(g.laser)}s`:`BALL ×${g.balls.length}`;
    g.draw=()=>{background('#25263d');text('NEON / BREAKOUT',240,24,'#8c89a8',10);g.bricks.forEach(b=>{if(b.hp<=0)return;rect(b.x,b.y,b.w,b.h,b.color);rect(b.x+2,b.y+2,b.w-4,2,'#ffffff55');if(b.hp>1)rect(b.x+19,b.y+8,12,3,'#ffffff88');});
      g.balls.forEach(b=>{ctx.fillStyle='#f5edb9';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
      rect(g.paddle.x-g.paddle.w/2,587,g.paddle.w,12,g.laser>0?'#efb0b8':'#c6ee96');rect(g.paddle.x-g.paddle.w/2+5,589,g.paddle.w-10,3,'#f4ffcf');
      g.drops.forEach(d=>{rect(d.x-13,d.y-12,26,24,d.type==='L'?'#e4a4c5':'#d6dc92');text(d.type,d.x,d.y+5,'#35432d',13);});g.lasers.forEach(l=>rect(l.x-2,l.y,4,15,'#f1adc6'));
      if(g.launch>0)text('GET READY',240,490,'#a6af91',13);
    };board();return g;
  }

  function Snake(){
    const cell=20,cols=24,rows=32;
    const g={level:1,body:[{x:11,y:17},{x:10,y:17},{x:9,y:17}],dir:{x:1,y:0},queue:[],food:null,obstacles:[],timer:0,apples:0,warp:0};
    const same=(a,b)=>a.x===b.x&&a.y===b.y;
    function freeCell(){const free=[];for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++)if(!g.body.some(b=>same(b,{x,y}))&&!g.obstacles.some(b=>same(b,{x,y})))free.push({x,y});return free.length?pick(free):null;}
    function food(){const at=freeCell();if(!at){finish('整片场地都被你征服了！');return;}g.food={...at,kind:g.apples%6===5?'warp':'normal'};}
    g.action=n=>{const d={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}}[n];if(!d||g.queue.length>=2)return;const last=g.queue[g.queue.length-1]||g.dir;if(d.x===last.x&&d.y===last.y||d.x===-last.x&&d.y===-last.y)return;g.queue.push(d);};
    g.update=dt=>{g.warp=Math.max(0,g.warp-dt);g.timer+=dt;const step=keys.has('fire')?.065:Math.max(.075,.16-(g.level-1)*.012);if(g.timer<step)return;g.timer-=step;if(g.queue.length)g.dir=g.queue.shift();
      let h={x:g.body[0].x+g.dir.x,y:g.body[0].y+g.dir.y};if(g.warp>0){h.x=(h.x+cols)%cols;h.y=(h.y+rows)%rows;}else if(h.x<0||h.x>=cols||h.y<0||h.y>=rows){finish('撞到边界了。');return;}
      const eat=g.food&&same(h,g.food),body=eat?g.body:g.body.slice(0,-1);
      if(body.some(b=>same(b,h))||g.obstacles.some(b=>same(b,h))){spark(h.x*cell+10,h.y*cell+10,'#e6b28c',18);finish('小心自己的尾巴和障碍！');return;}
      g.body.unshift(h);if(!eat)g.body.pop();else{g.apples++;addScore(g.food.kind==='warp'?150:100);if(g.food.kind==='warp'){g.warp=8;message('穿越边界 · 8s');}beep(550+g.apples*10,.1);
        if(g.apples%5===0){g.level++;for(let i=0;i<3;i++){const at=freeCell();if(at&&Math.abs(at.x-h.x)+Math.abs(at.y-h.y)>5)g.obstacles.push(at);}message(`LEVEL ${g.level} · 小心新障碍`);}
        food();}
    };
    g.status=()=>g.warp>0?`WARP ${Math.ceil(g.warp)}s`:`ENERGY ${g.apples}`;
    g.draw=()=>{background('#263e35',cell);ctx.strokeStyle=g.warp>0?'#8cded7':'#8d9e6b';ctx.strokeRect(1,1,W-2,H-2);
      g.obstacles.forEach(b=>{rect(b.x*cell+1,b.y*cell+1,18,18,'#77836c');rect(b.x*cell+4,b.y*cell+3,12,3,'#a1aa88');});
      g.body.forEach((b,i)=>{rect(b.x*cell+1,b.y*cell+1,18,18,i===0?'#dcf6ad':i%2?'#a5cb78':'#b2d282');});
      const h=g.body[0],ex=h.x*cell+10,ey=h.y*cell+10;for(const sign of [-1,1]){const ox=g.dir.y!==0?sign*4:g.dir.x*5,oy=g.dir.x!==0?sign*4:g.dir.y*5;rect(ex+ox-1,ey+oy-1,3,3,'#2c4b36');}
      if(g.food){const f=g.food;ctx.fillStyle=f.kind==='warp'?'#86d9db':'#ebad7f';ctx.beginPath();ctx.arc(f.x*cell+10,f.y*cell+10,7,0,Math.PI*2);ctx.fill();rect(f.x*cell+9,f.y*cell,3,5,'#c3dd99');}
    };food();return g;
  }

  function Racer(){
    const lanes=[120,240,360],g={level:1,lives:3,lane:1,x:240,y:540,cars:[],coins:[],time:0,distance:0,spawn:.7,inv:0,road:0};
    g.action=n=>{if(n==='left')g.lane=Math.max(0,g.lane-1);if(n==='right')g.lane=Math.min(2,g.lane+1);};
    function spawn(){const blocked=pick([0,1,2]),rows=[blocked];if(g.level>2&&Math.random()<.45)rows.push(pick([0,1,2].filter(v=>v!==blocked)));
      rows.forEach(l=>g.cars.push({x:lanes[l],y:-80,w:45,h:76,color:pick(['#b7c8bc','#c78d7d','#a39bbd'])}));const open=pick([0,1,2].filter(v=>!rows.includes(v)));g.coins.push({x:lanes[open],y:-80});
    }
    g.update=dt=>{g.time+=dt;g.level=1+Math.floor(g.time/18);g.inv=Math.max(0,g.inv-dt);const speed=Math.min(480,230+(g.level-1)*30);g.road=(g.road+speed*dt)%80;const previous=Math.floor(g.distance);g.distance+=dt*12;addScore(Math.floor(g.distance)-previous);g.x+=(lanes[g.lane]-g.x)*Math.min(1,dt*14);g.spawn-=dt;if(g.spawn<=0){spawn();g.spawn=Math.max(.95,1.65-g.level*.07);}
      for(const c of g.cars){c.y+=speed*dt;if(g.inv<=0&&overlap({x:g.x,y:g.y,w:40,h:68},c)){c.dead=true;g.lives--;g.inv=2;spark(g.x,g.y,'#f1be87',24);beep(120,.2);message('小心车流！');if(g.lives<=0){finish('三次碰撞，休息一下再出发。');return;}}}
      for(const c of g.coins){c.y+=speed*dt;if(Math.abs(c.x-g.x)<31&&Math.abs(c.y-g.y)<42){c.dead=true;addScore(100);beep(900,.07);spark(c.x,c.y,'#f8d98d',7);}}
      g.cars=g.cars.filter(c=>!c.dead&&c.y<H+100);g.coins=g.coins.filter(c=>!c.dead&&c.y<H+20);
    };
    g.status=()=>`${Math.min(240,95+g.level*12)} KM/H`;
    function car(x,y,color,player=false){rect(x-26,y-27,5,18,'#172a30');rect(x+21,y-27,5,18,'#172a30');rect(x-26,y+20,5,18,'#172a30');rect(x+21,y+20,5,18,'#172a30');rect(x-21,y-39,42,78,color);rect(x-17,y-34,34,4,'#ffffff44');rect(x-15,y-19,30,18,'#324d58');rect(x-13,y+21,26,10,'#405962');rect(x-16,y-37,7,5,player?'#fff4b8':'#edc7a2');rect(x+9,y-37,7,5,player?'#fff4b8':'#edc7a2');}
    g.draw=()=>{rect(0,0,W,H,'#7e916b');rect(60,0,360,H,'#354a54');rect(62,0,4,H,'#c9c4a0');rect(414,0,4,H,'#c9c4a0');for(let y=-80;y<H;y+=80){rect(178,y+g.road,4,35,'#b7bdab');rect(298,y+g.road,4,35,'#b7bdab');rect(48,y+g.road,10,40,'#d7bf94');rect(422,y+g.road,10,40,'#d7bf94');}
      g.cars.forEach(c=>car(c.x,c.y,c.color));g.coins.forEach(c=>{ctx.fillStyle='#efcf7b';ctx.beginPath();ctx.arc(c.x,c.y,10,0,Math.PI*2);ctx.fill();text('$',c.x,c.y+5,'#8b763d',13);});if(g.inv<=0||Math.floor(g.inv*10)%2===0)car(g.x,g.y,'#ebbd78',true);
    };return g;
  }

  function Tanks(){
    const tile=32,dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},g={level:1,lives:3,player:null,enemies:[],bullets:[],walls:[],spawn:.6,spawned:0,killed:0,target:8,inv:2,transition:0};
    const base={x:240,y:592,w:29,h:29};
    function tank(x,y,enemy=false){return{x,y,w:26,h:26,dir:enemy?'down':'up',cooldown:enemy?random(.6,1.8):0,think:0,enemy,hp:1};}
    function board(){g.walls=[];for(let r=2;r<17;r++)for(let c=1;c<14;c++)if(r%4===2&&![3,7,11].includes(c)||r%4===0&&c%4===1){g.walls.push({x:c*32+16,y:r*32+16,w:32,h:32,type:r%4===0?'steel':'brick'});}for(const [c,r] of [[6,17],[7,17],[8,17],[6,18],[8,18],[6,19],[7,19],[8,19]])g.walls.push({x:c*32+16,y:r*32+16,w:32,h:32,type:'brick'});
      g.player=tank(176,592);g.enemies=[];g.bullets=[];g.inv=2;g.spawned=g.killed=0;g.spawn=.7;g.target=6+g.level*2;}
    function blocked(t,x,y){const at={...t,x,y};return x<14||x>W-14||y<14||y>H-14||overlap(at,base)||g.walls.some(w=>overlap(at,w))||[g.player,...g.enemies].some(e=>e!==t&&e.hp>0&&overlap(at,e));}
    function turn(t,dir){if(t.dir===dir)return;const d=dirs[dir],perpendicular=d.x?'y':'x',aligned=Math.round((t[perpendicular]-16)/32)*32+16;if(Math.abs(aligned-t[perpendicular])<=(t.enemy?8:16)){const x=perpendicular==='x'?aligned:t.x,y=perpendicular==='y'?aligned:t.y;if(!blocked(t,x,y))t[perpendicular]=aligned;}t.dir=dir;}
    function move(t,dt,speed){const d=dirs[t.dir],x=t.x+d.x*speed*dt,y=t.y+d.y*speed*dt;if(blocked(t,x,y))return false;t.x=x;t.y=y;return true;}
    function shoot(t){if(t.cooldown>0)return;const d=dirs[t.dir];g.bullets.push({x:t.x+d.x*19,y:t.y+d.y*19,w:5,h:5,vx:d.x*(t.enemy?235:350),vy:d.y*(t.enemy?235:350),enemy:t.enemy});t.cooldown=t.enemy?Math.max(.7,1.6-g.level*.08):.28;beep(t.enemy?190:460,.035);}
    g.action=n=>{if(dirs[n])turn(g.player,n);if(n==='fire')shoot(g.player);};
    g.update=dt=>{
      g.inv=Math.max(0,g.inv-dt);g.player.cooldown=Math.max(0,g.player.cooldown-dt);
      if(g.transition>0){g.transition-=dt;if(g.transition<=0){g.level++;board();message(`STAGE ${g.level} · 守住基地`,2);}return;}
      const active=['up','left','down','right'].filter(n=>keys.has(n));if(active.length){turn(g.player,active[active.length-1]);move(g.player,dt,115);}shoot(g.player);
      g.spawn-=dt;if(g.spawned<g.target&&g.enemies.length<4&&g.spawn<=0){const points=[48,240,432].filter(x=>![g.player,...g.enemies].some(e=>Math.abs(e.x-x)<30&&e.y<50));if(points.length){g.enemies.push(tank(pick(points),16,true));g.spawned++;}g.spawn=1.5;}
      for(const e of g.enemies){e.cooldown=Math.max(0,e.cooldown-dt);e.think-=dt;if(e.think<=0){const target=Math.random()<.65?base:g.player;const options=[];if(target.x<e.x-16)options.push('left');if(target.x>e.x+16)options.push('right');if(target.y>e.y+16)options.push('down');if(target.y<e.y-16)options.push('up');turn(e,Math.random()<.7&&options.length?pick(options):pick(Object.keys(dirs)));e.think=random(.4,1.2);}
        if(!move(e,dt,Math.min(105,58+g.level*5)))e.think=0;shoot(e);}
      for(const b of g.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<0||b.x>W||b.y<0||b.y>H){b.dead=true;continue;}
        const wall=g.walls.find(w=>!w.dead&&overlap(b,w));if(wall){b.dead=true;if(wall.type==='brick'){wall.dead=true;spark(b.x,b.y,'#b58a65',6);}continue;}
        if(b.enemy){if(overlap(b,base)){spark(base.x,base.y,'#f3c47e',40);finish('基地失守！优先保护 ★。');return;}if(g.inv<=0&&overlap(b,g.player)){b.dead=true;g.lives--;spark(g.player.x,g.player.y,'#e9bd81',22);if(g.lives<=0){finish('机体耗尽，基地等待你的归来。');return;}g.player=tank(176,592);g.inv=2.5;message('机体受损 · 短暂无敌');}}
        else{const enemy=g.enemies.find(e=>e.hp>0&&overlap(b,e));if(enemy){b.dead=true;enemy.hp=0;g.killed++;addScore(200);spark(enemy.x,enemy.y,'#edbd83',18);beep(100,.1);}}
      }
      for(let i=0;i<g.bullets.length;i++)for(let j=i+1;j<g.bullets.length;j++){const a=g.bullets[i],b=g.bullets[j];if(!a.dead&&!b.dead&&a.enemy!==b.enemy&&Math.abs(a.x-b.x)<8&&Math.abs(a.y-b.y)<8){a.dead=b.dead=true;spark(a.x,a.y,'#f0e6b3',3);}}
      g.walls=g.walls.filter(w=>!w.dead);g.bullets=g.bullets.filter(b=>!b.dead);g.enemies=g.enemies.filter(e=>e.hp>0);
      if(g.killed>=g.target){addScore(1000);g.transition=2.5;g.bullets=[];g.lives=Math.min(3,g.lives+1);message('基地安全 · +1000',2.4);record();}
    };
    g.status=()=>`敌军 ${g.target-g.killed}`;
    function drawTank(t,color){ctx.save();ctx.translate(t.x,t.y);ctx.rotate({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[t.dir]);rect(-15,-14,7,28,'#172b29');rect(8,-14,7,28,'#172b29');for(let y=-12;y<13;y+=6){rect(-14,y,5,2,'#73816a');rect(9,y,5,2,'#73816a');}rect(-10,-12,20,24,color);rect(-7,-7,14,15,t.enemy?'#925e4f':'#91a765');rect(-3,-23,6,24,t.enemy?'#dfaa87':'#dbe7a7');ctx.restore();}
    g.draw=()=>{background('#354335');g.walls.forEach(w=>{if(w.type==='steel'){rect(w.x-15,w.y-15,30,30,'#8c9890');rect(w.x-12,w.y-12,24,24,'#64766d');rect(w.x-10,w.y-10,20,3,'#b6beb0');}else{rect(w.x-15,w.y-15,30,30,'#ad805d');for(let r=0;r<3;r++){rect(w.x-15,w.y-15+r*10,30,1,'#644e3d');rect(w.x+(r%2?-7:1),w.y-15+r*10,1,10,'#6e533d');}}});rect(225,577,30,30,'#c4b27c');text('★',240,600,'#344a35',25);g.enemies.forEach(e=>drawTank(e,'#c88b70'));if(g.inv<=0||Math.floor(g.inv*10)%2===0)drawTank(g.player,'#c9d893');g.bullets.forEach(b=>rect(b.x-2,b.y-3,5,7,b.enemy?'#f0b18d':'#e9f5ac'));};
    board();return g;
  }
  const constructors={breakout:Breakout,snake:Snake,racer:Racer,tanks:Tanks};
  document.title=`${config.title} · 口袋街机厅`;
  $('game-title').textContent=config.title;$('header-game').textContent=config.label;$('game-label').textContent=config.label;$('game-description').textContent=config.description;
  $('controls-description').textContent=config.controls;$('game-tip').textContent=config.tip;$('touch-tip').textContent=config.touch;$('touch-controls').dataset.game=id;document.body.dataset.game=id;$('drag-strip').hidden=id!=='breakout';if(id==='snake'){$('fire-button').innerHTML='加速<br><small>按住</small>';$('fire-button').setAttribute('aria-label','按住加速');}
  canvas.setAttribute('aria-label',`${config.title}游戏画面。${config.controls}`);
  document.querySelector(`.side-games a[href="play.html?game=${id}"]`)?.classList.add('current');
  const mapping={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',' ':'fire'};
  window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(mapping[key]||['p','m','Escape'].includes(key))e.preventDefault();if(e.repeat)return;
    if(key==='Enter'&&e.target instanceof HTMLElement&&e.target.closest('button,a'))return;
    if(key==='p'||key==='Escape')pause();else if(key==='m')toggleAudio();else if(key==='Enter'){if(mode==='paused')pause();else if(mode==='ready'||mode==='over')start();}
    else if(mapping[key]&&mode==='playing'){keys.add(mapping[key]);action(mapping[key]);}});
  window.addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;keys.delete(mapping[key]);});
  const controlButtons=[...document.querySelectorAll('[data-control]')];
  function setControl(pointerId,name){
    const old=pointers.get(pointerId);pointers.delete(pointerId);
    if(old&&![...pointers.values()].includes(old))keys.delete(old);
    if(name){pointers.set(pointerId,name);keys.add(name);if(old!==name)action(name);}
    controlButtons.forEach(b=>b.setAttribute('aria-pressed',String([...pointers.values()].includes(b.dataset.control))));
  }
  controlButtons.forEach(button=>{
    button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);setControl(e.pointerId,button.dataset.control);});
    button.addEventListener('pointermove',e=>{
      if(mode!=='playing'||!pointers.has(e.pointerId)||button.dataset.control==='fire'||id==='racer')return;
      const r=$('direction-pad').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      if(Math.hypot(dx,dy)<12)return;
      setControl(e.pointerId,Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
    });
    const release=e=>setControl(e.pointerId,null);
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  const strip=$('drag-strip');
  function stripMove(e){const r=strip.getBoundingClientRect();game.pointer?.(clamp((e.clientX-r.left)/r.width,0,1)*W);}
  strip.addEventListener('pointerdown',e=>{if(mode!=='playing'||id!=='breakout')return;e.preventDefault();strip.setPointerCapture(e.pointerId);stripPointer=e.pointerId;stripMove(e);});
  strip.addEventListener('pointermove',e=>{if(mode==='playing'&&stripPointer===e.pointerId)stripMove(e);});
  const releaseStrip=e=>{if(e.pointerId===stripPointer)stripPointer=null;};
  strip.addEventListener('pointerup',releaseStrip);strip.addEventListener('pointercancel',releaseStrip);strip.addEventListener('lostpointercapture',releaseStrip);
  function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
  canvas.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=pos(e);swipe={...p,id:e.pointerId};game.pointer?.(p.x,p.y);});
  canvas.addEventListener('pointermove',e=>{if(mode!=='playing')return;const p=pos(e);if(id==='breakout'&&(e.pointerType==='mouse'||swipe?.id===e.pointerId))game.pointer?.(p.x,p.y);if(!swipe||swipe.id!==e.pointerId)return;
    const dx=p.x-swipe.x,dy=p.y-swipe.y;if(Math.hypot(dx,dy)>24){if(id==='snake')action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');else if(id==='racer'&&Math.abs(dx)>24)action(dx>0?'right':'left');swipe={...p,id:e.pointerId};}});
  const clearSwipe=()=>{swipe=null;};canvas.addEventListener('pointerup',clearSwipe);canvas.addEventListener('pointercancel',clearSwipe);canvas.addEventListener('lostpointercapture',clearSwipe);
  $('mini-start').addEventListener('click',()=>mode==='paused'?pause():start());$('mini-pause').addEventListener('click',pause);$('audio-toggle').addEventListener('click',toggleAudio);
  window.addEventListener('blur',()=>{if(mode==='playing')pause();clearInput();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});window.addEventListener('pagehide',record);window.addEventListener('orientationchange',()=>{if(mode==='playing')pause();});
  function update(dt){if(mode!=='playing')return;clock+=dt;game.update(dt);if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('mini-message').textContent='';}particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);if(Math.floor(clock*10)!==Math.floor((clock-dt)*10))hud();}
  function draw(){game.draw();particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*3,0,1);rect(p.x,p.y,4,4,p.color);});ctx.globalAlpha=1;}
  function frame(time){accumulator+=Math.min(.05,(time-last)/1000||0);last=time;while(accumulator>=1/60){update(1/60);accumulator-=1/60;}draw();requestAnimationFrame(frame);}
  game=constructors[id]();$('mini-overlay-text').textContent=config.hint;hud();soundUI();requestAnimationFrame(frame);
})();
