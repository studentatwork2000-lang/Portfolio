import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import http from 'node:http';
import {fixture} from './fixture.mjs';
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes,scryptSync,randomUUID} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');let child,port,base,cookie,csrf,workspace,configPath,env;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function call(path,data,headers={}){return fetch(base+path,{method:data===undefined?'GET':'POST',headers:{Cookie:cookie || '',...(data===undefined?{}:{'Content-Type':'application/json',Origin:base,'X-CSRF-Token':csrf || '', 'X-Codex-Remote':'1'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});}
async function json(path,data){const res=await call(path,data);const value=await res.json();assert.equal(res.status,200,JSON.stringify(value));return value;}
async function start(){child=spawn(process.execPath,[resolve(root,'dist-server/index.js')],{cwd:root,env});let logs='';child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);child.on('exit',code=>{if(code)console.error('Test service exit',code,logs);});for(let i=0;i<100;i++){try{if((await call('/health')).ok)return;}catch{}await wait(40);}throw new Error('Service start failed: '+logs);}
async function stop(){if(!child || child.exitCode!==null)return;child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
async function login(){const res=await call('/api/login',{password:'test-passphrase-1234'});assert.equal(res.status,200);cookie=res.headers.get('set-cookie').split(';')[0];csrf=(await res.json()).csrf;}
async function ready(){for(let i=0;i<100;i++){const s=await json('/api/status');if(s.state==='ready')return;await wait(30);}assert.fail('Bridge not ready: '+JSON.stringify(await json('/api/status')));}
async function make(){return (await json('/api/threads',{requestId:randomUUID(),cwd:workspace,model:'test-model',mode:'workspaceWrite'})).thread;}
async function finished(id){for(let i=0;i<100;i++){const r=await json('/api/threads/'+id);if(r.thread.turns.at(-1)?.status==='completed')return r;await wait(40);}assert.fail('Turn did not finish.');}
test.before(async()=>{
  const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));port=listener.address().port;await new Promise(r=>listener.close(r));base='http://127.0.0.1:'+port;
  const setup=await fixture('test',port,'test-passphrase-1234');workspace=setup.workspace;configPath=setup.configPath;env=setup.env;
  await start();await login();await ready();
});
test.after(stop);
test('access control: login, host, origin, CSRF, raw routes, directory traversal',async()=>{
  assert.equal((await call('/api/status',undefined,{Cookie:''})).status,401);
  const hostStatus=await new Promise(resolve=>{const req=http.get(base+'/api/status',{headers:{Host:'evil.invalid',Cookie:cookie}},res=>{res.resume();resolve(res.statusCode);});req.on('error',()=>resolve(0));});assert.equal(hostStatus,403);
  assert.equal((await call('/api/threads',{}, {Origin:'https://evil.invalid'})).status,403);
  assert.equal((await call('/api/threads',{}, {'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await call('/api/rpc',{method:'command/exec'})).status,404);
  assert.equal((await call('/api/threads',{requestId:randomUUID(),cwd:'/tmp',mode:'workspaceWrite'})).status,403);
  assert.equal((await call('/config.local.json')).status,404);
  const wrong=await call('/api/login',{password:'wrong'});assert.equal(wrong.status,401);
  const source=await call('/');assert.match(source.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(source.headers.get('x-content-type-options'),/nosniff/);
});
test('saved CLI fixture is read without resumption; consent is required for resumption',async()=>{
  const r=await json('/api/threads/saved_cli');assert.equal(r.thread.turns[0].items[1].text,'Stored CLI fixture response.');assert.equal(r.loadedByController,false);
  const denied=await call('/api/threads/saved_cli/turn',{requestId:randomUUID(),text:'test',mode:'readOnly',model:'test-model',effort:'medium'});assert.equal(denied.status,409);
  await json('/api/threads/saved_cli/turn',{requestId:randomUUID(),text:'resume test',mode:'readOnly',model:'test-model',effort:'medium',confirmSavedSession:true});await finished('saved_cli');
});
test('streaming events and persisted idempotency prevent a second turn',async()=>{
  const t=await make();const requestId=randomUUID();const payload={requestId,text:'slow test',model:'test-model',effort:'high',mode:'workspaceWrite'};
  const controller=new AbortController();const stream=await fetch(base+'/api/events',{headers:{Cookie:cookie},signal:controller.signal});assert.equal(stream.status,200);
  let data='';const reading=(async()=>{try{for await(const chunk of stream.body)data+=new TextDecoder().decode(chunk);}catch{}})();
  await json('/api/threads/'+t.id+'/turn',payload);await wait(450);
  assert.match(data,/item\/agentMessage\/delta/);assert.equal((await json('/api/threads/'+t.id)).thread.turns.at(-1).status,'inProgress');
  const retry=await json('/api/threads/'+t.id+'/turn',payload);assert.ok(retry.turn.id);
  controller.abort();await reading;await finished(t.id);assert.equal((await json('/api/threads/'+t.id)).thread.turns.length,1);
  await stop();await start();await login();await ready();await json('/api/threads/'+t.id+'/turn',payload);assert.equal((await json('/api/threads/'+t.id)).thread.turns.length,1);
});
test('real approval request IDs are routed and stale/broad approvals are rejected',async()=>{
  const t=await make();await json('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'approval test',model:'test-model',mode:'workspaceWrite'});
  const controller=new AbortController();const stream=await fetch(base+'/api/events',{headers:{Cookie:cookie},signal:controller.signal});let key;
  const reader=stream.body.getReader();let value='';for(let i=0;i<10 && !key;i++){value+=new TextDecoder().decode((await reader.read()).value);for(const line of value.split('\n'))if(line.startsWith('data: ')){const event=JSON.parse(line.slice(6));if(event.method==='bridge/snapshot')key=event.params.approvals[0]?.key;}}
  assert.ok(key);controller.abort();
  assert.equal((await call('/api/approvals',{key,decision:'acceptForSession'})).status,400);
  await json('/api/approvals',{key,decision:'decline'});const history=await finished(t.id);assert.match(history.thread.turns.at(-1).items.at(-1).text,/Rejected/);
  assert.equal((await call('/api/approvals',{key,decision:'accept'})).status,409);
});
test('model/effort validation and interruption',async()=>{
  const t=await make();assert.equal((await call('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'test',model:'made-up',mode:'readOnly'})).status,400);
  assert.equal((await call('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'test',model:'test-model',effort:'ultra',mode:'readOnly'})).status,400);
  await json('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'slow long',model:'test-model',mode:'readOnly'});
  await json('/api/threads/'+t.id+'/interrupt',{});assert.equal((await json('/api/threads/'+t.id)).thread.turns.at(-1).status,'interrupted');
});
test('rename and archive use supported protocol methods',async()=>{const t=await make();await json('/api/threads/'+t.id+'/rename',{name:'Renamed fixture'});assert.equal((await json('/api/threads/'+t.id)).thread.name,'Renamed fixture');await json('/api/threads/'+t.id+'/archive',{});assert.ok(!(await json('/api/threads')).data.some(x=>x.id===t.id));});
test('approval acceptance is once-only; unsupported permission methods fail visibly',async()=>{
  const t=await make();const controller=new AbortController();let data='';const stream=await fetch(base+'/api/events',{headers:{Cookie:cookie},signal:controller.signal});const reader=(async()=>{try{for await(const c of stream.body)data+=new TextDecoder().decode(c);}catch{}})();
  await json('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'approval accept test',model:'test-model',mode:'workspaceWrite'});
  let key;for(let i=0;i<100 && !key;i++){for(const line of data.split('\n'))if(line.startsWith('data: ')){const e=JSON.parse(line.slice(6));if(e.method==='bridge/approval' && e.params.params.threadId===t.id)key=e.params.key;}await wait(10);}
  assert.ok(key);await json('/api/approvals',{key,decision:'accept'});assert.match((await finished(t.id)).thread.turns.at(-1).items.at(-1).text,/Approved/);
  await json('/api/threads/'+t.id+'/turn',{requestId:randomUUID(),text:'unsupported request test',model:'test-model',mode:'workspaceWrite'});await finished(t.id);assert.match(data,/bridge\/unsupported/);controller.abort();await reader;
});
