import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {Writable} from 'node:stream';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const args=process.argv.slice(2);
let config={};try{config=JSON.parse(await readFile(resolve(root,'config.local.json'),'utf8'));}catch{}
let muted=false;const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
try{
  const paths=args.filter(p=>!p.startsWith('--'));
  let workspaces=paths.length?await Promise.all(paths.map(p=>realpath(p))):config.workspaces;
  if(!workspaces?.length){const p=await rl.question('Absolute path to your workspace: ');workspaces=[await realpath(p.trim())];}
  if(!config.password || args.includes('--reset-password')){
    if(!process.stdin.isTTY)throw new Error('Setup needs an interactive terminal to enter a private app passphrase.');
    process.stdout.write('Choose an app passphrase (12+ characters; input hidden): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');
    if(password.length<12 || password.length>256)throw new Error('Use a passphrase between 12 and 256 characters.');
    process.stdout.write('Confirm passphrase (input hidden): ');muted=true;const confirm=await rl.question('');muted=false;process.stdout.write('\n');
    if(password!==confirm)throw new Error('Passphrases do not match.');
    const salt=randomBytes(32).toString('hex');config.password={salt,hash:scryptSync(password,salt,64).toString('hex')};
  }
  const testWorkspace=resolve(root,'.runtime','test-workspace');await mkdir(testWorkspace,{recursive:true,mode:0o700});
  workspaces=[...new Set([...workspaces,testWorkspace])];
  config={port:8787,host:'127.0.0.1',origins:[],codexPath:'codex',...config,workspaces};
  await mkdir(resolve(root,'.runtime'),{recursive:true,mode:0o700});
  await writeFile(resolve(root,'config.local.json'),JSON.stringify(config,null,2),{mode:0o600});
  console.log('Configuration saved. Inspecting your installed Codex protocol…');
  const check=spawnSync(process.execPath,[resolve(root,'scripts/inspect.mjs')],{stdio:'inherit'});
  if(check.status!==0)throw new Error('Fix the reported protocol check before starting.');
  if(process.env.CODESPACE_NAME){
    const name=process.env.CODESPACE_NAME;
    const port=spawnSync('gh',['codespace','ports','visibility',`${config.port}:private`,'--codespace',name],{encoding:'utf8'});
    if(port.error || port.status!==0)console.log('Before using the app, forward port '+config.port+' in the Codespaces Ports panel and confirm its visibility is Private.');
    else console.log('Requested private visibility for port '+config.port+'. Verify it in the Codespaces Ports panel.');
    console.log('Dashboard URL: https://'+name+'-'+config.port+'.'+(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'));
  }
  console.log('Build once: npm run build\nStart in background: npm run service -- start');
}catch(e){muted=false;console.error(e.message);process.exitCode=1;}finally{rl.close();}
