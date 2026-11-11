import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {eventBudget,eventDailyBeansPerHour} from '../event-budget.js';

test('four selected dailies supply an average of 800 beans per 24 hours',()=>{
 const state={event:true,eventBudgetMode:'recurring',hours:48,dailyFuture:{friend:true,orders:true,outing:true,sale:true}};
 assert.equal(eventDailyBeansPerHour(state),800/24);
 assert.equal(eventBudget(state),1600);
 assert.equal(eventBudget({...state,hours:12}),400);
});
test('recurring event uses only the four selected dailies and assumes no starting stock',()=>{
 const state={event:true,eventBudgetMode:'recurring',hours:24,beans:900,dailyRewards:{friend:true},dailyFuture:{friend:true,other:true}};
 assert.equal(eventBudget(state),200);
 assert.equal(eventBudget({...state,event:false}),0);
});
test('older callers keep their explicit finite budget semantics',()=>{
 const state={event:true,hours:48,beans:100,dailyRewards:{friend:true},dailyFuture:{friend:true,sale:true}};
 assert.equal(eventBudget(state),1100);
});
