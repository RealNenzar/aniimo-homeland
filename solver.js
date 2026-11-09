import highsModule from './vendor/highs/highs.mjs';
import { facilityGroups } from './facilities.js';
import {workers} from './worker-abilities.js';
import { ELECTRIC_FACILITIES, GENERATOR_WATTS, MODULE_RV, facilityWatts } from './power.js';

export const RV_ANIIMO_LIMITS=[0,8,11,14,17,20,22,24,26,28,30,32,34,36,38,40,42,43,44,45,46,47];
const gathering = new Set(['Mine','Well','Tidewhisper Sandcastle','Dewy House','Nimbus Bed','Starfall Hammock','Floral Windmill','Aniipod Maker']);
const shared = new Set();
const base = (id, ids) => id.startsWith('quick_') && ids.has(id.slice(6)) ? id.slice(6) : id;
const term = (coef, name) => `${coef < 0 ? '-' : '+'} ${Math.abs(coef).toPrecision(12)} ${name}`;
const expr = (terms) => terms.filter(([c]) => Math.abs(c) > 1e-12).map(([c,n]) => term(c,n)).join(' ') || '0 anchor';

export function speed(r, f) {
  if (r.seconds > 0) return r.seconds;
  if (f.electric && ELECTRIC_FACILITIES.has(r.facility)) {
    const efficiency = Number(f.powerEfficiency) || 0;
    return efficiency > 0 ? r.workload / ((1 + .25 * (Math.max(1, Math.min(3, r.abilityLevel || 1)) - 1)) * efficiency) : Infinity;
  }
  const level = Math.max(1, Math.min(4, Number(f.skill) || 1));
  const need = Math.max(1, Math.min(3, r.abilityLevel || 1));
  let rate;
  if (gathering.has(r.facility)) rate = Math.max(.1, (60 + (level - need) * 30 - (need - 1) * 15) / 60);
  else { const d = level - need; rate = d < 0 ? Math.max(.25, 1 + d * .25) : d === 0 ? 1 : d + 2; }
  return r.workload / (rate * (f.bonus ? 1.2 : 1));
}

