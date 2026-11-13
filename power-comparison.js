import {speed,possibleWorkerLevel} from './solver.js?v=0.2.25';
import {workers} from './worker-abilities.js';
import {recipeFamily} from './families.js';
import {ELECTRIC_FACILITIES} from './power.js';

// The fastest eligible level is a comparison, not a promise that the same
// individual Aniimo is free to work multiple facilities simultaneously.
export function compareWorkModes(recipe,state){
 if(!ELECTRIC_FACILITIES.has(recipe.facility)||!recipe.workload||recipe.seconds)return null;
 const ability=workers[recipe.facility]?.[0], family=recipeFamily(recipe)||(ability==='Perfumery'?'Dewy':null);
 const entries=state.workerCounts?.[ability];
 const specified=entries&&Object.values(entries).some(v=>v!==''&&v!==null&&v!==undefined);
 const familyCount=family?state.familyCounts?.[family]:undefined;
 const familyUnavailable=familyCount!==''&&familyCount!==null&&familyCount!==undefined&&Number(familyCount)<=0;
 const levels=familyUnavailable?[]:(specified?[1,2,3,4].filter(level=>Number(entries[level])>0):[3]).filter(level=>possibleWorkerLevel(recipe,ability,level));
 const candidates=levels.map(level=>({level,seconds:speed(recipe,{skill:level,bonus:!['Dance Pad Polisher','Aniipod Maker'].includes(recipe.facility),electric:false})}));
 candidates.sort((a,b)=>a.seconds-b.seconds);
 const efficiency=Math.max(.01,Math.min(1.2,Number(state.power?.efficiencyPercent??120)/100));
 return {ability,family,manual:candidates[0]||null,electric:speed(recipe,{electric:true,powerEfficiency:efficiency}),efficiency};
}
