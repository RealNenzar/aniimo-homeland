import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepare, speed, optimize} from '../solver.js';

const crop={id:'cocoa',facility:'Woodland',ingredients:{},yield:6,seconds:2400,workload:0,facilityLevel:1,module:'',environment:'',ability:'',abilityLevel:1,sellValue:10,sellCurrency:'coins',seedCost:0,byproductYield:122,eventPoints:0,event:null,verified:true};
const base=()=>({hours:1,beans:0,event:false,unverified:false,autoWorkers:true,modules:{},facilities:{Woodland:{count:1,level:1}},stock:{},targets:{},notes:[],special:[],priorities:[{id:'coins',enabled:true}],growerSteps:[]});

test('two waterings shorten only field growth to 75 percent of the base time',()=>{
 const full=base();full.wateringMode='full';const without=base();without.wateringMode='none';
 assert.equal(speed(prepare([crop],full)[0],prepare([crop],full)[0].worker),1800);
 assert.equal(speed(prepare([crop],without)[0],prepare([crop],without)[0].worker),2400);
 const custom={...crop,id:'custom_food',facility:'Claw Game Cooker',seconds:2400};
 assert.equal(speed(custom,{watered:true}),2400);
});

test('nineteen cocoa trees produce 4636 blocks per hour when watered twice',async()=>{
 const s=base();s.wateringMode='full';s.facilities.Woodland.count=19;s.priorities=[{id:'wood',enabled:true}];
 const result=await optimize([crop],s);assert.ok(Math.abs(result.goals[0].value-4636)<0.001);
});

test('no Water Aniimo prevents the watered plan but permits an unwatered plan',async()=>{
 const s=base();s.currentRv=10;s.workerCounts={Water:{3:0}};s.wateringMode='full';
 assert.equal((await optimize([crop],s)).goals[0].value,0);
 s.wateringMode='none';const unwatered=await optimize([crop],s);assert.ok(unwatered.goals[0].value>0);
});

test('event crops use the same unwatered source time before watering is applied',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 for(const id of ['magic_pumpkin','memory_lanternfruit']){
  const crop=catalog.find(r=>r.id===id);assert.equal(crop.seconds,2400);
  assert.equal(speed(crop,{watered:false}),2400);assert.equal(speed(crop,{watered:true}),1800);
 }
});
