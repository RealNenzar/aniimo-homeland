import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {buildTeam} from '../staffing.js';

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
