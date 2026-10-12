import {useCallback,useEffect,useRef,useState,memo,FormEvent,Fragment} from 'react';
import {api,ApiError,save,saved,setCsrf} from './api';
import {Icon} from './icons';
import {Copy,Markdown} from './Markdown';
import {Approval,Item,Model,Status,Thread,Turn,WireEvent} from './types';
import {reduceEvents} from './timeline';
import {userText} from '../server/messages';
import {turnElapsedMs} from '../server/timing';
import {TurnDuration} from './TurnDuration';

const title=(t:Thread)=>t.name || t.preview?.slice(0,90) || 'New conversation';
const threadPath=(id:string)=>'/threads/'+encodeURIComponent(id);
function Logo() {return <span className="logo"><Icon name="terminal" size={21}/></span>;}
function Dialog({title:heading,close,children}:{title:string;close:()=>void;children:React.ReactNode}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  return <dialog ref={dialog} className="modal" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="modal-heading"><h2>{heading}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><Icon name="close"/></button></div>{children}</dialog>;
}
const ToolItem=memo(function ToolItem({item}:{item:Item}) {
  let label='Activity',icon='bolt';
  if(item.type==='commandExecution'){label=item.command || 'Command';icon='terminal';}
  else if(item.type==='fileChange'){label=`${item.changes?.length || 0} file change${item.changes?.length===1?'':'s'}`;icon='file';}
  else if(item.type==='reasoning'){label='Thinking';}
  else if(item.type==='mcpToolCall'){label=`${item.server || 'Tool'} · ${item.tool || ''}`;}
  else if(item.type==='webSearch'){label=item.query || 'Web search';icon='search';}
  else if(item.type==='contextCompaction'){label='Conversation context compacted';}
  else {label=item.tool || item.type.replace(/([A-Z])/g,' $1');}
  return <details className="tool-item"><summary><Icon name={icon} size={16}/><span>{label}</span><span className={'tool-status '+(item.status || '')}>{item.status==='inProgress'?'Running':item.status || ''}</span><Icon name="down" size={15}/></summary><div className="tool-body">
    {item.cwd && <div className="muted tool-cwd">{item.cwd}</div>}
    {item.type==='commandExecution' && <><pre>{item.aggregatedOutput || (item.status==='inProgress'?'Waiting for output…':'No output.')}</pre>{item.exitCode!=null && <small>Exit code {item.exitCode}</small>}</>}
    {item.type==='fileChange' && item.changes?.map((change,i)=><div key={i}><p className="file-name">{change.path}</p><pre className="diff">{change.diff}</pre></div>)}
    {item.type==='reasoning' && <p>{item.summary?.join('\n') || 'Codex is working.'}</p>}
    {!['commandExecution','fileChange','reasoning'].includes(item.type) && <pre>{JSON.stringify(item.result || item.arguments || item.error || {status:item.status},null,2)?.slice(0,100_000)}</pre>}
  </div></details>;
});
const Message=memo(function Message({item,streaming}:{item:Item;streaming:boolean}) {
  if(item.type==='userMessage') {const text=userText(item);return <article className="message user"><div className="user-bubble">{text}</div><Copy text={text}/></article>;}
  if(item.type==='agentMessage' || item.type==='plan')return <article className={'message assistant '+(streaming?'streaming':'')}><Markdown text={item.text || ''} streaming={streaming}/>{!streaming && <Copy text={item.text || ''}/>}</article>;
  return <ToolItem item={item}/>;
});
function ApprovalCard({approval,complete}:{approval:Approval;complete:(key:string,decision?:string,answers?:any)=>Promise<void>}) {
  const [answers,setAnswers]=useState<Record<string,string[]>>({});const [pending,setPending]=useState(false);
  const input=approval.method.includes('requestUserInput');const network=approval.params.networkApprovalContext;
  const submit=async(decision?:string)=>{setPending(true);try{await complete(approval.key,decision,answers);}finally{setPending(false);}};
  const allowed=approval.params.availableDecisions;
  return <section className="approval"><div className="approval-title"><Icon name={input?'bolt':'shield'} size={20}/><strong>{input?'Codex needs your input':network?'Network access requested':'Your approval is needed'}</strong></div>
    {approval.params.reason && <p>{approval.params.reason}</p>}
    {network && <pre>{network.protocol}://{network.host}</pre>}
    {approval.params.command && <pre>{approval.params.command}</pre>}
    {approval.params.cwd && <small className="muted">{approval.params.cwd}</small>}
    {approval.method==='item/fileChange/requestApproval' && <p>Review the proposed changes in the file activity above.</p>}
    {input ? <form onSubmit={e=>{e.preventDefault();void submit();}}>{approval.params.questions?.map(q=><fieldset key={q.id}><legend>{q.question}</legend>{q.options?.map(option=><label className="answer-choice" key={option.label}><input type="radio" name={q.id} value={option.label} required={!answers[q.id]?.[0]} onChange={()=>setAnswers(a=>({...a,[q.id]:[option.label]}))}/><span>{option.label}<small>{option.description}</small></span></label>)}<input className="field" type={q.isSecret?'password':'text'} aria-label={'Answer: '+q.question} placeholder={q.options?.length?'Or write an answer':'Your answer'} onChange={e=>setAnswers(a=>({...a,[q.id]:[e.target.value]}))}/></fieldset>)}<button className="primary" disabled={pending || !approval.params.questions?.every(q=>answers[q.id]?.[0]?.trim())}>Submit answer</button></form>:
    <div className="approval-actions">{(!allowed || allowed.includes('decline')) && <button className="secondary" disabled={pending} onClick={()=>void submit('decline')}>Reject</button>}{(!allowed || allowed.includes('cancel')) && <button className="secondary" disabled={pending} onClick={()=>void submit('cancel')}>Cancel turn</button>}{(!allowed || allowed.includes('accept')) && <button className="primary" disabled={pending} onClick={()=>void submit('accept')}>Approve once</button>}</div>}
  </section>;
}
function Login({onLogin}:{onLogin:()=>void}) {
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await api('/login',{password});setCsrf(r.csrf);setPassword('');onLogin();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  return <div className="login-page"><form className="login-card" onSubmit={submit}><Logo/><h1>Welcome to Codex Remote</h1><p>Your Codex workspace, from any browser.</p><label htmlFor="password">App passphrase</label><input id="password" className="field" type="password" autoComplete="current-password" autoFocus value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary" disabled={busy}>{busy?'Signing in…':'Continue'}</button>{error && <p role="alert" className="error-text">{error}</p>}<small>Use the passphrase you chose during setup.<br/>This is your personal controller for Codex.</small></form></div>;
}
export default function App() {
  const [auth,setAuth]=useState<boolean|null>(null);const [status,setStatus]=useState<Status|null>(null);
  const [threads,setThreads]=useState<Thread[]>([]);const [cursor,setCursor]=useState<string|null>(null);
  const [models,setModels]=useState<Model[]>([]);const [model,setModel]=useState(saved('model',''));
  const [effort,setEffort]=useState(saved('effort',''));const [mode,setMode]=useState(saved('mode','readOnly'));
  const [cwd,setCwd]=useState(saved('workspace',''));const [selected,setSelected]=useState<string|null>(saved('thread',null));
  const selectedRef=useRef(selected);selectedRef.current=selected;
  const [thread,setThread]=useState<Thread|null>(null);const [turns,setTurns]=useState<Turn[]>([]);
  const [loadedByController,setLoadedByController]=useState(false);
  const [before,setBefore]=useState(0);const [visible,setVisible]=useState(80);const [approvals,setApprovals]=useState<Approval[]>([]);
  const [draft,setDraft]=useState(saved('draft:'+selected,''));const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
  const [sidebar,setSidebar]=useState(saved('sidebar',true));const [search,setSearch]=useState('');const [searchOpen,setSearchOpen]=useState(false);
  const [settings,setSettings]=useState(false);const [rename,setRename]=useState<Thread|null>(null);const [renameText,setRenameText]=useState('');
  const [menu,setMenu]=useState<string|null>(null);const [toast,setToast]=useState('');const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [connected,setConnected]=useState(false);const [showBottom,setShowBottom]=useState(false);const [resumeConsent,setResumeConsent]=useState(false);
  const [active,setActive]=useState<Record<string,{turnId:string;status:string}>>({});
  const scroll=useRef<HTMLDivElement>(null);const textarea=useRef<HTMLTextAreaElement>(null);const stick=useRef(true);
  const queue=useRef<WireEvent[]>([]);const readVersion=useRef(0);const pendingSubmission=useRef<{id:string;text:string;threadId:string}|null>(null);
  const snapshotCursor=useRef('');
  const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),7000);},[]);
  const handleError=useCallback((error:any)=>{if(error instanceof ApiError && error.status===401)setAuth(false);notify(error.message || 'Connection failed.');},[notify]);
  const list=useCallback(async(append=false,next?:string|null)=>{try{const r=await api('/threads'+(next?'?cursor='+encodeURIComponent(next):''));setThreads(old=>append?[...old,...r.data.filter((t:Thread)=>!old.some(o=>o.id===t.id))]:r.data);setCursor(r.nextCursor || null);}catch(e){handleError(e);}},[handleError]);
  const syncThread=useCallback(async(id:string)=>{
    const version=++readVersion.current;setLoading(true);
    try {const r=await api(threadPath(id));if(version!==readVersion.current || selectedRef.current!==id)return;
      snapshotCursor.current=r.eventCursor || '';setLoadedByController(r.loadedByController);setThread(r.thread);setTurns(r.thread.turns || []);setBefore(Math.max(0,r.totalTurns-(r.thread.turns?.length || 0)));setVisible(80);
      setActive(old=>{const next={...old};if(r.active)next[id]=r.active;else delete next[id];return next;});
    } catch(e){if(version===readVersion.current)handleError(e);} finally{if(version===readVersion.current)setLoading(false);}
  },[handleError]);
  const refresh=useCallback(async()=>{
    try {const s:Status=await api('/status');setStatus(s);setActive(s.active);
      if(!s.workspaces.some(w=>w.path===cwd)){setCwd(s.workspaces[0]?.path || '');}
      if(s.state==='ready'){
        const r=await api('/models');setModels(r.data);
        if(!r.data.some((m:Model)=>m.model===model || m.id===model)){const m=r.data.find((m:Model)=>m.isDefault) || r.data[0];setModel(m?.model || '');setEffort(m?.defaultReasoningEffort || '');}
        await list();
      }
    } catch(e){handleError(e);}
  },[cwd,model,list,handleError]);
  const refreshRef=useRef(refresh);refreshRef.current=refresh;
  const syncRef=useRef(syncThread);syncRef.current=syncThread;
  useEffect(()=>{void api('/session').then(s=>{setAuth(s.authenticated);if(s.csrf)setCsrf(s.csrf);}).catch(handleError);},[handleError]);
  useEffect(()=>{
    if(!auth)return;
    void refreshRef.current();
    const events=new EventSource('/api/events');
    events.onopen=()=>{setConnected(true);};
    events.onerror=()=>{setConnected(false);};
    events.onmessage=e=>{
      const event:WireEvent={...JSON.parse(e.data),cursor:e.lastEventId};const {method,params:p}=event;
      if(method==='bridge/resync'){if(selectedRef.current)void syncRef.current(selectedRef.current);void refreshRef.current();return;}
      if(method==='bridge/snapshot' || method==='bridge/state'){
        setStatus(s=>s?{...s,state:p.state,agent:p.agent,error:p.error}:s);setActive(p.active || {});
        if(method==='bridge/snapshot')setApprovals(p.approvals || []);
        if(method==='bridge/state' && p.state==='ready')void refreshRef.current();return;
      }
      if(method==='bridge/approval'){setApprovals(a=>[...a.filter(x=>x.key!==p.key),p]);return;}
      if(method==='bridge/approvalResolved'){setApprovals(a=>a.filter(x=>x.key!==p.key));return;}
      if(method==='serverRequest/resolved'){setApprovals(a=>a.filter(x=>!x.key.endsWith(':'+String(p.requestId))));return;}
      if(method==='bridge/unsupported'){notify(`Codex requested an unsupported interaction (${p.method}). Nothing was approved.`);return;}
      if(method==='bridge/lostTurn'){notify('The Codex process stopped, ending its running turn. Check the saved history before starting new work.');if(selectedRef.current===p.threadId)void syncRef.current(p.threadId);return;}
      if(method==='turn/started')setActive(a=>({...a,[p.threadId]:{turnId:p.turn.id,status:p.turn.status}}));
      if(method==='turn/completed'){
        setActive(a=>{const n={...a};delete n[p.threadId];return n;});setApprovals(a=>a.filter(x=>x.params.threadId!==p.threadId));
        void list();if(p.turn.status==='failed')notify(p.turn.error?.message || 'Codex turn failed.');
      }
      if(method==='error')notify(p.error?.message || 'Codex reported an error.');
      if(method==='thread/archived')setThreads(t=>t.filter(x=>x.id!==p.threadId));
      if(method==='thread/name/updated')setThreads(t=>t.map(x=>x.id===p.threadId?{...x,name:p.threadName}:x));
      queue.current.push(event);
    };
    const timer=setInterval(()=>{if(!queue.current.length)return;const snapshot=snapshotCursor.current.split(':');const batch=queue.current.splice(0).filter(e=>{const cursor=(e.cursor || '').split(':');return cursor[0]!==snapshot[0] || Number(cursor[1])>Number(snapshot[1]);});const id=selectedRef.current;if(id && batch.length)setTurns(t=>reduceEvents(t,batch,id));},50);
    return()=>{events.close();clearInterval(timer);queue.current=[];setConnected(false);};
  },[auth,handleError,list,notify]);
  useEffect(()=>{save('thread',selected);setDraft(saved('draft:'+selected,''));setResumeConsent(false);pendingSubmission.current=saved('pending:'+selected,null);snapshotCursor.current='';stick.current=true;setShowBottom(false);setTurns([]);setThread(null);if(auth && selected)void syncThread(selected);else setLoading(false);},[selected,auth,syncThread]);
  useEffect(()=>{save('model',model);save('effort',effort);save('mode',mode);save('workspace',cwd);save('sidebar',sidebar);},[model,effort,mode,cwd,sidebar]);
  useEffect(()=>{const element=textarea.current;if(element){element.style.height='auto';element.style.height=Math.min(element.scrollHeight,220)+'px';}},[draft]);
  useEffect(()=>{if(stick.current && scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[turns,approvals,selected]);
  useEffect(()=>{function key(e:KeyboardEvent){if((e.ctrlKey || e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='o'){e.preventDefault();setSelected(null);}if(e.key==='Escape'){setMenu(null);setSearchOpen(false);}}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  const changeDraft=(text:string)=>{setDraft(text);save('draft:'+selectedRef.current,text);};
  const currentModel=models.find(m=>m.model===model || m.id===model);
  const workspaceInfo=status?.workspaces.find(w=>w.path===(thread?.cwd || cwd));
  const running=selected?active[selected]:null;
  const runningTurn=running?turns.find(t=>t.id===running.turnId):undefined;
  const ready=connected && status?.state==='ready' && status.account?.authenticated!==false;
  const needsConsent=selected && thread && !loadedByController && !resumeConsent;
  async function send(){
    if(busy || !draft.trim() || !ready || running)return;
    if(needsConsent){notify('Confirm that this saved conversation is no longer running in another CLI or controller.');return;}
    setBusy(true);stick.current=true;let id=selected;const text=draft;
    try {
      if(!id){const createId=saved<string|null>('createRequest',null) || crypto.randomUUID();save('createRequest',createId);const r=await api('/threads',{requestId:createId,cwd,model,mode});save('createRequest',null);id=r.thread.id;selectedRef.current=id;save('draft:'+id,text);setSelected(id);setThread(r.thread);}
      if(!id)throw new Error('Conversation was not created.');
      if(!pendingSubmission.current || pendingSubmission.current.text!==text || pendingSubmission.current.threadId!==id)pendingSubmission.current={id:crypto.randomUUID(),text,threadId:id};
      const requestId=pendingSubmission.current.id;save('pending:'+id,pendingSubmission.current);
      const accepted=await api(threadPath(id)+'/turn',{requestId,text,model,effort,mode,confirmSavedSession:resumeConsent});
      if(selectedRef.current===id){setLoadedByController(true);setTurns(t=>reduceEvents(t,[{method:'bridge/promptAccepted',params:{threadId:id,turnId:accepted.turn.id,item:accepted.prompt}}],id!));setDraft('');pendingSubmission.current=null;}
      save('draft:'+id,'');save('draft:null','');save('pending:'+id,null);await list();
    }catch(e){handleError(e);}finally{setBusy(false);}
  }
  async function stop(){if(!selected)return;try{await api(threadPath(selected)+'/interrupt',{});}catch(e){handleError(e);}}
  async function approve(key:string,decision?:string,answers?:any){try{await api('/approvals',{key,decision,answers});}catch(e){handleError(e);}}
  async function loadOlder(){if(!selected || !before)return;setLoading(true);const height=scroll.current?.scrollHeight || 0;
    try{const r=await api(threadPath(selected)+'/history?before='+before);setTurns(t=>[...r.turns,...t]);setBefore(r.before);setVisible(v=>v+80);requestAnimationFrame(()=>{if(scroll.current)scroll.current.scrollTop+=scroll.current.scrollHeight-height;});}catch(e){handleError(e);}finally{setLoading(false);}}
  async function archive(t:Thread){setMenu(null);try{await api(threadPath(t.id)+'/archive',{});setThreads(list=>list.filter(x=>x.id!==t.id));if(selected===t.id)setSelected(null);}catch(e){handleError(e);}}
  const items=turns.flatMap(t=>t.items.map(item=>({item,turn:t})));const shown=items.slice(-visible);
  if(auth===null)return <div className="boot" role="status">Connecting to Codex Remote…</div>;
  if(!auth)return <Login onLogin={()=>setAuth(true)}/>;
  return <div className={'app '+(sidebar?'sidebar-open':'sidebar-closed')}>
    {sidebar && <button className="sidebar-scrim" aria-label="Dismiss sidebar overlay" onClick={()=>setSidebar(false)}/>}
    <aside className="sidebar"><div className="sidebar-top"><button className="brand-button" onClick={()=>setSelected(null)} title="Codex Remote"><Logo/><span>Codex Remote</span></button><button className="icon-button" onClick={()=>setSidebar(false)} aria-label="Close sidebar"><Icon name="panel"/></button></div>
      <nav className="sidebar-nav"><button onClick={()=>{setSelected(null);if(innerWidth<760)setSidebar(false);}}><Icon name="compose"/><span>New chat</span><kbd>Ctrl ⇧ O</kbd></button><button onClick={()=>{setSearchOpen(v=>!v);setSearch('');}}><Icon name="search"/><span>Search chats</span></button></nav>
      {searchOpen && <div className="search-box"><input autoFocus placeholder="Search loaded conversations" aria-label="Search conversations" value={search} onChange={e=>setSearch(e.target.value)}/></div>}
      <div className="history"><div className="history-label">Chats</div>{threads.filter(t=>title(t).toLowerCase().includes(search.toLowerCase())).map(t=><div className={'history-row '+(selected===t.id?'selected':'')} key={t.id}><button className="history-title" onClick={()=>{setSelected(t.id);if(innerWidth<760)setSidebar(false);}} title={title(t)}>{active[t.id] && <span className="tiny-pulse"/>}{title(t)}</button><button className="icon-button history-menu-button" aria-label={'Actions for '+title(t)} onClick={()=>setMenu(menu===t.id?null:t.id)}><Icon name="dots" size={18}/></button>{menu===t.id && <div className="history-menu"><button onClick={()=>{setRename(t);setRenameText(title(t));setMenu(null);}}>Rename</button><button onClick={()=>void archive(t)}>Archive</button></div>}</div>)}{!threads.length && <p className="history-empty">Your saved conversations will appear here.</p>}{cursor && <button className="load-more" onClick={()=>void list(true,cursor)}>Load more chats</button>}</div>
      <button className="sidebar-footer" onClick={()=>setSettings(true)}><span className="avatar">CR</span><span><strong>Personal workspace</strong><small><span className={'status-dot '+(ready?'online':'')}/>{ready?'Codex connected':status?.state==='connecting'?'Connecting to Codex':'Codex unavailable'}</small></span><Icon name="settings" size={18}/></button>
    </aside>
    <main className="main"><header className="topbar"><div>{!sidebar && <button className="icon-button" onClick={()=>setSidebar(true)} aria-label="Open sidebar"><Icon name="panel"/></button>}<span className="app-title">Codex Remote</span><Icon name="down" size={17}/></div><div className="header-right"><span className="private-label"><Icon name="shield" size={14}/>Personal controller</span><button className="avatar small-avatar" aria-label="Open settings" onClick={()=>setSettings(true)}>CR</button></div></header>
      {status?.state!=='ready' && <div className="connection-banner" role="status">{status?.state==='connecting'?'Connecting to your Codex process…':'Codex is unavailable. Check that your Codespace and service are running.'}<button onClick={()=>void refresh()}>Retry</button></div>}
      {status?.account?.authenticated===false && <div className="connection-banner warning">Codex is not signed in. Run <code>codex login</code> in your Codespace, then restart this service.</div>}
      <div className={'conversation '+(!selected?'empty':'')} ref={scroll} onScroll={()=>{const e=scroll.current!;stick.current=e.scrollHeight-e.scrollTop-e.clientHeight<110;setShowBottom(!stick.current);}}>
        {!selected ? <div className="welcome"><h1>What are we working on?</h1><p>Pick a workspace. Let Codex take it from here.</p></div>:
        <div className="messages">{loading && !items.length && <p className="muted loading-text">Loading conversation…</p>}
          {before>0 && <button className="load-more older" onClick={()=>void loadOlder()} disabled={loading}>Load earlier turns</button>}
          {items.length>visible && <button className="load-more older" onClick={()=>setVisible(v=>v+80)}>Show earlier messages</button>}
          {shown.map(({item,turn},index)=><Fragment key={turn.id+':'+item.id}><Message item={item} streaming={turn.status==='inProgress' && (item.type==='agentMessage' || item.type==='plan')}/>{turn.status!=='inProgress' && shown[index+1]?.turn.id!==turn.id && turnElapsedMs(turn)!=null && <div className="worked"><Icon name="bolt" size={14}/><TurnDuration turn={turn}/></div>}</Fragment>)}
          {turns.filter(t=>t.status==='failed' || t.status==='interrupted').map(t=><div className="turn-notice" key={t.id}>{t.status==='failed'?'Turn failed: '+(t.error?.message || 'Codex could not finish this turn.'):'You stopped this response.'}</div>)}
          {running && <div className="working"><span className="working-dot"/>{running.status==='unknown'?'Execution state is uncertain after a disconnection. Check history before retrying.':<><span>{runningTurn?.status==='inProgress' && turnElapsedMs(runningTurn)!=null?<TurnDuration turn={runningTurn}/>:'Codex is working…'}</span>{approvals.some(a=>a.params.threadId===selected) && <span>· Waiting for your input</span>}</>}</div>}
          {approvals.filter(a=>a.params.threadId===selected).map(a=><ApprovalCard key={a.key} approval={a} complete={approve}/>)}
          {!items.length && !loading && !running && <p className="muted loading-text">This conversation is ready for your next prompt.</p>}
        </div>}
      </div>
      <div className={'composer-zone '+(!selected?'home-composer':'')}>
        {showBottom && <button className="jump-bottom icon-button" aria-label="Scroll to bottom" onClick={()=>{stick.current=true;scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}><Icon name="down"/></button>}
        {needsConsent && <label className="resume-consent"><input type="checkbox" checked={resumeConsent} onChange={e=>setResumeConsent(e.target.checked)}/>I have stopped any other CLI or controller using this saved conversation.</label>}
        <form className="composer" onSubmit={e=>{e.preventDefault();void send();}}><textarea ref={textarea} value={draft} placeholder="Message Codex" aria-label="Message Codex" rows={1} maxLength={120000} onChange={e=>changeDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
          <div className="composer-toolbar"><div className="composer-options"><div className="select-wrap model-select"><select aria-label="Model" value={model} disabled={!models.length || busy || !!running} title="Catalog visibility does not guarantee model access" onChange={e=>{setModel(e.target.value);setEffort(models.find(m=>m.model===e.target.value)?.defaultReasoningEffort || '');}}>{!models.length && <option value="">Model unavailable</option>}{models.map(m=><option key={m.id} value={m.model || m.id}>{m.displayName || m.model}</option>)}</select><Icon name="down" size={13}/></div>
            {!!currentModel?.supportedReasoningEfforts?.length && <div className="select-wrap effort-select"><select aria-label="Reasoning effort" value={effort} disabled={busy || !!running} onChange={e=>setEffort(e.target.value)}><option value="">Default effort</option>{currentModel.supportedReasoningEfforts.map(e=><option key={e.reasoningEffort} value={e.reasoningEffort}>{e.reasoningEffort}</option>)}</select><Icon name="down" size={12}/></div>}
          </div>{running && running.status!=='unknown'?<button type="button" className="send-button" onClick={()=>void stop()} aria-label="Stop generation"><Icon name="stop" size={18}/></button>:<button className="send-button" disabled={!draft.trim() || busy || !ready || !!running || !!needsConsent} aria-label="Send message"><Icon name="arrow" size={20}/></button>}</div>
        </form>
        <div className="composer-meta"><div className="workspace-control"><Icon name="folder" size={13}/>{selected?<span title={thread?.cwd}>{workspaceInfo?.name || thread?.cwd || 'Loading workspace'}</span>:<select aria-label="Workspace" value={cwd} onChange={e=>setCwd(e.target.value)} disabled={busy}>{status?.workspaces.map(w=><option value={w.path} key={w.path}>{w.name}</option>)}</select>}{workspaceInfo?.branch && <span className="branch">· {workspaceInfo.branch}</span>}</div><div className="permission-control"><Icon name="shield" size={13}/><select aria-label="Permission mode" value={mode} disabled={busy || !!running} title={mode==='fullAccess'?'Full access to files and network in this Codespace. Commands run without approval prompts.':'Unknown commands require approval. Network access is restricted.'} onChange={e=>setMode(e.target.value)}><option value="readOnly">Read only</option><option value="workspaceWrite">Workspace edits</option><option value="fullAccess">Full access</option></select></div></div>
        <p className="footer-note">Runs in your workspace. Review important changes.</p>
      </div>
    </main>
    {toast && <div className="toast" role="alert">{toast}<button className="icon-button" onClick={()=>setToast('')} aria-label="Dismiss notification"><Icon name="close" size={16}/></button></div>}
    {settings && <Dialog title="Settings & connection" close={()=>setSettings(false)}><div className="settings-content"><div className="setting-row"><span>Codex</span><strong>{status?.state || 'Unknown'}</strong></div><p className="muted version">{status?.agent || 'App Server has not connected yet.'}</p><div className="setting-row"><span>Sign-in</span><strong>{status?.account?.type || 'Not signed in'}{status?.account?.planType?' · '+status.account.planType:''}</strong></div><div className="setting-row"><span>Installed protocol checked</span><strong>{status?.protocolChecked?'Yes':'Run npm run inspect'}</strong></div><h3>Workspaces</h3>{status?.workspaces.map(w=><div className="settings-workspace" key={w.path}><strong>{w.name}</strong><code>{w.path}</code><small>{w.branch || 'No Git branch'}</small></div>)}<h3>When you close the browser</h3><p>Work continues while this service and your Codespace remain running. Reopen the same URL to reconnect. A Codespace shutdown or service restart ends running work; saved conversations remain available.</p><p>Saved CLI conversations can be resumed. This controller cannot attach to an independently running CLI turn.</p><p className="muted">Model choices come from Codex’s catalog. A successful turn confirms access. This is an independently built personal controller.</p><button className="secondary" onClick={()=>void refresh()}>Refresh connection</button><button className="secondary logout" onClick={()=>void api('/logout',{}).then(()=>{setCsrf('');setAuth(false);setSettings(false);}).catch(handleError)}><Icon name="logout" size={17}/>Sign out</button></div></Dialog>}
    {rename && <Dialog title="Rename conversation" close={()=>setRename(null)}><form className="rename-form" onSubmit={e=>{e.preventDefault();void api(threadPath(rename.id)+'/rename',{name:renameText}).then(()=>{setRename(null);void list();}).catch(handleError);}}><input className="field" aria-label="Conversation title" autoFocus maxLength={120} value={renameText} onChange={e=>setRenameText(e.target.value)} required/><button className="primary">Save</button></form></Dialog>}
  </div>;
}
