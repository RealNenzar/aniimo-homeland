import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {speed,optimize} from '../solver.js';
import {compareWorkModes} from '../power-comparison.js';
import {ELECTRIC_FACILITIES} from '../power.js';

const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
const byId=id=>catalog.find(r=>r.id===id);
const makeState=()=>({hours:1,beans:0,event:false,unverified:false,autoWorkers:true,currentRv:18,
 modules:{},facilities:{'Woodworking Bench':{count:1,level:4}},workerCounts:{Artisanship:{4:1}},
 familyCounts:{},stock:{wood_block:100000},targets:{},notes:[],special:[],
 priorities:[{id:'coins',enabled:true}],power:{enabled:true,module:4,level:4,watts:1200,efficiencyPercent:100}});

test('rough lumber matches the reported level-four Energetic and 100 percent power times',()=>{
 const r=byId('rough_lumber'), c=compareWorkModes(r,makeState());
 assert.equal(c.manual.level,4);
 assert.ok(Math.abs(c.manual.seconds-34/4.8)<1e-9);
 assert.ok(Math.abs(c.electric-34/1.25)<1e-9);
});
test('comparison uses entered level rather than the electric row synthetic worker',()=>{
 const s=makeState(),r={...byId('rough_lumber'),worker:{skill:3,electric:true}};
 assert.equal(compareWorkModes(r,s).manual.level,4);
 s.workerCounts.Artisanship={2:1};assert.equal(compareWorkModes(r,s).manual.level,2);
 s.workerCounts.Artisanship={4:0};assert.equal(compareWorkModes(r,s).manual,null);
 s.workerCounts={};assert.equal(compareWorkModes(r,s).manual.level,3);
});
test('optimizer chooses the faster Aniimo when capacity improves the selected goal',async()=>{
 const r={...byId('rough_lumber'),sellValue:1,sellCurrency:'coins'},result=await optimize([r],makeState());
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].recipe.worker.electric,false);
 assert.equal(result.rows[0].recipe.worker.skill,4);
});
test('electric mode may win at the recommended ability level',()=>{
 const s=makeState();s.workerCounts.Artisanship={2:1};s.power.efficiencyPercent=120;
 const c=compareWorkModes(byId('rough_lumber'),s);assert.ok(c.electric<c.manual.seconds);
});
test('all electric facility types are compared with an appropriate available worker',()=>{
 for(const facility of ELECTRIC_FACILITIES){
  const r=catalog.find(x=>x.facility===facility&&x.workload>0);assert.ok(r,facility);
  const ability=facility==='Phonolfactory Table'?'Perfumery':null;
  const s=makeState();s.workerCounts=ability?{Perfumery:{3:1}}:{};
  const comparison=compareWorkModes(r,s);assert.ok(comparison?.manual,facility);
  assert.ok(comparison.electric>0&&comparison.manual.seconds>0,facility);
 }
});
test('no-personality facilities use their distinct 40 percent level bonus',()=>{
 const fruit=byId('growth_fruit'),pod=byId('aniipod_mega');
 for(const r of [fruit,pod]){
  assert.equal(r.abilityLevel,3);
  assert.ok(Math.abs(speed(r,{skill:4,bonus:true})-r.workload/(1.5*1.4))<1e-9);
 }
});
test('seven independently cross-checked recipes use their recorded work levels',()=>{
 for(const id of ['laminated_beams','densified_timber_component','refined_ore','microcrystalline_ore_plate'])assert.equal(byId(id).abilityLevel,3,id);
 for(const id of ['moondew_radish_slices','umbral_hot_pot','umbral_pickle'])assert.equal(byId(id).abilityLevel,2,id);
});
test('new Pearl Powder and Crafting Table recipes keep verified inputs and unlock levels',()=>{
 const powder=byId('pearl_powder'),diamond=byId('star_diamond'),cream=byId('pearl_face_cream');
 assert.deepEqual([powder.facility,powder.facilityLevel,powder.workload,powder.abilityLevel,powder.sellValue],['Carousel Mill',6,81,3,1810]);
 assert.deepEqual(powder.ingredients,{pearl:2});
 assert.deepEqual([diamond.facility,diamond.facilityLevel,diamond.workload,diamond.abilityLevel,diamond.sellValue],['Crafting Table',8,162,3,3990]);
 assert.deepEqual(diamond.ingredients,{gem:2,star:2});
 assert.deepEqual([cream.facility,cream.facilityLevel,cream.workload,cream.abilityLevel,cream.sellValue],['Crafting Table',8,243,3,11130]);
 assert.deepEqual(cream.ingredients,{pearl_powder:1,lotion:1});
});
