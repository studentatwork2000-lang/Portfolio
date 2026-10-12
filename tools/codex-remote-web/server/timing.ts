export type TurnTiming = {status:string;startedAt?:number|null;completedAt?:number|null;durationMs?:number|null};
const valid=(value:unknown):value is number=>typeof value==='number' && Number.isFinite(value) && value>=0;
// Codex timestamps use Unix seconds; durationMs is already in milliseconds.
export function turnElapsedMs(turn:TurnTiming,nowMs=Date.now()):number|null {
  if(turn.status==='inProgress')return valid(turn.startedAt)?Math.max(0,nowMs-turn.startedAt*1000):null;
  if(!['completed','failed','interrupted'].includes(turn.status))return null;
  if(valid(turn.durationMs))return turn.durationMs;
  if(valid(turn.startedAt) && valid(turn.completedAt))return Math.max(0,(turn.completedAt-turn.startedAt)*1000);
  return null;
}
export function formatDuration(ms:number) {
  const seconds=Math.floor(Math.max(0,ms)/1000);const hours=Math.floor(seconds/3600);
  const minutes=Math.floor(seconds/60)%60;const remainder=String(seconds%60).padStart(2,'0');
  return hours?`${hours}h ${String(minutes).padStart(2,'0')}m ${remainder}s`:`${minutes}m ${remainder}s`;
}
