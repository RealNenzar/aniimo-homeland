import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {layoutPlan,stableLayoutPlan,placePower} from '../layout.js';
import {optimize} from '../solver.js';

const definitions=JSON.parse(readFileSync(new URL('../data/climate-facilities.json',import.meta.url)));
const row=(facility,id,{units=1,environment='',electric=false}={})=>({units,rate:units,recipe:{id,facility,environment,worker:{level:1,electric}}});
const pos=(name,recipe,x,y,w=8,h=6,environment='')=>({name,recipe,plot:1,x,y,w,h,environment,level:1,electric:false});
const noOverlap=placed=>placed.every((a,i)=>placed.slice(i+1).every(b=>a.plot!==b.plot||a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y));

test('existing production positions are retained when the recipe is unchanged',()=>{
 const rows=[row('Woodworking Bench','lumber'),row('Woodworking Bench','planks')];
 const previous=[pos('Woodworking Bench','lumber',30,30),pos('Woodworking Bench','planks',42,30)];
 const result=stableLayoutPlan(rows,1,{previous,definitions});
 assert.equal(result.stability.usedPrevious,true);assert.equal(result.stability.exact,2);
 assert.ok(result.layout.placed.some(p=>p.recipe==='lumber'&&p.x===30&&p.y===30));assert.ok(noOverlap(result.layout.placed));
});
test('a changed recipe can reuse its facility after exact matches are reserved',()=>{
 const rows=[row('Woodworking Bench','planks'),row('Woodworking Bench','new')];
 const previous=[pos('Woodworking Bench','old',30,30),pos('Woodworking Bench','planks',42,30)];
 const result=stableLayoutPlan(rows,1,{previous,definitions});
 assert.equal(result.stability.usedPrevious,true);
 assert.ok(result.layout.placed.some(p=>p.recipe==='planks'&&p.x===42));
 assert.ok(result.layout.placed.some(p=>p.recipe==='new'&&p.x===30));
});
test('stale or overlapping locations are never trusted or duplicated',()=>{
 const rows=[row('Woodworking Bench','one'),row('Woodworking Bench','two')];
 const old=[pos('Woodworking Bench','one',30,30),pos('Woodworking Bench','two',30,30),pos('Woodworking Bench','one',-2,3),null];
 const result=layoutPlan(rows,1,{previous:old});
 assert.equal(result.placed.length,2);assert.equal(result.unplaced.length,0);assert.ok(noOverlap(result.placed));
});
test('stability does not reduce climate, electricity or storage coverage',()=>{
 const rows=[row('Farmland','cocoa',{units:3,environment:'Scorching'}),row('Woodworking Bench','lumber',{electric:true})];
 const options={rv:18,definitions,generatorCount:1,poleCap:8,storageLimit:2};
 const base=stableLayoutPlan(rows,2,options);
 const previous=base.layout.placed.map(p=>({...p}));
 const result=stableLayoutPlan(rows,2,{...options,previous});
 assert.ok(result.layout.unplaced.length<=base.layout.unplaced.length);
 assert.ok(result.climate.uncovered.length<=base.climate.uncovered.length);
 assert.ok(result.grid.uncovered<=base.grid.uncovered);assert.ok(result.grid.generatorsPlaced>=base.grid.generatorsPlaced);
 assert.ok(result.grid.poles<=base.grid.poles);assert.ok(result.storages.length>=base.storages.length);assert.ok(noOverlap(result.layout.placed));
});
test('climate reconciliation receives the solver’s actual generator count',async()=>{
 const recipe={id:'food',facility:'Claw Game Cooker',ingredients:{},yield:1,seconds:0,workload:120,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'coins',sellValue:1,seedCost:0,byproductYield:0,eventPoints:0};
 const state={hours:1,beans:0,event:false,unverified:false,currentRv:12,autoWorkers:true,workerCounts:{Fire:{3:0}},power:{enabled:true,module:1,level:1,watts:600,efficiencyPercent:120},modules:{},facilities:{'Claw Game Cooker':{count:1,level:1}},stock:{},targets:{},notes:[],special:[],priorities:[{id:'coins',enabled:true}]};
 let observed;const result=await optimize([recipe],state,()=>{},{deferTieBreak:(rows,power)=>{observed={rows,power};return true}});
 assert.ok(observed.rows.some(r=>r.recipe.worker.electric));assert.equal(observed.power.generators,1);assert.deepEqual(observed.power,result.power);
});
test('old connected power network expands for a new distant consumer',()=>{
 const layout={plots:5,unplaced:[],placed:[{name:'Woodworking Bench',recipe:'planks',plot:5,x:60,y:8,w:8,h:6,electric:true,environment:''}]};
 const previousNodes=[{name:'Crackle Generator',recipe:'Power',plot:1,x:0,y:0,w:8,h:8},{name:'Crackle Power Pole',recipe:'Power',plot:1,x:20,y:0,w:6,h:6}];
 const grid=placePower(layout,1,12,{previousNodes,preservePositions:true});
 assert.equal(grid.complete,true);assert.equal(grid.uncovered,0);assert.ok(grid.reusedNodes>=1);assert.ok(grid.poles<=12);
 assert.ok(grid.placed.some(p=>p.name==='Crackle Generator'&&p.plot===1&&p.x===0&&p.y===0));
 assert.equal(layout.placed[0].plot,5);assert.equal(layout.placed[0].x,60);
});
test('a disconnected old pole is not accepted as a valid reusable network',()=>{
 const layout={plots:5,unplaced:[],placed:[{name:'Woodworking Bench',recipe:'planks',plot:1,x:15,y:15,w:8,h:6,electric:true,environment:''}]};
 const previousNodes=[{name:'Crackle Generator',recipe:'Power',plot:1,x:0,y:0,w:8,h:8},{name:'Crackle Power Pole',recipe:'Power',plot:5,x:60,y:45,w:6,h:6}];
 const grid=placePower(layout,1,12,{previousNodes,preservePositions:true});
 assert.equal(grid.complete,true);assert.equal(grid.poles,0);assert.ok(!grid.placed.some(p=>p.name==='Crackle Power Pole'&&p.plot===5));
});
test('separate temperature zones on one plot retain valid old positions',()=>{
 const rows=[row('Farmland','warm_crop',{environment:'Warm'}),row('Farmland','cold_crop',{environment:'Freeze'})];
 const previous=[pos('Farmland','warm_crop',0,20,8,8,'Warm'),pos('Farmland','cold_crop',70,20,8,8,'Freeze'),
  {name:'Heat Furnace',recipe:'Warm',mode:'Warm',plot:1,x:0,y:4,w:4,h:4,infrastructure:true},
  {name:'Cooling Unit',recipe:'Freeze',mode:'Freeze',plot:1,x:70,y:4,w:8,h:8,infrastructure:true}];
 const result=stableLayoutPlan(rows,1,{previous,rv:18,definitions});
 assert.equal(result.climate.complete,true);assert.equal(result.stability.total,4);assert.equal(result.stability.infrastructureReused,true);
 assert.ok(noOverlap(result.layout.placed));
});
