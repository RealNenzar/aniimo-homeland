import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {speed,model,optimize,prepare} from '../solver.js';
import {powerSummary,poleLimit} from '../power.js';
import {presetFacilities} from '../facilities.js';
import {layoutPlan,placePower,placeClimate,packClimate,placeStorage,STORAGE_LIMITS,coverageSegments,PLOT_GRID,powerReachesNode} from '../layout.js';
import {translate} from '../i18n.js';
import {allowedStock,STOCK_ITEMS} from '../inventory.js';
import {facilityImage} from '../images.js';

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
test('one woodworking bench cannot run two recipes',async()=>{
 const s=state();s.facilities={'Woodworking Bench':f};s.stock={wood_block:16};s.targets={plank:1};s.priorities=[{id:'rv',enabled:true}];
 const recipes=[recipe('lumber','Woodworking Bench',{ingredients:{wood_block:8},sellCurrency:'none'}),recipe('plank','Woodworking Bench',{ingredients:{lumber:2},sellCurrency:'none'})];
 assert.equal((await optimize(recipes,s)).goals[0].value,0);
 s.facilities['Woodworking Bench']={...f,count:2};const result=await optimize(recipes,s);
 assert.ok(result.goals[0].value>.99);assert.equal(result.rows.length,2);
 assert.ok(result.rows.every(row=>!row.shared&&row.units===1));
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
 assert.ok(result.placed.length>0);
 assert.equal(result.placed.length+result.unplaced.length,19);
 for(const x of result.placed) assert.ok(x.plot===1&&x.x+x.w<=80&&x.y+x.h<=60);
});
test('power layout places a connected generator for a nearby electric facility',()=>{
 const layout=layoutPlan([{recipe:{facility:'Woodworking Bench',group:0,worker:{electric:true},id:'rough_lumber'},units:1,shared:false}],1);
 const grid=placePower(layout,1,6);
 assert.equal(grid.generatorsPlaced,1);
 assert.equal(grid.uncovered,0);
 assert.equal(grid.complete,true);
});
test('power layout reports a missing generator when no plots are free',()=>{
 const layout={plots:1,placed:[{plot:1,x:0,y:0,w:80,h:60,electric:true}]};
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
test('only the requested inventory items are used',()=>{
 assert.equal(STOCK_ITEMS.length,11);
 assert.deepEqual(allowedStock({wood_block:20,coins:5,cocoa:900}),{wood_block:20,coins:5});
});
test('each bench is placed with exactly one recipe',()=>{
 const make=id=>({recipe:{id,facility:'Woodworking Bench',group:0,worker:{electric:false,level:2}},units:1});
 const plan=layoutPlan([make('rough_lumber'),make('standard_planks')],1);
 assert.equal(plan.placed.length,2);assert.deepEqual(plan.placed.map(p=>p.recipe).sort(),['rough_lumber','standard_planks']);
});
test('storage is placed when requested and there is production',()=>{
 const plan=layoutPlan([{recipe:{facility:'Farmland',group:0,worker:{electric:false,level:1},id:'wheat'},units:1,shared:false}],1,{storage:true});
 assert.equal(plan.placed.filter(p=>p.name==='Storage Unit').length,1);
});
test('climate is placed only if unlocked and required',()=>{
 const rows=[{recipe:{facility:'Woodland',group:0,worker:{electric:false,level:6},id:'cocoa',environment:'Scorching'},units:1,shared:false}];
 const defs=[{name:'Heat Furnace',unlocks:{1:7},counts:[0,0,0,0,0,0,1]}];
 const blocked=placeClimate(layoutPlan(rows,1),6,defs);
 assert.equal(blocked.uncovered.length,1);assert.equal(blocked.placed.length,0);
 const covered=placeClimate(layoutPlan(rows,1),7,defs);
 assert.equal(covered.uncovered.length,0);assert.equal(covered.placed.length,1);
 assert.equal(covered.placed[0].recipe,'Scorching');
});
test('building images reflect the visible facility level',()=>{
 assert.match(facilityImage('Woodland',1),/10100011/);
 assert.match(facilityImage('Woodland',6),/10100013/);
 assert.equal(facilityImage('unknown'),null);
});
test('event budget does not place spare fields',async()=>{
 const s=state();s.autoWorkers=true;s.event=true;s.beans=4;s.facilities={Farmland:{groups:[{count:4,level:1}]}};s.priorities=[{id:'event',enabled:true}];
 const pumpkin=recipe('pumpkin','Farmland',{event:'magical_wonder_night',seconds:3600,yield:8,seedCost:4,eventPoints:1});
 const result=await optimize([pumpkin],s);
 assert.equal(result.rows[0].units,1);
 assert.equal(layoutPlan(result.rows,1).placed.length,1);
});
test('layout preserves quarter-tile facility dimensions',()=>{
 const plan=layoutPlan([{recipe:{facility:'Blazing Stove',group:0,worker:{electric:false,level:1},id:'food'},units:1,shared:false}],1);
 assert.deepEqual([plan.placed[0].w,plan.placed[0].h],[10,7]);
});

test('climate packing covers cocoa woodland with physically valid 9 by 9 areas',()=>{
 const defs=JSON.parse(readFileSync(new URL('../data/climate-facilities.json',import.meta.url)));
 const layout=layoutPlan([{recipe:{facility:'Woodland',group:0,worker:{electric:false},id:'cocoa',environment:'Scorching'},units:19}],5);
 const climate=packClimate(layout,20,defs);
 assert.equal(climate.uncovered.length,0);assert.equal(layout.unplaced.length,0);assert.equal(layout.placed.length,19);
 for(const crop of layout.placed){assert.ok(climate.placed.some(node=>coverageSegments(node,18).some(area=>area.plot===crop.plot&&area.x<crop.x+crop.w&&area.x+area.w>crop.x&&area.y<crop.y+crop.h&&area.y+area.h>crop.y)));}
});
test('climate overlay clips across plot boundaries',()=>{
 const areas=coverageSegments({plot:1,x:76,y:20,w:4,h:4},18);
 assert.ok(areas.some(a=>a.plot===1));assert.ok(areas.some(a=>a.plot===5));
});

test('power devices use coordinates local to their actual plot',()=>{
 const layout={plots:5,placed:[{name:'Work',plot:5,x:24,y:24,w:8,h:8,electric:true}]};
 const result=placePower(layout,1,0);
 assert.equal(result.complete,true);
 for(const p of result.placed){assert.ok(p.x>=0&&p.x+p.w<=80&&p.y>=0&&p.y+p.h<=60)}
});
import {buildTeam} from '../staffing.js';

test('team shares compatible personalities but separates opposites',()=>{
 const task=(facility)=>({recipe:{facility,id:'dish',worker:{skill:4,bonus:true},workload:3600,abilityLevel:1},units:1,rate:1.2});
 const result={rows:[task('Claw Game Cooker'),task('Simmering Pot'),task('Blazing Stove')],power:{generators:1}};
 const team=buildTeam(result,{climate:{placed:[{name:'Heat Furnace',mode:'Warm'}]},grid:{placed:[]}},[]);
 assert.equal(team.groups.filter(g=>g.ability==='Fire'&&g.level===null).length,1);
 assert.equal(team.groups.filter(g=>g.ability==='Lightning'&&g.level===null).length,1);
 const production=team.groups.filter(g=>g.ability==='Fire'&&g.level===4);
 assert.ok(production.some(g=>g.personalities.includes('Practical')&&g.personalities.includes('Tenacious')));
 assert.ok(production.every(g=>!(g.personalities.includes('Practical')&&g.personalities.includes('Nimble'))));
});

test('growing jobs are listed without inventing workload',()=>{
 const result={rows:[{recipe:{id:'cocoa',facility:'Woodland',seconds:2400},rate:1}],power:{generators:0}};
 const team=buildTeam(result,{climate:{placed:[]},grid:{placed:[]}},[{name:'cocoa',facility:'Woodland',step:'Logging',ability:'Dark',min_level:'2'}]);
 assert.ok(team.jobs.some(j=>j.ability==='Dark'&&j.step==='Logging'));assert.ok(team.jobs.some(j=>j.ability==='Water'&&j.step==='Watering'));assert.equal(team.groups.length,0);
});
test('event may trade at most ten percent of coin optimum',async()=>{
 const s=state();s.event=true;s.beans=100;s.eventCoinTolerance=.1;s.facilities={Farmland:{...f,count:10}};s.priorities=[{id:'coins',enabled:true},{id:'event',enabled:true}];
 const recipes=[recipe('pumpkin','Farmland',{event:'magical_wonder_night',seconds:3600,eventPoints:1,seedCost:4}),recipe('wheat','Farmland',{seconds:3600,sellValue:100})];
 const result=await optimize(recipes,s);assert.ok(result.goals[0].value>=900-1e-4);assert.ok(result.goals[1].value>0);assert.ok(result.rows.some(r=>r.recipe.id==='pumpkin'));
});
test('daily orders reserve materials and count only complete orders',async()=>{
 const s=state();s.facilities={Farmland:{...f,count:10}};s.daily=[{item:'wheat',count:4,quantity:3,priority:true}];s.priorities=[{id:'daily',enabled:true},{id:'coins',enabled:true}];
 const result=await optimize([recipe('wheat','Farmland',{seconds:3600,sellValue:10})],s);
 assert.equal(result.daily[0].completed,3);assert.ok(result.sales.reduce((n,x)=>n+x.rate,0)<=1.00001);
});
test('inactive daily orders do not consume materials',async()=>{
 const s=state();s.facilities={Farmland:{...f,count:10}};s.daily=[{item:'wheat',count:3,quantity:3}];
 const result=await optimize([recipe('wheat','Farmland',{seconds:3600,sellValue:10})],s);
 assert.equal(result.daily[0].completed,0);assert.ok(result.goals[0].value>99);
});
test('pumpkin event recipe ingredients and seed costs match the supplied list',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const expected={candied_lanternfruit:{memory_lanternfruit:8,rock_candy:1},honey_glazed_pumpkin_cup:{sea_salt_roasted_pumpkin:1,candied_lanternfruit:1},magic_pumpkin_cake:{magic_pumpkin:8,milled_rice:1},sea_salt_roasted_pumpkin:{magic_pumpkin:8,sea_salt:23},gleam_fruit_nectar:{memory_lanternfruit:8,fresh_water:8},glowfruit_lantern_set:{memory_lantern:1,magic_pumpkin_lantern:1},magic_pumpkin_lantern:{magic_pumpkin:8},golden_lantern_pumpkin_soup:{magic_pumpkin:8,memory_lanternfruit:8,fresh_water:8},memory_lantern:{memory_lanternfruit:8,cotton_thread:1}};
 for(const [id,ingredients] of Object.entries(expected))assert.deepEqual(catalog.find(r=>r.id===id).ingredients,ingredients);
 for(const id of ['magic_pumpkin','memory_lanternfruit'])assert.equal(catalog.find(r=>r.id===id).seedCost,4);
});

test('storage limits follow RV and extra storage is distributed',()=>{
 assert.equal(STORAGE_LIMITS[3],2);assert.equal(STORAGE_LIMITS[17],6);assert.equal(STORAGE_LIMITS[19],8);
 const plan=layoutPlan([{recipe:{facility:'Woodland',group:0,worker:{electric:false,level:6},id:'cocoa'},units:19,rate:20}],5);
 const stores=placeStorage(plan,6);assert.equal(stores.length,6);
 const boxes=[...plan.placed,...stores];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.plot===b.plot)assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y)}
});
test('incomplete network does not leave poles without covered devices',()=>{
 const layout={plots:5,placed:[{name:'Power target',plot:5,x:0,y:0,w:80,h:60,electric:true},{name:'Full',plot:1,x:0,y:0,w:80,h:60}]};
 const result=placePower(layout,1,24);assert.equal(result.generatorsPlaced,1);assert.ok(result.poles<24);
});
test('default workers use level three and specified counts constrain production',async()=>{
 const s=state();s.autoWorkers=true;s.facilities={'Claw Game Cooker':{...f,count:3}};
 const r=recipe('food','Claw Game Cooker',{seconds:0,workload:3600,abilityLevel:1,sellValue:10});
 const unlimited=await optimize([r],s);assert.ok(unlimited.rows.every(x=>x.recipe.worker.skill===3));
 s.workerCounts={Fire:{3:1}};const limited=await optimize([r],s);
 assert.ok(limited.goals[0].value<unlimited.goals[0].value*.5);assert.ok(limited.rows.every(x=>x.recipe.worker.skill===3));
 s.workerCounts={Fire:{3:0}};const none=await optimize([r],s);assert.equal(none.goals[0].value,0);
});
import {upgradeBalance} from '../upgrade-balance.js';
import {RV_ANIIMO_LIMITS} from '../solver.js';
test('RV levels include 21 and 22 and their personnel limits',()=>{
 const defs=JSON.parse(readFileSync(new URL('../data/facilities.json',import.meta.url)));
 assert.equal(RV_ANIIMO_LIMITS[17],43);assert.equal(RV_ANIIMO_LIMITS[20],46);assert.equal(RV_ANIIMO_LIMITS[21],47);
 const p=presetFacilities(22,defs);assert.equal(p.Farmland.groups[0].count,42);assert.equal(p.Farmland.groups[0].level,8);assert.equal(p['Tidewhisper Sandcastle'].groups[0].level,5);
});
test('upgrade balance subtracts sales, orders, inputs and seed costs',()=>{
 const r={rows:[{rate:2,recipe:{id:'lumber',yield:1,ingredients:{wood_block:8},seedCost:0}},{rate:1,recipe:{id:'crop',yield:1,ingredients:{},seedCost:2}}],sales:[{item:'lumber',rate:1,price:10}],daily:[{item:'lumber',quantity:1,completed:1}]};
 const s={hours:2,stock:{wood_block:40,coins:5},targets:{wood_block:3,lumber:2,coins:10}};
 const out=Object.fromEntries(upgradeBalance(r,s).map(x=>[x.item,x.difference]));assert.deepEqual(out,{wood_block:5,lumber:-1,coins:11});
});
test('RV cap constrains combined production and generator staffing',()=>{
 const s=state();s.currentRv=2;s.autoWorkers=true;s.facilities={'Claw Game Cooker':{...f,count:20}};
 const r=recipe('food','Claw Game Cooker',{seconds:0,workload:3600,abilityLevel:1,sellValue:1});
 assert.match(model([r],s).lp,/homelandCrew:.* <= 7/);
});

