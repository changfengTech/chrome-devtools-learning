import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,createFetchMock} from 'miniflare';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,createHash,randomBytes} from 'node:crypto';
const root=fileURLToPath(new URL('../..',import.meta.url));
const online=JSON.parse(await readFile(new URL('../../.openai/online.json',import.meta.url),'utf8'));
const scriptPath=root+'/.sites/build-shop/server/index.js';
const headers={Origin:online.tutorial.origin,'Content-Type':'application/json'};
let mf,workerB,db;
test.before(async()=>{
 const worker={modules:true,scriptPath,compatibilityDate:'2026-07-30',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'shared-lab'}};
 mf=new Miniflare({workers:[{...worker,name:'shop-a'},{...worker,name:'shop-b'}]});
 db=await mf.getD1Database('DB','shop-a');
 for(const sql of (await readFile(root+'/drizzle/0000_lab_sessions.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(sql.trim()).run();
 workerB=await mf.getWorker('shop-b');
});
test.after(async()=>mf?.dispose());
const get=(p,options)=>mf.dispatchFetch(online.shop.origin+p,{...options,signal:AbortSignal.timeout(15000)});
const post=(p,body)=>get(p,{method:'POST',headers,body:JSON.stringify(body)});
const create=async(api,lesson)=>{const r=await post('/api/'+api+'/sessions',{lesson,mode:'practice'});assert.equal(r.status,201,await r.clone().text());return r.json();};

test('Workers 健康响应、63 课会话和八章末在 D1 中可跨隔离实例读取',async()=>{
 const h=await get('/health',{headers});assert.equal(h.headers.get('access-control-allow-origin'),online.tutorial.origin);assert.equal((await h.json()).lessons.length,63);
 const groups={foundations:Array.from({length:18},(_,i)=>String(i+1).padStart(2,'0')),'network-state':['19','20','22','23','24','25','26','35','36','37','38','39'],performance:['27','28','29','30','31','32','33','34','51'],memory:['40','41','42','43','44','50'],quality:['45','46','47','48','49','52'],advanced:['53','54','55','T01','T02','T03','T04','T05','T06','T07','T08']};
 for(const [api,lessons]of Object.entries(groups))for(const lesson of lessons){
  const {token}=await create(api,lesson);
  const response=await workerB.fetch(online.shop.origin+'/api/'+api+'/lesson?token='+token);
  assert.equal(response.status,200,lesson+": "+await response.clone().text());assert.equal((await response.json()).id,lesson);
  const grade=await (await post('/api/'+api+'/grade',{token,diagnosis:'a',evidence:'a',verification:'a'})).json();assert.equal(grade.passed,false,lesson+' may not pass without evidence');
  if(api!=='foundations'){const type=api==='network-state'?'labs':api;let page=await get('/'+type+'/'+token+'/');assert.equal(page.status,200,lesson+' page');await page.text();const run=await post('/api/'+api+'/begin',{token,phase:'baseline'});assert.equal(run.status,200,lesson+' begin: '+await run.clone().text());const detail=await run.json();page=await get('/'+type+'/'+token+'/'+(api==='performance'?'':api==='network-state'?'probe':'activate')+'?run='+detail.runId);assert.equal(page.status,200,lesson+' activate');await page.text();}
 }
 const timing=await post('/api/challenges',{});assert.equal(timing.status,201);
 for(const [chapter,api]of Object.entries({elements:'advanced',console:'advanced',sources:'advanced',network:'network-state',application:'network-state',performance:'performance',memory:'memory',lighthouse:'quality'})){
  const r=await post('/api/'+api+'/chapter',{chapter});assert.equal(r.status,201,chapter);assert.ok((await r.json()).token);
 }
});
test('跨请求保留引导的故障 / 修复证据，错误答案仍拒绝',async()=>{
 const {token}=await create('foundations','05');
 for(const phase of ['baseline','fixed']){
  const run=await (await get('/api/foundations/data?token='+token+'&phase='+phase)).json();
  const r=await post('/api/foundations/observe',{token,runId:run.runId,checks:[{name:'runtime protocol verification',passed:true}]});assert.equal((await r.json()).passed,true);
 }
 assert.equal((await (await post('/api/foundations/grade',{token,diagnosis:'a',evidence:'c',verification:'a'})).json()).passed,false);
 assert.equal((await (await post('/api/foundations/grade',{token,diagnosis:'a',evidence:'a',verification:'a'})).json()).passed,true);
});
test('并行资源观察不覆盖 D1 中其他请求的证据',async()=>{
 const {token}=await create('network-state','19');
 const run=await (await post('/api/network-state/begin',{token,phase:'baseline'})).json();
 await Promise.all(Array.from({length:8},async()=>{const r=await get('/labs/'+token+'/probe?run='+run.runId);assert.equal(r.status,200);await r.text();}));
 const row=await db.prepare('SELECT state FROM lab_sessions WHERE namespace=? AND token=?').bind('network',token).first();
 const stored=JSON.parse(row.state);assert.equal(stored.runs.$map[run.runId].events.filter(x=>x.task==='probe').length,8);
});
test('真实 OPTIONS / POST CORS 故障与修复保留不同响应头',async()=>{
 const {token}=await create('network-state','24');
 for(const phase of ['baseline','fixed']){
  const run=await (await post('/api/network-state/begin',{token,phase,correction:phase==='fixed'?'a':''})).json();
  const path='/labs/'+token+'/remote?run='+run.runId;
  const r=await get(path,{method:'OPTIONS',headers:{Origin:online.shop.origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-shop-token'}});
  assert.equal(r.status,phase==='fixed'?204:403);assert.equal(r.headers.get('access-control-allow-origin'),phase==='fixed'?online.shop.origin:null);await r.text();
 }
 const bad=await post('/api/foundations/sessions',{lesson:'01',mode:'practice'});await bad.text();
 assert.equal((await get('/api/foundations/sessions',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status,403);
});
test('SSE 与 WebSocket 发送真实两条消息，并保存连接证据',async()=>{
 const {token}=await create('network-state','26');
 const run=await (await post('/api/network-state/begin',{token,phase:'baseline'})).json();
 const sse=await get('/labs/'+token+'/events?run='+run.runId);assert.match(sse.headers.get('content-type'),/event-stream/);assert.equal((await sse.text()).match(/event: inventory/g).length,2);
 const r=await get('/labs/'+token+'/socket?run='+run.runId,{headers:{Upgrade:'websocket',Origin:online.shop.origin}});assert.equal(r.status,101);
 const ws=r.webSocket;ws.accept();const messages=[];
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebSocket timeout')),4000);ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));ws.addEventListener('close',()=>{clearTimeout(timer);resolve();});ws.addEventListener('error',reject);});
 assert.deepEqual(messages.map(x=>x.sequence),[1,2]);
});
test('慢请求的等待与分块传输是真实流式响应',async()=>{
 const start=Date.now(),r=await get('/api/products?scenario=download');const headersAt=Date.now();const body=await r.text();assert.ok(body.length>400000);assert.ok(Date.now()-headersAt>800);assert.ok(headersAt-start<800);
 const waitingStart=Date.now();const wait=await get('/api/products?scenario=waiting');assert.ok(Date.now()-waitingStart>=1000);assert.equal((await wait.json()).products.length,3);
});

function cbor(x){
 const length=(m,n)=>n<24?Buffer.from([m*32+n]):n<256?Buffer.from([m*32+24,n]):Buffer.from([m*32+25,n>>8,n&255]);
 if(Buffer.isBuffer(x))return Buffer.concat([length(2,x.length),x]);
 if(typeof x==='string'){const b=Buffer.from(x);return Buffer.concat([length(3,b.length),b]);}
 if(typeof x==='number')return length(x<0?1:0,x<0?-1-x:x);
 return Buffer.concat([length(5,x.size),...[...x].flatMap(([k,v])=>[cbor(k),cbor(v)])]);
}
test('HTTPS WebAuthn 的 RP 绑定、一次性挑战与公开密钥可跨请求持久化',async()=>{
 const {token}=await create('advanced','T06');await (await get('/advanced/'+token+'/')).text();
 const run=await (await post('/api/advanced/begin',{token,phase:'baseline'})).json();await(await get('/advanced/'+token+'/activate?run='+run.runId)).text();
 const r=await post('/api/advanced/native-options',{token,runId:run.runId,action:'register'});assert.equal(r.status,200,await r.clone().text());const options=await r.json();assert.equal(options.rp.id,new URL(online.shop.origin).hostname);
 const {publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),id=randomBytes(16);
 const auth=Buffer.concat([createHash('sha256').update(options.rp.id).digest(),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),Buffer.from([0,16]),id,cbor(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]))]);
 const payload={token,runId:run.runId,id:id.toString('base64url'),clientDataJSON:Buffer.from(JSON.stringify({type:'webauthn.create',origin:online.shop.origin,challenge:options.challenge,crossOrigin:false})).toString('base64url'),attestationObject:cbor(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]])).toString('base64url')};
 const registration=await post('/api/advanced/native-register',payload);assert.equal(registration.status,200,await registration.clone().text());assert.equal((await registration.json()).registered,true);
 assert.equal((await post('/api/advanced/native-register',payload)).status,400);
 const authentication=await post('/api/advanced/native-options',{token,runId:run.runId,action:'authenticate'});assert.equal(authentication.status,200,await authentication.clone().text());assert.ok((await authentication.json()).challenge);
 const row=await db.prepare('SELECT state FROM lab_sessions WHERE namespace=? AND token=?').bind('advanced',token).first();assert.equal(JSON.parse(row.state).credential.publicKey.$key.kty,'EC');
});

test('HTTPS 审计报告只接受本会话的商城 URL，拒绝异源和旧运行（协议夹具）',async()=>{
 const {token}=await create('quality','45');await(await get('/quality/'+token+'/')).text();
 const run=await(await post('/api/quality/begin',{token,phase:'baseline'})).json();await(await get('/quality/'+token+'/activate?run='+run.runId)).text();
 const report={url:online.shop.origin+'/quality/'+token+'/audit/?run='+run.runId,version:'worker-contract-fixture',condition:'same',fetchTime:new Date().toISOString(),formFactor:'desktop',categories:{performance:0.8},buttonName:1,description:1,lcp:1400,tbt:400};
 for(const url of [report.url.replace(online.shop.origin,online.tutorial.origin),report.url.replace(run.runId,'old-run')])assert.equal((await post('/api/quality/audit',{token,runId:run.runId,report:{...report,url}})).status,400);
 const good=await post('/api/quality/audit',{token,runId:run.runId,report});assert.equal(good.status,200,await good.clone().text());
});
test('托管资源指向实际 HTTPS 来源，手机入口与 WebSocket 不降为本机地址',async()=>{
 const network=await(await get('/lab/network-state/runtime.js')).text();assert.ok(network.includes(online.tutorial.origin));assert.ok(network.includes('globalThis.__DEVTOOLS_HOSTED__.cors.origin'));assert.ok(network.includes('wss:'));assert.ok(!network.includes('http://127.0.0.1:4175${'));
 const advanced=await(await get('/lab/advanced/runtime.js')).text();assert.ok(advanced.includes('address.value = location.origin + location.pathname'));assert.ok(advanced.includes('if (location.protocol !== "https:") authURL.hostname = "localhost"'));
});
test('独立 CORS 同伴转发真实 Origin 和请求体，不转发身份或内部路由头',async()=>{
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get(online.shop.origin).intercept({path:'/labs/worker-test/remote?run=one',method:'POST',headers:h=>h.origin===online.shop.origin&&!h.cookie&&!h.authorization&&!h['x-dispatched-app']}).reply(200,async ({body})=>{assert.equal(await new Response(body).text(),'{"sku":"test"}');return '{"ok":true}';},{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':online.shop.origin}});
 const proxy=new Miniflare({modules:true,scriptPath:root+'/.sites/build-cors/server/index.js',compatibilityDate:'2026-07-30',fetchMock:mock});
 try{
  const r=await proxy.dispatchFetch(online.cors.origin+'/labs/worker-test/remote?run=one',{method:'POST',headers:{Origin:online.shop.origin,'Content-Type':'application/json','Cookie':'private=test','Authorization':'test-only','X-Dispatched-App':'wrong-app'},body:'{"sku":"test"}'});assert.equal(r.status,200,await r.clone().text());assert.equal(r.headers.get('access-control-allow-origin'),online.shop.origin);assert.equal((await r.json()).ok,true);mock.assertNoPendingInterceptors();
  assert.equal((await proxy.dispatchFetch(online.cors.origin+'/unrelated')).status,404);
 }finally{await proxy.dispose();}
});
