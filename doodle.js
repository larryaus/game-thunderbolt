(() => {
  'use strict';
  const $=id=>document.getElementById(id),directions=new Map();
  let game=null,ready=false,loading=false,muted=true,paused=false,loadFailed=false,best=0,lastSave=0,bootTimer=null;
  const cache=new Map();
  function getStore(key){try{return localStorage.getItem(key);}catch{return cache.get(key)??null;}}
  function putStore(key,value){cache.set(key,String(value));try{localStorage.setItem(key,String(value));}catch{}}
  // The upstream game reads storage directly. Keep it playable in private/blocked storage modes.
  window.DoodleStorage={
    getItem(key){
      const value=getStore('pocket-doodle:'+key);if(value===null)return null;
      if(['DJ_stats','DJ_localTopScores'].includes(key)){
        try{const data=JSON.parse(value);
          if(key==='DJ_stats'&&(!Array.isArray(data?.stats)||data.stats.length<25||!Array.isArray(data.achievements)))return null;
          if(key==='DJ_localTopScores'&&(!Array.isArray(data)||data.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!Number.isFinite(r[1]))))return null;
        }catch{return null;}
      }
      return value;
    },
    setItem(key,value){putStore('pocket-doodle:'+key,value);},
  };
  best=Math.max(0,Number(getStore('arcade-best-doodle'))||0);$('best').textContent=String(best);
  const status=text=>{$('status').textContent=text;};
  const motion=new DoodleMotion(window,state=>{
    const enabled=['requesting','waiting','on'].includes(state);
    $('motion').setAttribute('aria-pressed',String(enabled));
    $('motion').textContent=state==='requesting'?'等待授权…':state==='waiting'?'感应校准中…':state==='on'?'手机感应 开':'手机感应 关';
    $('motion').disabled=state==='requesting';$('calibrate').disabled=state!=='on'||paused;
    if(loading||loadFailed)return;
    if(state==='on'&&!loading&&!loadFailed)status('感应已开启：轻轻左右倾斜，点击画面射击。');
    if(state==='waiting')status('请自然握稳手机，正在等待感应数据…');
    if(state==='denied')status('未获得感应权限，可用左右按钮；也可再次点“手机感应”授权。');
    if(state==='unavailable')status('当前浏览器没有提供感应数据，请用左右按钮或键盘。');
  });
  // The original build expects FullTilt. The host owns permission/calibration and applies tilt each game update.
  window.FULLTILT={getDeviceOrientation:function(){return Promise.resolve(null);}};
  function state(){return game?.state?.getCurrentState?.();}
  function refresh(){
    ['left','right','shoot','restart'].forEach(id=>$(id).disabled=!ready||paused);
    $('pause').disabled=!ready;$('pause').textContent=paused?'▶':'Ⅱ';
    $('pause').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');$('paused').hidden=!paused;
    $('calibrate').disabled=motion.state!=='on'||paused;
  }
  function clear(){
    directions.clear();document.querySelectorAll('[data-direction]').forEach(b=>b.dataset.held='false');
    const s=state();if(s?.cursors){s.cursors.left.isDown=false;s.cursors.right.isDown=false;}
    if(s?.player?.body)s.player.body.velocity.x=0;
    game?.input?.keyboard?.reset?.(true);
  }
  function saveScore(){
    const score=Math.max(0,Math.floor(Number(state()?.score)||0));$('score').textContent=String(score);
    if(score>best){best=score;$('best').textContent=String(best);}
    if(best>lastSave){lastSave=best;putStore('arcade-best-doodle',best);}
  }
  function pause(value=true){
    if(!ready)return;clear();paused=value;game.paused=value;
    if(value){motion.suspend();saveScore();}else{if(state()?.pausePanelGroup)state().pausePanelGroup.y=game.height;motion.resume();wakeAudio();}
    refresh();
  }
  function wakeAudio(){try{game?.sound?.context?.resume()?.catch(()=>{});}catch{}}
  function drive(s){
    const left=[...directions.values()].includes('left'),right=[...directions.values()].includes('right');
    s.cursorContr=left||right||!motion.active;
    if(s.cursors){s.cursors.left.isDown=left&&!right;s.cursors.right.isDown=right&&!left;}
    return left||right;
  }
  function applyTilt(s,manual){
    if(manual||paused||!motion.active||!s.player?.alive||!s.player.body)return;
    s.player.body.velocity.x=motion.value*(s.GYRO_SENSE||40);
    if(s.player.frame<2&&Math.abs(motion.value)>.1)s.player.scale.setTo(motion.value>0?-1:1,1);
  }
  function shoot(){
    const s=state();if(!ready||paused||game.state.current!=='Game'||!s?.player?.alive)return;
    wakeAudio();s.playerShoot(0);
  }
  function start(){
    if(!ready)return;saveScore();clear();game.paused=false;paused=false;motion.resume();
    game.state.start('Game');refresh();wakeAudio();
  }
  function fail(text){
    loadFailed=true;loading=false;ready=false;paused=false;
    if(bootTimer!==null)window.clearTimeout(bootTimer);bootTimer=null;
    if(game?.isBooted&&game.sound)game.paused=true;motion.suspend();refresh();
    $('cover').hidden=false;$('tilt-start').disabled=false;$('touch-start').disabled=false;
    $('tilt-start').textContent='加载失败，点击重试';status(text);
  }
  function script(src){return new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error('游戏脚本加载失败，请重试。'));document.head.appendChild(el);
  });}
  function hookEngine(){
    const D=window.Doodle,boot=D.BootState.init;
    D.BootState.init=function(){
      boot.apply(this,arguments);this.load.baseURL='vendor/doodle/';this.game.sound.mute=muted;
      // Phaser creates these signals during boot, after the Game constructor returns.
      this.game.onPause.add(()=>{if(ready&&!paused){paused=true;clear();motion.suspend();saveScore();refresh();}});
      this.game.onResume.add(()=>{if(ready&&paused){paused=false;clear();motion.resume();refresh();}});
      this.load.onFileError.add(key=>fail('游戏资源加载失败：'+key+'。请检查网络后重试。'));
      this.load.onFileComplete.add(percent=>{if(loading)status('正在加载经典游戏 '+percent+'%…');});
    };
    const menu=D.MenuState.create;
    D.MenuState.create=function(){menu.apply(this,arguments);if(loading&&!loadFailed)this.state.start('Game');};
    for(const name of ['GameState','CalibrateState']){
      const object=D[name],create=object.create,update=object.update;
      object.create=function(){
        create.apply(this,arguments);
        if(name==='GameState'){
          if(loadFailed)return;if(bootTimer!==null)window.clearTimeout(bootTimer);bootTimer=null;
          loading=false;ready=true;paused=false;$('cover').hidden=true;
          status(motion.active?'感应已开启，左右倾斜转向。':'已开始：按住左右键转向，点画面或“射击”打怪物。');
          refresh();if(document.hidden)pause(true);
        }
      };
      object.update=function(){
        const manual=drive(this);update.apply(this,arguments);applyTilt(this,manual);
        if(name==='GameState')saveScore();
      };
    }
    const over=D.GameState.gameOver;
    D.GameState.gameOver=function(){saveScore();clear();return over.apply(this,arguments);};
  }
  async function boot(){
    if(loadFailed){location.reload();return;}if(loading||ready)return;
    loading=true;$('tilt-start').disabled=true;$('touch-start').disabled=true;status('正在加载经典网页版，请稍候…');
    bootTimer=window.setTimeout(()=>{if(loading)fail('游戏加载超时，请检查网络后点击重试。');},30000);
    try{
      await script('vendor/doodle/phaser.min.js');await script('vendor/doodle/game.js');hookEngine();
      game=new Phaser.Game(635,955,Phaser.CANVAS,'game');window.Doodle.game=game;
      for(const [name,key]of [['Boot','BootState'],['Preload','PreloadState'],['Menu','MenuState'],['Game','GameState'],['Settings','SettingsState'],['Calibrate','CalibrateState'],['Scores','ScoresState']])game.state.add(name,window.Doodle[key]);
      $('cover').hidden=true;game.state.start('Boot');
    }catch(error){fail(error.message||'游戏启动失败，请重新加载。');}
  }
  $('tilt-start').addEventListener('click',()=>{motion.enable();boot();});
  $('touch-start').addEventListener('click',()=>{motion.disable();boot();});
  $('motion').addEventListener('click',()=>{
    if(['waiting','on'].includes(motion.state)){motion.disable();status('感应已关闭，使用左右按钮转向。');}
    else motion.enable();
  });
  $('calibrate').addEventListener('click',()=>{motion.calibrate();status('已将当前握持角度设为水平，轻轻左右倾斜即可。');});
  $('pause').addEventListener('click',()=>pause(!paused));$('resume').addEventListener('click',()=>pause(false));$('restart').addEventListener('click',start);
  $('sound').addEventListener('click',()=>{muted=!muted;$('sound').textContent=muted?'声音关':'声音开';$('sound').setAttribute('aria-pressed',String(!muted));if(game?.sound)game.sound.mute=muted;if(!muted)wakeAudio();});
  $('fullscreen').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('此浏览器可直接竖屏游玩，或使用“添加到主屏幕”。');}catch{status('此浏览器可直接竖屏游玩。');}
  });
  document.querySelectorAll('[data-direction]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!ready||paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);directions.set('p'+e.pointerId,b.dataset.direction);b.dataset.held='true';wakeAudio();});
    const release=e=>{directions.delete('p'+e.pointerId);b.dataset.held=String([...directions.values()].includes(b.dataset.direction));};
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>b.addEventListener(type,release));
    b.addEventListener('click',e=>{if(e.detail===0&&ready&&!paused){directions.set('accessible',b.dataset.direction);setTimeout(()=>directions.delete('accessible'),180);}});
  });
  $('shoot').addEventListener('pointerdown',e=>{e.preventDefault();shoot();});$('shoot').addEventListener('click',e=>{if(e.detail===0)shoot();});
  const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  window.addEventListener('keydown',e=>{
    if(!ready||e.target?.closest?.('input,textarea,select'))return;
    if(!keys[e.code]&&!['Space','ArrowUp','KeyP','Escape','Enter'].includes(e.code))return;
    if((e.code==='Space'||e.code==='Enter')&&e.target?.closest?.('button,a'))return;
    e.preventDefault();e.stopPropagation();if(e.repeat)return;
    if(e.code==='KeyP'||e.code==='Escape')pause(!paused);
    else if(e.code==='Enter'){if(paused)pause(false);else start();}
    else if(!paused){if(keys[e.code])directions.set(e.code,keys[e.code]);else shoot();}
  },true);
  window.addEventListener('keyup',e=>{directions.delete(e.code);if(ready&&(keys[e.code]||['Space','ArrowUp'].includes(e.code))){e.preventDefault();e.stopPropagation();}},true);
  window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  window.addEventListener('orientationchange',()=>{motion.calibrate();pause(true);});
  window.addEventListener('resize',()=>game?.scale?.refresh?.());
  window.addEventListener('error',e=>{if(loading&&(!e.filename||/doodle/.test(e.filename)))fail('游戏启动出错，请点击重试。');});
  window.addEventListener('pagehide',()=>{saveScore();clear();motion.disable();if(bootTimer!==null)window.clearTimeout(bootTimer);if(game?.isBooted&&game.sound)game.paused=true;});
  refresh();
})();