test('field abilities and hauling reserve capacity only for planted crops',async()=>{
 const s=state();s.currentRv=2;s.autoWorkers=true;s.growerSteps=[{name:'crop',facility:'Farmland',ability:'Grass',step:'Sowing'},{name:'crop',facility:'Farmland',ability:'Dark',step:'Reaping'}];
 s.facilities={Farmland:{...f,count:2}};const m=model([recipe('crop','Farmland',{seconds:3600,sellValue:10})],s);
 assert.match(m.lp,/fieldLink/);assert.match(m.lp,/homelandCrew:.*field0.*field1.*field2.* <= 7/);
 s.workerCounts={Water:{3:0}};const result=await optimize([recipe('crop','Farmland',{seconds:3600,sellValue:10})],s);assert.equal(result.goals[0].value,0);
});
import {upgradeForecast} from '../upgrade-balance.js';
test('forecast estimates the first common target time from average rates',()=>{
 const r={rows:[{rate:4,recipe:{id:'wood_block',yield:1,ingredients:{}}}],sales:[],daily:[]};
 const s={hours:10,stock:{wood_block:10,coins:150},targets:{wood_block:30,coins:100}};
 const result=upgradeForecast(r,s);assert.equal(result.reachable,true);assert.equal(result.hours,5);assert.equal(result.balances.find(x=>x.item==='coins').difference,50);
});
test('climate devices reserve staff and obey explicitly entered ability counts',async()=>{
 const s=state();s.currentRv=7;s.autoWorkers=true;s.facilities={Farmland:{...f,count:1}};s.workerCounts={Fire:{3:0}};
 const r=recipe('crop','Farmland',{seconds:3600,environment:'Scorching',sellValue:1});
 const m=model([r],s);assert.match(m.lp,/climateLink/);assert.match(m.lp,/supportCrew/);
 const result=await optimize([r],s);assert.equal(result.goals[0].value,0);
});
test('selected power percentage changes generator demand and processing speed',()=>{
 const s=state();s.currentRv=12;s.autoWorkers=true;s.power={enabled:true,module:1,level:1,watts:600,efficiencyPercent:100};s.facilities={'Claw Game Cooker':f};
 const r=recipe('food','Claw Game Cooker',{seconds:0,workload:120,abilityLevel:1});const electric=model([r],s).recipes.find(x=>x.worker.electric);
 assert.equal(speed(electric,electric.worker),120);assert.match(model([r],s).lp,/600\.000000000 generatorCount/);
});
test('coin tolerance accepts full 100 percent',()=>{
 const s=state();s.event=true;s.eventCoinTolerance=1;s.priorities=[{id:'coins',enabled:true},{id:'event',enabled:true}];
 const m=model([recipe('wheat','Farmland',{sellValue:100})],s,[{key:'coins',value:100}],'event');
 assert.match(m.lp,/priority0:.* >= -1e-7/);
});
import {eventBudget} from '../event-budget.js';
test('future daily rewards add once per full day and remain separate from earned rewards',()=>{
 assert.equal(eventBudget({beans:100,event:true,hours:48,dailyRewards:{friend:true},dailyFuture:{friend:true,sale:true}}),1100);
 assert.equal(eventBudget({beans:100,event:false,hours:48,dailyRewards:{friend:true},dailyFuture:{friend:true}}),300);
});
test('forecast marks extrapolation beyond the modeled period',()=>{
 const r={rows:[{rate:1,recipe:{id:'wood_block',yield:1,ingredients:{}}}],sales:[],daily:[]};
 const s={hours:10,stock:{wood_block:0},targets:{wood_block:20}};const f=upgradeForecast(r,s);
 assert.equal(f.hours,20);assert.equal(f.extrapolated,true);
});
test('independent fastest RV pace accounts for stock without the selected time horizon',async()=>{
 const s=state();s.stock={crop:30};s.targets={crop:150};s.hours=24;s.priorities=[{id:'rv',enabled:true}];s.facilities={Farmland:f};
 const crop=recipe('crop','Farmland',{seconds:60,sellCurrency:'none'});
 const a=await optimize([crop],s);assert.ok(Math.abs(a.fastestUpgrade.hours-2)<.001);
 s.hours=10;const b=await optimize([crop],s);assert.ok(Math.abs(b.fastestUpgrade.hours-2)<.001);
});
test('fastest RV does not pretend one-off event orders are completed',async()=>{
 const s=state();s.event=true;s.beans=4;s.daily=[{item:'pumpkin',count:1,quantity:1,priority:true}];s.targets={wheat:1};s.priorities=[{id:'rv',enabled:true},{id:'daily',enabled:true}];
 const recipes=[recipe('pumpkin','Farmland',{event:'magical_wonder_night',seconds:3600,seedCost:4}),recipe('wheat','Farmland',{seconds:3600})];
 const result=await optimize(recipes,s);assert.ok(Math.abs(result.fastestUpgrade.hours-1)<.001);
});
test('forecast refuses to extrapolate after finite intermediate stock runs out',()=>{
 const s={hours:10,stock:{wood_block:80},targets:{lumber:30}};
 const r={rows:[{rate:1,recipe:{id:'lumber',yield:1,ingredients:{wood_block:8}}}],sales:[],daily:[]};
 assert.deepEqual(upgradeForecast(r,s),{reachable:false,reason:'finite'});
});
test('forecast refuses to repeat a finite order over an extended period',()=>{
 const s={hours:10,stock:{},targets:{lumber:30}};
 const r={rows:[{rate:1,recipe:{id:'lumber',yield:1,ingredients:{}}}],sales:[],daily:[{item:'lumber',quantity:1,completed:1}]};
 assert.deepEqual(upgradeForecast(r,s),{reachable:false,reason:'finite'});
});
test('identical preferred and all-order objectives do not run the same solve twice',async()=>{
 const s=state();s.facilities={Farmland:{...f,count:10}};s.daily=[{item:'wheat',count:3,quantity:3,priority:true}];s.priorities=[{id:'daily',enabled:true}];const phases=[];
 const result=await optimize([recipe('wheat','Farmland',{seconds:3600})],s,p=>phases.push(p));
 assert.deepEqual(phases,['daily_priority']);assert.equal(result.daily[0].completed,3);assert.equal(result.goals.find(g=>g.key==='daily').value,3);
});
test('nonidentical order goals remain separately optimized',async()=>{
 const s=state();s.facilities={Farmland:{...f,count:2}};s.daily=[{item:'wheat',count:1,quantity:1,priority:true},{item:'wheat',count:1,quantity:1,priority:false}];s.priorities=[{id:'daily',enabled:true}];const phases=[];
 const result=await optimize([recipe('wheat','Farmland',{seconds:3600})],s,p=>phases.push(p));assert.deepEqual(phases,['daily_priority','daily']);assert.equal(result.daily.reduce((n,d)=>n+d.completed,0),2);
});
test('climate retry defers staffing tie-break without changing priorities',async()=>{
 const s=state();s.autoWorkers=true;s.facilities={Farmland:{...f,count:1}};const phases=[];let checked=false;
 const result=await optimize([recipe('wheat','Farmland',{seconds:3600,sellValue:10})],s,p=>phases.push(p),{deferTieBreak:rows=>{checked=rows.length>0;return true}});
 assert.equal(checked,true);assert.ok(!phases.includes('workers'));assert.equal(result.goals[0].value,10);
});

