import {speed} from './solver.js';
import {workers} from './worker-abilities.js';
import {recipeFamily} from './families.js';

const resident=new Set(['Tidewhisper Sandcastle','Dewy House','Nimbus Bed','Starfall Hammock','Floral Windmill']);
const opposites={Instinctive:'Energetic',Energetic:'Instinctive',Nimble:'Practical',Practical:'Nimble',Faithful:'Tenacious',Tenacious:'Faithful',Playful:'Judicious',Judicious:'Playful'};

// Estimate average staffed production time; not a simulation of random breaks.
export function buildTeam(result,layout,growerSteps){
 const tasks=[];
 for(const row of result.rows){
  const r=row.recipe,info=workers[r.facility];if(r.seconds||r.worker.electric||!info)continue;
  const [ability,personality]=info;const load=row.rate*speed(r,r.worker)/3600;
  const job={ability,level:r.worker.skill||1,personality,where:r.facility,recipe:r.id,family:recipeFamily(r)};
  if(resident.has(r.facility)){for(let i=0;i<Math.ceil(row.units-1e-7);i++)tasks.push({...job,load:1,resident:true});}
  else if(load>1e-7)tasks.push({...job,load});
 }
 const people=[];
 // Split fractional workload across people with compatible personality pairs.
 for(const task of tasks.sort((a,b)=>b.load-a.load)){let remaining=task.load;
  while(remaining>1e-7){let person=!task.resident&&people.find(p=>!p.resident&&p.ability===task.ability&&p.level>=task.level&&p.load<1-1e-7&&(!task.personality||!p.personalities.has(opposites[task.personality])));
   if(!person){person={ability:task.ability,level:task.level,load:0,personalities:new Set(),where:new Set(),resident:!!task.resident,family:task.family||null};people.push(person)}
   const portion=Math.min(remaining,1-person.load);person.load+=portion;remaining-=portion;if(task.personality)person.personalities.add(task.personality);person.where.add(task.where+'|'+task.recipe);
  }
 }
 for(const p of layout.climate.placed){const ability=({'Heat Furnace':'Fire','Cooling Unit':'Ice','Sunlamp':'Light'})[p.name];if(ability)people.push({ability,level:null,load:1,personalities:new Set(),where:new Set([p.name+'|'+p.mode]),resident:true})}
 for(let i=0;i<(result.power?.generators||0);i++)people.push({ability:'Lightning',level:null,load:1,personalities:new Set(),where:new Set(['Crackle Generator|']),resident:true});
 const groups=new Map();for(const p of people){const personalities=[...p.personalities].sort(),where=[...p.where].sort(),key=JSON.stringify([p.ability,p.level,personalities,where,p.resident,p.family||null]);const g=groups.get(key)||{ability:p.ability,level:p.level,personalities,where,count:0,load:0,resident:p.resident,family:p.family||null};g.count++;g.load+=p.load;groups.set(key,g)}
 const jobs=new Map();for(const row of result.rows){const r=row.recipe;if(!r.seconds||!['Farmland','Woodland'].includes(r.facility))continue;for(const step of growerSteps){if(step.name!==r.id||step.facility!==r.facility)continue;const key=step.ability+'|'+step.step+'|'+step.facility;const old=jobs.get(key);if(!old||Number(step.min_level)>old.level)jobs.set(key,{ability:step.ability,level:Number(step.min_level)||1,step:step.step,facility:step.facility})}}
 if(result.rows.some(row=>row.recipe.seconds&&['Farmland','Woodland'].includes(row.recipe.facility)))jobs.set('Water|Watering|Farmland',{ability:'Water',level:1,step:'Watering',facility:'Farmland / Woodland'});
 return {groups:[...groups.values()],jobs:[...jobs.values()]};
}


