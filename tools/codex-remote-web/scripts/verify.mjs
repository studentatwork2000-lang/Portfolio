import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(resolve(root,'config.local.json'),'utf8'));
const origin=`http://127.0.0.1:${config.port}`;let cookie='',csrf='';
if(!process.stdin.isTTY)throw new Error('Run this check from an interactive terminal.');
let muted=false;const output=new Writable({write(c,e,cb){if(!muted)process.stdout.write(c);cb();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
async function api(path,data){const response=await fetch(origin+'/api'+path,{method:data===undefined?'GET':'POST',headers:{Cookie:cookie,...(data===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-Codex-Remote':'1','X-CSRF-Token':csrf})},...(data===undefined?{}:{body:JSON.stringify(data)})});const value=await response.json();if(!response.ok)throw new Error(value.error);if(path==='/login'){cookie=response.headers.get('set-cookie').split(';')[0];csrf=value.csrf;}return value;}
try{
  process.stdout.write('App passphrase (input hidden): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');
  await api('/login',{password});const status=await api('/status');
  console.log('App authentication: passed\nApp Server: '+status.state+'\nProtocol checked: '+status.protocolChecked);
  if(status.state!=='ready')throw new Error(status.error || 'App Server is not ready.');
  console.log('Codex sign-in: '+(status.account?.authenticated?'available':'not signed in'));
  const models=await api('/models');const threads=await api('/threads');
  console.log('Model catalog entries: '+models.data.length+' (catalog only; not proof of model entitlement)');
  console.log('Saved conversation summaries returned: '+threads.data.length+' on first page');
  console.log('Configured workspaces: '+status.workspaces.length);
  if(!process.argv.includes('--live')){console.log('Read-only checks complete. For a real disposable-file/inference test, run npm run verify -- --live.');}
  else{
    if(!status.account?.authenticated)throw new Error('Codex is not authenticated. Complete codex login in the Codespace first.');
    const cwd=resolve(root,'.runtime','test-workspace');if(!config.workspaces.includes(cwd))throw new Error('Run setup to add the isolated verification workspace.');
    const created=await api('/threads',{requestId:randomUUID(),cwd,mode:'workspaceWrite'});const threadId=created.thread.id;
    const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),120000);
    const response=await fetch(origin+'/api/events',{headers:{Cookie:cookie},signal:abort.signal});
    let resolveDone,rejectDone;const done=new Promise((r,j)=>{resolveDone=r;rejectDone=j;});done.catch(()=>{});let deltas=0,buffer='';
    const listener=(async()=>{try{for await(const chunk of response.body){buffer+=new TextDecoder().decode(chunk);let i;while((i=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,i);buffer=buffer.slice(i+2);const line=block.split('\n').find(l=>l.startsWith('data: '));if(!line)continue;const event=JSON.parse(line.slice(6));if((event.params?.threadId || event.params?.params?.threadId)!==threadId)continue;if(event.method==='item/agentMessage/delta')deltas++;if(event.method==='bridge/approval')console.log('Approval requested. Open the dashboard and review it. Nothing is automatically approved.');if(event.method==='turn/completed'){resolveDone(event.params.turn);return;}}}}catch(e){rejectDone(new Error('Live verification timed out or disconnected. Inspect this conversation in the dashboard before retrying.'));}})();
    try{
      await api('/threads/'+threadId+'/turn',{requestId:randomUUID(),mode:'workspaceWrite',text:'In the current disposable verification workspace, create verification.txt containing exactly codex-remote-ok. Do not read or edit anything outside this workspace. Then report completion.'});
      const turn=await done;if(turn.status!=='completed')throw new Error('Codex turn ended with '+turn.status);
      const file=(await readFile(resolve(cwd,'verification.txt'),'utf8')).trim();if(file!=='codex-remote-ok')throw new Error('Verification file did not contain the expected result.');
      console.log('Real inference and file execution: passed\nAgent text delta events: '+deltas+'\nDisposable file verified on disk: '+resolve(cwd,'verification.txt'));
    }finally{clearTimeout(timer);abort.abort();await listener.catch(()=>{});}
  }
}catch(e){muted=false;console.error('Verification incomplete: '+e.message);process.exitCode=1;}finally{rl.close();if(cookie)await api('/logout',{}).catch(()=>{});}