export function prepare(catalog, state) {
  const ids = new Set(catalog.map(r => r.id));
  return catalog.flatMap(r => facilityGroups(state.facilities[r.facility]).flatMap((f,group) => {
    const ability=workers[r.facility]?.[0];
    const entries=ability && state.workerCounts?.[ability];
    const configured=entries && Object.values(entries).some(v=>v!==''&&v!==null&&v!==undefined);
    const levels=state.autoWorkers && !r.seconds && ability && configured?[1,2,3,4].filter(l=>Number(entries[l])>0):[state.autoWorkers?3:Number(f.skill)||1];
    const modes=levels.map(skill=>({...r,group,worker:state.autoWorkers?{...f,skill,bonus:!['Dance Pad Polisher','Aniipod Maker'].includes(r.facility),electric:false,ability,limited:!!configured}:f}));
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
}

export function model(catalog, state, fixed = [], objective = 'coins') {
  const recipes = prepare(catalog,state);
  const items = new Set();
  recipes.forEach(r => { items.add(r.output); Object.keys(r.ingredients).forEach(i=>items.add(i)); if(r.byproductYield && r.facility==='Woodland') items.add('wood_block'); if(r.byproductYield && r.facility==='Mine') items.add('mineral_sand'); });
  Object.keys(state.stock).filter(x=>x!=='coins').forEach(x=>items.add(x));
  Object.keys(state.targets).filter(x=>x!=='coins').forEach(x=>items.add(x));
  const dailyEnabled=(state.priorities||[]).some(p=>p.id==='daily'&&p.enabled);
  const daily=(state.daily||[]).filter(d=>d.item && Number(d.count)>0 && Number(d.quantity)>0);daily.forEach(d=>items.add(d.item));
  const itemIds = [...items].sort(); const itemIndex = Object.fromEntries(itemIds.map((v,i)=>[v,i]));
  const sales = itemIds.map((item,i)=>({item,var:`s${i}`,price:recipes.find(r=>r.output===item && r.sellCurrency==='coins')?.sellValue||0}));
  const lines = [], integer = [], electrical=[];
  const paceMode=!!state.paceMode;
  const objectives = {coins:[],event:[],rv:[[1,paceMode?'pace':'progress']],wood:[],sand:[],workers:[],daily:[],daily_priority:[]};
  daily.forEach((d,i)=>{objectives.daily.push([1,`d${i}`]);if(d.priority)objectives.daily_priority.push([1,`d${i}`]);integer.push(`d${i}`)});
  const fieldAbilities=new Map();
  recipes.forEach((r,i)=>{
    if(!r.seconds||!['Farmland','Woodland'].includes(r.facility))return;
    const steps=(state.growerSteps||[]).filter(x=>x.name===r.id&&x.facility===r.facility);
    const needed=new Set(steps.map(x=>x.ability));needed.add('Water');
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
      else if(!r.seconds) objectives.workers.push([-1,n]);
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
  const resident=new Set(['Tidewhisper Sandcastle','Dewy House','Nimbus Bed','Starfall Hammock','Floral Windmill']);
  for(const [ability,levels] of Object.entries(state.workerCounts||{}))for(let level=1;level<=4;level++){
    const count=levels[level];if(count===''||count===null||count===undefined)continue;
    const terms=recipes.flatMap((r,i)=>r.worker.limited&&!r.worker.electric&&r.worker.ability===ability&&r.worker.skill===level?[[resident.has(r.facility)?1:speed(r,r.worker)/3600,`${resident.has(r.facility)?'n':'x'}${i}`]]:[]);
    if(terms.length)lines.push(`crew${lines.length}: ${expr(terms)} <= ${Math.max(0,Math.floor(Number(count)||0))}`);
  }
  if(electrical.length){const p=state.power||{},rv=Number(state.currentRv)||0,max=rv>=18?3:rv>=15?2:rv>=12?1:0,efficiency=Math.max(.01,Math.min(1.2,Number(p.efficiencyPercent??120)/100));integer.push('generatorCount');lines.push(`power: ${expr([...electrical,[-(Number(p.watts)||0)/efficiency,'generatorCount']])} <= 0`);lines.push(`generatorLimit: generatorCount <= ${max}`);objectives.workers.push([-.001,'generatorCount']);}
  const combinedAbilities=new Set([...fieldAbilities.keys(),...[...climateModes.values()].map(m=>m.ability),...(electrical.length?['Lightning']:[])]);
  for(const ability of combinedAbilities){
    const levels=state.workerCounts?.[ability];if(!levels||!Object.values(levels).some(x=>x!==''&&x!==null&&x!==undefined))continue;
    const count=Object.values(levels).reduce((n,x)=>n+Math.max(0,Math.floor(Number(x)||0)),0);
    const terms=recipes.flatMap((r,i)=>r.worker.limited&&!r.worker.electric&&r.worker.ability===ability?[[resident.has(r.facility)?1:speed(r,r.worker)/3600,`${resident.has(r.facility)?'n':'x'}${i}`]]:[]);
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
    const terms=recipes.flatMap((r,i)=>r.seconds||r.worker.electric?[]:[[resident.has(r.facility)?1:speed(r,r.worker)/3600,`${resident.has(r.facility)?'n':'x'}${i}`]]);
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
    if(paceMode){const delta=(Number(state.stock[item])||0)-rvNeed;if(delta)terms.push([delta,'pace']);lines.push(`balance${i}: ${expr(terms)} >= 0`)}
    else{if(rvNeed)terms.push([-rvNeed/hours,'progress']);lines.push(`balance${i}: ${expr(terms)} >= ${-(state.stock[item]||0)/hours}`)}
    if(item==='wood_block') objectives.wood=terms.filter(([,n])=>n.startsWith('x'));
    if(item==='mineral_sand') objectives.sand=terms.filter(([,n])=>n.startsWith('x'));
  }
  sales.forEach(s=>{if(s.price) objectives.coins.push([s.price,s.var]);});
  const coinNeed=Number(state.targets.coins)||0;
  if(paceMode){const delta=(Number(state.stock.coins)||0)-coinNeed;if(coinNeed||delta)lines.push(`rvcoins: ${expr([...objectives.coins,[delta,'pace']])} >= 0`)}
  else if(coinNeed) lines.push(`rvcoins: ${expr([...objectives.coins,[-coinNeed/hours,'progress']])} >= ${-(state.stock.coins||0)/hours}`);
  if(objectives.beans?.length)lines.push(paceMode?`beans: ${expr([...objectives.beans,[-(Number(state.beans)||0),'pace']])} <= 0`:`beans: ${expr(objectives.beans)} <= ${state.beans/hours}`);
  const order=(state.priorities||[]).filter(p=>p.enabled).map(p=>p.id);
  const coinIndex=order.indexOf('coins'), eventIndex=order.indexOf('event');
  for (let i=0;i<fixed.length;i++) {
    const item=fixed[i];
    const allowEventTrade=item.key==='coins' && state.event && coinIndex>=0 && eventIndex>coinIndex && Number(state.eventCoinTolerance)>0;
    const floor=allowEventTrade && item.value>0 ? item.value*(1-Math.min(1,Math.max(0,Number(state.eventCoinTolerance)))) : item.value;
    lines.push(`priority${i}: ${expr(objectives[item.key])} >= ${floor-1e-7*Math.max(1,Math.abs(floor))}`);
  }
  const lp=['Maximize',` goal: ${expr(objectives[objective]||[])}`,'Subject To',...lines,'Bounds',' 0 <= progress <= 1',...(paceMode?[' 0 <= pace <= 3600']:[]),' anchor = 0',...[...fieldAbilities.values()].map(v=>` 0 <= ${v} <= 1`),...[...climateModes.values()].map(m=>` 0 <= ${m.variable} <= 1`),...daily.map((d,i)=>` 0 <= d${i} <= ${dailyEnabled?Math.max(0,Math.floor(Number(d.count))):0}`),...(integer.length?['General',...integer]:[]),'End'].join('\n');
  return {lp,recipes,sales,objectives,electrical,daily};
}

export async function optimize(catalog,state,onProgress=()=>{}) {
  if (state.power?.enabled) {
    const p=state.power, rv=Number(state.currentRv)||0;
    if (rv<12 || p.module<1 || p.module>5 || rv<MODULE_RV[p.module] || p.level>p.module || p.watts<=0 || p.watts>GENERATOR_WATTS[p.level]) throw Error('Stromnetz prüfen: RV-Level, Power Module, Generatoren oder Poles überschreiten die Freischaltung.');
  }
  const highs=await highsModule({print:()=>{},printErr:()=>{}}), fixed=[];
  const goals=state.priorities.filter(p=>p.enabled).flatMap(p=>p.id==='daily'&&(state.daily||[]).some(d=>d.priority&&Number(d.count)>0)?['daily_priority','daily']:[p.id]);
  if(goals.includes('daily')&&!(state.daily||[]).some(d=>Number(d.count)>0&&Number(d.quantity)>0)) throw Error('Bitte mindestens einen Eventauftrag eintragen.');
  if(!goals.length) throw Error('Bitte mindestens eine Priorität aktivieren.');
  if(goals.includes('rv') && !Object.values(state.targets).some(n=>n>0)) throw Error('Für RV-Level-up mindestens ein Zielmaterial eintragen.');
  let result,problem,fastestUpgrade=null;
  if(goals[0]==='rv'){
    const missing=Object.entries(state.targets||{}).some(([item,need])=>Number(need)>(Number(state.stock?.[item])||0));
    if(!missing)fastestUpgrade={hours:0,status:'Optimal'};
    else{
      onProgress('rv');const paceState={...state,paceMode:true,daily:[],priorities:[{id:'rv',enabled:true}]};
      const paceProblem=model(catalog,paceState,[],'rv');const solved=highs.solve(paceProblem.lp,{time_limit:30,mip_rel_gap:.001});
      const pace=solved.Columns?.pace?.Primal||0;
      fastestUpgrade=pace>1e-9?{hours:1/pace,status:solved.Status||'Unknown'}:{hours:null,status:solved.Status||'Unknown'};
    }
  }
  for(const key of goals){
    onProgress(key); problem=model(catalog,state,fixed,key);
    result=highs.solve(problem.lp,{time_limit:30,mip_rel_gap:0.001});
    if(!result.Columns || !['Optimal','Time limit reached'].includes(result.Status)) throw Error(`Berechnung: ${result.Status || 'kein Ergebnis'}`);
    const value=(problem.objectives[key]||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0);
    fixed.push({key,value,status:result.Status});
  }
  // Among plans with the same prioritized result, prefer fewer staffed stations.
  if(state.autoWorkers){const alternative=model(catalog,state,fixed,'workers'), solved=highs.solve(alternative.lp,{time_limit:30,mip_rel_gap:.001});if(solved.Columns && solved.Status==='Optimal'){problem=alternative;result=solved;}}
  const draw=problem.electrical.reduce((sum,[w,n])=>sum+w*(result.Columns[n]?.Primal||0),0);
  const efficiency=Math.max(.01,Math.min(1.2,Number(state.power?.efficiencyPercent??120)/100));
  const generators=draw?Math.ceil(draw*efficiency/state.power.watts-1e-9):0;
  return {fastestUpgrade,goals:fixed.map(g=>({...g,maximum:g.value,value:(problem.objectives[g.key]||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0)})),daily:problem.daily.map((d,i)=>({...d,completed:Math.round(result.Columns[`d${i}`]?.Primal||0)})),power:{draw,generators,output:generators*(state.power?.watts||0)},rows:problem.recipes.map((r,i)=>{const rate=result.Columns[`x${i}`]?.Primal||0;const load=rate*speed(r,r.worker)/3600;return {recipe:r,rate,shared:shared.has(r.facility),units:shared.has(r.facility)?load:Math.min(result.Columns[`n${i}`]?.Primal||0,Math.ceil(load-1e-7))}}).filter(r=>r.rate>1e-6),sales:problem.sales.map(s=>({...s,rate:result.Columns[s.var]?.Primal||0})).filter(s=>s.rate>1e-6)};
}
