import highsModule from './vendor/highs/highs.mjs';
import { facilityGroups } from './facilities.js';
import {workers} from './worker-abilities.js';
import {recipeFamily} from './families.js';
import { ELECTRIC_FACILITIES, GENERATOR_WATTS, MODULE_RV, facilityWatts } from './power.js';

export const RV_ANIIMO_LIMITS=[0,8,11,14,17,20,22,24,26,28,30,32,34,36,38,40,42,43,44,45,46,47];
const gathering = new Set(['Mine','Well','Tidewhisper Sandcastle','Dewy House','Nimbus Bed','Starfall Hammock','Floral Windmill','Aniipod Maker','Dance Pad Polisher']);
const shared = new Set();
const isField = r => r.seconds > 0 && ['Farmland','Woodland'].includes(r.facility);
// Known work levels for the only families able to use family-bound recipes.
// Counts per family and level are not known and are not inferred from these sets.
export const FAMILY_WORK_LEVELS=Object.freeze({
  Celestis:[1,3,4],Iris:[1,3,4],Nimbi:[1,3,4],Flutternym:[1,3,4],
  Dewy:[1,3],Susuta:[1,2,3,4],Shelly:[1,2,3,4],Coinwisp:[1,3,4],Sugarfish:[1,3,4]
});
export function possibleWorkerLevel(recipe, ability, level) {
  const family=recipeFamily(recipe);
  if(family && ability==='Leisure' && FAMILY_WORK_LEVELS[family])return FAMILY_WORK_LEVELS[family].includes(level);
  // Perfumery is exclusive to Dewy and Fragrancier in the current known roster.
  if(ability==='Perfumery')return [1,3].includes(level);
  return true;
}

const base = (id, ids) => id.startsWith('quick_') && ids.has(id.slice(6)) ? id.slice(6) : id;
const term = (coef, name) => `${coef < 0 ? '-' : '+'} ${Math.abs(coef).toPrecision(12)} ${name}`;
const expr = (terms) => terms.filter(([c]) => Math.abs(c) > 1e-12).map(([c,n]) => term(c,n)).join(' ') || '0 anchor';

export function speed(r, f) {
  if (r.seconds > 0) return isField(r) && f.watered === true ? r.seconds * 0.75 : r.seconds;
  if (f.electric && ELECTRIC_FACILITIES.has(r.facility)) {
    const efficiency = Number(f.powerEfficiency) || 0;
    return efficiency > 0 ? r.workload / ((1 + .25 * (Math.max(1, Math.min(3, r.abilityLevel || 1)) - 1)) * efficiency) : Infinity;
  }
  const level = Math.max(1, Math.min(4, Number(f.skill) || 1));
  const need = Math.max(1, Math.min(3, r.abilityLevel || 1));
  let rate;
  if (gathering.has(r.facility)) rate = Math.max(.1, (60 + (level - 1) * 30 - (need - 1) * 15) / 60);
  else { const d = level - need; rate = d < 0 ? Math.max(.25, 1 + d * .25) : d === 0 ? 1 : d + 2; }
  return r.workload / (rate * (f.bonus ? 1.2 : 1));
}

