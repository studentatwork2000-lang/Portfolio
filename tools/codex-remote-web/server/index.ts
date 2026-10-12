import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, basename, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { Bridge } from './bridge.js';
import { loadConfig, ROOT, HttpError, workspace } from './config.js';
import { Security, headers, body } from './security.js';

const exec = promisify(execFile);
const config = await loadConfig();
const security = new Security(config);
const bridge = new Bridge(config);
const clients = new Set<ServerResponse>();
const bootId = crypto.randomUUID();
let sequence = 0;
let eventBytes = 0;
const events: {id:number;data:string}[] = [];
const EVENT_MAX = 2*1024*1024;
function json(res:ServerResponse,status:number,value:any) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));
}
function sendEvent(res:ServerResponse,id:number,data:string) {
  if(res.writableLength>512*1024) { res.end(); return; }
  res.write(`id: ${bootId}:${id}\ndata: ${data}\n\n`);
}
bridge.on('event',(event:any)=>{
  const data=JSON.stringify(event);const id=++sequence;
  events.push({id,data});eventBytes+=Buffer.byteLength(data);
  while(events.length>2000 || eventBytes>EVENT_MAX) { const e=events.shift()!;eventBytes-=Buffer.byteLength(e.data); }
  for(const client of clients) sendEvent(client,id,data);
});
const heartbeat=setInterval(()=>{
  security.prune();
  for(const client of clients) if(client.writableLength<512*1024) client.write(': heartbeat\n\n'); else client.end();
},20_000);heartbeat.unref();

