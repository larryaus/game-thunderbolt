(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const actions=[...document.querySelectorAll('[data-action]')];
  let ready=false,loading=false,paused=false,muted=true,stickId=null,watcher=null;
  const input=new RoadRashInput((id,value)=>window.EJS_emulator?.gameManager?.simulateInput(0,id,value));
  const activePointers=new Map();
  const status=text=>{$('status').textContent=text;};
  function updateCruise(){
    $('cruise').setAttribute('aria-pressed',String(!!input.cruise));
    $('cruise-state').textContent=input.cruise?'开':'关 · 比赛中开启';
  }
  function updateControls(){
    [...actions,$('start'),$('cruise')].forEach(b=>b.disabled=!ready||paused);
    $('pause').disabled=!ready;$('pause').textContent=paused?'▶':'Ⅱ';
    $('pause').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');
    $('stick').setAttribute('aria-disabled',String(!ready||paused));
    $('pause-cover').hidden=!paused;updateCruise();
  }
  function clearInput(){
    input.clear();stickId=null;activePointers.clear();$('knob').style.transform='';
    actions.forEach(b=>b.dataset.held='false');updateCruise();
  }
  function wakeAudio(){try{window.EJS_emulator?.Module?.AL?.currentCtx?.audioCtx?.resume()?.catch(()=>{});}catch{}}
  function pause(value=true){
    if(!ready)return;clearInput();paused=value;
    if(paused)window.EJS_emulator.pause();else{window.EJS_emulator.play();wakeAudio();}
    updateControls();
  }
  function fail(message){
    clearInput();loading=false;ready=false;
    if(watcher!==null)clearInterval(watcher);watcher=null;
    status(message);$('boot-cover').hidden=false;$('boot').disabled=false;
    $('boot').textContent='重新加载原版';$('restart').disabled=false;updateControls();
  }
  function boot(){
    if(loading||ready)return;loading=true;$('boot-cover').hidden=true;
    status('正在加载 MD 原版与模拟器，首次约 3 MB，请稍候…');
    Object.assign(window,{
      EJS_player:'#game',EJS_core:'genesis_plus_gx',EJS_controlScheme:'segaMD',EJS_gameUrl:'roms/roadrash.md',EJS_gameName:'roadrash.md',
      EJS_pathtodata:'vendor/emulatorjs/',EJS_language:'zh-CN',EJS_startOnLoaded:true,
      EJS_threads:false,EJS_forceLegacyCores:true,EJS_disableDatabases:true,EJS_noAutoFocus:true,
      EJS_volume:muted?0:.65,EJS_backgroundColor:'#000',EJS_color:'#f0cb7e',
      EJS_defaultOptions:{'ejs_threads':'disabled','virtual-gamepad':'disabled','shader':'disabled'},
      EJS_Buttons:{rightClick:false},
      EJS_onGameStart:()=>{
        ready=true;loading=false;paused=false;
        if(watcher!==null)clearInterval(watcher);watcher=null;
        window.EJS_emulator.toggleVirtualGamepad?.(false);window.EJS_emulator.setVolume?.(muted?0:.65);
        $('restart').disabled=false;updateControls();
        status('标题画面按开始 → 左右选赛道 → 再按两次开始出发。');
        if(document.hidden)pause(true);
      },
    });
    const script=document.createElement('script');script.src='vendor/emulatorjs/loader.js';
    script.onerror=()=>fail('播放器加载失败，请重新加载。');document.head.appendChild(script);
    watcher=setInterval(()=>{if(window.EJS_emulator?.failedToStart)fail('原版启动失败，请重新加载；具体原因显示在画面内。');},1000);
  }
  $('boot').addEventListener('click',()=>{if(window.EJS_emulator&&!ready){location.reload();return;}boot();});
  $('pause').addEventListener('click',()=>pause(!paused));$('resume').addEventListener('click',()=>pause(false));
  $('restart').addEventListener('click',()=>{clearInput();location.reload();});
  $('sound').addEventListener('click',()=>{
    muted=!muted;$('sound').textContent=muted?'声音关':'声音开';$('sound').setAttribute('aria-pressed',String(!muted));
    window.EJS_emulator?.setVolume?.(muted?0:.65);if(!muted)wakeAudio();
  });
  $('fullscreen').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('旋转手机即可横屏游玩，按钮会自动适配。');}
    catch{status('可以旋转手机横屏游玩。');}
  });
  $('start').addEventListener('click',()=>{
    if(!ready||paused)return;clearInput();wakeAudio();input.pulse('start',[3]);
    status('已按 START：选好赛道后再按开始，出现人物对话后再按开始出发。');
  });
  $('cruise').addEventListener('click',()=>{
    if(!ready||paused)return;wakeAudio();input.setCruise(!input.cruise);updateCruise();
    status(input.cruise?'油门已锁定，可转向、出拳和踢人；刹车优先，暂停会解除锁定。':'油门锁定已关闭，按住“加速”前进。');
  });
  function stickMove(e){
    const r=$('stick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
    const d=Math.hypot(dx,dy),scale=Math.min(1,r.width*.27/(d||1));
    $('knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
    input.set('stick',WofInput.directions(dx,dy));
  }
  $('stick').addEventListener('pointerdown',e=>{
    if(!ready||paused||stickId!==null)return;e.preventDefault();wakeAudio();
    stickId=e.pointerId;$('stick').setPointerCapture(e.pointerId);stickMove(e);
  });
  $('stick').addEventListener('pointermove',e=>{if(e.pointerId===stickId&&ready&&!paused)stickMove(e);});
  const releaseStick=e=>{if(e.pointerId!==stickId)return;stickId=null;input.release('stick');$('knob').style.transform='';};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('stick').addEventListener(type,releaseStick));
  actions.forEach(button=>{
    button.addEventListener('pointerdown',e=>{
      if(!ready||paused)return;e.preventDefault();wakeAudio();button.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId,button);button.dataset.held='true';
      input.set('pointer-'+e.pointerId,RoadRashInput.buttons(button.dataset.action));
    });
    const release=e=>{
      if(activePointers.get(e.pointerId)!==button)return;
      activePointers.delete(e.pointerId);input.release('pointer-'+e.pointerId);
      button.dataset.held=String([...activePointers.values()].includes(button));
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,release));
    button.addEventListener('click',e=>{
      if(e.detail!==0||!ready||paused)return;wakeAudio();
      input.pulse('accessible-'+button.id,RoadRashInput.buttons(button.dataset.action),150);
    });
  });
  const keys={KeyW:[4],ArrowUp:[4],KeyS:[5],ArrowDown:[5],KeyA:[6],ArrowLeft:[6],KeyD:[7],ArrowRight:[7],KeyJ:[0],KeyK:[1],KeyL:[8],Space:[5,8],Enter:[3]};
  window.addEventListener('keydown',e=>{
    if(!ready||e.target?.closest?.('input,select,textarea'))return;
    if((e.code==='Enter'||e.code==='Space')&&e.target?.closest?.('button,a'))return;
    if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)pause(!paused);return;}
    if(paused||!keys[e.code])return;e.preventDefault();e.stopPropagation();if(e.repeat)return;wakeAudio();
    if(e.code==='Enter'){clearInput();status('START：左右选赛道，再按两次开始出发。');}
    input.set('key-'+e.code,keys[e.code]);
  },true);
  window.addEventListener('keyup',e=>{input.release('key-'+e.code);if(keys[e.code]&&ready){e.preventDefault();e.stopPropagation();}},true);
  window.addEventListener('blur',()=>pause(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  window.addEventListener('orientationchange',()=>pause(true));
  window.addEventListener('pagehide',()=>{clearInput();if(watcher!==null)clearInterval(watcher);});
  updateControls();
})();
