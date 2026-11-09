import test from 'node:test';
import assert from 'node:assert/strict';
import {speed,model,optimize} from '../solver.js';

const f={count:1,level:1,skill:1,bonus:false};
const recipe=(id,facility,extra={})=>({id,facility,ingredients:{},yield:1,seconds:60,workload:0,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'coins',sellValue:0,seedCost:0,byproductYield:0,eventPoints:0,...extra});
const state=()=>({hours:1,beans:0,event:false,unverified:false,modules:{},facilities:{Farmland:f,'Claw Game Cooker':f},stock:{},targets:{},notes:[],special:[],priorities:[{id:'coins',enabled:true}]});
test('crop timers ignore skill and personality',()=>{assert.equal(speed(recipe('wheat','Farmland',{seconds:2400}),{skill:4,bonus:true}),2400)});
test('processing speed accounts for skill and personality',()=>{assert.equal(speed(recipe('bread','Claw Game Cooker',{seconds:0,workload:34}),{skill:4,bonus:false}),6.8)});
test('solver shares ingredients and respects processor capacity',async()=>{
 const recipes=[recipe('crop','Farmland',{yield:8,seconds:60}),recipe('food','Claw Game Cooker',{ingredients:{crop:8},sellValue:10})];
 const result=await optimize(recipes,state());
 assert.ok(Math.abs(result.goals[0].value-600)<0.01);
 assert.equal(result.rows.length,2);
});
test('event seeds have finite separate budget',()=>{
 const s=state();s.event=true;s.beans=8;s.hours=1;
 const p=model([recipe('magic_pumpkin','Farmland',{event:'magical_wonder_night',yield:8,seedCost:4,eventPoints:1})],s,[],'event');
 assert.match(p.lp,/beans:.*4\.00000000000 x0 <= 8/);
});
test('missing material cannot be fabricated',async()=>{
 const result=await optimize([recipe('food','Claw Game Cooker',{ingredients:{missing:1},sellValue:10})],state());
 assert.equal(result.goals[0].value,0);
});
test('RV progress cannot be created when target item is missing',async()=>{
 const s=state();s.targets={unobtainium:100};s.priorities=[{id:'rv',enabled:true}];
 const result=await optimize([recipe('crop','Farmland')],s);
 assert.equal(result.goals[0].value,0);
});
test('one woodworking bench can share time between tiers',async()=>{
 const s=state();s.facilities={'Woodworking Bench':f};s.stock={wood_block:16};s.targets={plank:1};s.priorities=[{id:'rv',enabled:true}];
 const result=await optimize([recipe('lumber','Woodworking Bench',{ingredients:{wood_block:8},sellCurrency:'none'}),recipe('plank','Woodworking Bench',{ingredients:{lumber:2},sellCurrency:'none'})],s);
 assert.ok(result.goals[0].value>.99);
 assert.equal(result.rows.length,2);
});
test('nineteen cocoa plots produce the expected wood block rate',async()=>{
 const s=state();s.facilities={Woodland:{...f,count:19}};s.priorities=[{id:'wood',enabled:true}];
 const cocoa=recipe('cocoa','Woodland',{seconds:2400,byproductYield:122});
 const result=await optimize([cocoa],s);
 assert.ok(Math.abs(result.goals[0].value-3477)<.001);
});
test('higher event priority is kept when optimizing coins',async()=>{
 const s=state();s.event=true;s.beans=4;s.priorities=[{id:'event',enabled:true},{id:'coins',enabled:true}];
 const recipes=[recipe('pumpkin','Farmland',{event:'magical_wonder_night',seconds:3600,yield:8,eventPoints:1,seedCost:4}),recipe('wheat','Farmland',{seconds:3600,sellValue:100})];
 const result=await optimize(recipes,s);
 assert.ok(result.rows.some(r=>r.recipe.id==='pumpkin'));
 assert.ok(result.goals[0].value>9.99);
});
