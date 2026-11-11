import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {gzipSync} from 'node:zlib';
import {decodeSharePlan,encodeSharePlan,sharePlanFromHash} from '../share-plan.js';

const plan={language:'de',facilities:{Mine:{count:2,level:3}},modules:{ecological_module:4},priorities:[{id:'rv',enabled:true}],label:'🌱 Heimat · здоровье · été'};
test('compressed share code and URL fragment preserve the full plan',async()=>{
 const code=await encodeSharePlan(plan);assert.match(code,/^hp1[gj][A-Za-z0-9_-]+$/);
 assert.deepEqual(await decodeSharePlan(code),plan);
 assert.deepEqual(await decodeSharePlan(`#plan=${code}`),plan);
 assert.deepEqual(await decodeSharePlan(`https://example.test/planner/#plan=${code}`),plan);
 assert.equal(sharePlanFromHash(`#tab=result&plan=${code}`),code);
});
test('uncompressed fallback works without a CompressionStream',async()=>{
 const original=globalThis.CompressionStream;
 try{globalThis.CompressionStream=undefined;const code=await encodeSharePlan(plan);assert.match(code,/^hp1j/);assert.deepEqual(await decodeSharePlan(code),plan)}
 finally{globalThis.CompressionStream=original}
});
test('invalid and oversized share codes cannot be imported',async()=>{
 await assert.rejects(()=>decodeSharePlan('hp1j@@@@'));
 await assert.rejects(()=>decodeSharePlan('hp1j'+'A'.repeat(3*1024*1024)));
 await assert.rejects(()=>encodeSharePlan({facilities:{},modules:{},priorities:[],text:'a'.repeat(2*1024*1024)}));
 await assert.rejects(()=>encodeSharePlan({facilities:{},modules:{},priorities:{}}));
 const malicious=JSON.parse('{"facilities":{},"modules":{},"priorities":[],"__proto__":{"polluted":true}}');
 await assert.rejects(()=>encodeSharePlan(malicious));
 const bomb='hp1g'+gzipSync(Buffer.alloc(2*1024*1024+1,65)).toString('base64url');
 await assert.rejects(()=>decodeSharePlan(bomb),/too large/);
});
