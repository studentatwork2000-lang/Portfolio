#!/usr/bin/env node
// Protocol fixture ONLY. Production configuration must point to the installed codex binary.
import {createInterface} from 'node:readline';
import {readFileSync,writeFileSync} from 'node:fs';
const path=process.env.MOCK_STORE;let threads={};let counter=0;const timers=new Map();
try{threads=JSON.parse(readFileSync(path,'utf8'));}catch{threads={'saved_cli':{id:'saved_cli',name:'Saved CLI fixture',preview:'A saved test conversation',cwd:process.env.MOCK_WORKSPACE,createdAt:1,updatedAt:1,status:{type:'notLoaded'},turns:[{id:'old-turn',status:'completed',items:[{id:'old-user',type:'userMessage',content:[{type:'text',text:'Previous CLI prompt'}]},{id:'old-agent',type:'agentMessage',text:'Stored CLI fixture response.'}]}]}};}
const persist=()=>{if(path)writeFileSync(path,JSON.stringify(threads));};
const send=m=>process.stdout.write(JSON.stringify(m)+'\n');
const event=(method,params)=>send({method,params});
const answer=(id,result)=>send({id,result});
const requests=new Map();
async function handle(m){
  if(!m.method){const entry=requests.get(m.id);if(entry){requests.delete(m.id);finish(entry,m.result?.decision==='accept'?'Approved test command.':'Rejected test command.');}return;}
  const p=m.params || {};const thread=threads[p.threadId];
  switch(m.method){
    case 'initialize':answer(m.id,{userAgent:'TEST FIXTURE — no model inference'});break;
    case 'initialized':break;
    case 'account/read':answer(m.id,{account:{type:'chatgpt',planType:'test'},requiresOpenaiAuth:true});break;
    case 'model/list':answer(m.id,{data:[{id:'test-model',model:'test-model',displayName:'Test fixture model',isDefault:true,defaultReasoningEffort:'medium',supportedReasoningEfforts:[{reasoningEffort:'medium',description:'Test'},{reasoningEffort:'high',description:'Test'}]}],nextCursor:null});break;
    case 'thread/list':answer(m.id,{data:Object.values(threads).map(t=>({...t,turns:[]})),nextCursor:null});break;
    case 'thread/read':if(thread)answer(m.id,{thread:{...thread,turns:p.includeTurns?thread.turns.map(t=>({...t,items:t.items[0]?.content?.[0]?.text?.includes('sparse-history')?t.items.filter(i=>i.type!=='userMessage'):t.items})):[]}});else send({id:m.id,error:{code:-32000,message:'Thread not found.'}});break;
    case 'thread/start':{
      const id='created_'+Date.now()+'_'+counter++;const t={id,name:null,preview:'',cwd:p.cwd,createdAt:Date.now()/1000,updatedAt:Date.now()/1000,status:{type:'idle'},turns:[],fixturePermissions:{method:m.method,approvalPolicy:p.approvalPolicy,sandbox:p.sandbox}};threads[id]=t;persist();event('thread/started',{thread:t});answer(m.id,{thread:t,model:p.model || 'test-model'});break;
    }
    case 'thread/resume':thread.status={type:'idle'};thread.fixturePermissions={method:m.method,approvalPolicy:p.approvalPolicy,sandbox:p.sandbox};persist();event('thread/started',{thread});answer(m.id,{thread});break;
    case 'turn/start':{
      const turn={id:'turn_'+counter++,status:'inProgress',items:[],fixturePermissions:{approvalPolicy:p.approvalPolicy,sandboxPolicy:p.sandboxPolicy}};thread.turns.push(turn);thread.preview=p.input[0].text;thread.updatedAt=Date.now()/1000;persist();
      const entry={thread,turn,text:p.input[0].text};event('turn/started',{threadId:thread.id,turn});answer(m.id,{turn});
      const user={id:turn.id+'_user',type:'userMessage',clientId:p.clientUserMessageId || null,content:p.input};turn.items.push(user);
      if(!entry.text.includes('sparse-events')){event('item/started',{threadId:thread.id,turnId:turn.id,item:user});event('item/completed',{threadId:thread.id,turnId:turn.id,item:user});}
      if(entry.text.includes('approval') && p.approvalPolicy!=='never'){
        const item={id:turn.id+'_cmd',type:'commandExecution',command:'printf harmless',cwd:thread.cwd,status:'inProgress',aggregatedOutput:''};turn.items.push(item);event('item/started',{threadId:thread.id,turnId:turn.id,item});
        const id=500+counter++;requests.set(id,entry);send({id,method:'item/commandExecution/requestApproval',params:{kind:'command',threadId:thread.id,turnId:turn.id,itemId:item.id,startedAtMs:Date.now(),environmentId:null,command:item.command,cwd:thread.cwd,reason:'Harmless protocol-fixture approval.'}});
      }else if(entry.text.includes('unsupported')){
        send({id:900,method:'item/permissions/requestApproval',params:{threadId:thread.id,turnId:turn.id,itemId:'unsupported',permissions:{network:{enabled:true}}}});
        finish(entry,'Unsupported approval fixture finished.');
      }else{const slow=entry.text.includes('slow');const chunks=entry.text.includes('long')?Array.from({length:150},(_,i)=>'Stream '+i+' · ').concat(['\n\nFinished.']):['Here is a ','streamed test response.\n\n','```javascript\nconst value = 42;\n```\n\n','| Check | Result |\n|---|---|\n| Streaming | Works |\n\n','<img src=x onerror="window.pwned=1"><script>window.pwned=2</script>'];stream(entry,chunks,slow?350:10);}
      break;
    }
    case 'turn/interrupt':{
      clearTimeout(timers.get(p.turnId));const turn=thread.turns.find(t=>t.id===p.turnId);turn.status='interrupted';persist();event('turn/completed',{threadId:thread.id,turn});answer(m.id,{});break;
    }
    case 'thread/name/set':thread.name=p.name;persist();event('thread/name/updated',{threadId:thread.id,threadName:p.name});answer(m.id,{});break;
    case 'thread/archive':delete threads[p.threadId];persist();event('thread/archived',{threadId:p.threadId});answer(m.id,{});break;
    default:send({id:m.id,error:{code:-32601,message:'Unknown fixture method'}});
  }
}
function finish(entry,text){stream(entry,[text],10);}
function stream(entry,chunks,delay){const {thread,turn}=entry;const item={id:turn.id+'_agent',type:'agentMessage',text:''};turn.items.push(item);event('item/started',{threadId:thread.id,turnId:turn.id,item});let i=0;
 const tick=()=>{if(turn.status!=='inProgress')return;if(i<chunks.length){const delta=chunks[i++];item.text+=delta;event('item/agentMessage/delta',{threadId:thread.id,turnId:turn.id,itemId:item.id,delta});persist();timers.set(turn.id,setTimeout(tick,delay));}else{turn.status='completed';persist();event('item/completed',{threadId:thread.id,turnId:turn.id,item});event('turn/completed',{threadId:thread.id,turn:entry.text.includes('sparse-events')?{...turn,items:turn.items.filter(i=>i.type!=='userMessage')}:turn});}};timers.set(turn.id,setTimeout(tick,delay));}
createInterface({input:process.stdin}).on('line',line=>{try{void handle(JSON.parse(line));}catch(e){send({id:0,error:{code:-32000,message:e.message}});}});
