import { Buffer } from 'node:buffer';

export function nodeRequest(request, body) {
  const u=new URL(request.url);
  return {method:request.method,url:u.pathname+u.search,headers:{...Object.fromEntries(request.headers),host:u.host},async *[Symbol.asyncIterator](){if(body)yield Buffer.from(body);}};
}
export function responseBridge(request, persist) {
  let resolveResponse, resolveDone;
  const ready=new Promise(resolve=>resolveResponse=resolve),done=new Promise(resolve=>resolveDone=resolve);
  const headers=new Headers(), listeners=new Map();
  let controller,finished=false;
  const emit=(name)=>{for(const fn of listeners.get(name)||[])fn();listeners.delete(name);};
  const body=new ReadableStream({start(c){controller=c;},cancel(){res.destroyed=true;emit('close');resolveDone();}});
  const res={
    headersSent:false,destroyed:false,statusCode:200,
    setHeader(name,value){headers.delete(name);for(const v of Array.isArray(value)?value:[value])headers.append(name,String(v));},
    removeHeader(name){headers.delete(name);},
    getHeader(name){return headers.get(name);},
    once(name,fn){const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);return this;},
    on(name,fn){return this.once(name,fn);},
    writeHead(status,extra={}){this.statusCode=status;for(const [k,v]of Object.entries(extra))this.setHeader(k,v);},
    flushHeaders(){
      if(this.headersSent)return;
      this.headersSent=true;
      headers.delete('Connection');headers.delete('Transfer-Encoding');
      resolveResponse(new Response([204,304].includes(this.statusCode)||request.method==='HEAD'?null:body,{status:this.statusCode,headers}));
    },
    write(chunk){if(this.destroyed||finished)return false;this.flushHeaders();controller.enqueue(typeof chunk==='string'?new TextEncoder().encode(chunk):new Uint8Array(chunk));return true;},
    end(chunk){
      if(finished)return;
      if(chunk!==undefined&&!this.destroyed)this.write(chunk);
      emit('finish');finished=true;
      // Persist evidence before closing the response: a client report sent after
      // consuming the body must observe all completed resource requests.
      Promise.resolve().then(persist).then(()=>{
        this.flushHeaders();if(!this.destroyed)controller.close();emit('close');resolveDone();
      },error=>{
        if(!this.headersSent){this.statusCode=503;this.setHeader('Content-Type','application/json');this.flushHeaders();controller.enqueue(new TextEncoder().encode(JSON.stringify({error:'实验状态暂时无法保存，请重试。'})));}
        if(!this.destroyed)controller.error(error);resolveDone();
      });
    },
  };
  request.signal.addEventListener('abort',()=>{res.destroyed=true;emit('close');resolveDone();},{once:true});
  return {res,ready,done};
}
export function websocketAdapter(socket) {
  return {get readyState(){return socket.readyState;},send:(v)=>socket.send(v),close:(code,reason)=>socket.close(code,reason),terminate:()=>socket.close(1001,'Closing'),on(event,fn){socket.addEventListener(event,fn);}};
}
