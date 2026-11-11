import {findAniimoExample} from './aniimo-examples.js';

export const TEAM_ABILITIES=['Fire','Grass','Water','Earth','Lightning','Ice','Wind','Dark','Light','Hauling','Artisanship','Leisure','Perfumery'];
const COLORS={Fire:'#e34b58',Grass:'#4fac78',Water:'#398ddd',Earth:'#ad9570',Lightning:'#d3af1d',Ice:'#46b9cf',Wind:'#35bfa6',Dark:'#8355b6',Light:'#e8a024',Hauling:'#5f83c9',Artisanship:'#66aa53',Leisure:'#dc648e',Perfumery:'#bd7ac9'};
const LETTERS={Playful:'P',Judicious:'J',Faithful:'F',Tenacious:'T',Instinctive:'I',Energetic:'E',Nimble:'N',Practical:'S'};

// Field work and hauling are separately reserved minimums; they cannot be
// silently combined with the dedicated production-facility assignments.
export function summarizeTeam(team){
 const abilities=new Map(TEAM_ABILITIES.map(ability=>[ability,{ability,count:0,plus:false,groups:[],jobs:[]}]));
 for(const group of team.groups){const a=abilities.get(group.ability);if(a){a.count+=group.count;a.groups.push(group)}}
 for(const job of team.jobs){const a=abilities.get(job.ability);if(a)a.jobs.push(job)}
 for(const a of abilities.values())if(a.jobs.length){a.count++;a.plus=true}
 const hauling=abilities.get('Hauling');hauling.count++;hauling.plus=true;
 return {abilities:[...abilities.values()],count:[...abilities.values()].reduce((n,a)=>n+a.count,0)};
}

export function renderTeamView(team,{teamLimit,language,tr,gameTerm,esc,pretty,fmt,abilityImage}){
 const {abilities,count}=summarizeTeam(team);
 const dot=(ability,level)=>`<span class="team-dot" style="--ability:${COLORS[ability]||'#89979a'}">${abilityImage(ability)}${level?`<span class="team-level">${level}</span>`:''}</span>`;
 const where=items=>items.map(item=>{const [place,recipe]=item.split('|');return esc(pretty(place))+(recipe?' ('+esc(pretty(recipe))+')':'')}).join(', ');
 const cards=abilities.map(a=>{
  const groups=new Map();for(const g of a.groups){const key=JSON.stringify([g.level,g.personalities,g.family]);const old=groups.get(key)||{...g,count:0};old.count+=g.count;groups.set(key,old)}
  const chips=[...groups.values()].map(g=>`<span class="team-summary-chip" title="${esc([g.level?tr('Stufe')+' '+g.level:tr('beliebige Stufe'),g.family?tr('Familie')+' '+g.family:'',...g.personalities.map(p=>gameTerm(p,language))].filter(Boolean).join(' · '))}">${dot(a.ability,g.level)}${g.count>1?`<small>×${g.count}</small>`:''}</span>`).join('');
  const level=a.jobs.reduce((n,j)=>Math.max(n,j.level||1),0);
  const field=a.jobs.length?`<span class="team-summary-chip" title="${esc(tr('Zusätzliche Feldarbeiten'))}">${dot(a.ability,level)}<small>1+</small></span>`:'';
  const haul=a.ability==='Hauling'?`<span class="team-summary-chip" title="${esc(tr('Transport'))}">${dot('Hauling',null)}<small>1+</small></span>`:'';
  return `<div class="team-summary-column${a.count?'':' is-empty'}" style="--ability:${COLORS[a.ability]}"><div class="team-summary-count"><strong>${a.count}${a.plus?'+':''}</strong><small>${esc(gameTerm(a.ability,language))}</small></div><div class="team-summary-chips">${chips}${field}${haul}</div></div>`;
 }).join('');
 const rows=team.groups.map(g=>{const example=findAniimoExample(g.ability,g.level,g.family);return `<tr><td>${dot(g.ability,g.level)} ${esc(gameTerm(g.ability,language))} · ${g.level?tr('Stufe')+' '+g.level:tr('beliebige Stufe')}${g.family?' · '+tr('Familie')+' '+esc(g.family):''} ${g.personalities.map(p=>`<span class="personality-chip" title="${esc(tr('Persönlichkeit'))}">${esc(gameTerm(p,language))} (${LETTERS[p]})</span>`).join(' ')}${example?`<br><span class="aniimo-example"><img class="aniimo-portrait" src="${example.portrait}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true">${tr('Beispiel')}: ${esc(example.name)}</span>`:''}</td><td>${g.count}</td><td>${fmt(g.load)}</td><td>${where(g.where)}</td></tr>`}).join('');
 const fieldRows=abilities.filter(a=>a.jobs.length).map(a=>`<tr><td>${dot(a.ability,Math.max(...a.jobs.map(j=>j.level||1)))} ${esc(gameTerm(a.ability,language))}</td><td>1+</td><td>?</td><td>${a.jobs.map(j=>`${tr(j.step)} · ${esc(pretty(j.facility))}`).join(', ')}</td></tr>`).join('');
 return `<article class="card team-panel"><h3>${tr('Aniimo-Team')}</h3><p>${tr('Jedes manuell betriebene Produktionsgebäude erhält ein eigenes Aniimo. Pausen sind nicht eingerechnet.')}</p><div class="team-total"><strong>${count}+</strong> / ${teamLimit??'?'}</div>${teamLimit!==undefined&&count>teamLimit?`<div class="warning">${tr('Das empfohlene Team überschreitet das RV-Limit; der Plan ist personell nicht abgesichert.')}</div>`:''}<div class="team-summary-grid">${cards}</div><details class="team-details"><summary>${tr('Aniimo-Team')}</summary><div class="tablewrap"><table class="team-table"><thead><tr><th>${tr('Fähigkeit und Persönlichkeit')}</th><th>${tr('Anzahl')}</th><th>${tr('Durchschnittlich belegt')}</th><th>${tr('Einsatz')}</th></tr></thead><tbody>${rows}${fieldRows}<tr><td>${dot('Hauling',null)} ${tr('Transport')} · ${tr('beliebige Stufe')}</td><td>1+</td><td>?</td><td>${tr('Transport zum Lager; tatsächlicher Bedarf unbekannt.')}</td></tr></tbody></table></div><p>${tr('Für jede benötigte Feldfähigkeit wird mindestens ein Aniimo eingeplant. Bewässerung und genaue Zeiten sind Annahmen.')}</p><p class="hint">${tr('Eigene Aniimo werden noch nicht im Optimierer berücksichtigt. Familienstufen und Persönlichkeiten werden angenommen; Pausen, Bewässerung und Wechsel sind nicht vollständig geprüft.')}</p></details></article>`;
}