async function workspaceInfo(path:string) {
  let branch:string|null=null;
  try { branch=(await exec('git',['-C',path,'branch','--show-current'],{timeout:3000,maxBuffer:2048})).stdout.trim() || 'detached HEAD'; } catch { /* no repository */ }
  return {path,name:basename(path),branch};
}
function permissions(mode:any) {
  if(!['readOnly','workspaceWrite'].includes(mode)) throw new HttpError(400,'Select read-only or workspace edits.');
  return {approvalPolicy:bridge.approvalPolicy,sandbox:bridge.sandboxMode(mode)};
}
async function requireAgentAuth() {
  const account=await bridge.rpc('account/read',{refreshToken:false});
  if(!account.account && account.requiresOpenaiAuth!==false)throw new HttpError(409,'Codex is not signed in. Run codex login in this Codespace, then restart this service.');
}
async function threadRead(id:string) {
  const response=await bridge.rpc('thread/read',{threadId:id,includeTurns:true});
  const all=response.thread.turns || [];
  const live=bridge.liveTurns.get(id);
  if(live){const i=all.findIndex((t:any)=>t.id===live.id);if(i>=0)all[i]=structuredClone(live);else all.push(structuredClone(live));}
  // Codex's stable full-history API is used; page only what the browser renders.
  const count=all.length;response.thread.turns=all.slice(-30);response.totalTurns=count;
  response.olderTurns=count>30;response.active=bridge.active.get(id) || null;
  response.loadedByController=bridge.loaded.has(id);
  response.eventCursor=`${bootId}:${sequence}`;
  return response;
}
async function handler(req:IncomingMessage,res:ServerResponse) {
  for(const [key,value] of Object.entries(headers)) res.setHeader(key,value);
  try {
    security.origin(req);
    const url=new URL(req.url || '/',`http://${req.headers.host}`);
    const path=url.pathname;const method=req.method || 'GET';
    if(path==='/health' && method==='GET') { json(res,200,{alive:true,instanceId:process.env.CODEX_REMOTE_INSTANCE_ID || undefined});return; }
    if(path==='/api/session' && method==='GET') {
      const s=security.session(req);json(res,200,s?{authenticated:true,csrf:s.csrf}:{authenticated:false});return;
    }
    if(path==='/api/login' && method==='POST') { const b=await body(req);json(res,200,security.login(req,res,b.password));return; }
    if(path.startsWith('/api/')) {
      const session=security.require(req,method!=='GET');
      if(path==='/api/logout' && method==='POST') { security.remove(session.id);res.setHeader('Set-Cookie','crw_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');json(res,200,{ok:true});return; }
      if(path==='/api/events' && method==='GET') {
        if(clients.size>=32) throw new HttpError(429,'Too many streaming connections.');
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.flushHeaders();clients.add(res);security.sessions.get(session.id)!.streams.add(res);
        const last=String(req.headers['last-event-id'] || '').split(':');const n=Number(last[1]);
        if(last[0]===bootId && Number.isFinite(n) && n>=(events[0]?.id || sequence)-1) {
          for(const e of events) if(e.id>n) sendEvent(res,e.id,e.data);
        } else sendEvent(res,sequence,JSON.stringify({method:'bridge/resync',params:{}}));
        sendEvent(res,sequence,JSON.stringify({method:'bridge/snapshot',params:{state:bridge.state,agent:bridge.agent,error:bridge.lastError,active:Object.fromEntries(bridge.active),approvals:[...bridge.approvals].map(([key,a])=>({key,method:a.method,params:a.params}))}}));
        req.on('close',()=>{clients.delete(res);security.sessions.get(session.id)?.streams.delete(res);});return;
      }
      if(path==='/api/status' && method==='GET') {
        let account:any=null;
        if(bridge.state==='ready') {
          try { const a=await bridge.rpc('account/read',{refreshToken:false});account={type:a.account?.type || null,planType:a.account?.planType || null,requiresOpenaiAuth:a.requiresOpenaiAuth,authenticated:!!a.account || a.requiresOpenaiAuth===false}; } catch { account={error:'Cannot read Codex authentication state.'}; }
        }
        const cpu=process.cpuUsage();
        json(res,200,{state:bridge.state,agent:bridge.agent,error:bridge.lastError,account,active:Object.fromEntries(bridge.active),workspaces:await Promise.all(config.workspaces.map(workspaceInfo)),protocolChecked:!!bridge.methods,resources:{rssBytes:process.memoryUsage().rss,cpuUserMicros:cpu.user,cpuSystemMicros:cpu.system,uptimeSeconds:process.uptime()},limitations:['Saved sessions can be resumed; independently running CLI turns cannot be taken over.','A running service continues after the browser closes. Codespace shutdown or service termination stops running work.']});return;
      }
      if(path==='/api/models' && method==='GET') { json(res,200,{data:await bridge.listModels(),catalogOnly:true});return; }
      if(path==='/api/threads' && method==='GET') {
        const params:any={limit:40,sortKey:'updated_at',sourceKinds:['cli','vscode','appServer']};
        const cursor=url.searchParams.get('cursor');if(cursor) params.cursor=cursor;
        // Omitting sourceKinds uses Codex's interactive-source defaults (including CLI).
        json(res,200,await bridge.rpc('thread/list',params));return;
      }
      if(path==='/api/threads' && method==='POST') {
        await requireAgentAuth();
        const b=await body(req);const cwd=await workspace(config,b.cwd);const policy=permissions(b.mode);await bridge.validateSelection(b.model,b.effort);
        const result=await bridge.submitOnce(b.requestId,{op:'create',cwd,mode:b.mode,model:b.model},()=>bridge.rpc('thread/start',{cwd,...policy,...bridge.reviewer('thread/start'),...(b.model?{model:b.model}:{})}));
        json(res,200,result);return;
      }
      const match=/^\/api\/threads\/([a-zA-Z0-9_-]{1,160})(?:\/(turn|interrupt|rename|archive|history))?$/.exec(path);
      if(match) {
        const id=match[1];const action=match[2];
        if(method==='GET' && !action) { json(res,200,await threadRead(id));return; }
        if(method==='GET' && action==='history') {
          const response=await bridge.rpc('thread/read',{threadId:id,includeTurns:true});const all=response.thread.turns || [];
          const end=Number(url.searchParams.get('before'));if(!Number.isInteger(end) || end<0 || end>all.length) throw new HttpError(400,'Invalid history offset.');
          json(res,200,{turns:all.slice(Math.max(0,end-30),end),before:Math.max(0,end-30)});return;
        }
        if(method==='POST' && action==='turn') {
          await requireAgentAuth();
          const b=await body(req);if(typeof b.text!=='string' || !b.text.trim() || b.text.length>120_000) throw new HttpError(400,'Enter a prompt under 120,000 characters.');
          await bridge.validateSelection(b.model,b.effort);const policy=permissions(b.mode);
          const result=await bridge.submitOnce(b.requestId,{op:'turn',id,text:b.text,model:b.model,effort:b.effort,mode:b.mode},async()=>{
            if(bridge.active.has(id) || bridge.busy.has(id)) throw new HttpError(409,'This conversation already has running or uncertain work. Check its status first.');
            bridge.busy.add(id);
            try {
              const info=await bridge.rpc('thread/read',{threadId:id,includeTurns:false});
              const cwd=await workspace(config,info.thread.cwd);
              if(info.thread.status?.type==='active' && !bridge.loaded.has(id)) throw new HttpError(409,'This session is already active. Stop using its other controller first.');
              if(!bridge.loaded.has(id)) {
                if(b.confirmSavedSession!==true)throw new HttpError(409,'Confirm that no other CLI or controller is using this saved conversation.');
                await bridge.rpc('thread/resume',{threadId:id,cwd,...policy,...bridge.reviewer('thread/resume')});bridge.loaded.add(id);
              }
              return await bridge.rpc('turn/start',{threadId:id,input:[{type:'text',text:b.text,text_elements:[]}],cwd,approvalPolicy:policy.approvalPolicy,...bridge.reviewer('turn/start'),sandboxPolicy:b.mode==='readOnly'?{type:'readOnly',networkAccess:false}:{type:'workspaceWrite',writableRoots:[cwd],networkAccess:false,excludeTmpdirEnvVar:true,excludeSlashTmp:true},...(b.model?{model:b.model}:{}),...(b.effort?{effort:b.effort}:{})});
            } finally {bridge.busy.delete(id);}
          });json(res,200,result);return;
        }
        if(method==='POST' && action==='interrupt') {
          const active=bridge.active.get(id);if(!active || active.status==='unknown') throw new HttpError(409,'No interruptible turn is running in this service.');
          json(res,200,await bridge.rpc('turn/interrupt',{threadId:id,turnId:active.turnId}));return;
        }
        if(method==='POST' && action==='rename') {
          const b=await body(req);if(typeof b.name!=='string' || !b.name.trim() || b.name.length>120) throw new HttpError(400,'Use a title between 1 and 120 characters.');
          json(res,200,await bridge.rpc('thread/name/set',{threadId:id,name:b.name.trim()}));return;
        }
        if(method==='POST' && action==='archive') {
          if(bridge.active.has(id)) throw new HttpError(409,'Stop running work before archiving.');
          json(res,200,await bridge.rpc('thread/archive',{threadId:id}));return;
        }
      }
      if(path==='/api/approvals' && method==='POST') {
        const b=await body(req);json(res,200,bridge.approval(b.key,b.decision,b.answers));return;
      }
      throw new HttpError(404,'Unknown API route.');
    }
    if(method!=='GET' && method!=='HEAD') throw new HttpError(405,'Method not allowed.');
    const base=resolve(ROOT,'dist');const requested=path==='/'?'/index.html':path;
    let file=resolve(base,'.'+decodeURIComponent(requested));
    if(!file.startsWith(base+sep)) throw new HttpError(404,'Not found.');
    try { file=await realpath(file);if(!file.startsWith(base+sep)) throw new HttpError(404,'Not found.');await stat(file); } catch {throw new HttpError(404,'Not found.');}
    const bytes=await readFile(file);const type:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff'};
    res.setHeader('Content-Type',type[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control',path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
    res.setHeader('Vary','Accept-Encoding');
    if((req.headers['accept-encoding'] || '').includes('gzip') && bytes.length>1024) {res.setHeader('Content-Encoding','gzip');res.end(method==='HEAD'?undefined:gzipSync(bytes));} else res.end(method==='HEAD'?undefined:bytes);
  } catch(e:any) {
    if(res.headersSent) { res.end();return; }
    json(res,e instanceof HttpError?e.status:500,{error:e instanceof HttpError?e.message:'Service error. Check configuration and restart if necessary.'});
  }
}
const server=createServer((req,res)=>void handler(req,res));
server.requestTimeout=120_000;server.headersTimeout=15_000;
server.listen(config.port,config.host,()=>console.log(`Codex Remote listening on http://${config.host}:${config.port}`));
await bridge.init();
function shutdown() {bridge.close();clearInterval(heartbeat);for(const client of clients) client.end();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
