import sites from '../.openai/online.json' with {type:'json'};
export default {
  async fetch(request){
    const u=new URL(request.url);
    if(u.pathname==='/health')return Response.json({ok:true,role:'cors-companion'});
    if(!/^\/labs\/[\w-]+\/remote$/.test(u.pathname)||!['POST','OPTIONS'].includes(request.method))return Response.json({error:'仅提供教学跨源端点'},{status:404});
    const target=new URL(u.pathname+u.search,sites.shop.origin);
    const headers=new Headers();
    for(const name of ['Origin','Content-Type','Access-Control-Request-Method','Access-Control-Request-Headers','X-Shop-Token']){const value=request.headers.get(name);if(value)headers.set(name,value);}
    return fetch(new Request(target,{method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'}));
  }
};
