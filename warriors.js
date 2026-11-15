(() => {
  'use strict';
  window.ArcadeWarriors = env => () => {
    const {ctx,W,H,keys,clamp,random,addScore,finish,message,beep,spark,rect,text,getHero}=env;
    const heroes={
      guan:{name:'关羽',weapon:'青龙偃月',hp:100,damage:5,range:105,cooldown:.36,color:'#73966c',trim:'#d9cc8c'},
      zhao:{name:'赵云',weapon:'龙胆破阵',hp:92,damage:4,range:96,cooldown:.26,color:'#bac6ce',trim:'#94c6cb'},
      zhang:{name:'张飞',weapon:'丈八横扫',hp:120,damage:7,range:86,cooldown:.46,color:'#597180',trim:'#d0a78b'}
    };
    const selected=getHero?.(),hero=heroes[Object.hasOwn(heroes,selected)?selected:'guan'];
    const scenes=[{name:'桃园破阵',boss:'黄巾校尉',wall:'#8f9875',sky:'#bac4a4'},{name:'虎牢突围',boss:'虎牢先锋',wall:'#8c8d7e',sky:'#adb8b2'},{name:'洛阳决战',boss:'洛阳守将',wall:'#947d70',sky:'#c3ac93'}];
    const gates=[370,880,1390];
    const g={level:1,lives:3,hero,hp:hero.hp,maxHp:hero.hp,rage:100,player:null,enemies:[],pickups:[],wave:0,active:false,kills:0,camera:0,combo:0,comboTime:0,transition:0,skillFx:0,time:0,over:false};
    function build(){g.player={x:90,y:440,z:0,vz:0,face:1,cooldown:0,swing:0,inv:2};g.enemies=[];g.pickups=[];g.wave=0;g.active=false;g.camera=0;g.combo=0;g.comboTime=0;}
    function spawnWave(){const n=3+g.level+(g.wave===2?0:1),gate=gates[g.wave];for(let i=0;i<n;i++){
      const type=i%3===2?'spear':i%4===3?'brute':'soldier';
      g.enemies.push({x:gate+(i%2?160:-100)+Math.floor(i/2)*45,y:330+(i%4)*65,z:0,hp:(type==='brute'?24:12)+g.level*3,maxHp:(type==='brute'?24:12)+g.level*3,type,face:-1,cooldown:.7+i*.12,wind:0,stun:0,swing:0,dead:false,attacks:0});
    }if(g.wave===2)g.enemies.push({x:gate+140,y:445,z:0,hp:130+g.level*40,maxHp:130+g.level*40,type:'boss',face:-1,cooldown:1.4,wind:0,stun:0,swing:0,dead:false,attacks:0});
      g.active=true;message(g.wave===2?`${scenes[g.level-1].boss} · 决战`:`第 ${g.wave+1} 波敌军`,1.5);
    }
    function strikeEnemy(e,damage,knock=12){if(e.dead||e.hp<=0)return;e.hp-=damage;e.stun=e.type==='boss'?.09:.24;if(e.type!=='boss'||knock>=40)e.wind=0;e.x=clamp(e.x+g.player.face*knock,14,gates[g.wave]+175);g.rage=Math.min(100,g.rage+7);spark(e.x-g.camera,e.y-30,'#ecc798',5);beep(260,.035);
      if(e.hp<=0){e.dead=true;g.kills++;addScore(e.type==='boss'?2000*g.level:e.type==='brute'?250:150);g.rage=Math.min(100,g.rage+8);spark(e.x-g.camera,e.y-30,'#edc88c',15);if(e.type!=='boss'&&g.kills%4===0)g.pickups.push({x:e.x,y:e.y,type:g.kills%8===0?'gold':'food'});}
    }
    function attack(manual=false){const p=g.player;if(p.cooldown>0||g.transition>0||g.over)return;
      const range=hero.range+(p.z>20?18:0),targets=g.enemies.filter(e=>!e.dead&&Math.abs(e.x-p.x)<range&&Math.abs(e.y-p.y)<37);
      if(!targets.length&&!manual)return;
      if(targets.length)p.face=targets.reduce((a,b)=>Math.abs(a.x-p.x)<Math.abs(b.x-p.x)?a:b).x>=p.x?1:-1;
      g.combo=g.comboTime>0?g.combo%3+1:1;g.comboTime=1.1;p.cooldown=hero.cooldown;p.swing=.23;
      for(const e of targets)if((e.x-p.x)*p.face>=-16)strikeEnemy(e,hero.damage*(g.combo===3?1.7:1)*(p.z>20?1.1:1),g.combo===3?28:10);
    }
    function hurt(damage){const p=g.player;if(p.inv>0||p.z>25||g.over)return;g.hp=Math.max(0,g.hp-damage);p.inv=.85;g.comboTime=0;spark(p.x-g.camera,p.y-25,'#e3a18a',14);beep(120,.12);
      if(g.hp<=0){g.lives--;if(g.lives<=0){g.over=true;finish('武将力竭，整备后再战！');return;}g.hp=g.maxHp;p.inv=2.5;g.rage=Math.min(100,g.rage+35);message('再战！恢复体力 · 短暂无敌',1.7);g.enemies.forEach(e=>{e.wind=0;e.cooldown=Math.max(e.cooldown,1.3);});}
    }
    g.action=name=>{if(g.over||g.transition>0)return;const p=g.player;
      if(name==='fire'&&p.z===0){p.vz=470;p.z=.01;beep(450,.06);}
      if(name==='attack')attack(true);
      if(name==='skill'&&g.rage>=100){g.rage=0;g.skillFx=.65;p.inv=Math.max(p.inv,1);for(const e of g.enemies)if(!e.dead&&Math.abs(e.x-p.x)<245&&Math.abs(e.y-p.y)<105)strikeEnemy(e,e.type==='boss'?38:45,42);g.rage=0;message(hero.weapon+'！',1);beep(190,.3);}
    };
    g.update=dt=>{
      if(g.over)return;g.time+=dt;g.skillFx=Math.max(0,g.skillFx-dt);
      if(g.transition>0){g.transition-=dt;if(g.transition<=0){g.level++;g.hp=Math.min(g.maxHp,g.hp+35);g.rage=Math.min(100,g.rage+40);build();message(scenes[g.level-1].name,2);}return;}
      const p=g.player;p.inv=Math.max(0,p.inv-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.swing=Math.max(0,p.swing-dt);g.comboTime=Math.max(0,g.comboTime-dt);
      let dx=Number(keys.has('right'))-Number(keys.has('left')),dy=Number(keys.has('down'))-Number(keys.has('up'));if(dx||dy){const len=Math.hypot(dx,dy);p.x=clamp(p.x+dx/len*160*dt,16,gates[g.wave]+190);p.y=clamp(p.y+dy/len*126*dt,315,558);if(dx)p.face=dx>0?1:-1;}
      if(p.z>0||p.vz>0){p.z+=p.vz*dt;p.vz-=1280*dt;if(p.z<=0){p.z=0;p.vz=0;}}
      g.camera=clamp(p.x-145,0,1220);
      if(!g.active&&p.x>=gates[g.wave]-180)spawnWave();
      attack();
      for(const e of g.enemies){if(e.dead)continue;e.stun=Math.max(0,e.stun-dt);e.swing=Math.max(0,e.swing-dt);e.cooldown=Math.max(0,e.cooldown-dt);e.face=p.x>=e.x?1:-1;if(e.stun>0)continue;
        const dx=p.x-e.x,dy=p.y-e.y,isBoss=e.type==='boss',reach=isBoss?112:e.type==='spear'?86:51;
        if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.swing=.22;e.attacks++;const slam=isBoss&&e.attacks%3===0;if(Math.abs(p.x-e.x)<(slam?155:reach+18)&&Math.abs(p.y-e.y)<(slam?88:38))hurt(isBoss?15:e.type==='brute'?11:7);e.cooldown=isBoss?.95:1.1;}if(g.over)return;continue;}
        if(Math.abs(dx)<reach&&Math.abs(dy)<29){if(e.cooldown<=0)e.wind=isBoss?.7:.48;}
        else{const speed=isBoss?69:e.type==='brute'?53:76;if(Math.abs(dx)>reach*.75)e.x+=Math.sign(dx)*speed*dt;if(Math.abs(dy)>10)e.y+=Math.sign(dy)*Math.min(speed,58)*dt;e.x=clamp(e.x,14,gates[g.wave]+180);e.y=clamp(e.y,315,558);}
      }
      for(const item of g.pickups)if(Math.abs(p.x-item.x)<36&&Math.abs(p.y-item.y)<30){item.dead=true;if(item.type==='food'){g.hp=Math.min(g.maxHp,g.hp+25);message('军粮补给 · 体力 +25',1);}else{addScore(300);message('战利品 · +300',1);}beep(950,.1);}
      g.pickups=g.pickups.filter(p=>!p.dead);g.enemies=g.enemies.filter(e=>!e.dead);
      if(g.active&&!g.enemies.length){g.active=false;g.wave++;addScore(400*g.level);if(g.wave===3){if(g.level===3){g.over=true;finish(`三关突破！${hero.name} 共击退 ${g.kills} 名敌军。`);return;}g.transition=2.7;message('战区突破 · 体力补给',2.5);}else{g.rage=Math.min(100,g.rage+20);message('敌阵已破，向右前进 →',1.7);}}
    };
    g.lifeLabel=()=>`体力 ${Math.ceil(g.hp)}/${g.maxHp} · 命 ${g.lives}`;
    g.status=()=>g.rage>=100?'大招就绪':`怒气 ${Math.floor(g.rage)}%`;
    function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    function drawWarrior(a,isHero=false){const x=a.x-g.camera,y=a.y-(a.z||0),boss=a.type==='boss',scale=boss?1.35:1,color=isHero?hero.color:boss?'#984d44':a.type==='spear'?'#9b835c':'#a18c61';
      ctx.fillStyle='#263b3127';ctx.beginPath();ctx.ellipse(x,a.y+3,boss?25:17,boss?9:6,0,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(x,y);ctx.scale(a.face*scale,scale);
      rect(-12,-7,9,11,'#2a3932');rect(5,-7,9,11,'#2a3932');rect(-13,-42,27,35,color);rect(-16,-38,10,24,color);rect(12,-38,9,23,color);rect(-10,-22,24,5,isHero?hero.trim:'#cbb983');rect(-8,-61,19,20,'#d4aa80');
      rect(-12,-65,29,10,isHero?hero.color:'#8b6f4f');rect(-13,-58,9,3,isHero?hero.trim:'#baa77b');rect(6,-54,3,3,'#293e34');
      if(isHero&&hero.name==='关羽')rect(-3,-43,13,20,'#304234');else if(isHero&&hero.name==='张飞'){rect(-4,-46,14,7,'#293c32');rect(-11,-69,27,6,'#435966');}
      if(isHero&&hero.name==='赵云'){rect(1,-75,5,13,'#d6e0dd');rect(-10,-28,24,4,'#e0e7d9');}
      const swinging=isHero?a.swing>0:a.swing>0;ctx.save();ctx.translate(11,-29);if(swinging)ctx.rotate(-.6);rect(2,-39,5,81,'#826543');
      if(isHero&&hero.name==='关羽'||boss){ctx.fillStyle=isHero?'#dce3c5':'#d8c4a5';ctx.beginPath();ctx.moveTo(4,-45);ctx.lineTo(31,-35);ctx.lineTo(26,-8);ctx.lineTo(8,-17);ctx.closePath();ctx.fill();}
      else{rect(-1,-51,11,18,'#d9ddc3');if(isHero&&hero.name==='张飞'){rect(-6,-46,5,16,'#c5d2b3');rect(12,-46,5,16,'#c5d2b3');}}
      ctx.restore();ctx.restore();
      if(a.wind>0){text(boss&&(a.attacks+1)%3===0?'震击!':'!',x,y-83,'#f8d18f',25);ctx.strokeStyle='#e3ad7c99';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+a.face*45,a.y,boss&&(a.attacks+1)%3===0?135:55,boss?32:16,0,0,Math.PI*2);ctx.stroke();}
      if(!isHero){const barW=boss?64:34;rect(x-barW/2,y-(boss?100:77),barW,4,'#34473c');rect(x-barW/2,y-(boss?100:77),barW*Math.max(0,a.hp/a.maxHp),4,boss?'#ebba80':'#d6d2a3');}
    }
    g.draw=()=>{const scene=scenes[g.level-1];rect(0,0,W,H,scene.sky);
      for(let i=0;i<7;i++){const x=i*125-g.camera*.13%125;ctx.fillStyle='#94a28a';ctx.beginPath();ctx.moveTo(x-50,210);ctx.lineTo(x+40,100+(i%3)*24);ctx.lineTo(x+140,210);ctx.fill();}
      rect(0,170,W,155,scene.wall);for(let x=-64;x<W+64;x+=64){const xx=x-g.camera*.45%64;rect(xx,152,42,28,scene.wall);rect(xx+10,210,2,109,'#65725e30');rect(xx,246,64,2,'#63745f33');}
      for(let i=0;i<5;i++){const x=i*270-g.camera*.7%270;rect(x+44,178,5,113,'#675c48');rect(x+49,186,38,63,i%2?'#6e7953':'#925d4e');text(i%2?'义':'勇',x+68,226,'#e0d3a1',22);}
      rect(0,325,W,H-325,'#999576');for(let row=0;row<8;row++){const y=335+row*42;rect(0,y,W,1,'#68765b33');for(let col=-1;col<8;col++)rect(col*80+(row%2)*40-g.camera%80,y,1,42,'#68765b33');}
      g.pickups.forEach(i=>{const x=i.x-g.camera;circle(x,i.y-8,12,i.type==='food'?'#c5c38c':'#dfbd75');text(i.type==='food'?'+':'金',x,i.y-4,'#526044',12);});
      const actors=[...g.enemies,{...g.player,isHero:true}].sort((a,b)=>a.y-b.y);actors.forEach(a=>{if(!a.isHero||g.player.inv<=0||Math.floor(g.player.inv*11)%2===0)drawWarrior(a,a.isHero);});
      const p=g.player;if(p.swing>0){ctx.strokeStyle='#e8e3acbb';ctx.lineWidth=g.combo===3?7:4;ctx.beginPath();ctx.ellipse(p.x-g.camera+p.face*55,p.y-34-p.z,48,31,p.face*.3,-1.3,1.3);ctx.stroke();}
      if(g.skillFx>0){ctx.strokeStyle='#e7f0b3';ctx.lineWidth=8*g.skillFx;ctx.beginPath();ctx.ellipse(p.x-g.camera,p.y-24,180*(1-g.skillFx/.8),85*(1-g.skillFx/.8),0,0,Math.PI*2);ctx.stroke();}
      rect(16,16,448,70,'#324a3dce');text(`${hero.name} · ${scene.name}`,240,38,'#e8e7c3',15);rect(36,53,260,9,'#1d352e');rect(36,53,260*g.hp/g.maxHp,9,'#bace8e');rect(314,53,126,9,'#1d352e');rect(314,53,126*g.rage/100,9,g.rage>=100?'#edc083':'#c4b086');
      text('靠近自动连击 · 跳跃躲攻击 · 满怒释放大招',240,112,'#4d644d',11);
      if(!g.active&&g.transition<=0)text('GO →',W-56,270,'#f3e4ad',22);
      const boss=g.enemies.find(e=>e.type==='boss');if(boss)text(scenes[g.level-1].boss,240,144,'#694e3d',14);
    };
    build();return g;
  };
})();
