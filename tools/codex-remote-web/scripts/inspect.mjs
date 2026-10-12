import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const exec=promisify(execFile);
let config={};try{config=JSON.parse(await readFile(resolve(root,'config.local.json'),'utf8'));}catch{}
const binary=process.env.CODEX_REMOTE_BINARY || config.codexPath || 'codex';
const folder=resolve(root,'.runtime','protocol');await mkdir(folder,{recursive:true,mode:0o700});
try{
  const version=(await exec(binary,['--version'],{timeout:10000})).stdout.trim();
  await exec(binary,['app-server','generate-json-schema','--out',folder],{timeout:45000,maxBuffer:1024*1024});
  const content=await readFile(resolve(folder,'ClientRequest.json'),'utf8');const schema=JSON.parse(content);
  const methods=schema.oneOf?.flatMap(e=>e.properties?.method?.enum || []) || [];
  const required=['initialize','account/read','model/list','thread/list','thread/read','thread/start','thread/resume','turn/start','turn/interrupt'];
  const missing=required.filter(m=>!methods.includes(m));if(missing.length)throw new Error('Missing required protocol methods: '+missing.join(', '));
  await writeFile(resolve(root,'.runtime','protocol.json'),JSON.stringify({version,methods,sha256:createHash('sha256').update(content).digest('hex'),generatedAt:new Date().toISOString()},null,2),{mode:0o600});
  console.log(JSON.stringify({codex:version,executable:binary,node:process.version,platform:os.platform(),ramGiB:Math.round(os.totalmem()/1024**3),codespace:process.env.CODESPACE_NAME || null,workspaces:config.workspaces || [],coreMethodsVerified:true,optionalMethods:{rename:methods.includes('thread/name/set'),archive:methods.includes('thread/archive')},note:'Authentication, saved sessions, and model entitlement are checked by the running service; credentials are never read by this script.'},null,2));
}catch(e){console.error('Protocol inspection failed: '+e.message+'\nInstall or select your existing Codex executable; this script does not upgrade it.');process.exitCode=1;}
