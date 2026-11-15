import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {optimize,prepare,speed} from '../solver.js';

const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
const state=()=>({hours:1,beans:0,event:false,unverified:false,autoWorkers:true,
 modules:{resource_detector:5},facilities:{'Nimbus Bed':{count:1,level:2}},
 workerCounts:{Leisure:{1:1}},familyCounts:{},stock:{},targets:{},notes:[],special:[],
 priorities:[{id:'coins',enabled:true}],power:{enabled:false}});

test('level-one Nimbi produces and sells more normal wool than quick wool',async()=>{
 const recipes=catalog.filter(r=>['wool','quick_wool'].includes(r.id)),s=state();
 assert.deepEqual(new Set(prepare(recipes,s).map(r=>r.id)),new Set(['wool','quick_wool']));
 const normal=recipes.find(r=>r.id==='wool');
 const expected=normal.yield*3600/speed(normal,{skill:1,bonus:true})*normal.sellValue;
 const result=await optimize(recipes,s);
 assert.equal(result.rows[0].recipe.id,'wool');
 assert.ok(Math.abs(result.goals[0].value-expected)<.01);
});

test('quick wool remains preferred when the configured level makes it faster',async()=>{
 const recipes=catalog.filter(r=>['wool','quick_wool'].includes(r.id)),s=state();s.workerCounts.Leisure={3:1};
 assert.deepEqual(prepare(recipes,s).map(r=>r.id),['quick_wool']);
 assert.equal((await optimize(recipes,s)).rows[0].recipe.id,'quick_wool');
});

test('a quick recipe with higher material cost cannot eliminate the cheaper normal option',()=>{
 const base={id:'sample',facility:'Woodworking Bench',ingredients:{wood_block:1},yield:1,seconds:0,workload:10,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'coins',sellValue:10,seedCost:0,byproductYield:0,eventPoints:0};
 const quick={...base,id:'quick_sample',ingredients:{wood_block:4},yield:2};
 const s=state();s.workerCounts={};s.facilities={'Woodworking Bench':{count:1,level:1}};
 assert.deepEqual(new Set(prepare([base,quick],s).map(r=>r.id)),new Set(['sample','quick_sample']));
});

test('selling production follows the player’s selected RV and coin priority order',async()=>{
 const common={facility:'Crafting Table',ingredients:{},yield:1,seconds:0,workload:3600,facilityLevel:1,module:'',abilityLevel:1,verified:true,event:null,sellCurrency:'coins',seedCost:0,byproductYield:0,eventPoints:0};
 const recipes=[{...common,id:'upgrade',sellValue:0},{...common,id:'sale',sellValue:100}];
 const s=state();s.autoWorkers=false;s.workerCounts={};s.facilities={'Crafting Table':{count:1,level:1,skill:1,bonus:false}};s.modules={};s.targets={upgrade:1};
 s.priorities=[{id:'rv',enabled:true},{id:'coins',enabled:true}];
 const rvFirst=await optimize(recipes,s);assert.ok(rvFirst.goals.find(g=>g.key==='rv').value>.999);assert.ok(rvFirst.goals.find(g=>g.key==='coins').value<.01);
 s.priorities=[{id:'coins',enabled:true},{id:'rv',enabled:true}];
 const coinsFirst=await optimize(recipes,s);assert.ok(coinsFirst.goals.find(g=>g.key==='coins').value>99.9);assert.ok(coinsFirst.goals.find(g=>g.key==='rv').value<.001);
});

test('a faster available Aniimo is preferred over power when the same RV goal is met',async()=>{
 const rough=catalog.find(r=>r.id==='rough_lumber');
 const s=state();Object.assign(s,{hours:24,currentRv:18,facilities:{'Woodworking Bench':{count:1,level:1}},workerCounts:{Artisanship:{4:1}},modules:{},stock:{wood_block:1000},targets:{rough_lumber:1},priorities:[{id:'rv',enabled:true}],power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:120}});
 const result=await optimize([rough],s);assert.ok(result.goals[0].value>.999);
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].recipe.worker.electric,false);
 assert.equal(result.rows[0].recipe.worker.skill,4);
});

test('electric mode remains available when no suitable Aniimo is entered',async()=>{
 const rough=catalog.find(r=>r.id==='rough_lumber');
 const s=state();Object.assign(s,{hours:24,currentRv:18,facilities:{'Woodworking Bench':{count:1,level:1}},workerCounts:{Artisanship:{4:0}},modules:{},stock:{wood_block:1000},targets:{rough_lumber:1},priorities:[{id:'rv',enabled:true}],power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:120}});
 const result=await optimize([rough],s);assert.ok(result.goals[0].value>.999);
 assert.equal(result.rows[0].recipe.worker.electric,true);
});

test('electricity is available only when faster than entered workers for the three timber upgrades',()=>{
 const s=state();Object.assign(s,{currentRv:18,facilities:{'Woodworking Bench':{count:3,level:4}},modules:{},power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:120}});
 const recipes=catalog.filter(r=>['standard_planks','laminated_beams','densified_timber_component'].includes(r.id));
 const modes=()=>new Map(recipes.map(r=>[r.id,prepare(recipes,s).filter(m=>m.id===r.id)]));
 s.workerCounts={Artisanship:{3:3}};
 let m=modes();assert.equal(m.get('standard_planks').some(r=>r.worker.electric),false);
 for(const id of ['laminated_beams','densified_timber_component'])assert.equal(m.get(id).some(r=>r.worker.electric),true);
 s.workerCounts={Artisanship:{3:3,4:1}};
 m=modes();for(const rs of m.values())assert.equal(rs.some(r=>r.worker.electric),false);
 s.workerCounts={};m=modes();assert.equal(m.get('standard_planks').some(r=>r.worker.electric),false);
});

test('power cannot replace faster registered workers to improve a higher priority',async()=>{
 const rough=catalog.find(r=>r.id==='rough_lumber');const s=state();
 Object.assign(s,{hours:1,currentRv:18,facilities:{'Woodworking Bench':{count:2,level:1}},workerCounts:{Artisanship:{3:1}},modules:{},stock:{wood_block:100000},targets:{rough_lumber:1000},priorities:[{id:'rv',enabled:true}],power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:120}});
 const result=await optimize([rough],s);assert.ok(result.rows.length>0);assert.ok(result.rows.every(r=>!r.recipe.worker.electric));
 assert.equal(result.rows.reduce((n,r)=>n+r.units,0),1);assert.ok(result.goals[0].value<.5);
});

test('electricity remains an option if the required family is unavailable',()=>{
 const r=catalog.find(r=>r.id==='bamboo_joss_stick');const s=state();
 Object.assign(s,{facilities:{'Phonolfactory Table':{count:1,level:7}},workerCounts:{Perfumery:{3:1}},familyCounts:{Dewy:0},power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:120}});
 assert.ok(prepare([r],s).some(x=>x.worker.electric));
});
