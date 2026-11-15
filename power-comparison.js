import {speed,workerLevelsForRecipe} from './solver.js?v=0.2.30';
import {workers} from './worker-abilities.js';
import {recipeFamily} from './families.js';
import {ELECTRIC_FACILITIES} from './power.js';

// The fastest eligible level is a comparison, not a promise that the same
// individual Aniimo is free to work multiple facilities simultaneously.
export function compareWorkModes(recipe,state){
 if(!ELECTRIC_FACILITIES.has(recipe.facility)||!recipe.workload||recipe.seconds)return null;
 const ability=workers[recipe.facility]?.[0], family=recipeFamily(recipe)||(ability==='Perfumery'?'Dewy':null);
 const entries=state.workerCounts?.[ability];
 const familyCount=family?state.familyCounts?.[family]:undefined;
 const familyUnavailable=familyCount!==''&&familyCount!==null&&familyCount!==undefined&&Number(familyCount)<=0;
 const levels=familyUnavailable?[]:workerLevelsForRecipe(recipe,ability,entries);
 const candidates=levels.map(level=>({level,seconds:speed(recipe,{skill:level,bonus:!['Dance Pad Polisher','Aniipod Maker'].includes(recipe.facility),electric:false})}));
 candidates.sort((a,b)=>a.seconds-b.seconds);
 const efficiency=Math.max(.01,Math.min(1.2,Number(state.power?.efficiencyPercent??120)/100));
 const baseline={level:3,seconds:speed(recipe,{skill:3,bonus:!['Dance Pad Polisher','Aniipod Maker'].includes(recipe.facility),electric:false})};
 const reference=candidates[0]&&candidates[0].seconds<baseline.seconds?candidates[0]:baseline;
 return {ability,family,manual:candidates[0]||null,reference,electric:speed(recipe,{electric:true,powerEfficiency:efficiency}),efficiency};
}
