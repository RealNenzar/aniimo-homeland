// Four Wonder Dailies each award 200 Beans once per day. The recurring mode
// uses their average rate; the reset time and starting stock are unknown.
export function eventDailyBeansPerHour(state){
 if(!state.event)return 0;
 const keys=['friend','orders','outing','sale'];
 return keys.filter(key=>state.dailyFuture?.[key]===true).length*200/24;
}

export function eventBudget(state){
 if(state.eventBudgetMode==='recurring')return eventDailyBeansPerHour(state)*Math.max(0,Number(state.hours)||0);
 const earned=Object.values(state.dailyRewards||{}).filter(Boolean).length*200;
 const future=state.event?Object.values(state.dailyFuture||{}).filter(Boolean).length*200*Math.floor((Number(state.hours)||0)/24):0;
 return Math.max(0,Number(state.beans)||0)+earned+future;
}
