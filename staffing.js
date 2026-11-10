import {speed} from './solver.js';
import {workers} from './worker-abilities.js';
import {recipeFamily} from './families.js';

// Each manually operated facility has its own assigned Aniimo.
// Occupancy is an average only; breaks and travel are not simulated.
export function buildTeam(result,layout,growerSteps){
 const people=[];
 for(const row of result.rows){
  const r=row.recipe,info=workers[r.facility];
  if((r.seconds&&['Farmland','Woodland'].includes(r.facility))||r.worker.electric||!info)continue;
  const [ability,personality]=info,count=Math.ceil(row.units-1e-7);
  const load=Math.max(0,row.rate*speed(r,r.worker)/3600);
  for(let i=0;i<count;i++)people.push({ability,level:r.worker.skill||1,load:Math.min(1,Math.max(0,load-i)),personalities:new Set(personality?[personality]:[]),where:new Set([r.facility+'|'+r.id]),resident:true,family:recipeFamily(r)});
 }
 for(const p of layout.climate.placed){const ability=({'Heat Furnace':'Fire','Cooling Unit':'Ice','Sunlamp':'Light'})[p.name];if(ability)people.push({ability,level:null,load:1,personalities:new Set(),where:new Set([p.name+'|'+p.mode]),resident:true})}
 for(let i=0;i<(result.power?.generators||0);i++)people.push({ability:'Lightning',level:null,load:1,personalities:new Set(),where:new Set(['Crackle Generator|']),resident:true});
 const groups=new Map();for(const p of people){const personalities=[...p.personalities].sort(),where=[...p.where].sort(),key=JSON.stringify([p.ability,p.level,personalities,where,p.resident,p.family||null]);const g=groups.get(key)||{ability:p.ability,level:p.level,personalities,where,count:0,load:0,resident:p.resident,family:p.family||null};g.count++;g.load+=p.load;groups.set(key,g)}
 const jobs=new Map();for(const row of result.rows){const r=row.recipe;if(!r.seconds||!['Farmland','Woodland'].includes(r.facility))continue;for(const step of growerSteps){if(step.name!==r.id||step.facility!==r.facility)continue;const key=step.ability+'|'+step.step+'|'+step.facility;const old=jobs.get(key);if(!old||Number(step.min_level)>old.level)jobs.set(key,{ability:step.ability,level:Number(step.min_level)||1,step:step.step,facility:step.facility})}}
 if(result.rows.some(row=>row.recipe.seconds&&['Farmland','Woodland'].includes(row.recipe.facility)))jobs.set('Water|Watering|Farmland',{ability:'Water',level:1,step:'Watering',facility:'Farmland / Woodland'});
 return {groups:[...groups.values()],jobs:[...jobs.values()]};
}