export function prepare(catalog, state) {
  const ids = new Set(catalog.map(r => r.id));
  const available = catalog.flatMap(r => facilityGroups(state.facilities[r.facility]).flatMap((f,group) => {
    const ability=workers[r.facility]?.[0];
    const entries=ability && state.workerCounts?.[ability];
    const configured=entries && Object.values(entries).some(v=>v!==''&&v!==null&&v!==undefined);
    const levels=(state.autoWorkers && !isField(r) && ability && configured?[1,2,3,4].filter(l=>Number(entries[l])>0):[state.autoWorkers?3:Number(f.skill)||1]).filter(level=>possibleWorkerLevel(r,ability,level));
    const modes=levels.map(skill=>({...r,group,worker:state.autoWorkers?{...f,skill,watered:state.wateringMode==='full',bonus:!['Dance Pad Polisher','Aniipod Maker'].includes(r.facility),electric:false,ability,limited:!!configured}:{...f,watered:state.wateringMode==='full'}}));
    if(state.autoWorkers && state.power?.enabled && ELECTRIC_FACILITIES.has(r.facility) && r.workload>0) modes.push({...r,group,worker:{...f,skill:3,electric:true,powerEfficiency:Math.max(.01,Math.min(1.2,Number(state.power?.efficiencyPercent??120)/100)),ability,limited:false}});
    return modes;
  })).filter(r => {
    const f = r.worker;
    if (!f.count || r.facilityLevel > f.level || (!r.verified && !state.unverified)) return false;
    if ((state.disabled||[]).includes(r.id)) return false;
    if (r.event && (!state.event || r.event !== 'magical_wonder_night')) return false;
    if (r.module) { const [name, level] = r.module.split(':'); if ((state.modules[name] || 0) < Number(level)) return false; }
    if (state.special.includes(r.id) && !state.notes.includes(r.id)) return false;
    return speed(r, f) > 0;
  }).map(r => ({...r, output:base(r.id,ids)}));
  // Prefer an available quick variant only for the same building group and worker mode.
  // The normal recipe remains available when the quick variant is locked or disabled.
  const quickModes = new Set(available.filter(r=>r.id.startsWith('quick_') && r.output!==r.id)
    .map(r=>JSON.stringify([r.facility,r.group,r.output,r.worker.skill,!!r.worker.electric])));
  return available.filter(r=>r.id.startsWith('quick_') || !quickModes.has(JSON.stringify([r.facility,r.group,r.output,r.worker.skill,!!r.worker.electric])));
}

