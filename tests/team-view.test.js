import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {summarizeTeam,renderTeamView} from '../team-view.js';
test('overview counts dedicated production and separately reserved field workers',()=>{
 const team={groups:[{ability:'Water',count:2,level:3,personalities:[],family:null,where:[],load:2}],jobs:[{ability:'Water',level:1},{ability:'Water',level:2},{ability:'Grass',level:1}]};
 const summary=summarizeTeam(team);
 assert.equal(summary.count,5);
 assert.deepEqual(summary.abilities.filter(x=>x.count).map(x=>[x.ability,x.count,x.plus]),[['Grass',1,true],['Water',3,true],['Hauling',1,true]]);
});
test('details are collapsed and show one dedicated worker per facility',()=>{
 const team={groups:[{ability:'Dark',count:2,level:3,personalities:['Nimble'],family:null,where:['Jukebox Dryer|dried_strawberries'],load:1}],jobs:[]};
 const view=renderTeamView(team,{teamLimit:43,language:'en',tr:s=>s,gameTerm:s=>s,esc:s=>String(s),pretty:s=>s,fmt:n=>n,abilityImage:()=>''});
 assert.match(view,/<details class="team-details">/);
 assert.match(view,/<td>2<\/td><td>1<\/td>/);
 assert.match(view,/Jukebox Dryer/);
});
test('level-four suggestions are shown in a collapsed comparison',()=>{
 const team={groups:[],jobs:[],upgrades:[{ability:'Artisanship',personality:'Energetic',facility:'Woodworking Bench',recipe:'rough_lumber',count:1,seconds3:9.4,seconds4:7.1}]};
 const view=renderTeamView(team,{teamLimit:43,language:'de',tr:s=>s,gameTerm:s=>s,esc:s=>String(s),pretty:s=>s,fmt:n=>n,abilityImage:()=>''});
 assert.match(view,/<details class="team-details"><summary>Stufe 4: mögliche Verbesserungen/);
 assert.match(view,/rough_lumber/);assert.match(view,/9\.4 s/);assert.match(view,/7\.1 s/);
});
