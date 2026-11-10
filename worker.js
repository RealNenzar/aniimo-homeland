import { optimize } from './solver.js?v=0.2.13';
import {layoutPlan,packClimate} from './layout.js?v=0.2.13';
self.onmessage=async e=>{
  try{
    const state={...e.data.state,climateReserve:{}};let result,verified=false;
    const reconcile=rows=>{
      if(!state.climateDefinitions)return false;
      const layout=layoutPlan(rows,state.plotCount,{storage:false});
      const climate=packClimate(layout,state.currentRv,state.climateDefinitions);
      const actual={};for(const p of climate.placed)actual[p.mode]=(actual[p.mode]||0)+1;
      let changed=false;for(const [mode,count] of Object.entries(actual))if(count>(state.climateReserve[mode]||1)){state.climateReserve[mode]=count;changed=true}
      return changed;
    };
    for(let attempt=0;attempt<6;attempt++){
      let retry=false;
      result=await optimize(e.data.catalog,state,key=>self.postMessage({progress:key,round:attempt+1}),{deferTieBreak:rows=>{retry=reconcile(rows);return retry}});
      if(retry||reconcile(result.rows))continue;
      verified=true;break;
    }
    result.climateCapacityVerified=verified;
    self.postMessage({result});
  }catch(error){self.postMessage({error:error.message});}
};
