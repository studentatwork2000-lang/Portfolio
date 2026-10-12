let csrf = '';
export function setCsrf(value:string) {csrf=value;}
export class ApiError extends Error {constructor(public status:number,message:string) {super(message);}}
export async function api<T=any>(path:string,data?:any):Promise<T> {
  const response=await fetch('/api'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf,'X-Codex-Remote':'1'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const result=await response.json();if(!response.ok) throw new ApiError(response.status,result.error || 'Request failed.');return result;
}
export function saved<T>(key:string,fallback:T):T {try {const raw=localStorage.getItem('crw:'+key);return raw===null?fallback:JSON.parse(raw);} catch{return fallback;}}
export function save(key:string,value:unknown) {try{localStorage.setItem('crw:'+key,JSON.stringify(value));}catch{/* browser storage unavailable */}}