test('RV 21 and 22 recipes respect facility, module and recipe-note unlocks',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const s=state();s.facilities={Farmland:{...f,level:8},Well:{...f,level:6},'Blazing Stove':{...f,level:6},'Crafting Table':{...f,level:9}};
 s.special=['orange_flower_rice_drink'];
 const ids=()=>new Set(prepare(catalog,s).map(r=>r.id));
 assert.ok(ids().has('sorghum'));assert.ok(!ids().has('quick_agave'));assert.ok(!ids().has('quick_snowmelt_cold_spring'));assert.ok(!ids().has('orange_flower_rice_drink'));assert.ok(!ids().has('premium_quicksilver_springstone'));
 s.modules={ecological_module:9,resource_detector:10,crafting_module:8};s.notes=['orange_flower_rice_drink'];
 for(const id of ['quick_agave','quick_snowmelt_cold_spring','orange_flower_rice_drink','premium_quicksilver_springstone'])assert.ok(ids().has(id),id);
 s.facilities.Farmland.level=7;assert.ok(!ids().has('sorghum'));
});

import {recipeFamily} from '../families.js';
test('family requirements match each leisure recipe',()=>{
 for(const [facility,id,family] of [
  ['Nimbus Bed','wool','Nimbi'],['Nimbus Bed','quick_wool','Nimbi'],['Nimbus Bed','petals','Iris'],
  ['Starfall Hammock','star','Celestis'],['Starfall Hammock','gold_speck_cap','Coinwisp'],
  ['Floral Windmill','scales','Flutternym'],['Floral Windmill','quick_scales','Flutternym'],
  ['Dewy House','aromathyst','Dewy'],['Dewy House','quick_aromathyst','Dewy'],
  ['Tidewhisper Sandcastle','sea_salt','Susuta'],['Tidewhisper Sandcastle','pearl','Shelly'],['Tidewhisper Sandcastle','sweet_cone','Sugarfish']])
   assert.equal(recipeFamily({facility,id}),family,id);
 assert.equal(recipeFamily({facility:'Nimbus Bed',id:'star'}),null);
});
test('family limits reserve a family member per facility while blank stays unrestricted',async()=>{
 const s=state();s.autoWorkers=true;s.facilities={'Nimbus Bed':{...f,count:2,level:3}};
 const recipes=[recipe('wool','Nimbus Bed',{seconds:0,workload:2700,abilityLevel:3,sellValue:100}),recipe('quick_wool','Nimbus Bed',{seconds:0,workload:2700,abilityLevel:3,sellValue:100,yield:2})];
 s.familyCounts={Nimbi:0};assert.equal((await optimize(recipes,s)).rows.length,0);
 s.familyCounts={Nimbi:1};let result=await optimize(recipes,s);assert.ok(result.rows.reduce((sum,row)=>sum+row.units,0)<=1.00001);
 s.familyCounts={Nimbi:''};result=await optimize(recipes,s);assert.ok(result.rows.reduce((sum,row)=>sum+row.units,0)>1.9);
});
test('team recommendation names the required family',()=>{
 const result={rows:[{recipe:{id:'petals',facility:'Nimbus Bed',worker:{skill:3},workload:2700,abilityLevel:3},units:1,rate:1}],power:{generators:0}};
 assert.equal(buildTeam(result,{climate:{placed:[]}},[]).groups[0].family,'Iris');
});

