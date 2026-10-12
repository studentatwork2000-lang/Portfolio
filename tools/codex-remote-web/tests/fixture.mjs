import {mkdir,writeFile,readFile,chmod,rm} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {resolve} from 'node:path';
export async function fixture(name,port,password){
 const root=resolve(import.meta.dirname,'..');const dir=resolve(root,'.runtime',name);const workspace=resolve(dir,'workspace');const state=resolve(dir,'state');
 await mkdir(workspace,{recursive:true});await mkdir(resolve(state,'protocol'),{recursive:true});
 await rm(resolve(dir,'store.json'),{force:true});await rm(resolve(state,'submissions.json'),{force:true});
 const schema=JSON.parse(await readFile(resolve(root,'tests/protocol-schema.json'),'utf8'));
 await writeFile(resolve(state,'protocol/ClientRequest.json'),JSON.stringify(schema));await writeFile(resolve(state,'protocol.json'),JSON.stringify({methods:schema.oneOf.flatMap(e=>e.properties.method.enum)}));
 const salt=randomBytes(32).toString('hex');const configPath=resolve(dir,'config.json');
 await writeFile(configPath,JSON.stringify({port,host:'127.0.0.1',origins:[],workspaces:[workspace],password:{salt,hash:scryptSync(password,salt,64).toString('hex')},codexPath:resolve(root,'tests/mock-codex.mjs')}));
 await chmod(resolve(root,'tests/mock-codex.mjs'),0o755);
 return {workspace,configPath,env:{...process.env,CODEX_REMOTE_CONFIG:configPath,CODEX_REMOTE_STATE_PATH:state,MOCK_WORKSPACE:workspace,MOCK_STORE:resolve(dir,'store.json')}};
}
