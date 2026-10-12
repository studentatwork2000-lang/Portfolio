import {Turn,WireEvent} from './types';
const LIMIT=100_000;
export function reduceEvents(previous:Turn[],events:WireEvent[],threadId:string) {
  let turns=previous.slice();
  for(const {method,params:p} of events) {
    if(p.threadId!==threadId)continue;
    if(method==='turn/started' || method==='turn/completed') {
      const index=turns.findIndex(t=>t.id===p.turn.id);
      if(index<0)turns.push({...p.turn,items:p.turn.items || []});
      else turns[index]={...turns[index],...p.turn,items:p.turn.items?.length?p.turn.items:turns[index].items};
      continue;
    }
    if(!method.startsWith('item/'))continue;
    let index=turns.findIndex(t=>t.id===p.turnId);
    if(index<0) {turns.push({id:p.turnId,status:'inProgress',items:[]});index=turns.length-1;}
    const turn={...turns[index],items:turns[index].items.slice()};turns[index]=turn;
    const itemId=p.item?.id || p.itemId;let i=turn.items.findIndex(item=>item.id===itemId);
    if(method==='item/started' || method==='item/completed') {
      if(i<0)turn.items.push(p.item);else turn.items[i]={...turn.items[i],...p.item};continue;
    }
    if(i<0 && method==='item/agentMessage/delta') {turn.items.push({id:itemId,type:'agentMessage',text:''});i=turn.items.length-1;}
    if(i<0)continue;
    const item={...turn.items[i]};turn.items[i]=item;
    if(method==='item/agentMessage/delta' || method==='item/plan/delta') item.text=(item.text || '')+(p.delta || '');
    if(method==='item/commandExecution/outputDelta') item.aggregatedOutput=((item.aggregatedOutput || '')+(p.delta || '')).slice(-LIMIT);
    if(method==='item/reasoning/summaryTextDelta') {
      item.summary=(item.summary || []).slice();const s=p.summaryIndex || 0;item.summary[s]=(item.summary[s] || '')+(p.delta || '');
    }
  }
  return turns;
}
