(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const metalSlug=document.body?.dataset?.arcade==='mslug';
  const settings=metalSlug?{rom:'roms/mslug.json',parts:true,name:'mslug.zip',download:'约 24 MB',ready:'原版已启动：投币 → 开始，进入任务。',start:'已发送开始，准备进入原版任务。',turbo:'连发',special:[1]}:{rom:'roms/wof.zip',name:'wof',download:'约 13 MB',ready:'原版已启动：投币 → 开始 → 方向选将 → 攻击确认',start:'已发送开始，方向选将，按“攻击”确认。',turbo:'连击',special:[0,8]};
  const actionButtons=name=>name==='jump'?[8]:name==='special'?settings.special:[0];
  let ready=false,loading=false,paused=false,muted=true,stickId=null,watcher=null,romURL=null;
  const input=new WofInput((id,value)=>window.EJS_emulator?.gameManager?.simulateInput(0,id,value));
  const controls=['coin','start','turbo','attack','jump','special'];
  function status(text){$('status').textContent=text;}
  function updateControls(){controls.forEach(id=>$(id).disabled=!ready||paused);$('pause').disabled=!ready;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');$('stick').setAttribute('aria-disabled',String(!ready||paused));$('pause-cover').hidden=!paused;}
  function clearInput(){input.clear();stickId=null;$('knob').style.transform='';document.querySelectorAll('[data-action]').forEach(b=>b.dataset.held='false');}
  function wakeAudio(){try{window.EJS_emulator?.Module?.AL?.currentCtx?.audioCtx?.resume()?.catch(()=>{});}catch{}}
  function pause(value=true){if(!ready)return;clearInput();paused=value;const e=window.EJS_emulator;if(paused)e.pause();else{e.play();wakeAudio();}updateControls();}
  function fail(message){if(romURL){URL.revokeObjectURL(romURL);romURL=null;}loading=false;ready=false;if(watcher!==null)clearInterval(watcher);watcher=null;status(message);$('boot-cover').hidden=false;$('boot').disabled=false;$('boot').textContent='重新加载原版';$('restart').disabled=false;updateControls();}
  async function boot(){
    if(loading||ready)return;
    loading=true;$('boot-cover').hidden=!settings.parts;$('boot').disabled=!!settings.parts;if(settings.parts)$('boot').textContent='原版资源加载中…';status(`正在加载原版游戏与模拟器，首次${settings.download}，请稍候…`);
    let gameURL=settings.rom;
    if(settings.parts){
      try{const rom=await ArcadeRom.load(settings.rom,{onProgress:(done,total)=>{const percent=Math.round(done/total*100);$('boot').textContent=`原版资源 ${percent}%` ;status(`原版资源已下载 ${percent}%，正在校验…`);}});romURL=URL.createObjectURL(new Blob([rom.bytes],{type:'application/zip'}));gameURL=romURL;}
      catch(error){fail(error.message||'游戏文件加载失败，请刷新重试。');return;}
    }
    $('boot-cover').hidden=true;$('boot').disabled=false;
    Object.assign(window,{
      EJS_player:'#game',EJS_core:'fbneo',EJS_gameUrl:gameURL,EJS_gameName:settings.name,
      EJS_pathtodata:'vendor/emulatorjs/',EJS_language:'zh-CN',EJS_startOnLoaded:true,
      EJS_threads:false,EJS_forceLegacyCores:true,EJS_disableDatabases:true,EJS_noAutoFocus:true,
      EJS_volume:muted?0:.65,EJS_backgroundColor:'#000',EJS_color:'#a9c87d',
      EJS_defaultOptions:{'ejs_threads':'disabled','virtual-gamepad':'disabled','shader':'disabled'},
      EJS_Buttons:{rightClick:false},
      EJS_onGameStart:()=>{ready=true;loading=false;paused=false;if(watcher!==null)clearInterval(watcher);watcher=null;window.EJS_emulator.toggleVirtualGamepad?.(false);window.EJS_emulator.setVolume?.(muted?0:.65);$('restart').disabled=false;updateControls();status(settings.ready);if(document.hidden)pause(true);},
    });
    const script=document.createElement('script');script.src='vendor/emulatorjs/loader.js';script.onerror=()=>fail('播放器加载失败，请刷新后重试。');document.head.appendChild(script);
    watcher=setInterval(()=>{if(window.EJS_emulator?.failedToStart)fail('原版启动失败，可重新加载；具体原因显示在游戏画面内。');},1000);
  }
  $('boot').addEventListener('click',()=>{if(window.EJS_emulator&&!ready){location.reload();return;}return boot();});
  $('pause').addEventListener('click',()=>pause(!paused));$('resume').addEventListener('click',()=>pause(false));
  $('restart').addEventListener('click',()=>{clearInput();location.reload();});
  $('sound').addEventListener('click',()=>{muted=!muted;$('sound').textContent=muted?'声音关':'声音开';$('sound').setAttribute('aria-pressed',String(!muted));window.EJS_emulator?.setVolume?.(muted?0:.65);if(!muted)wakeAudio();});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('此浏览器可横屏游玩；方向与操作按钮会自动适配。');}catch{status('可以旋转手机横屏游玩。');}});
  $('turbo').addEventListener('click',()=>{input.setTurbo(!input.turbo);$('turbo').textContent=settings.turbo+(input.turbo?' 开':' 关');$('turbo').setAttribute('aria-pressed',String(input.turbo));});
  document.querySelectorAll('[data-pulse]').forEach(button=>button.addEventListener('click',()=>{if(!ready||paused)return;wakeAudio();const id=Number(button.dataset.pulse);input.pulse('pulse-'+id,[id]);status(id===2?'已发送投币，按“开始”进入游戏。':settings.start);}));
  function stickMove(e){const r=$('stick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),limit=r.width*.27,scale=Math.min(1,limit/(d||1));$('knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;input.set('stick',WofInput.directions(dx,dy));}
  $('stick').addEventListener('pointerdown',e=>{if(!ready||paused||stickId!==null)return;e.preventDefault();wakeAudio();stickId=e.pointerId;$('stick').setPointerCapture(e.pointerId);stickMove(e);});
  $('stick').addEventListener('pointermove',e=>{if(e.pointerId===stickId&&ready&&!paused)stickMove(e);});
  const releaseStick=e=>{if(e.pointerId!==stickId)return;stickId=null;input.release('stick');$('knob').style.transform='';};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('stick').addEventListener(type,releaseStick));
  document.querySelectorAll('[data-action]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{if(!ready||paused)return;e.preventDefault();wakeAudio();button.setPointerCapture(e.pointerId);button.dataset.held='true';const source='pointer-'+e.pointerId;
      if(button.dataset.action==='attack')input.attack(source,true);else input.set(source,actionButtons(button.dataset.action));
    });
    const release=e=>{const source='pointer-'+e.pointerId;button.dataset.held='false';if(button.dataset.action==='attack')input.attack(source,false);else input.release(source);};
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,release));
    // Keyboard and assistive-technology activation of a focused button.
    button.addEventListener('click',e=>{if(e.detail!==0||!ready||paused)return;input.pulse('accessible-'+button.id,actionButtons(button.dataset.action),120);});
  });
  const keys={KeyW:4,ArrowUp:4,KeyS:5,ArrowDown:5,KeyA:6,ArrowLeft:6,KeyD:7,ArrowRight:7,KeyK:8,KeyL:settings.special,Space:2,Enter:3};
  window.addEventListener('keydown',e=>{if(!ready||e.target?.closest?.('input,select,textarea'))return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)pause(!paused);return;}if(paused)return;
    if(e.code==='KeyJ'||keys[e.code]!==undefined){e.preventDefault();e.stopPropagation();if(e.repeat)return;wakeAudio();if(e.code==='KeyJ')input.attack('keyboard-attack',true);else input.set('key-'+e.code,Array.isArray(keys[e.code])?keys[e.code]:[keys[e.code]]);}
  },true);
  window.addEventListener('keyup',e=>{if(e.code==='KeyJ')input.attack('keyboard-attack',false);else input.release('key-'+e.code);},true);
  window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});window.addEventListener('orientationchange',()=>pause(true));
  window.addEventListener('pagehide',()=>{clearInput();if(romURL)URL.revokeObjectURL(romURL);if(watcher!==null)clearInterval(watcher);});
  updateControls();
})();
