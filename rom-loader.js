/* Reassemble byte-identical arcade archives from same-origin static parts. */
(() => {
  'use strict';
  async function load(url,options={}){
    const fetchFile=options.fetch||globalThis.fetch,cryptoApi=options.crypto||globalThis.crypto;
    if(!cryptoApi?.subtle)throw Error('需要 HTTPS 浏览器才能校验游戏文件。');
    const request=async path=>{const r=await fetchFile(path);if(!r.ok)throw Error(`游戏文件下载失败 (${r.status})，请重新加载。`);return r;};
    const manifest=await (await request(url)).json();
    if(manifest.version!==1||!Number.isSafeInteger(manifest.size)||manifest.size<=0||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.some(p=>!Number.isSafeInteger(p.size)||p.size<=0||!/^[\w.-]+$/.test(p.file))||manifest.parts.reduce((n,p)=>n+p.size,0)!==manifest.size)throw Error('游戏文件清单无效。');
    const digest=async bytes=>Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    const base=url.slice(0,url.lastIndexOf('/')+1);let done=0;
    const chunks=await Promise.all(manifest.parts.map(async part=>{
      const bytes=new Uint8Array(await (await request(base+part.file)).arrayBuffer());
      if(bytes.byteLength!==part.size||await digest(bytes)!==part.sha256)throw Error('游戏文件校验失败，请刷新后重新加载。');
      options.onProgress?.(++done,manifest.parts.length);return bytes;
    }));
    const bytes=new Uint8Array(manifest.size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    if(await digest(bytes)!==manifest.sha256)throw Error('游戏包完整性校验失败。');
    return{name:manifest.name,bytes};
  }
  const api={load};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.ArcadeRom=api;
})();
