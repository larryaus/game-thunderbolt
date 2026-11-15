const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
test('lobby filters all ten games and refreshes browser records after returning',()=>{
  const file=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
  const html=file('index.html');
  const cards=[...html.matchAll(/class="game-card[^"]*" href="([^"]+)" data-category="([^"]+)"/g)].map(m=>({href:m[1],dataset:{category:m[2]},hidden:false}));
  assert.equal(cards.length,10);cards.forEach(c=>assert.ok(fs.existsSync(path.join(__dirname,'..',c.href.split('?')[0]))));
  const buttons=['all','action','casual'].map(f=>({dataset:{filter:f},classList:{toggle(){}},setAttribute(){},addEventListener(n,fn){this[n]=fn;}}));
  const records=[...html.matchAll(/data-best="([^"]+)"/g)].map(m=>({dataset:{best:m[1]}}));
  const note={hidden:false},count={},stored={},events={};
  const document={querySelectorAll:s=>s==='.game-card'?cards:s==='[data-filter]'?buttons:records,querySelector:()=>note,getElementById:()=>count};
  vm.runInNewContext(file('lobby.js'),{document,localStorage:{getItem:k=>stored[k]},window:{addEventListener:(n,f)=>events[n]=f}});
  buttons[1].click();assert.equal(cards.filter(c=>!c.hidden).length,5);assert.equal(note.hidden,true);assert.equal(count.textContent,'5 GAMES / 即点即玩');
  buttons[2].click();assert.equal(cards.filter(c=>!c.hidden).length,5);buttons[0].click();assert.equal(cards.filter(c=>!c.hidden).length,10);assert.equal(note.hidden,false);
  stored['arcade-best-tanks']='1500';events.pageshow();assert.equal(records.find(r=>r.dataset.best==='arcade-best-tanks').textContent,'BEST 001500');
});
test('all local page assets and fragment links resolve; engine DOM identifiers exist',()=>{
  const root=path.join(__dirname,'..');
  for(const f of ['index.html','play.html','thunderbolt.html']){
    const html=fs.readFileSync(path.join(root,f),'utf8');
    for(const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[^"#]*)"/g))if(!m[1].includes(':'))assert.ok(fs.existsSync(path.join(root,m[1])),`${f}: ${m[1]}`);
  }
  const script=fs.readFileSync(path.join(root,'minigames.js'),'utf8'),html=fs.readFileSync(path.join(root,'play.html'),'utf8');
  const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
  for(const m of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),`Missing game UI: ${m[1]}`);
});