test('a pole needs its footprint in an existing power range',()=>{
 const generator={x:0,y:0,radius:22,w:4,h:4};
 const poleOutside={x:30,y:0,radius:14,w:6,h:6};
 const poleInside={x:24,y:0,radius:14,w:6,h:6};
 assert.equal(powerReachesNode(generator,poleOutside),false);
 assert.equal(powerReachesNode(generator,poleInside),true);
 assert.equal(powerReachesNode(poleInside,{x:40,y:0,w:6,h:6}),true);
});

test('unpowered facilities are moved into existing coverage before placing poles',()=>{
 const layout={plots:1,unplaced:[],placed:[{name:'Well',plot:1,x:0,y:0,w:8,h:8,electric:true},{name:'Well',plot:1,x:68,y:48,w:8,h:8,electric:true}]};
 const grid=placePower(layout,1,10);
 assert.equal(grid.complete,true);assert.equal(grid.uncovered,0);assert.equal(grid.poles,0);
 assert.ok(layout.placed[1].x<68 || layout.placed[1].y<48);
});

test('quick wool earns more per hour at default level and both gathering rates match the work table',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const wool=catalog.find(r=>r.id==='wool'),quick=catalog.find(r=>r.id==='quick_wool');
 const worker={skill:3,bonus:true};
 assert.ok(Math.abs(wool.yield*3600/speed(wool,worker)-13.44)<1e-9);
 assert.ok(Math.abs(quick.yield*3600/speed(quick,worker)-14.4)<1e-9);
});
test('gathering speed uses correct work table across all skill and recommended levels',()=>{
 const expected=[[60,90,120,150],[45,75,105,135],[30,60,90,120]];
 for(let need=1;need<=3;need++)for(let skill=1;skill<=4;skill++){
  const r=recipe('work','Mine',{seconds:0,workload:3600,abilityLevel:need});
  assert.equal(speed(r,{skill,bonus:false}),3600/(expected[need-1][skill-1]/60));
 }
});
test('optimizer selects quick wool when it produces more with a level-3 worker',async()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url))).filter(r=>['wool','quick_wool'].includes(r.id));
 const s=state();s.autoWorkers=true;s.facilities={'Nimbus Bed':{...f,level:2}};s.modules={resource_detector:5};
 const result=await optimize(catalog,s);assert.deepEqual(result.rows.map(row=>row.recipe.id),['quick_wool']);
});

