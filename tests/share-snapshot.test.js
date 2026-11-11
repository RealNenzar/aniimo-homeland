import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {encodeSharePlan,decodeSharePlan} from '../share-plan.js';
import {createResultSnapshot,getResultSnapshot,snapshotStatus} from '../share-snapshot.js';

const state={language:'de',theme:'dark',layoutZoom:100,hours:24,calculatedAt:1700000000000,facilities:{Farmland:{count:1,level:1}},modules:{},priorities:[{id:'rv',enabled:true}]};
const rect={plot:1,name:'Farmland',recipe:'wheat',x:6,y:6,w:8,h:8};
const result={rows:[{rate:1,units:1,recipe:{id:'wheat',facility:'Farmland',yield:1,worker:{level:1},ingredients:{}}}],goals:[{key:'rv',value:1,maximum:1}],sales:[],daily:[],power:{draw:0,generators:0,output:0},planningHours:24};
const layout={layout:{plots:1,placed:[rect],unplaced:[]},climate:{placed:[],uncovered:[],complete:true},grid:{placed:[],generatorsPlaced:0,poles:0,uncovered:0,complete:true}};
test('full result and exact plot coordinates survive code and URL roundtrip',async()=>{
 const snapshot=createResultSnapshot(result,state,layout,'0.2.23');
 const url='https://example.test/#plan='+await encodeSharePlan({...state,resultSnapshot:snapshot});
 const decoded=await decodeSharePlan(url);
 assert.deepEqual(getResultSnapshot(decoded),snapshot);
 assert.deepEqual(getResultSnapshot(decoded).layout.layout.placed[0],rect);
 assert.equal(getResultSnapshot(state),null);
});
test('changed planning settings and old calculation versions are flagged',()=>{
 const snapshot=createResultSnapshot(result,state,layout,'0.2.23');
 assert.deepEqual(snapshotStatus(snapshot,{...state,language:'fr',hours:96},'0.2.23'),{settingsChanged:false,versionChanged:false});
 assert.deepEqual(snapshotStatus(snapshot,{...state,facilities:{Farmland:{count:2,level:1}}},'0.2.24'),{settingsChanged:true,versionChanged:true});
});
test('malformed or oversized result data cannot be restored',()=>{
 const snapshot=createResultSnapshot(result,state,layout,'0.2.23');
 assert.throws(()=>getResultSnapshot({resultSnapshot:{...snapshot,result:{...result,rows:[{...result.rows[0],rate:Infinity}]}}}));
 assert.throws(()=>getResultSnapshot({resultSnapshot:{...snapshot,layout:{...layout,layout:{...layout.layout,placed:[{...rect,x:79}]}}}}));
 assert.throws(()=>getResultSnapshot({resultSnapshot:{...snapshot,result:{...result,rows:new Array(10001).fill(result.rows[0])}}}));
});
test('optional undefined solver properties are omitted without masking invalid numbers',async()=>{
 const recipe={...result.rows[0].recipe,optional:undefined,worker:{...result.rows[0].recipe.worker,ability:undefined}};
 const snapshot=createResultSnapshot({...result,rows:[{...result.rows[0],recipe}]},state,layout,'0.2.23');
 assert.equal('optional' in snapshot.result.rows[0].recipe,false);
 assert.equal('ability' in snapshot.result.rows[0].recipe.worker,false);
 const decoded=await decodeSharePlan(await encodeSharePlan({...state,resultSnapshot:snapshot}));
 assert.deepEqual(getResultSnapshot(decoded),snapshot);
 assert.throws(()=>createResultSnapshot({...result,rows:[{...result.rows[0],rate:NaN}]},state,layout,'0.2.23'));
 assert.throws(()=>createResultSnapshot({...result,rows:[undefined]},state,layout,'0.2.23'));
});
