const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('viewport sizing uses the visible in-app browser area and updates after browser chrome changes',()=>{
  const listeners={},values={},frames=[];
  const viewport={height:620,addEventListener(n,f){listeners['visual-'+n]=f;}};
  const sandbox={window:{innerHeight:800,visualViewport:viewport,addEventListener(n,f){listeners[n]=f;}},document:{documentElement:{style:{setProperty(k,v){values[k]=v;}}}},requestAnimationFrame(fn){frames.push(fn);}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile.js'),'utf8'),sandbox);
  assert.equal(values['--game-vh'],'620px');viewport.height=560;listeners['visual-resize']();listeners.resize();assert.equal(frames.length,1);frames.shift()();assert.equal(values['--game-vh'],'560px');
});
test('viewport sizing falls back for browsers without VisualViewport',()=>{
  const values={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile.js'),'utf8'),{window:{innerHeight:650,addEventListener(){}},document:{documentElement:{style:{setProperty(k,v){values[k]=v;}}}},requestAnimationFrame(){}});assert.equal(values['--game-vh'],'650px');
});
