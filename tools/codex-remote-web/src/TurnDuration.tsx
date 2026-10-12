import {memo,useEffect,useState} from 'react';
import {Turn} from './types';
import {formatDuration,turnElapsedMs} from '../server/timing';

export const TurnDuration=memo(function TurnDuration({turn}:{turn:Turn}) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    if(turn.status!=='inProgress' || turn.startedAt==null)return;
    const update=()=>setNow(Date.now());update();
    const interval=setInterval(update,1000);document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',update);};
  },[turn.status,turn.startedAt]);
  const elapsed=turnElapsedMs(turn,now);if(elapsed==null)return null;
  const label=turn.status==='inProgress'?'Working for':turn.status==='interrupted'?'Stopped after':turn.status==='failed'?'Failed after':'Worked for';
  return <span className="turn-duration" role="timer" aria-live="off" data-duration-ms={elapsed}>{label} {formatDuration(elapsed)}</span>;
});
