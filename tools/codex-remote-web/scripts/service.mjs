import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,open,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const dir=resolve(process.env.CODEX_REMOTE_STATE_PATH || resolve(root,'.runtime'));
const configPath=process.env.CODEX_REMOTE_CONFIG || resolve(root,'config.local.json');
const pidFile=resolve(dir,'service.json');const entry=resolve(root,'dist-server/index.js');
const action=process.argv[2] || 'status';
await mkdir(dir,{recursive:true,mode:0o700});
async function current(){
  try{const info=JSON.parse(await readFile(pidFile,'utf8'));if(!Number.isInteger(info.pid) || info.pid<=0 || !info.instanceId || !info.port)return null;process.kill(info.pid,0);
    const health=await fetch(`http://127.0.0.1:${info.port}/health`,{signal:AbortSignal.timeout(1000)});const value=await health.json();return value.instanceId===info.instanceId?info:null;
  }catch{return null;}
}
async function stop(){const info=await current();if(!info){console.log('Service is stopped.');return;}process.kill(info.pid,'SIGTERM');
  const deadline=Date.now()+6500;while(Date.now()<deadline){if(!await current())break;await new Promise(r=>setTimeout(r,200));}
  if(await current())throw new Error('Service did not stop. Inspect it before starting another instance.');
  await rm(pidFile,{force:true});console.log('Service stopped. Running turns ended.');}
async function start(){if(await current()){console.log('Service is already running.');return;}
  await readFile(entry);const config=JSON.parse(await readFile(configPath,'utf8'));const instanceId=randomUUID();
  const log=await open(resolve(dir,'service.log'),'a',0o600);
  const child=spawn(process.execPath,[entry],{cwd:root,env:{...process.env,CODEX_REMOTE_INSTANCE_ID:instanceId},detached:true,stdio:['ignore',log.fd,log.fd]});
  await new Promise((done,reject)=>{child.once('spawn',done);child.once('error',reject);});
  child.unref();await writeFile(pidFile,JSON.stringify({pid:child.pid,instanceId,port:config.port,startedAt:new Date().toISOString()}),{mode:0o600});await log.close();
  let running=false;for(let i=0;i<30;i++){if(await current()){running=true;break;}await new Promise(r=>setTimeout(r,100));}
  if(!running)throw new Error('Service failed to start. Check .runtime/service.log.');
  console.log('Service started in background (PID '+child.pid+'). Closing the editor or browser does not stop it.');
  console.log('Local health: http://127.0.0.1:'+config.port+'/health');
  if(process.env.CODESPACE_NAME)console.log('Dashboard: https://'+process.env.CODESPACE_NAME+'-'+config.port+'.'+(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'));
  console.log('Confirm that the forwarded port visibility is Private.');}
try{
  if(action==='start')await start();else if(action==='stop')await stop();else if(action==='restart'){await stop();await start();}
  else if(action==='status'){const info=await current();console.log(info?'Running: PID '+info.pid+', since '+info.startedAt:'Stopped.');}
  else throw new Error('Usage: npm run service -- start|stop|restart|status');
}catch(e){console.error(e.message);process.exitCode=1;}
