import { build } from 'vite';
import { readFile, readdir, mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const role=process.argv[2]||'shop';
if(!['shop','cors'].includes(role))throw new Error('Expected shop or cors');
const online=JSON.parse(await readFile(path.join(root,'.openai/online.json'),'utf8'));
const destination=process.env.HOSTED_OUTPUT?path.resolve(process.env.HOSTED_OUTPUT):path.join(root,process.argv.includes('--dist')?'dist':'.sites/build-'+role);
const assets={};
async function collect(directory){
 for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
  const name=directory+'/'+entry.name;
  if(entry.isDirectory())await collect(name);
  else {
   let data=await readFile(path.join(root,name));
   if(/\.(js|html)$/.test(name)){
    let text=data.toString();
    if(name.endsWith('.html'))text=text.replace('<head>','<head><script src="/lab/hosting-config.js"></script>').replace('在 localhost 打开独立原生取证页','打开独立原生取证页');
    if(name.endsWith('.js')){
     text=text.replace(/(new Set\(\[\s*)(?=["']http:\/\/)/g,'$1'+JSON.stringify(online.tutorial.origin)+',\n');
     text=text.replace('`http://127.0.0.1:4175${url("remote")}`','`${globalThis.__DEVTOOLS_HOSTED__.cors.origin}${url("remote")}`');
     text=text.replace('`ws://${location.host}${url("socket")}`','`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${url("socket")}`');
     text=text.replace('实验源 http://127.0.0.1:4174；本课跨源请求使用独立端口 4175。','实验源 '+online.shop.origin+'；跨源同伴 '+online.cors.origin+'。');
     // Online WebAuthn uses this exact HTTPS exercise origin and RP hostname.
     if(name==='public/lab/advanced/runtime.js'){
      text=text.replace('配置 4174 转发后，在 Android Chrome 打开此地址：','在 Android Chrome 打开此 HTTPS 地址，再从电脑 Inspect 目标页：');
      text=text.replace('"http://localhost:4174" + location.pathname','location.origin + location.pathname');
      text=text.replace('手机转发后的商城地址','手机访问的在线商城地址');
      text=text.replaceAll('location.hostname !== "localhost"','!(location.hostname === "localhost" || location.origin === globalThis.__DEVTOOLS_HOSTED__.shop.origin)');
      text=text.replace('authURL.hostname = "localhost";','if (location.protocol !== "https:") authURL.hostname = "localhost";');
      text=text.replace('$("auth-origin-note").hidden = location.hostname === "localhost";','$("auth-origin-note").hidden = location.hostname === "localhost" || location.protocol === "https:";');
     }
    }
    data=Buffer.from(text);
   }
   const type=name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.png')?'image/png':name.endsWith('.ico')?'image/x-icon':name.endsWith('.json')||name.endsWith('.map')?'application/json':'text/plain; charset=utf-8';
   assets[name]={body:data.toString('base64'),type};
  }
 }
}
if(role==='shop'){await collect('public');await collect('src/data');}
const shims=Object.fromEntries(['http','fs','ws'].map(x=>[x,path.join(root,'worker/shims/'+x+'.mjs')]));
await build({configFile:false,root,publicDir:false,define:{'import.meta.url':JSON.stringify('file:///site/server/lab.mjs'),'process.argv':'[]','performance.now':'Date.now'},ssr:{noExternal:['ws']},resolve:{alias:[{find:'node:http',replacement:shims.http},{find:'node:fs/promises',replacement:shims.fs},{find:'node:fs',replacement:shims.fs},{find:'ws',replacement:shims.ws}]},plugins:[{
 name:'shared-node-lab-on-workers',
 resolveId(id){if(id==='virtual:lab-assets')return '\0lab-assets';if(id==='node:http')return shims.http;if(id==='node:fs'||id==='node:fs/promises')return shims.fs;if(id==='ws')return shims.ws;},
 load(id){if(id==='\0lab-assets')return 'export default '+JSON.stringify(assets);},
 transform(code,id){
  if(!id.startsWith(path.join(root,'server')))return;
  if(id.endsWith('quality.mjs')){code=code.replace('["127.0.0.1", "localhost"].includes(u.hostname)','u.origin === '+JSON.stringify(online.shop.origin));}
  if(id.endsWith('advanced.mjs')){
   code=code.replace('const origin = "http://" + request.headers.host;','const origin = '+JSON.stringify(online.shop.origin)+';');
   code=code.replace('!["http://127.0.0.1:4174", "http://localhost:4174"].includes(origin)','!['+JSON.stringify(online.shop.origin)+'].includes(origin)');
  }
  if(id.endsWith('advanced-webauthn.mjs')){
   code='import { Buffer } from "node:buffer";\n'+code;
   code=code.replace('origin !== "http://localhost:4174"','origin !== '+JSON.stringify(online.shop.origin));
   code=code.replace('return "localhost";','return '+JSON.stringify(new URL(online.shop.origin).hostname)+';');
  }
  return code;
 }
}],build:{ssr:path.join(root,role==='shop'?'worker/index.mjs':'worker/companion.mjs'),outDir:path.join(destination,'server'),emptyOutDir:true,minify:true,target:'es2022',rolldownOptions:{external:['node:crypto','node:buffer','node:path','node:url'],output:{entryFileNames:'index.js',codeSplitting:false}}}});
const manifest={project_id:online[role].project_id,...(role==='shop'?{d1:'DB'}:{})};
await mkdir(path.join(destination,'.openai'),{recursive:true});
await writeFile(path.join(destination,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
if(role==='shop')await cp(path.join(root,'drizzle'),path.join(destination,'.openai/drizzle'),{recursive:true});
console.log(JSON.stringify({role,destination,assets:Object.keys(assets).length}));
