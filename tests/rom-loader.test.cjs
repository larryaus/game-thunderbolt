const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),Rom=require('../rom-loader.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){const chunks=[Buffer.from([80,75,3,4]),Buffer.from('original bytes')],whole=Buffer.concat(chunks),m={version:1,name:'mslug.zip',size:whole.length,sha256:sha(whole),parts:chunks.map((b,i)=>({file:`part${i}.bin`,size:b.length,sha256:sha(b)}))};return{chunks,m,whole};}
function server(m,chunks){return async url=>url.endsWith('.json')?{ok:true,json:async()=>m}:{ok:true,arrayBuffer:async()=>{const i=Number(url.match(/part(\d+)/)[1]),b=chunks[i];return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};}
test('ROM assembler preserves byte order and checks all parts plus the whole archive',async()=>{
 const {chunks,m,whole}=fixture(),progress=[];const r=await Rom.load('roms/mslug.json',{fetch:server(m,chunks),crypto:crypto.webcrypto,onProgress:(done,total)=>progress.push([done,total])});assert.equal(r.name,'mslug.zip');assert.deepEqual(Buffer.from(r.bytes),whole);assert.deepEqual(progress.at(-1),[2,2]);
});
test('ROM assembler rejects corrupt parts, corrupt combined checksum and invalid manifests',async()=>{
 let {chunks,m}=fixture();const bad=[Buffer.from([80,75,3,9]),chunks[1]];await assert.rejects(Rom.load('roms/mslug.json',{fetch:server(m,bad),crypto:crypto.webcrypto}),/校验失败/);
 m={...m,sha256:'0'.repeat(64)};await assert.rejects(Rom.load('roms/mslug.json',{fetch:server(m,chunks),crypto:crypto.webcrypto}),/完整性/);
 m={...m,size:999};await assert.rejects(Rom.load('roms/mslug.json',{fetch:server(m,chunks),crypto:crypto.webcrypto}),/清单无效/);
});
test('ROM assembler reports network failures without producing a playable corrupt ZIP',async()=>{
 await assert.rejects(Rom.load('roms/mslug.json',{fetch:async()=>({ok:false,status:404}),crypto:crypto.webcrypto}),/404/);
});
test('published Metal Slug parts reconstruct the verified source archive and the lobby points to it',async()=>{
 const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'roms/mslug.json'),'utf8'));
 const fetch=async url=>{const p=path.join(root,url);if(url.endsWith('.json'))return{ok:true,json:async()=>JSON.parse(fs.readFileSync(p,'utf8'))};const b=fs.readFileSync(p);return{ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};};
 const r=await Rom.load('roms/mslug.json',{fetch,crypto:crypto.webcrypto});assert.equal(r.bytes.length,14779872);assert.equal(sha(r.bytes),'ef3ef3de26a6d79372d99b5d902a702cf247fb4f810d108264a630788c572370');assert.equal(manifest.parts.length,3);
 assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="mslug.html?v=original1"'));assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="play.html?game=commando'));
});
