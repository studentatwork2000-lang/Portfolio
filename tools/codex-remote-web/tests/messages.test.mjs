import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeItems,userText} from '../dist-server/messages.js';
const prompt=(id,clientId,text)=>({id,type:'userMessage',clientId,content:[{type:'text',text}]});
test('partial completion preserves the submitted prompt and completed assistant item',()=>{
 const p=prompt('crw-prompt:request-1','request-1','My entire\noriginal prompt.');
 const result=mergeItems([p,{id:'a',type:'agentMessage',text:'Partial'}],[{id:'a',type:'agentMessage',text:'Complete'}]);
 assert.equal(result.length,2);assert.equal(userText(result[0]),'My entire\noriginal prompt.');assert.equal(result[1].text,'Complete');
});
test('Codex echoes replace supplemental items without duplicating user messages',()=>{
 const p=prompt('crw-prompt:request-1','request-1','Hello');const native=prompt('codex-user-1','request-1','Hello');
 const merged=mergeItems([p],[native]);assert.equal(merged.length,1);assert.equal(merged[0].id,'codex-user-1');
 assert.equal(mergeItems(merged,[p]).length,1);
 assert.equal(mergeItems([prompt('crw-prompt:legacy',null,'Hello')],[prompt('native',null,'Hello')]).length,1);
});
test('identical native messages with distinct IDs are not conflated',()=>{
 assert.equal(mergeItems([prompt('a',null,'Same text')],[prompt('b',null,'Same text')]).length,2);
});
