import test from 'node:test';
import assert from 'node:assert/strict';
import {turnElapsedMs,formatDuration} from '../dist-server/timing.js';
test('live time uses native Unix seconds, includes pauses, and clamps clock skew',()=>{
  assert.equal(turnElapsedMs({status:'inProgress',startedAt:100},162345),62345);
  assert.equal(turnElapsedMs({status:'inProgress',startedAt:100},95000),0);
  assert.equal(turnElapsedMs({status:'inProgress',startedAt:null}),null);
});
test('completed, interrupted, and failed durations stay fixed and prefer native precision',()=>{
  for(const status of ['completed','interrupted','failed']){
    const turn={status,startedAt:100,completedAt:163,durationMs:62345};
    assert.equal(turnElapsedMs(turn,200000),62345);assert.equal(turnElapsedMs(turn,900000),62345);
    assert.equal(turnElapsedMs({...turn,durationMs:null}),63000);
  }
  assert.equal(turnElapsedMs({status:'completed',durationMs:0}),0);
  assert.equal(turnElapsedMs({status:'unknown',startedAt:100}),null);
});
test('unknown or invalid historical times are not invented and durations format across hours',()=>{
  assert.equal(turnElapsedMs({status:'completed'}),null);
  assert.equal(turnElapsedMs({status:'completed',durationMs:NaN}),null);
  assert.equal(turnElapsedMs({status:'inProgress',startedAt:Infinity}),null);
  assert.equal(formatDuration(0),'0m 00s');assert.equal(formatDuration(62345),'1m 02s');
  assert.equal(formatDuration(3723999),'1h 02m 03s');
});
