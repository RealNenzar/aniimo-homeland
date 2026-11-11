import {eventBudget} from './event-budget.js?v=0.2.23';

// Each retry re-solves every selected priority over its own horizon. The
// result is never labelled complete unless that exact plan meets the RV goal.
// Later RV upgrades typically need several days. Starting there avoids
// spending the time budget on several predictably incomplete optimizations.
// This is a search starting point, not a claim about the shortest duration.
export function initialHorizonFor(state){
 if(!(state.priorities||[]).some(p=>p.id==='rv'&&p.enabled))return 24;
 const rv=Number(state.currentRv)||0;
 return rv>=15?96:rv>=10?48:24;
}
export async function solveWithAutoHorizon(original,solve,{initialHours,maxHours=8760,maxAttempts=6,maxMilliseconds=90000,now=()=>Date.now()}={}){
 const deadline=now()+maxMilliseconds,rvEnabled=(original.priorities||[]).some(p=>p.id==='rv'&&p.enabled);
 let hours=Math.min(maxHours,Math.max(1,Number(initialHours)||initialHorizonFor(original))),last=null,attempts=0;
 while(attempts<maxAttempts){
  if(now()>=deadline)break;
  const current={...original,hours};current.beans=eventBudget(current);attempts++;
  let result;
  try{result=await solve(current,deadline,attempts)}catch(error){
   if(last&&(now()>=deadline||error.message==='Berechnung: Time limit reached'))return {...last,horizonStatus:'time_limit'};
   throw error;
  }
  last={...result,planningHours:hours,horizonIterations:attempts};
  if(!rvEnabled)return {...last,horizonStatus:'not_requested'};
  const rv=result.goals?.find(g=>g.key==='rv');
  if(rv&&Number(rv.value)>=1-1e-5)return {...last,horizonStatus:result.climateCapacityVerified===false||result.goals.some(g=>g.status&&g.status!=='Optimal')?'unverified':'complete'};
  if(hours>=maxHours)break;
  const fraction=Math.max(0,Number(rv?.value)||0);
  const multiplier=Math.max(1.5,Math.min(4,1/Math.max(.01,fraction)));
  hours=Math.min(maxHours,Math.ceil(hours*multiplier*100)/100);
 }
 if(!last)throw Error('Berechnung: Time limit reached');
 return {...last,horizonStatus:now()>=deadline?'time_limit':'limit'};
}
