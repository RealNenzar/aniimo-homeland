export function eventBudget(state){
 const earned=Object.values(state.dailyRewards||{}).filter(Boolean).length*200;
 const future=state.event?Object.values(state.dailyFuture||{}).filter(Boolean).length*200*Math.floor((Number(state.hours)||0)/24):0;
 return Math.max(0,Number(state.beans)||0)+earned+future;
}
