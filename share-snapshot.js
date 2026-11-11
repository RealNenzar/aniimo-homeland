import {validateSharePlan} from './share-plan.js';

const MAX_ARRAY=10000,MAX_NODES=150000,MAX_DEPTH=40,MAX_STRING=1000,MAX_NUMBER=1e15;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=(x,min=0,max=MAX_NUMBER)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const list=x=>Array.isArray(x)&&x.length<=MAX_ARRAY;
const str=x=>typeof x==='string'&&x.length<=MAX_STRING;
const fail=()=>{throw Error('Invalid result snapshot')};

// Result snapshots are untrusted JSON supplied by another player. Validate the
// complete tree before checking the specific fields consumed by the renderer.
function validateTree(root){
 const stack=[[root,0]];let count=0;
 while(stack.length){const [v,depth]=stack.pop();if(++count>MAX_NODES||depth>MAX_DEPTH)fail();
  if(v===null||typeof v==='boolean')continue;
  if(typeof v==='number'){if(!finite(v,-MAX_NUMBER))fail();continue}
  if(typeof v==='string'){if(!str(v))fail();continue}
  if(!isObject(v)&&!Array.isArray(v))fail();
  if(Array.isArray(v)&&!list(v))fail();
  for(const [key,child] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(key)||key.length>MAX_STRING)fail();stack.push([child,depth+1])}
 }
}
function validateRect(item){
 if(!isObject(item)||!str(item.name)||!Number.isInteger(item.plot)||item.plot<1||item.plot>16||
    !finite(item.x,0,80)||!finite(item.y,0,60)||!finite(item.w,0.01,80)||!finite(item.h,0.01,60)||
    item.x+item.w>80||item.y+item.h>60)fail();
 if('recipe' in item&&!str(item.recipe))fail();
 if('mode' in item&&!str(item.mode))fail();
}
function validateResult(result){
 if(!isObject(result)||!list(result.rows)||!list(result.goals)||!list(result.sales)||!list(result.daily))fail();
 for(const row of result.rows){
  if(!isObject(row)||!finite(row.rate,0,1e9)||!finite(row.units,0,1e4)||!isObject(row.recipe))fail();
  const r=row.recipe;
  if(!str(r.id)||!str(r.facility)||!isObject(r.worker)||!isObject(r.ingredients)||!finite(r.yield,0,1e9))fail();
  if(!finite(r.worker.level,1,100))fail();
  for(const key of ['output','environment','event','module'])if(r[key]!=null&&!str(r[key]))fail();
  for(const key of ['seconds','workload','seedCost','byproductYield'])if(r[key]!=null&&!finite(r[key],0,1e9))fail();
  for(const n of Object.values(r.ingredients))if(!finite(n,0,1e9))fail();
 }
 const goals=new Set(['rv','coins','event','wood','sand','reserve','daily','daily_priority','workers']);
 for(const goal of result.goals)if(!isObject(goal)||!goals.has(goal.key)||!finite(goal.value,-1e12)||('maximum' in goal&&!finite(goal.maximum,-1e12))||('status' in goal&&!str(goal.status)))fail();
 for(const sale of result.sales)if(!isObject(sale)||!str(sale.item)||!finite(sale.rate,0,1e9)||!finite(sale.price,0,1e9))fail();
 for(const d of result.daily)if(!isObject(d)||!str(d.item)||!finite(d.completed,0,1e9)||!finite(d.quantity,0,1e9))fail();
 if(!isObject(result.power)||!finite(result.power.generators,0,100)||!finite(result.power.draw,0,1e12)||!finite(result.power.output,0,1e12))fail();
 if('planningHours' in result&&!finite(result.planningHours,0,1e6))fail();
}
function validateLayout(bundle){
 if(!isObject(bundle)||!isObject(bundle.layout)||!isObject(bundle.climate)||!isObject(bundle.grid))fail();
 const {layout,climate,grid}=bundle;
 if(!Number.isInteger(layout.plots)||layout.plots<1||layout.plots>16||!list(layout.placed)||!list(layout.unplaced))fail();
 for(const p of layout.placed)validateRect(p);
 for(const p of layout.unplaced)if(!isObject(p)||!str(p.name))fail();
 if(!list(climate.placed)||!list(climate.uncovered)||typeof climate.complete!=='boolean')fail();
 for(const p of climate.placed)validateRect(p);
 for(const p of climate.uncovered)if(!isObject(p)||!str(p.name)||!str(p.recipe))fail();
 if(!list(grid.placed)||!finite(grid.generatorsPlaced,0,100)||!finite(grid.poles,0,10000)||!finite(grid.uncovered,0,10000)||typeof grid.complete!=='boolean')fail();
 for(const p of grid.placed)validateRect(p);
}
export function validateResultSnapshot(snapshot){
 validateTree(snapshot);
 if(!isObject(snapshot)||snapshot.schema!==1||!str(snapshot.plannerVersion)||!isObject(snapshot.state)||'resultSnapshot' in snapshot.state)fail();
 validateSharePlan(snapshot.state);validateResult(snapshot.result);validateLayout(snapshot.layout);
 return snapshot;
}
export function createResultSnapshot(result,state,layout,plannerVersion){
 const {resultSnapshot:ignored,...cleanState}=state;
 // Solver objects can contain optional fields with value undefined. JSON omits
 // those fields; remove them before validation without coercing NaN/Infinity.
 const stripUndefined=(value,depth=0)=>{
  if(depth>MAX_DEPTH)fail();
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(item=>{if(item===undefined)fail();return stripUndefined(item,depth+1)});
  const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null)fail();
  const result={};
  for(const [key,child] of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))fail();
   if(child!==undefined)result[key]=stripUndefined(child,depth+1);
  }
  return result;
 };
 const snapshot=stripUndefined({schema:1,plannerVersion,state:cleanState,result,layout});
 return validateResultSnapshot(snapshot);
}
export function getResultSnapshot(plan){
 if(!plan||plan.resultSnapshot==null)return null;
 return validateResultSnapshot(plan.resultSnapshot);
}
const IGNORE=new Set(['language','theme','layoutZoom','hours','calculatedAt','resultSnapshot']);
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!IGNORE.has(k)).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
export function snapshotStatus(snapshot,currentState,plannerVersion){
 return {settingsChanged:JSON.stringify(canonical(snapshot.state))!==JSON.stringify(canonical(currentState)),versionChanged:snapshot.plannerVersion!==plannerVersion};
}
