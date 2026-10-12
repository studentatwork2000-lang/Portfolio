import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Bridge} from '../dist-server/bridge.js';
const schema=JSON.parse(await readFile(new URL('./protocol-schema.json',import.meta.url),'utf8'));
test('Full Access fails visibly if the installed protocol lacks either required setting',()=>{
  const bridge=new Bridge({});bridge.schema=structuredClone(schema);
  assert.equal(bridge.approvalPolicy('fullAccess'),'never');assert.equal(bridge.sandboxMode('fullAccess'),'danger-full-access');
  bridge.schema.definitions.AskForApproval={enum:['on-request','untrusted'],type:'string'};
  assert.throws(()=>bridge.approvalPolicy('fullAccess'),e=>e.status===501);
  bridge.schema.definitions.SandboxMode.enum=['read-only','workspace-write'];
  assert.throws(()=>bridge.sandboxMode('fullAccess'),e=>e.status===501);
});
