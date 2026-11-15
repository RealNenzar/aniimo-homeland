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
test('team details group production and field work by ability and mark only matching level-four opportunities',()=>{
 const group=(ability,level,id)=>({ability,count:1,level,personalities:[],family:null,where:[`Facility|${id}`],load:1});
 const team={groups:[group('Dark',3,'dark_a'),group('Fire',3,'fire_a'),group('Dark',4,'dark_b'),group('Fire',3,'fire_b')],
  jobs:[{ability:'Fire',level:1,step:'fire_field',facility:'Field'},{ability:'Dark',level:1,step:'dark_field',facility:'Field'}],
  upgrades:[{ability:'Fire',facility:'Facility',recipe:'fire_a',family:null,seconds3:30,seconds4:10,count:1},{ability:'Dark',facility:'Facility',recipe:'dark_b',family:null,seconds3:30,seconds4:10,count:1}]};
 const view=renderTeamView(team,{teamLimit:43,language:'de',tr:s=>s,gameTerm:s=>s,esc:s=>String(s),pretty:s=>s,fmt:n=>n,abilityImage:()=>''});
 const body=view.split('<tbody>')[1].split('</tbody>')[0];
 assert.ok(body.indexOf('fire_a')<body.indexOf('fire_b'));assert.ok(body.indexOf('fire_b')<body.indexOf('fire_field'));
 assert.ok(body.indexOf('fire_field')<body.indexOf('dark_a'));assert.ok(body.indexOf('dark_a')<body.indexOf('dark_b'));assert.ok(body.indexOf('dark_b')<body.indexOf('dark_field'));
 const rows=body.match(/<tr>.*?<\/tr>/g);const fire=rows.find(x=>x.includes('fire_a')),noUpgrade=rows.find(x=>x.includes('fire_b')),alreadyFour=rows.find(x=>x.includes('dark_b'));
 assert.match(fire,/class="level-four-marker"/);assert.match(fire,/Stufe 3 30 s · Stufe 4 10 s/);
 assert.doesNotMatch(noUpgrade,/level-four-marker/);assert.doesNotMatch(alreadyFour,/level-four-marker/);
});