export function model(catalog, state, fixed = [], objective = 'coins') {
  const recipes = prepare(catalog,state);
  const items = new Set();
  recipes.forEach(r => { items.add(r.output); Object.keys(r.ingredients).forEach(i=>items.add(i)); if(r.byproductYield && r.facility==='Woodland') items.add('wood_block'); if(r.byproductYield && r.facility==='Mine') items.add('mineral_sand'); });
  Object.keys(state.stock).filter(x=>x!=='coins').forEach(x=>items.add(x));
  Object.keys(state.targets).filter(x=>x!=='coins').forEach(x=>items.add(x));
  const reserveEnabled=(state.priorities||[]).some(p=>p.id==='reserve'&&p.enabled);
  const reserveTargets=reserveEnabled?(state.reserveTargets||{}):{};
  Object.keys(reserveTargets).filter(x=>x!=='coins').forEach(x=>items.add(x));
  const dailyEnabled=(state.priorities||[]).some(p=>p.id==='daily'&&p.enabled);
  const daily=(state.daily||[]).filter(d=>d.item && Number(d.count)>0 && Number(d.quantity)>0);daily.forEach(d=>items.add(d.item));
  const itemIds = [...items].sort(); const itemIndex = Object.fromEntries(itemIds.map((v,i)=>[v,i]));
  const sales = itemIds.map((item,i)=>({item,var:`s${i}`,price:recipes.find(r=>r.output===item && r.sellCurrency==='coins')?.sellValue||0}));
  const lines = [], integer = [], electrical=[];
  const reserveVars=Object.entries(reserveTargets).filter(([item,need])=>item!=='coins'&&Number(need)>0).map(([item,need],i)=>({item,need:Number(need),variable:`reserve${i}`}));
  const reserveByItem=new Map(reserveVars.map(x=>[x.item,x]));
  const objectives = {coins:[],event:[],rv:[[1,'progress']],reserve:reserveVars.map(x=>[1/reserveVars.length,x.variable]),wood:[],sand:[],workers:[],daily:[],daily_priority:[]};
  daily.forEach((d,i)=>{objectives.daily.push([1,`d${i}`]);if(d.priority)objectives.daily_priority.push([1,`d${i}`]);integer.push(`d${i}`)});
  const fieldAbilities=new Map();
  recipes.forEach((r,i)=>{
    if(!r.seconds||!['Farmland','Woodland'].includes(r.facility))return;
    const steps=(state.growerSteps||[]).filter(x=>x.name===r.id&&x.facility===r.facility);
    const needed=new Set(steps.map(x=>x.ability));if(state.wateringMode==='full')needed.add('Water');
    for(const ability of needed){if(!fieldAbilities.has(ability)){const v=`field${fieldAbilities.size}`;fieldAbilities.set(ability,v);integer.push(v)}
      lines.push(`fieldLink${lines.length}: ${expr([[1,`n${i}`],[-r.worker.count,fieldAbilities.get(ability)]])} <= 0`);
    }
  });
  const climateModes=new Map(),climateAbility={Warm:'Fire',Scorching:'Fire',Cool:'Ice',Freeze:'Ice',Adequate:'Light'};
  recipes.forEach((r,i)=>{const ability=climateAbility[r.environment];if(!ability)return;let mode=climateModes.get(r.environment);if(!mode){mode={variable:`climate${climateModes.size}`,ability,count:Math.max(1,Number(state.climateReserve?.[r.environment])||1)};climateModes.set(r.environment,mode);integer.push(mode.variable)}lines.push(`climateLink${lines.length}: ${expr([[1,`n${i}`],[-r.worker.count,mode.variable]])} <= 0`)});
  const hours = state.hours;
  recipes.forEach((r,i)=>{
    const f = r.worker, x=`x${i}`, n=`n${i}`, rate=3600/speed(r,f);
    if (!shared.has(r.facility)) {
      lines.push(`capacity${i}: ${expr([[1,x],[-rate,n]])} <= 0`); integer.push(n);
      if(r.worker.electric) {electrical.push([facilityWatts(r.facility,r.worker.level),n]);objectives.workers.push([-.0001,n]);}
      else if(!isField(r)) objectives.workers.push([-1,n]);
      else objectives.workers.push([-.0001,n]);
    }
    if(r.event) objectives.event.push([(r.eventPoints*r.yield + (r.seconds && r.seedCost ? 2 : 0)),x]);
    if(!r.event && r.seedCost) objectives.coins.push([-r.seedCost,x]);
    if(r.event && r.seedCost) objectives.beans ??= [],objectives.beans.push([r.seedCost,x]);
  });
  for(const facility of Object.keys(state.facilities)) {
    facilityGroups(state.facilities[facility]).forEach((f, group) => {
      let vars=[];
      if(shared.has(facility)) {
        for(const electric of [false,true]) {
          const tasks=recipes.flatMap((r,i)=>r.facility===facility && r.group===group && !!r.worker.electric===electric?[[speed(r,r.worker)/3600,`x${i}`]]:[]);
          if(tasks.length){const n=`g${lines.length}`;integer.push(n);lines.push(`shared${lines.length}: ${expr([...tasks,[-1,n]])} <= 0`);vars.push([1,n]);if(electric){electrical.push([facilityWatts(facility,f.level),n]);objectives.workers.push([-.0001,n]);}else objectives.workers.push([-1,n]);}
        }
      } else vars=recipes.flatMap((r,i)=>r.facility===facility && r.group===group?[[1,`n${i}`]]:[]);
      if(vars.length) lines.push(`facility${lines.length}: ${expr(vars)} <= ${f.count}`);
    });
  }
  // Perfumery also uses the Dewy family, sharing its members with leisure work.
  for(const [family,count] of Object.entries(state.familyCounts||{})) {
    if(count===''||count===null||count===undefined)continue;
    const terms=recipes.flatMap((r,i)=>!r.worker.electric&&(recipeFamily(r)===family||(family==='Dewy'&&workers[r.facility]?.[0]==='Perfumery'))?[[1,`n${i}`]]:[]);
    if(terms.length)lines.push(`family${lines.length}: ${expr(terms)} <= ${Math.max(0,Math.floor(Number(count)||0))}`);
  }
  for(const [ability,levels] of Object.entries(state.workerCounts||{}))for(let level=1;level<=4;level++){
    const count=levels[level];if(count===''||count===null||count===undefined)continue;
    const terms=recipes.flatMap((r,i)=>r.worker.limited&&!r.worker.electric&&r.worker.ability===ability&&r.worker.skill===level?[[1,`n${i}`]]:[]);
    if(terms.length)lines.push(`crew${lines.length}: ${expr(terms)} <= ${Math.max(0,Math.floor(Number(count)||0))}`);
  }
  if(electrical.length){const p=state.power||{},rv=Number(state.currentRv)||0,max=rv>=18?3:rv>=15?2:rv>=12?1:0,efficiency=Math.max(.01,Math.min(1.2,Number(p.efficiencyPercent??120)/100));integer.push('generatorCount');lines.push(`power: ${expr([...electrical,[-(Number(p.watts)||0)/efficiency,'generatorCount']])} <= 0`);lines.push(`generatorLimit: generatorCount <= ${max}`);objectives.workers.push([-.001,'generatorCount']);}
  const combinedAbilities=new Set([...fieldAbilities.keys(),...[...climateModes.values()].map(m=>m.ability),...(electrical.length?['Lightning']:[])]);
  for(const ability of combinedAbilities){
    const levels=state.workerCounts?.[ability];if(!levels||!Object.values(levels).some(x=>x!==''&&x!==null&&x!==undefined))continue;
    const count=Object.values(levels).reduce((n,x)=>n+Math.max(0,Math.floor(Number(x)||0)),0);
    const terms=recipes.flatMap((r,i)=>r.worker.limited&&!r.worker.electric&&r.worker.ability===ability?[[1,`n${i}`]]:[]);
    if(fieldAbilities.has(ability))terms.push([1,fieldAbilities.get(ability)]);
    for(const m of climateModes.values())if(m.ability===ability)terms.push([m.count,m.variable]);
    if(ability==='Lightning'&&electrical.length)terms.push([1,'generatorCount']);
    if(terms.length)lines.push(`supportCrew${lines.length}: ${expr(terms)} <= ${count}`);
  }
  const hauling=state.workerCounts?.Hauling;
  if(hauling&&Object.values(hauling).some(x=>x!==''&&x!==null&&x!==undefined)&&Object.values(hauling).every(x=>(Number(x)||0)<=0)){
    const terms=recipes.map((_,i)=>[1,`n${i}`]);if(terms.length)lines.push(`noHauling: ${expr(terms)} <= 0`);
  }
  const rv=Number(state.currentRv)||0;
  if(rv>=2&&rv<=RV_ANIIMO_LIMITS.length){
    const terms=recipes.flatMap((r,i)=>isField(r)||r.worker.electric?[]:[[1,`n${i}`]]);
    if(electrical.length)terms.push([1,'generatorCount']);for(const v of fieldAbilities.values())terms.push([1,v]);for(const m of climateModes.values())terms.push([m.count,m.variable]);
    if(terms.length)lines.push(`homelandCrew: ${expr(terms)} <= ${RV_ANIIMO_LIMITS[rv-1]-1}`);
  }
  for(const [i,item] of itemIds.entries()) {
    const terms=[];
    recipes.forEach((r,j)=>{
      let c=(r.output===item?r.yield:0)-(r.ingredients[item]||0);
      if(item==='wood_block' && r.facility==='Woodland') c+=r.byproductYield;
      if(item==='mineral_sand' && r.facility==='Mine') c+=r.byproductYield;
      if(c) terms.push([c,`x${j}`]);
    });
    daily.forEach((d,j)=>{if(d.item===item)terms.push([-Number(d.quantity)/hours,`d${j}`])});
    const sale=sales[i]; if(sale.price) terms.push([-1,sale.var]);
    const rvNeed=Number(state.targets[item])||0;
    const reserve=reserveByItem.get(item);
    if(reserve)lines.push(`reserveBalance${i}: ${expr([...terms,[-reserve.need/hours,reserve.variable]])} >= ${-(state.stock[item]||0)/hours}`);
    if(rvNeed)terms.push([-rvNeed/hours,'progress']);lines.push(`balance${i}: ${expr(terms)} >= ${-(state.stock[item]||0)/hours}`);
    if(item==='wood_block') objectives.wood=terms.filter(([,n])=>n.startsWith('x'));
    if(item==='mineral_sand') objectives.sand=terms.filter(([,n])=>n.startsWith('x'));
  }
  sales.forEach(s=>{if(s.price) objectives.coins.push([s.price,s.var]);});
  objectives.coin_recovery=objectives.coins;
  const coinNeed=Number(state.targets.coins)||0;
  if(coinNeed) lines.push(`rvcoins: ${expr([...objectives.coins,[-coinNeed/hours,'progress']])} >= ${-(state.stock.coins||0)/hours}`);
  if(objectives.beans?.length)lines.push(`beans: ${expr(objectives.beans)} <= ${state.beans/hours}`);
  const order=(state.priorities||[]).filter(p=>p.enabled).map(p=>p.id);
  const coinIndex=order.indexOf('coins'), eventIndex=order.indexOf('event'), dailyIndex=order.indexOf('daily');
  for (let i=0;i<fixed.length;i++) {
    const item=fixed[i];
    const reserveIndex=order.indexOf('reserve');
    const currentIndex=['workers','coin_recovery'].includes(objective)?order.length:order.indexOf(objective==='daily_priority'?'daily':objective);
    // Daily orders are event objectives too; permit the event allowance once
    // either event objective is reached, never for a preceding priority.
    const allowEventTrade=item.key==='coins' && state.event && coinIndex>=0 && [eventIndex,dailyIndex].some(index=>index>coinIndex&&index<=currentIndex);
    const allowReserveTrade=item.key==='coins' && coinIndex>=0 && reserveIndex>coinIndex && reserveIndex<=currentIndex && reserveVars.length>0;
    const tolerance=Math.max(allowEventTrade?Number(state.eventCoinTolerance)||0:0,allowReserveTrade?Number(state.reserveCoinTolerance??.1)||0:0);
    const floor=item.value>0 && !item.strict ? item.value*(1-Math.min(1,Math.max(0,tolerance))) : item.value;
    lines.push(`priority${i}: ${expr(objectives[item.key])} >= ${floor-1e-7*Math.max(1,Math.abs(floor))}`);
  }
  const lp=['Maximize',` goal: ${expr(objectives[objective]||[])}`,'Subject To',...lines,'Bounds',' 0 <= progress <= 1',...reserveVars.map(r=>` 0 <= ${r.variable} <= 1`),' anchor = 0',...[...fieldAbilities.values()].map(v=>` 0 <= ${v} <= 1`),...[...climateModes.values()].map(m=>` 0 <= ${m.variable} <= 1`),...daily.map((d,i)=>` 0 <= d${i} <= ${dailyEnabled?Math.max(0,Math.floor(Number(d.count))):0}`),...(integer.length?['General',...integer]:[]),'End'].join('\n');
  return {lp,recipes,sales,objectives,electrical,daily};
}

