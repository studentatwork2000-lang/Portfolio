import { spawn, execFile, ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { Config, HttpError, ROOT, STATE } from './config.js';
import { Ajv, ValidateFunction } from 'ajv';

type Pending = { resolve: (v:any)=>void; reject: (e:any)=>void; timer: NodeJS.Timeout };
export type WireEvent = { method: string; params: any };
type Submission = { fingerprint:string; state:'pending'|'done'|'failed'; result?:any; error?:string; time:number };
const APPROVAL_METHODS = new Set(['item/commandExecution/requestApproval', 'item/fileChange/requestApproval']);
const INPUT_METHODS = new Set(['item/tool/requestUserInput','tool/requestUserInput']);
const execute=promisify(execFile);

export class Bridge extends EventEmitter {
  child?: ChildProcessWithoutNullStreams; state = 'offline'; agent = ''; lastError = '';
  pending = new Map<number, Pending>(); nextId = 1; generation = randomUUID();
  approvals = new Map<string,{id:any;method:string;params:any}>();
  active = new Map<string,{turnId:string;status:string}>(); loaded = new Set<string>();
  busy = new Set<string>(); submissions = new Map<string,Submission>(); stopped = false;
  models: any[] = []; methods?: Set<string>; retries = 0; restart?: NodeJS.Timeout;
  schema:any; validators=new Map<string,ValidateFunction>(); ajv=new Ajv({strict:false,allErrors:false,validateFormats:false});
  liveTurns=new Map<string,any>();
  persistQueue: Promise<void> = Promise.resolve();
  constructor(private config: Config) { super(); }
  async init() {
    try { const journal = JSON.parse(await readFile(resolve(STATE,'submissions.json'),'utf8'));
      this.submissions = new Map(journal); } catch(e:any) { if(e.code !== 'ENOENT') throw new Error('Submission journal is corrupt. Restore it before starting the service.'); }
    try {
      const p = JSON.parse(await readFile(resolve(STATE,'protocol.json'),'utf8')); this.methods = new Set(p.methods);
      this.schema=JSON.parse(await readFile(resolve(STATE,'protocol','ClientRequest.json'),'utf8'));
      if(p.version) {
        const current=(await execute(this.config.codexPath,['--version'],{timeout:10000})).stdout.trim();
        if(current!==p.version){this.lastError='Codex version changed. Run npm run inspect and restart the service.';this.emitState();return;}
      }
    } catch { this.lastError='Run npm run inspect to generate protocol schemas from your installed Codex.';this.emitState();return; }
    await this.start();
  }
  async start() {
    if (this.stopped || this.child) return;
    this.state = 'connecting'; this.emitState();
    // Preserve the same user, environment, and Codex home as the installed CLI.
    const child = spawn(this.config.codexPath, ['app-server'], { cwd: ROOT, stdio: ['pipe','pipe','pipe'] });
    this.child = child; this.generation = randomUUID(); this.loaded.clear(); this.models = [];
    let buffer = ''; let dead = false;
    const onDead = () => {
      if(dead) return; dead = true; this.child = undefined;
      for(const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new HttpError(503,'Codex disconnected. The operation may have been submitted; do not resend it blindly.')); }
      this.pending.clear(); this.approvals.clear(); this.loaded.clear();
      for(const a of this.active.values()) a.status='unknown';
      this.state='offline'; this.lastError='Codex App Server is unavailable. Check the executable and service health.'; this.emitState();
      if(!this.stopped) this.restart=setTimeout(()=>void this.start(), Math.min(30_000, 2000*2**Math.min(this.retries++,4)));
    };
    child.on('error',onDead); child.on('exit',onDead);
    child.stdin.on('error',()=>{});
    child.stderr.on('data',()=>{}); // Never forward potentially sensitive process logs.
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',(chunk:string)=>{
      buffer += chunk;
      if(Buffer.byteLength(buffer)>8*1024*1024) { child.kill(); return; }
      let pos;
      while((pos=buffer.indexOf('\n'))>=0) {
        const line=buffer.slice(0,pos); buffer=buffer.slice(pos+1); if(!line.trim()) continue;
        try { this.receive(JSON.parse(line)); } catch { this.lastError='Malformed App Server message received.'; }
      }
    });
    try {
      const init = await this.rpc('initialize',{clientInfo:{name:'codex_remote_web',title:'Codex Remote',version:'1.0.0'}},true);
      this.send({method:'initialized',params:{}}); this.agent=init.userAgent || 'Codex App Server';
      this.state='ready'; this.lastError=''; this.retries=0;
      for(const [threadId,turn] of this.active)if(turn.status==='unknown'){
        this.emit('event',{method:'bridge/lostTurn',params:{threadId,turnId:turn.turnId}});
        this.active.delete(threadId);this.liveTurns.delete(threadId);
      }
      this.emitState();
    } catch { if(this.child===child) child.kill(); }
  }
  emitState() { this.emit('event',{method:'bridge/state',params:{state:this.state,agent:this.agent,error:this.lastError,generation:this.generation,active:Object.fromEntries(this.active)}}); }
  send(value:any) {
    if(!this.child?.stdin.writable) throw new HttpError(503,'Codex is offline.');
    if(this.child.stdin.writableLength>2*1024*1024) throw new HttpError(503,'Codex request queue is busy.');
    this.child.stdin.write(JSON.stringify(value)+'\n');
  }
  rpc(method:string,params:any={},initial=false):Promise<any> {
    if(!initial && this.state!=='ready') return Promise.reject(new HttpError(503,'Codex is not connected.'));
    if(!initial && this.methods && !this.methods.has(method)) return Promise.reject(new HttpError(501,`Installed Codex does not advertise ${method}. Run npm run inspect after changing versions.`));
    if(this.schema) {
      let validator=this.validators.get(method);
      if(!validator) {
        const entry=this.schema.oneOf.find((e:any)=>e.properties?.method?.enum?.includes(method));
        if(!entry)return Promise.reject(new HttpError(501,`Installed Codex does not advertise ${method}.`));
        validator=this.ajv.compile({...entry.properties.params,definitions:this.schema.definitions});this.validators.set(method,validator);
      }
      if(!validator(params)) return Promise.reject(new HttpError(501,`Installed Codex protocol rejected ${method} parameters at ${validator.errors?.[0]?.instancePath || '/'}. Run npm run inspect and check compatibility.`));
    }
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new HttpError(504,'Codex request timed out; it may have been submitted. Check history before sending it again.'));},60_000);
      this.pending.set(id,{resolve,reject,timer});
      try { this.send({id,method,params}); } catch(e) { clearTimeout(timer);this.pending.delete(id);reject(e); }
    });
  }
  receive(m:any) {
    if(!m || typeof m!=='object') return;
    if('id' in m && !m.method) {
      const p=this.pending.get(m.id); if(!p) return; clearTimeout(p.timer);this.pending.delete(m.id);
      if(m.error) p.reject(new HttpError(m.error.code===-32601 ? 501 : 502, String(m.error.message || 'Codex rejected the request.'))); else p.resolve(m.result);
      return;
    }
    const params=m.params || {};
    if('id' in m && m.method) {
      if(APPROVAL_METHODS.has(m.method) || INPUT_METHODS.has(m.method)) {
        const key=`${this.generation}:${String(m.id)}`;
        this.approvals.set(key,{id:m.id,method:m.method,params});
        this.emit('event',{method:'bridge/approval',params:{key,method:m.method,params}}); return;
      }
      // Unsupported requests fail closed rather than silently granting access.
      this.send({id:m.id,error:{code:-32601,message:'This Codex Remote client does not support this approval/input method. No permission was granted.'}});
      this.emit('event',{method:'bridge/unsupported',params:{method:m.method,threadId:params.threadId}});return;
    }
    if(typeof m.method!=='string') return;
    if(m.method==='thread/started' && params.thread?.id) this.loaded.add(params.thread.id);
    if(m.method==='turn/started') this.active.set(params.threadId,{turnId:params.turn.id,status:params.turn.status || 'inProgress'});
    if(m.method==='turn/completed') {
      this.active.delete(params.threadId);
      for(const [key,a] of this.approvals) if(a.params.threadId===params.threadId) this.approvals.delete(key);
    }
    this.capture(m.method,params);
    if(m.method==='serverRequest/resolved') for(const [key,a] of this.approvals) if(a.id===params.requestId) this.approvals.delete(key);
    // No auth tokens, raw account notifications, or undocumented legacy envelopes reach the browser.
    if(/^(thread\/|turn\/|item\/|error$|serverRequest\/resolved$)/.test(m.method)) this.emit('event',{method:m.method,params});
  }
  get approvalPolicy() {
    const definition=this.schema?.definitions?.AskForApproval;
    const text=JSON.stringify(definition || '');
    if(text.includes('"untrusted"'))return 'untrusted';
    if(text.includes('"unlessTrusted"'))return 'unlessTrusted';
    throw new HttpError(501,'This installed Codex does not advertise the required approval policy.');
  }
  sandboxMode(mode:string) {
    const values=this.schema?.definitions?.SandboxMode?.enum || [];
    const choices=mode==='readOnly'?['read-only','readOnly']:['workspace-write','workspaceWrite'];
    const value=choices.find(c=>values.includes(c));if(!value)throw new HttpError(501,'Unsupported sandbox mode in installed Codex.');return value;
  }
  reviewer(method:string) {
    const entry=this.schema?.oneOf?.find((e:any)=>e.properties?.method?.enum?.includes(method));
    const name=entry?.properties?.params?.$ref?.split('/').pop();
    return this.schema?.definitions?.[name]?.properties?.approvalsReviewer?{approvalsReviewer:'user'}:{};
  }
  capture(method:string,p:any) {
    if(!p.threadId)return;
    if(method==='turn/started')this.liveTurns.set(p.threadId,{...p.turn,items:p.turn.items || []});
    let turn=this.liveTurns.get(p.threadId);
    if(!turn && method==='item/started') {turn={id:p.turnId,status:'inProgress',items:[]};this.liveTurns.set(p.threadId,turn);}
    if(!turn)return;
    if(method==='turn/completed'){Object.assign(turn,p.turn,{items:p.turn.items?.length?p.turn.items:turn.items});return;}
    if(p.turnId!==turn.id)return;
    const id=p.item?.id || p.itemId;let index=turn.items.findIndex((i:any)=>i.id===id);
    if(method==='item/started' || method==='item/completed') {
      const item={...p.item};if(typeof item.aggregatedOutput==='string')item.aggregatedOutput=item.aggregatedOutput.slice(-100_000);
      if(index<0)turn.items.push(item);else turn.items[index]=item;
    } else if(index>=0) {
      const item=turn.items[index];
      if(method==='item/agentMessage/delta' || method==='item/plan/delta')item.text=((item.text || '')+(p.delta || '')).slice(-1_000_000);
      if(method==='item/commandExecution/outputDelta')item.aggregatedOutput=((item.aggregatedOutput || '')+(p.delta || '')).slice(-100_000);
      if(method==='item/reasoning/summaryTextDelta'){item.summary ||= [];const i=p.summaryIndex || 0;item.summary[i]=((item.summary[i] || '')+(p.delta || '')).slice(-100_000);}
    }
    if(turn.items.length>500)turn.items=turn.items.slice(-500);
    while(this.liveTurns.size>32){const old=[...this.liveTurns.keys()].find(id=>!this.active.has(id));if(!old)break;this.liveTurns.delete(old);}
  }
  async listModels() {
    if(this.models.length) return this.models;
    const result=[]; let cursor:string|null=null;
    do { const page=await this.rpc('model/list',{limit:100,...(cursor?{cursor}:{})}); result.push(...(page.data || []));cursor=page.nextCursor || null; } while(cursor && result.length<500);
    this.models=result; return result;
  }
  async validateSelection(model:unknown,effort:unknown) {
    if(model==null || model==='') return;
    const found=(await this.listModels()).find(m=>m.id===model || m.model===model);
    if(!found) throw new HttpError(400,'Select a model from the installed Codex catalog.');
    if(effort && !found.supportedReasoningEfforts?.some((e:any)=>e.reasoningEffort===effort)) throw new HttpError(400,'This reasoning effort is not advertised for the selected model.');
  }
  async journal() {
    while(this.submissions.size>500) {
      const removable=[...this.submissions].find(([,v])=>v.state!=='pending');
      if(!removable) throw new HttpError(503,'Too many unresolved submissions. Inspect service history.');
      this.submissions.delete(removable[0]);
    }
    const content=JSON.stringify([...this.submissions]);
    const operation=this.persistQueue.then(async()=>{
      const p=resolve(STATE,'submissions.json'); await writeFile(p+'.tmp',content,{mode:0o600});await rename(p+'.tmp',p);
    });
    this.persistQueue=operation.catch(()=>{}); await operation;
  }
  async submitOnce(key:unknown,payload:any,action:()=>Promise<any>) {
    if(typeof key!=='string' || !/^[a-f0-9-]{36}$/.test(key)) throw new HttpError(400,'A request ID is required.');
    const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing=this.submissions.get(key);
    if(existing) {
      if(existing.fingerprint!==fingerprint) throw new HttpError(409,'This request ID was already used for a different operation.');
      if(existing.state==='done') return existing.result;
      if(existing.state==='failed') throw new HttpError(409,existing.error || 'The earlier request failed.');
      throw new HttpError(409,'This request was already submitted. Check conversation history; it will not be sent twice.');
    }
    const submission:Submission={fingerprint,state:'pending',time:Date.now()};this.submissions.set(key,submission);await this.journal();
    try { const result=await action();submission.state='done';submission.result=result;await this.journal();return result; }
    catch(e:any) {
      // Unknown delivery remains pending, including across restarts.
      if(e instanceof HttpError && ![503,504].includes(e.status)) { submission.state='failed';submission.error=e.message;await this.journal(); }
      throw e;
    }
  }
  approval(key:string, decision:any, answers:any) {
    const a=this.approvals.get(key); if(!a) throw new HttpError(409,'This request is no longer pending.');
    let result:any;
    if(APPROVAL_METHODS.has(a.method)) {
      if(!['accept','decline','cancel'].includes(decision)) throw new HttpError(400,'Only approve once, reject, or cancel are supported.');
      if(a.params.availableDecisions && !a.params.availableDecisions.includes(decision)) throw new HttpError(400,'Codex does not allow this decision.');
      result={decision};
    } else {
      if(!answers || typeof answers!=='object') throw new HttpError(400,'Provide an answer to each question.');
      const validated:Record<string,{answers:string[]}>={};
      for(const q of a.params.questions || []) {
        const answer=answers[q.id]; if(!Array.isArray(answer) || !answer.length || answer.some(v=>typeof v!=='string' || v.length>8000)) throw new HttpError(400,'Invalid question answer.');
        validated[q.id]={answers:answer};
      }
      result={answers:validated};
    }
    this.send({id:a.id,result});this.approvals.delete(key);
    this.emit('event',{method:'bridge/approvalResolved',params:{key,threadId:a.params.threadId}});
    return {ok:true};
  }
  close() { this.stopped=true;clearTimeout(this.restart);this.child?.kill('SIGTERM');setTimeout(()=>this.child?.kill('SIGKILL'),4000).unref(); }
}
