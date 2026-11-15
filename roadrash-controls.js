/* Genesis Plus GX: MD A = joypad Y (1), B = B (0), C = A (8). */
(() => {
  'use strict';
  const Base=typeof module!=='undefined'&&module.exports?require('./wof-controls.js'):window.WofInput;
  class RoadRashInput extends Base {
    sync(){
      const next=new Set([...this.sources.values()].flat());
      // Braking overrides every throttle source, including the optional latch.
      if(next.has(1))next.delete(0);
      for(const id of this.down)if(!next.has(id))this.send(id,0);
      for(const id of next)if(!this.down.has(id))this.send(id,1);
      this.down=next;
    }
    setCruise(on){this.cruise=!!on;this.set('cruise',on?[0]:[]);}
    clear(){this.cruise=false;super.clear();}
    static buttons(action){return{throttle:[0],brake:[1],attack:[8],kick:[5,8]}[action]||[];}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=RoadRashInput;
  else window.RoadRashInput=RoadRashInput;
})();
