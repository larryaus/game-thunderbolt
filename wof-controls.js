/* Physical arcade inputs for the FBNeo joypad (B=attack, A=jump). */
(() => {
  'use strict';
  class WofInput {
    constructor(send, timers = globalThis) {
      this.send=send;this.timers=timers;this.sources=new Map();this.down=new Set();this.attackers=new Set();this.turbo=true;this.timer=null;this.pulses=new Map();
    }
    sync(){const next=new Set([...this.sources.values()].flat());for(const id of this.down)if(!next.has(id))this.send(id,0);for(const id of next)if(!this.down.has(id))this.send(id,1);this.down=next;}
    set(source,buttons){if(buttons.length)this.sources.set(source,[...new Set(buttons)]);else this.sources.delete(source);this.sync();}
    release(source){this.sources.delete(source);this.sync();}
    attack(source,on){if(on)this.attackers.add(source);else this.attackers.delete(source);this.restartTurbo();}
    restartTurbo(){if(this.timer!==null){this.timers.clearInterval(this.timer);this.timer=null;}if(!this.attackers.size){this.release('turbo');return;}this.set('turbo',[0]);if(this.turbo){let pressed=true;this.timer=this.timers.setInterval(()=>{pressed=!pressed;this.set('turbo',pressed?[0]:[]);},90);}}
    setTurbo(on){this.turbo=on;this.restartTurbo();}
    pulse(source,buttons,ms=120){if(this.pulses.has(source))this.timers.clearTimeout(this.pulses.get(source));this.set(source,buttons);this.pulses.set(source,this.timers.setTimeout(()=>{this.pulses.delete(source);this.release(source);},ms));}
    clear(){if(this.timer!==null)this.timers.clearInterval(this.timer);this.timer=null;for(const timer of this.pulses.values())this.timers.clearTimeout(timer);this.pulses.clear();this.sources.clear();this.attackers.clear();this.sync();}
    static directions(dx,dy,deadzone=12){if(Math.hypot(dx,dy)<deadzone)return[];const result=[],ax=Math.abs(dx),ay=Math.abs(dy);if(ay>ax*.44)result.push(dy<0?4:5);if(ax>ay*.44)result.push(dx<0?6:7);return result;}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=WofInput;
  else window.WofInput=WofInput;
})();
