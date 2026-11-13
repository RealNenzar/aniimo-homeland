import { optimize } from './solver.js?v=0.2.25';
import {stableLayoutPlan,STORAGE_LIMITS} from './layout.js?v=0.2.25';
import {poleLimit} from './power.js';
import {solveWithAutoHorizon} from './auto-horizon.js?v=0.2.25';
self.onmessage=async e=>{
  try{
    const original=e.data.state;
    const result=await solveWithAutoHorizon(original,async(candidate,deadline,horizon)=>{
      const state={...candidate,climateReserve:{}};let result,verified=false;
      const cache=new Map();
      const reconcile=(rows,power)=>{
        if(!state.climateDefinitions)return false;
        const key=JSON.stringify([rows,power.generators]);let placed=cache.get(key);
        if(!placed){placed=stableLayoutPlan(rows,state.plotCount,{previous:state.previousLayout||[],rv:state.currentRv||1,definitions:state.climateDefinitions,generatorCount:power.generators||0,poleCap:poleLimit(state.power?.module),storageLimit:STORAGE_LIMITS[Math.max(0,Math.min(STORAGE_LIMITS.length-1,(state.currentRv||1)-1))]});cache.set(key,placed)}
        const climate=placed.climate;
        const actual={};for(const p of climate.placed)actual[p.mode]=(actual[p.mode]||0)+1;
        let changed=false;for(const [mode,count] of Object.entries(actual))if(count>(state.climateReserve[mode]||1)){state.climateReserve[mode]=count;changed=true}
        return changed;
      };
      for(let attempt=0;attempt<6;attempt++){
        let retry=false;
        result=await optimize(e.data.catalog,state,key=>self.postMessage({progress:key,round:attempt+1,horizon}),{deadline,solveTimeLimit:20,deferTieBreak:(rows,power)=>{retry=reconcile(rows,power);return retry}});
        if(retry||reconcile(result.rows,result.power))continue;
        verified=true;break;
      }
      return {...result,climateCapacityVerified:verified};
    });
    self.postMessage({result});
  }catch(error){self.postMessage({error:error.message});}
};
