import { optimize } from './solver.js?v=0.2.5';
import {layoutPlan,packClimate} from './layout.js';
self.onmessage=async e=>{
  try{
    const state={...e.data.state,climateReserve:{}};let result,verified=false;
    for(let attempt=0;attempt<6;attempt++){
      result=await optimize(e.data.catalog,state,key=>self.postMessage({progress:key}));
      if(!state.climateDefinitions){verified=true;break}
      const layout=layoutPlan(result.rows,state.plotCount,{storage:false});
      const climate=packClimate(layout,state.currentRv,state.climateDefinitions);
      const actual={};for(const p of climate.placed)actual[p.mode]=(actual[p.mode]||0)+1;
      let changed=false;for(const [mode,count] of Object.entries(actual))if(count>(state.climateReserve[mode]||1)){state.climateReserve[mode]=count;changed=true}
      if(!changed){verified=true;break}
    }
    result.climateCapacityVerified=verified;
    self.postMessage({result});
  }catch(error){self.postMessage({error:error.message});}
};
