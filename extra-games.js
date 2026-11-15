(() => {
  'use strict';
  window.ArcadeExtras = env => {
    const {ctx,W,H,keys,clamp,random,pick,overlap,addScore,finish,message,beep,spark,rect,text,background}=env;
    function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    function Moles(){
      const g={level:1,lives:3,time:60,spawn:.25,combo:0,hits:0,holes:[],over:false,feedback:[]};
      for(let r=0;r<3;r++)for(let c=0;c<3;c++)g.holes.push({x:80+c*160,y:166+r*166,kind:null,age:0,duration:0});
      g.tap=(x,y)=>{if(g.over)return;const h=g.holes.find(h=>h.kind&&Math.abs(x-h.x)<61&&Math.abs(y-h.y+12)<68);if(!h)return;
        const bomb=h.kind==='bomb';h.kind=null;h.age=0;
        if(bomb){g.combo=0;g.lives--;spark(h.x,h.y,'#efa786',20);beep(110,.2);g.feedback.push({x:h.x,y:h.y,t:.55,label:'小心炸弹',color:'#ffbc9c'});if(!g.lives){g.over=true;finish('踩中三次炸弹，休息一下再来！');}}
        else{g.hits++;g.combo++;const points=100+Math.min(10,g.combo-1)*10;addScore(points);g.level=1+Math.floor(g.hits/12);beep(500+Math.min(g.combo,15)*25);spark(h.x,h.y,'#e1ee98',8);g.feedback.push({x:h.x,y:h.y,t:.55,label:`+${points}`,color:'#e9f5b0'});}
      };
      g.update=dt=>{if(g.over)return;g.time=Math.max(0,g.time-dt);if(g.time<=0){g.over=true;finish(`时间到！本局击中 ${g.hits} 只地鼠。`);return;}
        g.spawn-=dt;for(const h of g.holes)if(h.kind){h.age+=dt;if(h.age>=h.duration){if(h.kind==='mole')g.combo=0;h.kind=null;}}
        if(g.spawn<=0){const free=g.holes.filter(h=>!h.kind);if(free.length){const h=pick(free);h.kind=g.hits>=3&&Math.random()<.19&&!g.holes.some(h=>h.kind==='bomb')?'bomb':'mole';h.age=0;h.duration=Math.max(.7,1.45-g.level*.075);}g.spawn=Math.max(.28,.7-g.level*.045);}
        g.feedback.forEach(f=>{f.t-=dt;f.y-=dt*28;});g.feedback=g.feedback.filter(f=>f.t>0);
      };
      g.status=()=>`剩余 ${Math.ceil(g.time)}s`;
      g.draw=()=>{background('#59734d',40);text('点地鼠 · 躲炸弹',240,37,'#d5e3b3',16);text(`连击 ×${g.combo}`,240,66,'#f5d7a3',13);
        for(const h of g.holes){ctx.fillStyle='#34472e';ctx.beginPath();ctx.ellipse(h.x,h.y+30,65,23,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#93a36c';ctx.lineWidth=4;ctx.stroke();
          if(h.kind){const rise=clamp(h.age/.12,0,1),y=h.y+32-rise*42;
            if(h.kind==='bomb'){circle(h.x,y,35,'#2a3538');circle(h.x-10,y-12,9,'#67736a');rect(h.x-5,y-43,10,12,'#d0a16d');ctx.strokeStyle='#e3b36b';ctx.beginPath();ctx.moveTo(h.x,y-40);ctx.lineTo(h.x+10,y-51);ctx.lineTo(h.x+21,y-47);ctx.stroke();text('!',h.x,y+12,'#efa97b',30);circle(h.x+23,y-49,4,'#f3d88e');}
            else{circle(h.x-28,y-18,15,'#a97a57');circle(h.x+28,y-18,15,'#a97a57');circle(h.x,y,40,'#bd9368');circle(h.x,y+17,26,'#dfbd8b');circle(h.x-13,y-6,4,'#283e32');circle(h.x+13,y-6,4,'#283e32');circle(h.x,y+8,7,'#79564c');rect(h.x-7,y+21,6,9,'#fff0c3');rect(h.x+1,y+21,6,9,'#fff0c3');}
          }
          rect(h.x-65,h.y+42,130,13,'#59734d');
        }
        g.feedback.forEach(f=>text(f.label,f.x,f.y-64,f.color,20));text('60 秒挑战 · 三次误点炸弹结束',240,624,'#ccd9ab',11);
      };return g;
    }

    function Match(){
      const rows=8,cols=6,step=64,stepX=72,left=24,top=68,symbols=['●','▲','◆','★','✿','☂','♥','☀','☾','♫','✚','ϟ'],colors=['#ca795b','#748d54','#768bb4','#b58d51','#b07caa','#589393','#c77c81','#ba9c42','#9284bd','#689383','#b68c75','#8d9b55'];
      const g={level:1,lives:3,time:150,board:[],selected:null,path:null,pathTime:0,hints:3,shuffles:2,hintPair:null,hintTime:0,remaining:48,transition:0,over:false};
      const at=(r,c)=>({r,c}),equal=(a,b)=>a.r===b.r&&a.c===b.c;
      function center(a){return{x:a.c===0?12:a.c===cols+1?468:left+(a.c-.5)*stepX,y:top+(a.r-.5)*step};}
      // BFS includes an empty outer border; a valid route has at most two bends.
      function route(a,b){
        if(equal(a,b)||!g.board[a.r]?.[a.c]||g.board[a.r][a.c]!==g.board[b.r]?.[b.c])return null;
        const queue=[{...a,dir:-1,turns:0,parent:-1}],seen=new Map(),dirs=[[0,1],[1,0],[0,-1],[-1,0]];
        for(let i=0;i<queue.length;i++){const p=queue[i];for(let dir=0;dir<4;dir++){const [dr,dc]=dirs[dir],r=p.r+dr,c=p.c+dc,turns=p.turns+(p.dir!==-1&&p.dir!==dir?1:0);if(r<0||r>rows+1||c<0||c>cols+1||turns>2)continue;
            const target=r===b.r&&c===b.c;if(!target&&g.board[r][c]!==0)continue;const key=`${r},${c},${dir}`;if((seen.get(key)??3)<=turns)continue;seen.set(key,turns);const next={r,c,dir,turns,parent:i};
            if(target){const path=[at(r,c)];let index=i;while(index>=0){path.push(at(queue[index].r,queue[index].c));index=queue[index].parent;}return path.reverse();}queue.push(next);
          }}return null;
      }
      function findMove(){for(let r=1;r<=rows;r++)for(let c=1;c<=cols;c++)if(g.board[r][c])for(let rr=r;rr<=rows;rr++)for(let cc=1;cc<=cols;cc++){if(rr===r&&cc<=c)continue;if(g.board[r][c]===g.board[rr][cc]){const path=route(at(r,c),at(rr,cc));if(path)return{a:at(r,c),b:at(rr,cc),path};}}return null;}
      function shuffleValues(values){for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}}
      function reshuffle(){const places=[],values=[];for(let r=1;r<=rows;r++)for(let c=1;c<=cols;c++)if(g.board[r][c]){places.push(at(r,c));values.push(g.board[r][c]);}
        for(let attempt=0;attempt<16;attempt++){shuffleValues(values);places.forEach((p,i)=>g.board[p.r][p.c]=values[i]);if(findMove())return;}
        // There is always a pair that can connect via the outer border: put a
        // matching value at the first two occupied positions in the topmost row.
        // If only one sits there, force a pair into the first occupied column.
        const pair=values.find(v=>values.filter(x=>x===v).length>=2);
        const first=places[0];let second=places.find(p=>p.r===first.r&&!equal(p,first));
        if(!second)second=places.find(p=>p.c===first.c&&!equal(p,first));
        if(!second){ // Sparse diagonal: any two positions can connect in <=2 bends.
          second=places[1];
        }
        for(const dest of [first,second])if(g.board[dest.r][dest.c]!==pair){const src=places.find(p=>!equal(p,first)&&!equal(p,second)&&g.board[p.r][p.c]===pair);if(src)[g.board[dest.r][dest.c],g.board[src.r][src.c]]=[g.board[src.r][src.c],g.board[dest.r][dest.c]];}
      }
      function build(){g.board=Array.from({length:rows+2},()=>Array(cols+2).fill(0));const values=[];for(let i=0;i<24;i++)values.push(i%12+1,i%12+1);shuffleValues(values);for(let r=1;r<=rows;r++)for(let c=1;c<=cols;c++)g.board[r][c]=values.pop();g.remaining=48;g.selected=null;g.path=null;g.hintPair=null;g.time=150;g.hints=3;g.shuffles=2;if(!findMove())reshuffle();}
      g.route=route;g.findMove=findMove;
      g.action=name=>{if(g.over||g.transition>0)return;if(name==='hint'&&g.hints>0){const move=findMove();if(move){g.hints--;g.hintPair=[move.a,move.b];g.hintTime=2;message('金色边框是一组可配对图案',1.5);}}
        if(name==='shuffle'&&g.shuffles>0){g.shuffles--;g.selected=null;g.hintPair=null;reshuffle();message('已重新排列');}};
      g.tap=(x,y)=>{if(g.over||g.transition>0)return;const c=Math.floor((x-left)/stepX)+1,r=Math.floor((y-top)/step)+1;if(r<1||r>rows||c<1||c>cols||!g.board[r][c])return;const next=at(r,c);g.hintPair=null;
        if(!g.selected){g.selected=next;beep(450,.04);return;}if(equal(g.selected,next)){g.selected=null;return;}
        const path=route(g.selected,next);if(path){g.board[g.selected.r][g.selected.c]=0;g.board[r][c]=0;g.remaining-=2;g.path=path;g.pathTime=.35;g.selected=null;g.time=Math.min(180,g.time+2);addScore(150);beep(850,.1);
          if(!g.remaining){addScore(1000);g.transition=2;message('全部连通 · +1000',1.8);}else if(!findMove()){reshuffle();message('暂无可连组合，已自动免费重排',2);}}
        else{g.selected=next;g.time=Math.max(0,g.time-3);beep(180,.06);message('需同图案，连线最多拐两次',1.2);}
      };
      g.update=dt=>{if(g.over)return;if(g.transition>0){g.transition-=dt;if(g.transition<=0){g.level++;build();message(`第 ${g.level} 关`,1.5);}return;}g.time=Math.max(0,g.time-dt);g.pathTime=Math.max(0,g.pathTime-dt);g.hintTime=Math.max(0,g.hintTime-dt);if(g.time<=0){g.over=true;finish('时间到，下一次连得更快！');}};
      g.lifeLabel=()=>`剩余 ${g.remaining} 张`;g.status=()=>`${Math.ceil(g.time)}s`;
      g.draw=()=>{background('#354b48');text('同图案 · 最多两次转弯 · 可走外圈',240,34,'#c4d3b1',12);
        for(let r=1;r<=rows;r++)for(let c=1;c<=cols;c++){const v=g.board[r][c];if(!v)continue;const p=center(at(r,c));rect(p.x-28,p.y-28,56,56,'#e9ead7');rect(p.x-25,p.y-25,50,3,'#ffffff88');text(symbols[v-1],p.x,p.y+11,colors[v-1],32);
          const selected=g.selected&&equal(g.selected,at(r,c)),hint=g.hintTime>0&&g.hintPair?.some(a=>equal(a,at(r,c)));if(selected||hint){ctx.strokeStyle=hint?'#f2c779':'#d8f58d';ctx.lineWidth=4;ctx.strokeRect(p.x-29,p.y-29,58,58);}}
        if(g.path&&g.pathTime>0){ctx.strokeStyle='#e4f7a7';ctx.lineWidth=4;ctx.beginPath();g.path.forEach((p,i)=>{const q=center(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();}text('点击两张图案 · 提示和重排在下方',240,618,'#a9beb0',11);
      };build();return g;
    }

    function Commando(){
      const ground=560,worldWidth=2520;
      const g={level:1,lives:5,player:null,enemies:[],crates:[],cages:[],platforms:[],bullets:[],boss:null,camera:0,inv:2,transition:0,jumpBuffer:0,over:false,time:0,rescued:0};
      function build(){g.player={x:76,y:ground-24,w:26,h:48,vy:0,face:1,onGround:true,cooldown:0};g.camera=0;g.bullets=[];g.inv=2.5;g.jumpBuffer=0;
        g.platforms=[{x:390,y:474,w:180,h:14},{x:900,y:474,w:160,h:14},{x:1460,y:474,w:160,h:14},{x:1880,y:474,w:150,h:14}];
        g.crates=[310,660,1110,1390,1760,2020].map(x=>({x,y:ground-20,w:34,h:40,hp:3}));
        g.cages=[{x:750,y:ground-27,w:38,h:54,hp:3,rescued:false},{x:1670,y:ground-27,w:38,h:54,hp:3,rescued:false}];
        g.enemies=[420,590,980,1210,1530,1840,2060].map((x,i)=>({x,y:ground-(i%3===2?22:23),origin:x,w:i%3===2?58:26,h:i%3===2?44:46,hp:i%3===2?7:2,type:i%3===2?'tank':'soldier',cooldown:1+i*.13,t:0}));
        g.boss={x:2350,y:ground-48,w:106,h:96,hp:35+g.level*10,maxHp:35+g.level*10,cooldown:1.2,t:0};
      }
      function damage(){if(g.inv>0||g.over)return;g.lives--;g.inv=2;g.bullets=g.bullets.filter(b=>!b.enemy);spark(g.player.x-g.camera,g.player.y,'#ecb28a',18);beep(120,.16);if(g.lives<=0){g.over=true;finish('机体耗尽，补给后再出发！');}else message('受伤 · 短暂无敌',1);}
      function shoot(x,y,enemy,angle=0,speed=500){g.bullets.push({x,y,w:enemy?8:12,h:5,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,enemy});}
      g.action=n=>{if((n==='fire'||n==='up')&&!g.over)g.jumpBuffer=.16;};
      g.update=dt=>{if(g.over)return;g.time+=dt;g.inv=Math.max(0,g.inv-dt);if(g.transition>0){g.transition-=dt;if(g.transition<=0){g.level++;g.lives=Math.min(5,g.lives+1);build();message(`MISSION ${g.level} · 自动射击`,2);}return;}
        const p=g.player;p.cooldown-=dt;const dx=Number(keys.has('right'))-Number(keys.has('left'));if(dx)p.face=dx;
        const nextX=clamp(p.x+dx*188*dt,15,worldWidth-20);if(!g.crates.some(c=>c.hp>0&&overlap({...p,x:nextX},c)))p.x=nextX;
        if(g.jumpBuffer>0){g.jumpBuffer-=dt;if(p.onGround){p.vy=-550;p.onGround=false;g.jumpBuffer=0;beep(420,.05);}}
        const oldBottom=p.y+p.h/2;p.vy+=1450*dt;p.y+=p.vy*dt;p.onGround=false;
        for(const platform of g.platforms)if(p.vy>=0&&Math.abs(p.x-platform.x)<platform.w/2+p.w/2&&oldBottom<=platform.y&&p.y+p.h/2>=platform.y){p.y=platform.y-p.h/2;p.vy=0;p.onGround=true;}
        if(p.y+p.h/2>=ground){p.y=ground-p.h/2;p.vy=0;p.onGround=true;}
        if(p.cooldown<=0){shoot(p.x+p.face*23,p.y-7,false,p.face===1?0:Math.PI);p.cooldown=.13;beep(600,.025);}
        for(const e of g.enemies){if(e.hp<=0||Math.abs(e.x-p.x)>650)continue;e.t+=dt;e.cooldown-=dt;if(e.type==='soldier')e.x=e.origin+Math.sin(e.t*.9)*24;
          if(e.cooldown<=0&&Math.abs(e.x-p.x)<490){shoot(e.x,e.y-8,true,p.x<e.x?Math.PI:0,180+g.level*12);e.cooldown=Math.max(.9,1.9-g.level*.15);}if(overlap(p,e))damage();}if(g.over)return;
        const boss=g.boss;if(boss&&boss.hp>0&&Math.abs(boss.x-p.x)<520){boss.t+=dt;boss.cooldown-=dt;if(boss.cooldown<=0){const angle=Math.atan2(p.y-8-boss.y,p.x-boss.x);for(let i=-1;i<=1;i++)shoot(boss.x-55,boss.y,true,angle+i*.16,190+g.level*10);boss.cooldown=boss.hp<boss.maxHp/2?.8:1.25;}if(overlap(p,boss))damage();}if(g.over)return;
        for(const b of g.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<0||b.x>worldWidth||b.y<0||b.y>ground+20||Math.abs(b.x-p.x)>900){b.dead=true;continue;}
          if(b.enemy){if(overlap(b,p)){b.dead=true;damage();if(g.over)return;}continue;}
          const crate=g.crates.find(c=>c.hp>0&&overlap(b,c));if(crate){crate.hp--;b.dead=true;spark(crate.x-g.camera,crate.y,'#bba078',5);if(crate.hp<=0)addScore(50);continue;}
          const cage=g.cages.find(c=>!c.rescued&&overlap(b,c));if(cage){cage.hp--;b.dead=true;if(cage.hp<=0){cage.rescued=true;g.rescued++;g.lives=Math.min(5,g.lives+1);addScore(500);message('救援成功 · +500 · 恢复生命');beep(1000,.2);}continue;}
          const enemy=g.enemies.find(e=>e.hp>0&&overlap(b,e));if(enemy){enemy.hp--;b.dead=true;spark(enemy.x-g.camera,enemy.y,'#eab58c',5);if(enemy.hp<=0){addScore(enemy.type==='tank'?400:150);spark(enemy.x-g.camera,enemy.y,'#edc28b',15);}continue;}
          if(boss&&boss.hp>0&&overlap(b,boss)){b.dead=true;boss.hp--;spark(boss.x-g.camera,boss.y,'#ebbf8a',4);if(boss.hp<=0){addScore(2000*g.level);g.bullets=[];spark(boss.x-g.camera,boss.y,'#f3ce91',45);if(g.level>=3){g.over=true;finish(`三大战区突破成功！救援 ${g.rescued} 人。`);return;}g.transition=2.5;message('MISSION CLEAR',2.4);break;}}
        }
        g.bullets=g.bullets.filter(b=>!b.dead);g.camera=clamp(p.x-150,0,worldWidth-W);
      };
      g.status=()=>g.boss&&Math.abs(g.boss.x-g.player.x)<530?`BOSS ${Math.max(0,g.boss.hp)}`:`救援 ${g.rescued}`;
      function soldier(x,y,face,color,player=false){ctx.save();ctx.translate(x,y);ctx.scale(face,1);rect(-9,6,7,17,'#293b34');rect(3,6,7,17,'#293b34');rect(-10,-12,20,23,color);rect(-7,-27,16,16,'#d5ad83');rect(-10,-29,23,8,player?'#d2e09b':'#9ba789');rect(-2,-8,29,7,'#34443b');rect(20,-10,9,5,'#d5d2a9');rect(5,-23,3,3,'#34443b');ctx.restore();}
      g.draw=()=>{rect(0,0,W,H,'#718f92');for(let i=0;i<9;i++){const x=(i*95-g.camera*.15)%900;rect(x,260+(i%3)*25,64,240,'#526f73');rect(x+10,280+(i%3)*25,12,15,'#82988b');}
        rect(0,ground,W,H-ground,'#6b6750');rect(0,ground,W,8,'#b6ae7c');for(let x=-32;x<W+32;x+=32)rect(x-g.camera%32,ground+20,18,4,'#817758');
        g.platforms.forEach(p=>{rect(p.x-p.w/2-g.camera,p.y,p.w,p.h,'#9c9c75');rect(p.x-p.w/2-g.camera,p.y+4,p.w,4,'#c6c392');});
        g.crates.forEach(c=>{if(c.hp<=0)return;const x=c.x-g.camera;rect(x-17,c.y-20,34,40,'#a78559');ctx.strokeStyle='#d0ad75';ctx.lineWidth=3;ctx.strokeRect(x-14,c.y-17,28,34);ctx.beginPath();ctx.moveTo(x-13,c.y-16);ctx.lineTo(x+13,c.y+16);ctx.stroke();});
        g.cages.forEach(c=>{const x=c.x-g.camera;if(c.rescued){text('✓',x,c.y-18,'#e4f2b0',21);return;}soldier(x,c.y+6,1,'#c6c69a');for(let i=-1;i<=1;i++)rect(x+i*14-2,c.y-29,4,56,'#c7c6a5');rect(x-21,c.y-29,42,4,'#46574c');});
        g.enemies.forEach(e=>{if(e.hp<=0)return;const x=e.x-g.camera;if(e.type==='tank'){rect(x-31,e.y+8,62,16,'#35443a');rect(x-26,e.y-10,52,23,'#92966c');rect(x-12,e.y-23,27,19,'#b1b28a');rect(x-45,e.y-17,38,7,'#52644c');}else soldier(x,e.y,g.player.x<e.x?-1:1,'#8b986c');});
        const b=g.boss;if(b&&b.hp>0){const x=b.x-g.camera;rect(x-56,b.y+22,112,27,'#2c403a');rect(x-49,b.y-25,98,54,'#a0a07a');rect(x-25,b.y-50,58,31,'#b8b18a');rect(x-85,b.y-40,65,12,'#4b5b4b');rect(x-12,b.y-16,24,20,'#cc8a6c');rect(x-52,b.y-68,104,5,'#344c42');rect(x-52,b.y-68,104*b.hp/b.maxHp,5,'#ebbd82');}
        const p=g.player;if(g.inv<=0||Math.floor(g.inv*10)%2===0)soldier(p.x-g.camera,p.y,p.face,'#d4dc97',true);
        g.bullets.forEach(b=>rect(b.x-g.camera-4,b.y-2,b.enemy?8:14,5,b.enemy?'#f1b086':'#f5efb4'));
        text('合金突击 / 自动射击',240,28,'#edf0cf',13);text(`MISSION ${g.level}/3`,240,48,'#d5dec0',11);
      };build();return g;
    }
    return {moles:Moles,match:Match,commando:Commando};
  };
})();
