/* Permission-aware, screen-relative steering for the classic HTML5 game. */
(() => {
  'use strict';
  class DoodleMotion {
    constructor(env=globalThis,onChange=()=>{}){
      this.env=env;this.onChange=onChange;this.state='off';this.angle=0;this.neutral=null;
      this.latest=null;this.suspended=false;this.timer=null;this.attempt=0;this.received=false;
      this.listener=e=>this.sample(e);
    }
    static axis(event,rotation=0){
      if(!Number.isFinite(event.gamma)||!Number.isFinite(event.beta))return null;
      const radians=rotation*Math.PI/180;
      return event.gamma*Math.cos(radians)+event.beta*Math.sin(radians);
    }
    get active(){return this.state==='on'&&!this.suspended;}
    get value(){return this.active?this.angle:0;}
    changed(state){this.state=state;this.onChange(state);}
    clearTimer(){if(this.timer!==null)this.env.clearTimeout(this.timer);this.timer=null;}
    watch(){
      this.clearTimer();this.timer=this.env.setTimeout(()=>{
        if(this.received){this.angle=0;this.changed('waiting');}
        else{this.disable();this.changed('unavailable');}
      },4000);
    }
    async enable(){
      this.disable();const attempt=this.attempt,Device=this.env.DeviceOrientationEvent;
      if(!Device||this.env.isSecureContext===false){this.changed('unavailable');return false;}
      this.changed('requesting');
      try{
        // Safari requires this call directly within the user's click handler.
        if(typeof Device.requestPermission==='function'){
          const result=await Device.requestPermission();
          if(attempt!==this.attempt)return false;
          if(result!=='granted'){this.changed('denied');return false;}
        }
        if(attempt!==this.attempt)return false;
        this.env.addEventListener('deviceorientation',this.listener);
        this.changed('waiting');if(!this.suspended)this.watch();return true;
      }catch{if(attempt===this.attempt)this.changed('denied');return false;}
    }
    sample(event){
      if(this.suspended||!['waiting','on'].includes(this.state))return;
      const rotation=this.env.screen?.orientation?.angle??this.env.orientation??0;
      const axis=DoodleMotion.axis(event,rotation);if(axis===null)return;
      this.received=true;this.latest=axis;if(this.neutral===null)this.neutral=axis;
      let delta=((axis-this.neutral+540)%360)-180;
      delta=Math.sign(delta)*Math.max(0,Math.abs(delta)-2.5);
      const target=Math.max(-18,Math.min(18,delta));
      this.angle+=.3*(target-this.angle);this.clearTimer();
      // A stalled sensor must not keep steering indefinitely.
      this.watch();if(this.state!=='on')this.changed('on');
    }
    calibrate(){this.neutral=this.latest;this.angle=0;}
    suspend(){this.suspended=true;this.angle=0;this.latest=null;this.neutral=null;this.clearTimer();}
    resume(){
      this.suspended=false;this.angle=0;this.latest=null;this.neutral=null;
      if(this.state==='on'||this.state==='waiting'){this.changed('waiting');this.watch();}
    }
    disable(){
      this.attempt++;this.env.removeEventListener('deviceorientation',this.listener);this.clearTimer();
      this.angle=0;this.latest=null;this.neutral=null;this.suspended=false;this.received=false;this.changed('off');
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=DoodleMotion;
  else window.DoodleMotion=DoodleMotion;
})();
