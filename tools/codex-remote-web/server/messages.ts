// Pure timeline helpers shared by the browser and the server. No process or filesystem access.
export type MessageItem = {id:string;type:string;clientId?:string|null;content?:{type:string;text?:string}[]};
export function userText(item:MessageItem):string {
  return (item.content || []).filter(c=>c.type==='text' || c.type==='input_text').map(c=>c.text || '').join('\n');
}
function controllerPrompt(item:MessageItem) {return item.type==='userMessage' && item.id.startsWith('crw-prompt:');}
function sameItem(a:MessageItem,b:MessageItem) {
  if(a.id===b.id)return true;
  if(a.type!=='userMessage' || b.type!=='userMessage')return false;
  if(a.clientId && b.clientId)return a.clientId===b.clientId;
  // Older Codex versions do not echo client IDs. Only match a supplemental
  // controller item to its real Codex counterpart, never two native messages.
  return controllerPrompt(a)!==controllerPrompt(b) && userText(a)===userText(b);
}
export function mergeItems<T extends MessageItem>(known:T[]=[],incoming:T[]=[]):T[] {
  const result=known.slice();
  for(const item of incoming) {
    const index=result.findIndex(old=>sameItem(old,item));
    if(index<0) {if(controllerPrompt(item))result.unshift(item);else result.push(item);continue;}
    const old=result[index];
    // Native Codex IDs win over supplemental IDs. A sparse lifecycle event
    // cannot erase an already known prompt's content.
    const next=controllerPrompt(item) && !controllerPrompt(old)?{...item,...old}:{...old,...item};
    if(item.type==='userMessage' && !next.content?.length)next.content=old.content?.length?old.content:item.content;
    result[index]=next;
  }
  return result;
}
