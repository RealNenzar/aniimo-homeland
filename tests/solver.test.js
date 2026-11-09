import test from 'node:test';
import assert from 'node:assert/strict';
import {speed,model,optimize} from '../solver.js';
import {powerSummary,poleLimit} from '../power.js';
import {presetFacilities} from '../facilities.js';
import {layoutPlan,placePower,PLOT_GRID} from '../layout.js';
import {translate} from '../i18n.js';

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
test('four seven-second benches can process a 2318 block harvest in about 8.45 minutes',()=>{
 const minutes=2318*7/(4*8*60);
 assert.ok(Math.abs(minutes-8.45)<0.01);
});
test('higher event priority is kept when optimizing coins',async()=>{
 const s=state();s.event=true;s.beans=4;s.priorities=[{id:'event',enabled:true},{id:'coins',enabled:true}];
 const recipes=[recipe('pumpkin','Farmland',{event:'magical_wonder_night',seconds:3600,yield:8,eventPoints:1,seedCost:4}),recipe('wheat','Farmland',{seconds:3600,sellValue:100})];
 const result=await optimize(recipes,s);
 assert.ok(result.rows.some(r=>r.recipe.id==='pumpkin'));
 assert.ok(result.goals[0].value>9.99);
});
test('RV preset chooses unlocked counts and levels',()=>{
 const defs=[{name:'Woodland',counts:[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],unlocks:{1:2,2:4,3:7,4:11,5:14,6:18}}];
 assert.deepEqual(presetFacilities(18,defs).Woodland.groups[0],{count:19,level:6,skill:1,bonus:false});
});
test('electric supply is capped at 120 percent and uses facility level draw',()=>{
 const s={currentRv:18,power:{enabled:true,module:4,level:4,watts:1200},facilities:{'Woodworking Bench':{groups:[{count:4,level:4,electric:true}]}}};
 assert.deepEqual(powerSummary(s),{draw:240,output:1200,count:1,needed:1,maxCount:3,efficiency:1.2,maxOutput:1200});
 assert.equal(poleLimit(4),24);
 assert.ok(Math.abs(speed(recipe('lumber','Woodworking Bench',{seconds:0,workload:34,abilityLevel:2}),{electric:true,powerEfficiency:1.2})-34/1.5)<1e-9);
});
test('electric shortage slows production',()=>{
 const s={currentRv:12,power:{enabled:true,module:1,level:1,watts:600},facilities:{Mine:{groups:[{count:5,level:6,electric:true}]}}};
 assert.ok(Math.abs(powerSummary(s).efficiency-2/3)<1e-9);
 assert.equal(powerSummary(s).count,1);
 assert.equal(powerSummary(s).needed,2);
});
test('facility groups enforce their own levels',async()=>{
 const s=state();s.facilities={Farmland:{groups:[{...f,count:1,level:1},{...f,count:1,level:2}]}};
 const result=await optimize([recipe('low','Farmland',{sellValue:1}),recipe('high','Farmland',{facilityLevel:2,sellValue:2})],s);
 assert.ok(Math.abs(result.goals[0].value-180)<.01);
});
test('automatic power mode uses only the required generators for a reachable target',async()=>{
 const s=state();s.currentRv=18;s.autoWorkers=true;s.power={enabled:true,module:4,level:4,watts:1200};
 s.facilities={'Woodworking Bench':{groups:[{count:1,level:1}]}};s.stock={wood_block:1000};s.targets={rough_lumber:10};s.priorities=[{id:'rv',enabled:true}];
 const lumber=recipe('rough_lumber','Woodworking Bench',{seconds:0,workload:34,abilityLevel:2,ingredients:{wood_block:8},sellCurrency:'none'});
 const result=await optimize([lumber],s);
 assert.ok(result.rows.some(row=>row.recipe.worker.electric));
 assert.equal(result.power.generators,1);
 assert.equal(result.power.draw,15);
});
test('layout follows image plot order and keeps rectangles inside purchased plots',()=>{
 assert.deepEqual(PLOT_GRID[3],[10,2,1,5]);
 const result=layoutPlan([{recipe:{facility:'Woodland',group:0,worker:{electric:false},id:'cocoa'},units:19,shared:false}],1);
 assert.equal(result.placed.length,15);
 assert.equal(result.unplaced.length,4);
 for(const x of result.placed) assert.ok(x.plot===1&&x.x+x.w<=40&&x.y+x.h<=30);
});
test('power layout places a connected generator for a nearby electric facility',()=>{
 const layout=layoutPlan([{recipe:{facility:'Woodworking Bench',group:0,worker:{electric:true},id:'rough_lumber'},units:1,shared:false}],1);
 const grid=placePower(layout,1,6);
 assert.equal(grid.generatorsPlaced,1);
 assert.equal(grid.uncovered,0);
 assert.equal(grid.complete,true);
});
test('power layout reports a missing generator when no plots are free',()=>{
 const layout={plots:1,placed:[{plot:1,x:0,y:0,w:40,h:30,electric:true}]};
 const grid=placePower(layout,1,6);
 assert.equal(grid.generatorsPlaced,0);
 assert.equal(grid.complete,false);
});
test('interface translations cover all four languages',()=>{
 assert.equal(translate('Prioritäten','de'),'Prioritäten');
 assert.equal(translate('Prioritäten','en'),'Priorities');
 assert.equal(translate('Prioritäten','ru'),'Приоритеты');
 assert.equal(translate('Prioritäten','fr'),'Priorités');
});