let highsInstance;
function loadHighs(){return highsInstance ||= highsModule({print:()=>{},printErr:()=>{}}).catch(error=>{highsInstance=null;throw error});}
function solutionRows(problem,result){return problem.recipes.map((r,i)=>{const rate=result.Columns[`x${i}`]?.Primal||0;const load=rate*speed(r,r.worker)/3600;return {recipe:r,rate,shared:shared.has(r.facility),units:shared.has(r.facility)?load:Math.min(result.Columns[`n${i}`]?.Primal||0,Math.ceil(load-1e-7))}}).filter(r=>r.rate>1e-6)}
function solvedPower(problem,result,state){
 const draw=problem.electrical.reduce((sum,[w,n])=>sum+w*(result.Columns[n]?.Primal||0),0);
 const efficiency=Math.max(.01,Math.min(1.2,Number(state.power?.efficiencyPercent??120)/100));
 const generators=draw?Math.ceil(draw*efficiency/state.power.watts-1e-9):0;
 return {draw,generators,output:generators*(state.power?.watts||0)};
}
export async function optimize(catalog,state,onProgress=()=>{},options={}) {
  if (state.power?.enabled) {
    const p=state.power, rv=Number(state.currentRv)||0;
    if (rv<12 || p.module<1 || p.module>5 || rv<MODULE_RV[p.module] || p.level>p.module || p.watts<=0 || p.watts>GENERATOR_WATTS[p.level]) throw Error('Stromnetz prüfen: RV-Level, Power Module, Generatoren oder Poles überschreiten die Freischaltung.');
  }
  const highs=await loadHighs(), fixed=[];
  const solveOptions=()=>{const remaining=options.deadline?(options.deadline-Date.now())/1000:Infinity;if(remaining<=0)throw Error('Berechnung: Time limit reached');return {time_limit:Math.max(.05,Math.min(options.solveTimeLimit||30,remaining)),mip_rel_gap:.001}};
  const hasTime=()=>!options.deadline||Date.now()<options.deadline;
  const goals=state.priorities.filter(p=>p.enabled&&(p.id!=='reserve'||Object.values(state.reserveTargets||{}).some(n=>Number(n)>0))).flatMap(p=>p.id==='daily'&&(state.daily||[]).some(d=>d.priority&&Number(d.count)>0)?['daily_priority','daily']:[p.id]);
  if(goals.includes('daily')&&!(state.daily||[]).some(d=>Number(d.count)>0&&Number(d.quantity)>0)) throw Error('Bitte mindestens einen Eventauftrag eintragen.');
  if(!goals.length) throw Error('Bitte mindestens eine Priorität aktivieren.');
  if(goals.includes('rv') && !Object.values(state.targets).some(n=>n>0)) throw Error('Für RV-Level-up mindestens ein Zielmaterial eintragen.');
  let result,problem;
  for(const key of goals){
    if(key==='daily'&&fixed.at(-1)?.key==='daily_priority'&&(state.daily||[]).filter(d=>d.item&&Number(d.count)>0&&Number(d.quantity)>0).every(d=>d.priority)){const prev=fixed.at(-1);fixed.push({key,value:prev.value,status:prev.status});continue}
    onProgress(key); problem=model(catalog,state,fixed,key);
    result=highs.solve(problem.lp,solveOptions());
    if(!result.Columns || !['Optimal','Time limit reached'].includes(result.Status)) throw Error(`Berechnung: ${result.Status || 'kein Ergebnis'}`);
    const value=(problem.objectives[key]||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0);
    fixed.push({key,value,status:result.Status});
  }
  // After lower priorities use their allowance, recover any coins still possible
  // without reducing those priorities. Only then minimize staffing.
  const deferTieBreak=options.deferTieBreak?.(solutionRows(problem,result),solvedPower(problem,result,state))===true;
  let tieFixed=fixed;
  const coinGoal=fixed.find(g=>g.key==='coins');
  const actualCoins=coinGoal?(problem.objectives.coins||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0):0;
  if(!deferTieBreak&&coinGoal&&actualCoins<coinGoal.value-1e-5&&hasTime()){
    onProgress('coins');const recovery=model(catalog,state,fixed,'coin_recovery'),solved=highs.solve(recovery.lp,solveOptions());
    if(solved.Columns&&solved.Status==='Optimal'){
      const recovered=recovery.objectives.coins.reduce((n,[c,v])=>n+c*(solved.Columns[v]?.Primal||0),0);
      if(recovered+1e-5>=actualCoins){problem=recovery;result=solved;tieFixed=[...fixed,{key:'coins',value:recovered,strict:true}];}
    }
  }
  // Among plans with the same prioritized result, prefer fewer staffed stations.
  if(state.autoWorkers&&!deferTieBreak&&hasTime()){onProgress('workers');const alternative=model(catalog,state,tieFixed,'workers'), solved=highs.solve(alternative.lp,solveOptions());if(solved.Columns && solved.Status==='Optimal'){problem=alternative;result=solved;}}
  return {goals:fixed.map(g=>({...g,maximum:g.value,value:(problem.objectives[g.key]||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0)})),daily:problem.daily.map((d,i)=>({...d,completed:Math.round(result.Columns[`d${i}`]?.Primal||0)})),power:solvedPower(problem,result,state),rows:solutionRows(problem,result),sales:problem.sales.map(s=>({...s,rate:result.Columns[s.var]?.Primal||0})).filter(s=>s.rate>1e-6)};
}
