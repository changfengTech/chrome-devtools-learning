import { Buffer } from 'node:buffer';
import { createLabServer } from '../server/lab.mjs';
import assets from 'virtual:lab-assets';
import sites from '../.openai/online.json' with {type:'json'};
import { loadState } from './state.mjs';
import { nodeRequest, responseBridge, websocketAdapter } from './bridge.mjs';

const origins=new Set(Object.values(sites).map(x=>x.origin));
const factories={foundations:'foundationOptions',network:'networkOptions',performance:'performanceOptions',memory:'memoryOptions',quality:'qualityOptions',advanced:'advancedOptions'};
function namespace(path) {
  if(/^\/(api\/foundations|foundations)(\/|$)/.test(path))return 'foundations';
  if(/^\/(api\/network-state|labs)(\/|$)/.test(path))return 'network';
  for(const n of ['performance','memory','quality','advanced'])if(new RegExp('^/(api/'+n+'|'+n+')(/|$)').test(path))return n;
  return 'timing';
}
function json(data,status=200,origin){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});}
function staticAsset(path,method){
  const item=assets['public'+path];if(!item)return null;
  const headers={'Content-Type':item.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  return new Response(method==='HEAD'?null:Buffer.from(item.body,'base64'),{headers});
}
export default {
  async fetch(request,env,ctx){
    const u=new URL(request.url),origin=request.headers.get('Origin');
    if(u.pathname==='/health')return json({ok:true,version:8,lessons:[...Array.from({length:55},(_,i)=>String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'T0'+(i+1))],hosting:'Workers / D1'},200,origin);
    if(u.pathname==='/lab/hosting-config.js')return new Response('globalThis.__DEVTOOLS_HOSTED__='+JSON.stringify(sites)+';',{headers:{'Content-Type':'text/javascript','Cache-Control':'no-store'}});
    if(u.pathname.startsWith('/lab/')||u.pathname==='/favicon.svg'){
      if(!['GET','HEAD'].includes(request.method))return json({error:'不支持的方法'},405);
      return staticAsset(u.pathname,request.method)||json({error:'资源不存在'},404);
    }
    if(origin&&!origins.has(origin))return json({error:'不允许此来源操作实验'},403);
    // A same-origin server-to-server companion proxy keeps the browser's true
    // Origin header. It exposes only the deliberately bounded CORS experiment.
    let body='';
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      body=await request.text();if(body.length>131072)return json({error:'请求过长'},413);
    }
    let input={};try{input=JSON.parse(body||'{}');}catch{return json({error:'请求 JSON 格式不正确'},400);}
    const name=namespace(u.pathname);
    const token=input.token||input.id||u.searchParams.get('token')||u.pathname.match(/^\/(?:labs|performance|memory|quality|advanced)\/([\w-]+)\//)?.[1];
    if(!env.DB)return json({error:'在线会话存储尚未配置'},503);
    const state=await loadState(env.DB,name,token);
    if(/\/(sessions|chapter|challenges)$/.test(u.pathname)&&request.method==='POST'){
      const count=await env.DB.prepare('SELECT count(*) AS n FROM lab_sessions WHERE expires_at>?').bind(Date.now()).first();
      if(count.n>=5000)return json({error:'当前实验较多，请稍后再试'},429);
      await env.DB.prepare('DELETE FROM lab_sessions WHERE rowid IN (SELECT rowid FROM lab_sessions WHERE expires_at<? LIMIT 100)').bind(Date.now()).run();
    }
    const options={origins};
    for(const [n,key]of Object.entries(factories))options[key]={sessions:n===name?state.map:new Map(),origins,allowedOrigins:origins};
    options.challenges=name==='timing'?state.map:new Map();
    const server=createLabServer(options),req=nodeRequest(request,body);
    if(request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const pair=new WebSocketPair(),client=pair[0],connection=pair[1];connection.accept();
      let rejected=false;
      const socket={webSocket:websocketAdapter(connection),end(){rejected=true;connection.close(1008,'Invalid exercise');}};
      for(const fn of server.listeners.get('upgrade')||[])fn(req,socket,new Uint8Array());
      if(rejected)return json({error:'无效连接或来源'},403);
      await state.save();
      return new Response(null,{status:101,webSocket:client});
    }
    const bridge=responseBridge(request,()=>state.save());
    bridge.res.setHeader('Cache-Control','no-store');
    if(origin){bridge.res.setHeader('Access-Control-Allow-Origin',origin);bridge.res.setHeader('Vary','Origin');bridge.res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');bridge.res.setHeader('Access-Control-Allow-Headers','Content-Type');}
    const task=Promise.resolve(server.handler(req,bridge.res)).catch(()=>{if(!bridge.res.headersSent){bridge.res.writeHead(500,{'Content-Type':'application/json'});bridge.res.end(JSON.stringify({error:'实验请求失败，请重新准备'}));}else bridge.res.end();});
    ctx.waitUntil(Promise.all([task,bridge.done]));
    return bridge.ready;
  }
};
