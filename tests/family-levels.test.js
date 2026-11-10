import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepare,optimize,possibleWorkerLevel,FAMILY_WORK_LEVELS} from '../solver.js';
import {recipeFamily} from '../families.js';
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
const base=()=>({autoWorkers:true,wateringMode:'none',unverified:false,event:false,modules:{resource_detector:10},facilities:{'Dewy House':{count:1,level:2},'Nimbus Bed':{count:1,level:3},'Starfall Hammock':{count:1,level:2},'Floral Windmill':{count:1,level:1},'Tidewhisper Sandcastle':{count:1,level:5},'Phonolfactory Table':{count:1,level:7}},stock:{},targets:{},notes:[],special:[],disabled:[],workerCounts:{},priorities:[]});

test('known family skills exclude unavailable levels without inferring owned counts',()=>{
 const expected={Dewy:[1,3],Celestis:[1,3,4],Iris:[1,3,4],Nimbi:[1,3,4],Flutternym:[1,3,4],Susuta:[1,2,3,4],Shelly:[1,2,3,4],Coinwisp:[1,3,4],Sugarfish:[1,3,4]};
 assert.deepEqual(FAMILY_WORK_LEVELS,expected);
 const state=base();state.workerCounts={Leisure:{1:1,2:1,3:1,4:1}};
 const prepared=prepare(catalog,state);
 for(const [family,levels] of Object.entries(expected)){
  const actual=[...new Set(prepared.filter(r=>recipeFamily(r)===family).map(r=>r.worker.skill))].sort();
  assert.deepEqual(actual,levels,`${family} should only use known levels`);
 }
});

test('default level three works for all families without requiring owned roster data',()=>{
 const prepared=prepare(catalog,base());
 for(const family of Object.keys(FAMILY_WORK_LEVELS))assert.ok(prepared.some(r=>recipeFamily(r)===family&&r.worker.skill===3),family);
});

test('level four Leisure cannot operate Dewy House, but can operate other valid families',()=>{
 const state=base();state.workerCounts={Leisure:{4:1}};const prepared=prepare(catalog,state);
 assert.ok(!prepared.some(r=>r.facility==='Dewy House'));
 assert.ok(prepared.some(r=>r.facility==='Nimbus Bed'&&r.worker.skill===4));
});

test('Perfumery only has levels one and three, but electric mode does not need an Aniimo',()=>{
 const state=base();state.workerCounts={Perfumery:{1:1,2:1,3:1,4:1}};
 const prepared=prepare(catalog,state).filter(r=>r.facility==='Phonolfactory Table');
 assert.deepEqual([...new Set(prepared.map(r=>r.worker.skill))].sort(),[1,3]);
 state.workerCounts={Perfumery:{4:1}};state.power={enabled:true,efficiencyPercent:120};
 const electric=prepare(catalog,state).filter(r=>r.facility==='Phonolfactory Table');
 assert.ok(electric.length);assert.ok(electric.every(r=>r.worker.electric));
 assert.equal(possibleWorkerLevel({id:'star',facility:'Starfall Hammock'},'Leisure',2),false);
});

test('Dewy leisure and Perfumery share a family count, while electric Perfumery needs no family member',async()=>{
 const recipe=(id,facility,extra={})=>({id,facility,ingredients:{},yield:1,seconds:0,workload:60,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'none',sellValue:0,seedCost:0,byproductYield:0,eventPoints:0,...extra});
 const recipes=[recipe('aromathyst','Dewy House'),recipe('perfume','Phonolfactory Table',{ingredients:{aromathyst:1},sellCurrency:'coins',sellValue:100})];
 const state=base();Object.assign(state,{hours:1,currentRv:12,familyCounts:{Dewy:1},priorities:[{id:'coins',enabled:true}]});
 let result=await optimize(recipes,state);
 assert.equal(result.goals[0].value,0);
 state.familyCounts.Dewy=2;result=await optimize(recipes,state);
 assert.ok(result.goals[0].value>0);
 assert.equal(result.rows.filter(r=>!r.recipe.worker.electric).length,2);
 state.familyCounts.Dewy=1;state.power={enabled:true,module:1,level:1,watts:600,efficiencyPercent:120};
 result=await optimize(recipes,state);
 assert.ok(result.goals[0].value>0);
 assert.ok(result.rows.some(r=>r.recipe.facility==='Phonolfactory Table'&&r.recipe.worker.electric));
});

test('event coin allowance is not used by an earlier reserve priority',async()=>{
 const recipe=(id,extra={})=>({id,facility:'Farmland',ingredients:{},yield:1,seconds:3600,workload:0,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'none',sellValue:0,seedCost:0,byproductYield:0,eventPoints:0,...extra});
 const state=base();Object.assign(state,{hours:1,event:true,beans:100,facilities:{Farmland:{count:10,level:1}},reserveTargets:{wood_block:2},eventCoinTolerance:.1,reserveCoinTolerance:0,priorities:[{id:'coins',enabled:true},{id:'reserve',enabled:true},{id:'event',enabled:true}]});
 const recipes=[recipe('crop',{sellCurrency:'coins',sellValue:100}),recipe('wood_block'),recipe('pumpkin',{event:'magical_wonder_night',eventPoints:1})];
 const result=await optimize(recipes,state);
 assert.ok(result.goals.find(g=>g.key==='reserve').maximum<1e-5);
 assert.ok(result.goals.find(g=>g.key==='event').value>.9);
});

test('event coin allowance becomes available to daily orders only at their selected priority',async()=>{
 const recipe=(id,extra={})=>({id,facility:'Farmland',ingredients:{},yield:1,seconds:3600,workload:0,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'none',sellValue:0,seedCost:0,byproductYield:0,eventPoints:0,...extra});
 const state=base();Object.assign(state,{hours:1,event:true,beans:100,facilities:{Farmland:{count:10,level:1}},reserveTargets:{wood_block:2},eventCoinTolerance:.1,reserveCoinTolerance:0,daily:[{item:'pumpkin',count:1,quantity:1,priority:true}],priorities:[{id:'coins',enabled:true},{id:'reserve',enabled:true},{id:'daily',enabled:true},{id:'event',enabled:true}]});
 const recipes=[recipe('crop',{sellCurrency:'coins',sellValue:100}),recipe('wood_block'),recipe('pumpkin',{event:'magical_wonder_night',eventPoints:1})];
 const result=await optimize(recipes,state);
 assert.ok(result.goals.find(g=>g.key==='reserve').maximum<1e-5);
 assert.equal(result.daily[0].completed,1);
 assert.ok(result.goals.find(g=>g.key==='coins').value>=899.99);
});
