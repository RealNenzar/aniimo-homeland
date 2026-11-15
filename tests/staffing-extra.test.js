import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {buildTeam} from '../staffing.js';
import {readFileSync} from 'node:fs';

const emptyLayout={climate:{placed:[]}};
test('field watering staff is only shown when watering is planned',()=>{
 const crop={id:'crop',facility:'Farmland',seconds:2400,worker:{watered:false}};
 const rows=[{recipe:crop,units:1,rate:1}];
 assert.equal(buildTeam({rows},emptyLayout,[]).jobs.some(x=>x.step==='Watering'),false);
 crop.worker.watered=true;
 assert.equal(buildTeam({rows},emptyLayout,[]).jobs.some(x=>x.step==='Watering'),true);
});
test('manual Perfumery recommendations identify the required Dewy family',()=>{
 const recipe={id:'incense',facility:'Phonolfactory Table',workload:1000,worker:{skill:3,electric:false}};
 const team=buildTeam({rows:[{recipe,units:1,rate:1}]},emptyLayout,[]);
 assert.equal(team.groups[0].family,'Dewy');
});
test('level-four suggestions compare actual recipes, power and known family limits',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const get=id=>catalog.find(r=>r.id===id);
 const row=(id,electric=false)=>({recipe:{...get(id),worker:{skill:3,electric,powerEfficiency:1.2}},units:1,rate:1});
 const team=buildTeam({rows:[row('rough_lumber'),row('laminated_beams',true),row('bamboo_joss_stick'),row('aromathyst')]},emptyLayout,[]);
 assert.ok(team.upgrades.some(x=>x.recipe==='rough_lumber'&&x.ability==='Artisanship'&&x.personality==='Energetic'&&x.seconds4<x.seconds3));
 assert.ok(team.upgrades.some(x=>x.recipe==='laminated_beams'&&x.electric));
 assert.ok(!team.upgrades.some(x=>x.ability==='Perfumery'||x.family==='Dewy'));
});
