import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {solveWithAutoHorizon,initialHorizonFor} from '../auto-horizon.js';
import {optimize} from '../solver.js';
import {upgradeBalance,upgradeForecast} from '../upgrade-balance.js';

test('auto horizon extends until the same RV plan reaches its target',async()=>{
 const seen=[];const state={priorities:[{id:'rv',enabled:true},{id:'coins',enabled:true}],beans:0};
 const result=await solveWithAutoHorizon(state,async s=>{seen.push(s);return {goals:[{key:'rv',value:Math.min(1,s.hours/72)}]}});
 assert.equal(result.horizonStatus,'complete');assert.equal(result.planningHours,72);assert.deepEqual(seen.map(x=>x.hours),[24,72]);assert.deepEqual(seen[1].priorities,state.priorities);
});
test('recurring event budget follows each candidate horizon and is not front-loaded',async()=>{
 const seen=[];const state={event:true,eventBudgetMode:'recurring',dailyFuture:{friend:true},beans:5000,priorities:[{id:'rv',enabled:true}]};
 const result=await solveWithAutoHorizon(state,async s=>{seen.push([s.hours,s.beans]);return {goals:[{key:'rv',value:Math.min(1,s.hours/48)}]}});
 assert.deepEqual(seen,[[24,200],[48,400]]);assert.equal(result.horizonStatus,'complete');
});
test('unreached target and timeout are never presented as complete',async()=>{
 const base={priorities:[{id:'rv',enabled:true}],beans:0};let clock=0;
 const result=await solveWithAutoHorizon(base,async()=>{clock=200;return {goals:[{key:'rv',value:.2}]}},{now:()=>clock,maxMilliseconds:100});
 assert.equal(result.horizonStatus,'time_limit');assert.equal(result.planningHours,24);
 const limited=await solveWithAutoHorizon(base,async()=>({goals:[{key:'rv',value:0}]}),{maxHours:96,maxAttempts:5});
 assert.equal(limited.horizonStatus,'limit');assert.equal(limited.planningHours,96);
});
test('a disabled RV goal does not create a new one',async()=>{
 const result=await solveWithAutoHorizon({priorities:[{id:'coins',enabled:true}],beans:0},async s=>({goals:[{key:'coins',value:1}],used:s.hours}));
 assert.equal(result.horizonStatus,'not_requested');assert.equal(result.horizonIterations,1);
});
test('later RV levels start with a longer horizon without enabling any goals',()=>{
 const enabled=[{id:'rv',enabled:true}],disabled=[{id:'rv',enabled:false},{id:'coins',enabled:true}];
 assert.equal(initialHorizonFor({currentRv:3,priorities:enabled}),24);
 assert.equal(initialHorizonFor({currentRv:10,priorities:enabled}),48);
 assert.equal(initialHorizonFor({currentRv:18,priorities:enabled}),96);
 assert.equal(initialHorizonFor({currentRv:18,priorities:disabled}),24);
});
test('real optimizer solves selected goals over the extended horizon',async()=>{
 const crop={id:'wood_block',facility:'Farmland',ingredients:{},yield:1,seconds:3600,workload:0,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'none',sellValue:0,seedCost:0,byproductYield:0,eventPoints:0};
 const state={hours:24,beans:0,event:false,unverified:false,modules:{},facilities:{Farmland:{count:1,level:1,skill:1}},stock:{},targets:{wood_block:72},notes:[],special:[],priorities:[{id:'rv',enabled:true}]};
 const result=await solveWithAutoHorizon(state,s=>optimize([crop],s));
 assert.equal(result.horizonStatus,'complete');assert.ok(result.planningHours>=72);assert.ok(result.goals[0].value>=.99999);
});
test('recurring daily beans remain available over the forecast duration',()=>{
 const state={hours:24,event:true,eventBudgetMode:'recurring',dailyFuture:{friend:true},stock:{},targets:{wood_block:48}};
 const result={rows:[{rate:1,recipe:{id:'wood_block',yield:1,ingredients:{}}},{rate:1,recipe:{id:'event_crop',event:'magical_wonder_night',seedCost:4,yield:1,ingredients:{}}}],sales:[],daily:[]};
 const forecast=upgradeForecast(result,state);assert.equal(forecast.reachable,true);assert.equal(forecast.hours,48);
});
test('solver rounding at the horizon does not create a negative-zero deficit or false finite-order warning',()=>{
 const state={hours:100,stock:{},targets:{wood_block:400}};
 const result={rows:[{rate:3.9999996,recipe:{id:'wood_block',yield:1,ingredients:{}}}],sales:[],daily:[{item:'event_crop',quantity:1,completed:1}]};
 const balance=upgradeBalance(result,state)[0],forecast=upgradeForecast(result,state);
 assert.equal(balance.available,400);assert.equal(balance.difference,0);
 assert.equal(forecast.reachable,true);assert.equal(forecast.hours,100);assert.equal(forecast.extrapolated,false);
});
test('finite orders still prevent genuine extrapolation beyond the modeled period',()=>{
 const state={hours:100,stock:{},targets:{wood_block:401}};
 const result={rows:[{rate:4,recipe:{id:'wood_block',yield:1,ingredients:{}}}],sales:[],daily:[{item:'event_crop',quantity:1,completed:1}]};
 assert.deepEqual(upgradeForecast(result,state),{reachable:false,reason:'finite'});
});
