import highsModule from './vendor/highs/highs.mjs';

const gathering = new Set(['Mine','Well','Tidewhisper Sandcastle','Dewy House','Nimbus Bed','Starfall Hammock','Floral Windmill','Aniipod Maker']);
const shared = new Set(['Woodworking Bench','Chimney Kiln']);
const base = (id, ids) => id.startsWith('quick_') && ids.has(id.slice(6)) ? id.slice(6) : id;
const term = (coef, name) => `${coef < 0 ? '-' : '+'} ${Math.abs(coef).toPrecision(12)} ${name}`;
const expr = (terms) => terms.filter(([c]) => Math.abs(c) > 1e-12).map(([c,n]) => term(c,n)).join(' ') || '0 anchor';

export function speed(r, f) {
  if (r.seconds > 0) return r.seconds;
  const level = Math.max(1, Math.min(4, Number(f.skill) || 1));
  const need = Math.max(1, Math.min(3, r.abilityLevel || 1));
  let rate;
  if (gathering.has(r.facility)) rate = Math.max(.1, (60 + (level - need) * 30 - (need - 1) * 15) / 60);
  else { const d = level - need; rate = d < 0 ? Math.max(.25, 1 + d * .25) : d === 0 ? 1 : d + 2; }
  return r.workload / (rate * (f.bonus ? 1.2 : 1));
}

export function prepare(catalog, state) {
  const ids = new Set(catalog.map(r => r.id));
  return catalog.filter(r => {
    const f = state.facilities[r.facility];
    if (!f || !f.count || r.facilityLevel > f.level || (!r.verified && !state.unverified)) return false;
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
  const itemIds = [...items].sort(); const itemIndex = Object.fromEntries(itemIds.map((v,i)=>[v,i]));
  const sales = itemIds.map((item,i)=>({item,var:`s${i}`,price:recipes.find(r=>r.output===item && r.sellCurrency==='coins')?.sellValue||0}));
  const lines = [], integer = [];
  const objectives = {coins:[],event:[],rv:[[1,'progress']],wood:[],sand:[]};
  const hours = state.hours;
  recipes.forEach((r,i)=>{
    const f = state.facilities[r.facility], x=`x${i}`, n=`n${i}`, rate=3600/speed(r,f);
    if (!shared.has(r.facility)) { lines.push(`capacity${i}: ${expr([[1,x],[-rate,n]])} <= 0`); integer.push(n); }
    if(r.event) objectives.event.push([(r.eventPoints*r.yield + (r.seconds && r.seedCost ? 2 : 0)),x]);
    if(!r.event && r.seedCost) objectives.coins.push([-r.seedCost,x]);
    if(r.event && r.seedCost) objectives.beans ??= [],objectives.beans.push([r.seedCost,x]);
  });
  for(const facility of Object.keys(state.facilities)) {
    const vars=recipes.flatMap((r,i)=>r.facility===facility?[[shared.has(facility)?speed(r,state.facilities[facility])/3600:1,`${shared.has(facility)?'x':'n'}${i}`]]:[]);
    if(vars.length) lines.push(`facility${lines.length}: ${expr(vars)} <= ${state.facilities[facility].count}`);
  }
  for(const [i,item] of itemIds.entries()) {
    const terms=[];
    recipes.forEach((r,j)=>{
      let c=(r.output===item?r.yield:0)-(r.ingredients[item]||0);
      if(item==='wood_block' && r.facility==='Woodland') c+=r.byproductYield;
      if(item==='mineral_sand' && r.facility==='Mine') c+=r.byproductYield;
      if(c) terms.push([c,`x${j}`]);
    });
    const sale=sales[i]; if(sale.price) terms.push([-1,sale.var]);
    const rvNeed=Number(state.targets[item])||0; if(rvNeed) terms.push([-rvNeed/hours,'progress']);
    lines.push(`balance${i}: ${expr(terms)} >= ${-(state.stock[item]||0)/hours}`);
    if(item==='wood_block') objectives.wood=terms.filter(([,n])=>n.startsWith('x'));
    if(item==='mineral_sand') objectives.sand=terms.filter(([,n])=>n.startsWith('x'));
  }
  sales.forEach(s=>{if(s.price) objectives.coins.push([s.price,s.var]);});
  const coinNeed=Number(state.targets.coins)||0;
  if(coinNeed) lines.push(`rvcoins: ${expr([...objectives.coins,[-coinNeed/hours,'progress']])} >= ${-(state.stock.coins||0)/hours}`);
  if(objectives.beans?.length) lines.push(`beans: ${expr(objectives.beans)} <= ${state.beans/hours}`);
  for (let i=0;i<fixed.length;i++) lines.push(`priority${i}: ${expr(objectives[fixed[i].key])} >= ${fixed[i].value-1e-7*Math.max(1,Math.abs(fixed[i].value))}`);
  const lp=['Maximize',` goal: ${expr(objectives[objective]||[])}`,'Subject To',...lines,'Bounds',' 0 <= progress <= 1',' anchor = 0',...(integer.length?['General',...integer]:[]),'End'].join('\n');
  return {lp,recipes,sales,objectives};
}

export async function optimize(catalog,state,onProgress=()=>{}) {
  const highs=await highsModule({print:()=>{},printErr:()=>{}}), fixed=[];
  const goals=state.priorities.filter(p=>p.enabled).map(p=>p.id);
  if(!goals.length) throw Error('Bitte mindestens eine Priorität aktivieren.');
  if(goals.includes('rv') && !Object.values(state.targets).some(n=>n>0)) throw Error('Für RV-Level-up mindestens ein Zielmaterial eintragen.');
  let result,problem;
  for(const key of goals){
    onProgress(key); problem=model(catalog,state,fixed,key);
    result=highs.solve(problem.lp,{time_limit:30,mip_rel_gap:0.001});
    if(!result.Columns || !['Optimal','Time limit reached'].includes(result.Status)) throw Error(`Berechnung: ${result.Status || 'kein Ergebnis'}`);
    const value=(problem.objectives[key]||[]).reduce((n,[c,v])=>n+c*(result.Columns[v]?.Primal||0),0);
    fixed.push({key,value,status:result.Status});
  }
  return {goals:fixed,rows:problem.recipes.map((r,i)=>{const rate=result.Columns[`x${i}`]?.Primal||0;return {recipe:r,rate,shared:shared.has(r.facility),units:shared.has(r.facility)?rate*speed(r,state.facilities[r.facility])/3600:result.Columns[`n${i}`]?.Primal||0}}).filter(r=>r.rate>1e-6),sales:problem.sales.map(s=>({...s,rate:result.Columns[s.var]?.Primal||0})).filter(s=>s.rate>1e-6)};
}
