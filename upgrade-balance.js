import {eventBudget} from './event-budget.js?v=0.2.23';
function balancesAfter(result,state){
 const hours=Number(state.hours)||1,totals={...state.stock};
 const add=(id,n)=>{totals[id]=(Number(totals[id])||0)+n};
 for(const row of result.rows){const r=row.recipe,units=row.rate*hours;add(r.output||r.id.replace(/^quick_/,''),units*r.yield);for(const [item,amount] of Object.entries(r.ingredients||{}))add(item,-units*amount);if(r.facility==='Woodland'&&r.byproductYield)add('wood_block',units*r.byproductYield);if(r.facility==='Mine'&&r.byproductYield)add('mineral_sand',units*r.byproductYield);if(!r.event&&r.seedCost)add('coins',-units*r.seedCost)}
 for(const sale of result.sales||[]){add(sale.item,-sale.rate*hours);add('coins',sale.rate*hours*sale.price)}
 for(const order of result.daily||[])add(order.item,-order.completed*Number(order.quantity));
 return totals;
}
export function upgradeBalance(result,state){
 const totals=balancesAfter(result,state);
 return Object.entries(state.targets||{}).filter(([,n])=>Number(n)>0).map(([item,n])=>{
  const target=Number(n),raw=totals[item]||0;
  // HiGHS fixes earlier priorities with a small relative numerical slack.
  // Snap only that slack so 399.99996 / 400 does not become a false deficit.
  const available=Math.abs(raw-target)<=Math.max(1e-7,target*2e-7)?target:raw;
  return {item,target,available,difference:available-target};
 });
}
export function upgradeForecast(result,state){
 const hours=Number(state.hours)||1,balances=upgradeBalance(result,state);if(!balances.length)return null;
 let time=0;
 for(const b of balances){const start=Number(state.stock?.[b.item])||0,need=b.target-start,rate=(b.available-start)/hours;if(need>1e-8){if(rate<=1e-9)return {reachable:false};time=Math.max(time,need/rate)}}
 const estimate=balances.map(b=>{const start=Number(state.stock?.[b.item])||0;return start+(b.available-start)*(time/hours)});
 if(estimate.some((amount,i)=>amount+1e-7<balances[i].target))return {reachable:false};
 const eventSeedRate=result.rows.reduce((n,row)=>n+(row.recipe.event?(Number(row.recipe.seedCost)||0)*row.rate:0),0);
 if(state.eventBudgetMode==='recurring'&&eventSeedRate*time>eventBudget({...state,hours:time})+1e-7)return {reachable:false,reason:'finite'};
 // Solver tolerances can put the computed finish a few microseconds after
 // the modeled end; that is not extrapolation of finite orders or stock.
 if(time>hours&&time<=hours+Math.max(1e-7,hours*2e-7))time=hours;
 if(time>hours+1e-7){
   const totals=balancesAfter(result,state);
   const depleted=Object.entries(totals).some(([id,end])=>{const start=Number(state.stock?.[id])||0;return start+(end-start)*time/hours < -1e-6});
   const eventBudgetExceeded=eventSeedRate*time>eventBudget(state.eventBudgetMode==='recurring'?{...state,hours:time}:state)+1e-7;
   const finiteOrders=(result.daily||[]).some(order=>order.completed>0);
   if(depleted||eventBudgetExceeded||finiteOrders)return {reachable:false,reason:'finite'};
 }
 return {reachable:true,extrapolated:time>hours+1e-7,hours:time,balances:balances.map(b=>{const start=Number(state.stock?.[b.item])||0,amount=start+(b.available-start)*(time/hours);return {...b,available:amount,difference:amount-b.target}})};
}