test('unlocked quick recipes take precedence and fall back when disabled or locked',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url))).filter(r=>['wool','quick_wool'].includes(r.id));
 const s=state();s.autoWorkers=true;s.facilities={'Nimbus Bed':{...f,level:2}};
 s.modules={resource_detector:5};assert.deepEqual(prepare(catalog,s).map(r=>r.id),['quick_wool']);
 s.modules.resource_detector=4;assert.deepEqual(prepare(catalog,s).map(r=>r.id),['wool']);
 s.modules.resource_detector=5;s.disabled=['quick_wool'];assert.deepEqual(prepare(catalog,s).map(r=>r.id),['wool']);
 s.disabled=[];s.facilities['Nimbus Bed']={groups:[{...f,level:1},{...f,level:2}]};
 assert.deepEqual(prepare(catalog,s).map(r=>[r.id,r.group]).sort(),[['quick_wool',1],['wool',0]].sort());
});

test('quick pearl and quick scales are available only with their detector unlocks',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const s=state();s.autoWorkers=true;s.facilities={'Tidewhisper Sandcastle':{...f,level:4},'Floral Windmill':{...f,level:1}};
 s.modules={resource_detector:7};let ids=new Set(prepare(catalog,s).map(r=>r.id));assert.ok(!ids.has('quick_pearl'));assert.ok(!ids.has('quick_scales'));assert.ok(ids.has('pearl'));assert.ok(ids.has('scales'));
 s.modules.resource_detector=9;ids=new Set(prepare(catalog,s).map(r=>r.id));assert.ok(ids.has('quick_pearl'));assert.ok(ids.has('quick_scales'));assert.ok(!ids.has('pearl'));assert.ok(!ids.has('scales'));
 const pearl=catalog.find(r=>r.id==='quick_pearl');assert.deepEqual([pearl.yield,pearl.workload,pearl.abilityLevel,pearl.environment],[4,2700,3,'Warm']);assert.equal(recipeFamily(pearl),'Shelly');
});
