import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutPlan,placeClimate,packClimate,coverageSegments} from '../layout.js';

const defs=[
 {name:'Cooling Unit',unlocks:{1:1},counts:[2]},
 {name:'Sunlamp',unlocks:{1:1},counts:[2]},
 {name:'Heat Furnace',unlocks:{1:1},counts:[2]},
];
const crop=(id,environment,units)=>({recipe:{facility:'Farmland',id,seconds:2400,environment,worker:{level:5,electric:false}},units});

test('neutral crops may share a plot with climate-dependent crops',()=>{
 const layout=layoutPlan([crop('plain','',24),crop('hot','Scorching',24)],1);
 assert.equal(layout.placed.length,48);
 assert.equal(layout.unplaced.length,0);
});

test('a neutral crop inside a cooling area does not block a required cooler',()=>{
 const placed=[];
 for(let y=0;y<56;y+=8)for(let x=0;x<80;x+=8){
  if(x===32&&y===24)continue;
  placed.push({name:'Farmland',plot:1,x,y,w:8,h:8,recipe:'wheat',environment:x===40&&y===24?'Cool':''});
 }
 const climate=placeClimate({plots:1,placed},1,defs);
 assert.equal(climate.complete,true);assert.equal(climate.placed.length,1);assert.equal(climate.uncovered.length,0);
});

test('sunlamp and cooler can overlap without changing each other',()=>{
 const placed=[
  {name:'Wall',plot:1,x:32,y:0,w:48,h:60},
  {name:'Wall',plot:1,x:0,y:32,w:32,h:28},
  {name:'Farmland',plot:1,x:0,y:0,w:8,h:8,environment:'Cool',recipe:'rose'},
  {name:'Farmland',plot:1,x:24,y:24,w:8,h:8,environment:'Adequate',recipe:'lavender'},
 ];
 const climate=placeClimate({plots:1,placed},1,defs);
 assert.equal(climate.complete,true);
 assert.deepEqual(climate.placed.map(p=>p.mode).sort(),['Adequate','Cool']);
 const areas=climate.placed.map(p=>coverageSegments(p,18).find(a=>a.plot===1));
 assert.ok(areas[0].x<areas[1].x+areas[1].w&&areas[1].x<areas[0].x+areas[0].w);
 assert.ok(areas[0].y<areas[1].y+areas[1].h&&areas[1].y<areas[0].y+areas[0].h);
});

test('compact climate packing keeps temperature zones separated and covers every required crop',()=>{
 const layout=layoutPlan([crop('plain','',12),crop('hot','Scorching',8),crop('light','Adequate',8),crop('cold','Freeze',8)],3);
 const climate=packClimate(layout,1,defs);
 assert.equal(layout.unplaced.length,0);assert.equal(climate.uncovered.length,0);
 const areas=climate.placed.filter(p=>['Scorching','Warm','Cool','Freeze'].includes(p.mode)).flatMap(p=>coverageSegments(p,18));
 for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
  const a=areas[i],b=areas[j];if(a.plot!==b.plot)continue;
  assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'temperature areas overlap');
 }
});
