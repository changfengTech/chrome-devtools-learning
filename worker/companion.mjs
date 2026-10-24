import sites from '../.openai/online.json' with {type:'json'};
const home=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DevTools 跨源实验同伴</title><style>body{margin:0;background:#f4f7fc;color:#192238;font:17px/1.8 system-ui,sans-serif}main{max-width:680px;margin:12vh auto;padding:36px;background:white;border:1px solid #dfe5ef;border-radius:20px}small{color:#187458}h1{font-size:30px;line-height:1.3}a{color:#245de8}code{font-size:15px;overflow-wrap:anywhere}@media(max-width:720px){main{margin:24px 16px;padding:24px}}</style><main><small>DevTools 实验室 · 独立 HTTPS 来源</small><h1>跨源实验同伴已运行</h1><p>这里提供 Network 第 24 课的真实 CORS 端点。请从教程准备实验，再在商城比较预检失败与修复后的请求。</p><p><a href="${sites.tutorial.origin}/#lesson/24">打开第 24 课</a> · <a href="${sites.shop.origin}/shop/">查看实验商城</a> · <a href="/health">查看健康状态</a></p><p>课程使用 <code>OPTIONS / POST /labs/&lt;token&gt;/remote</code>。本服务只转发会话对应的教学请求，不提供任意 URL 代理。</p></main></html>`;
export default {
  async fetch(request){
    const u=new URL(request.url);
    if(u.pathname==='/'){
      if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
      return new Response(request.method==='HEAD'?null:home,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});
    }
    if(u.pathname==='/health')return Response.json({ok:true,role:'cors-companion'});
    if(!/^\/labs\/[\w-]+\/remote$/.test(u.pathname)||!['POST','OPTIONS'].includes(request.method))return Response.json({error:'仅提供教学跨源端点'},{status:404});
    const target=new URL(u.pathname+u.search,sites.shop.origin);
    const headers=new Headers();
    for(const name of ['Origin','Content-Type','Access-Control-Request-Method','Access-Control-Request-Headers','X-Shop-Token']){const value=request.headers.get(name);if(value)headers.set(name,value);}
    return fetch(new Request(target,{method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'}));
  }
};
