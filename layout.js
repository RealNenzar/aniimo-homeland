// Plot order and approximate facility footprints, in game tiles (Aniimax data).
export const PLOT_GRID = [[13,14,15,16],[12,7,8,9],[11,4,3,6],[10,2,1,5]];
export const FOOTPRINTS = {'Farmland':[2,2],'Woodland':[4,4],'Mine':[5,5],'Well':[2,2],'Tidewhisper Sandcastle':[5,5],'Dewy House':[2,2],'Nimbus Bed':[5,5],'Starfall Hammock':[5,5],'Floral Windmill':[5,5],'Carousel Mill':[5.5,5.5],'Crafting Table':[4,4],'Claw Game Cooker':[3.5,3.5],'Simmering Pot':[1.5,1.5],'Phonolfactory Table':[3.5,3.5],'Bouncy Brew Keg':[3,3],'Blazing Stove':[2.5,1.75],'Pickling Jar':[2.5,2],'Jukebox Dryer':[2.5,2.5],'Joy Wheel Loom':[4,4],'Woodworking Bench':[2,1.5],'Chimney Kiln':[5.5,5.5],'Dance Pad Polisher':[2.5,2.5],'Aniipod Maker':[4.5,4.5],'Storage Unit':[2,2]};

export function layoutPlan(rows, boughtPlots, {storage=false}={}) {
  const count=Math.max(1,Math.min(16,Number(boughtPlots)||1));
  const plots=Array.from({length:count},()=>Array.from({length:30},()=>new Uint8Array(40)));
  const climateByPlot=Array(count).fill(null);
  const grouped=new Map(), objects=[], unplaced=[];
  for(const row of rows){
    const key=`${row.recipe.facility}:${row.recipe.group}:${row.recipe.worker.electric?'e':'a'}`;
    if(row.shared){const group=grouped.get(key)||[];group.push(row);grouped.set(key,group)}
    else for(let i=0;i<Math.round(row.units);i++) objects.push({name:row.recipe.facility,recipe:row.recipe.id,environment:row.recipe.environment||'',level:row.recipe.worker.level,electric:!!row.recipe.worker.electric});
  }
  for(const group of grouped.values()){
    const bins=[];
    for(const row of group){let remaining=row.units;
      while(remaining>1e-7){let bin=bins.find(x=>x.load<1-1e-7);if(!bin){bin={load:0,recipes:[]};bins.push(bin)}
        const amount=Math.min(1-bin.load,remaining);bin.load+=amount;bin.recipes.push(row.recipe.id);remaining-=amount;}
    }
    for(const bin of bins){const row=group[0];objects.push({name:row.recipe.facility,recipe:bin.recipes.join(' / '),environment:'',level:row.recipe.worker.level,electric:!!row.recipe.worker.electric})}
  }
  if(storage&&rows.length)objects.push({name:'Storage Unit',recipe:'',environment:'',level:1,electric:false,infrastructure:true});
  objects.sort((a,b)=>{const x=FOOTPRINTS[a.name]||[2,2],y=FOOTPRINTS[b.name]||[2,2];return Number(b.infrastructure)-Number(a.infrastructure)||Number(b.electric)-Number(a.electric)||(a.environment||'').localeCompare(b.environment||'')||y[0]*y[1]-x[0]*x[1]});
  const placed=[];
  for(const item of objects){
    const size=FOOTPRINTS[item.name];if(!size){unplaced.push(item);continue}
    const w=Math.ceil(size[0]*2), h=Math.ceil(size[1]*2);let found=false;
    const climateSensitive=item.name==='Farmland'||item.name==='Woodland'||!!item.environment;
    const mode=item.environment||'neutral';
    const order=Array.from({length:count},(_,i)=>i).sort((a,b)=>Number(climateByPlot[b]===mode)-Number(climateByPlot[a]===mode)||a-b);
    for(const pi of order){if(found)break;if(climateSensitive&&climateByPlot[pi]!==null&&climateByPlot[pi]!==mode)continue;
    for(let y=3;y<=30-h&&!found;y++)for(let x=3;x<=40-w&&!found;x++){
      let free=true;for(let yy=y;yy<y+h&&free;yy++)for(let xx=x;xx<x+w;xx++)if(plots[pi][yy][xx]){free=false;break}
      if(!free)continue;
      for(let yy=y;yy<y+h;yy++)plots[pi][yy].fill(1,x,x+w);
      placed.push({...item,plot:pi+1,x,y,w,h});if(climateSensitive)climateByPlot[pi]=mode;found=true;
    }}
    if(!found)unplaced.push(item);
  }
  return {plots:count,placed,unplaced};
}

// Separate climate modes cannot share a device. Never claim coverage if a candidate
// reaches a crop needing a different environment; this is intentionally conservative.
export function placeClimate(layout, rv, definitions) {
  const position=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*40,y:y*30}])));
  const occupied=new Set(),key=(x,y)=>`${x},${y}`;
  const objects=layout.placed.map(p=>{const o=position.get(p.plot);return {...p,gx:o.x+p.x,gy:o.y+p.y}});
  for(const p of objects)for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)occupied.add(key(p.gx+x,p.gy+y));
  const modes={Scorching:'Heat Furnace',Warm:'Heat Furnace',Freeze:'Cooling Unit',Cool:'Cooling Unit',Adequate:'Sunlamp'};
  const nodes=[],remaining=[],used={};
  const inRange=(node,target)=>node.x+9>target.gx&&node.x-9<target.gx+target.w&&node.y+9>target.gy&&node.y-9<target.gy+target.h;
  const crop=p=>p.name==='Farmland'||p.name==='Woodland'||!!p.environment;
  for(const mode of Object.keys(modes)){
    const targets=objects.filter(p=>p.environment===mode), type=modes[mode];
    const def=definitions.find(d=>d.name===type);const level=Number(rv)||0;
    const cap=def&&level>=Number(def.unlocks['1'])?(def.counts[Math.min(level-1,def.counts.length-1)]||0):0;
    while(targets.some(t=>!nodes.some(n=>n.mode===mode&&inRange(n,t))) && (used[type]||0)<cap){
      const size=type==='Cooling Unit'?4:2;let best=null;
      for(let plot=1;plot<=layout.plots;plot++){const o=position.get(plot);
        for(let y=0;y<=30-size;y++)for(let x=0;x<=40-size;x++){
          let free=true;for(let yy=0;yy<size&&free;yy++)for(let xx=0;xx<size;xx++)if(occupied.has(key(o.x+x+xx,o.y+y+yy))){free=false;break}
          if(!free)continue;
          const candidate={plot,x,y,w:size,h:size,name:type,recipe:mode,mode,level:1,electric:false,infrastructure:true,xg:o.x+x+size/2,yg:o.y+y+size/2};
          const area={x:candidate.xg,y:candidate.yg};
          if(objects.some(t=>crop(t)&&t.environment!==mode&&inRange(area,t)))continue;
          const hits=targets.filter(t=>!nodes.some(n=>n.mode===mode&&inRange(n,t))&&inRange(area,t)).length;
          if(hits && (!best||hits>best.hits))best={...candidate,hits};
        }
      }
      if(!best)break;
      const o=position.get(best.plot);for(let y=0;y<best.h;y++)for(let x=0;x<best.w;x++)occupied.add(key(o.x+best.x+x,o.y+best.y+y));
      nodes.push({...best,x:best.xg,y:best.yg,localX:best.x,localY:best.y});used[type]=(used[type]||0)+1;
    }
    remaining.push(...targets.filter(t=>!nodes.some(n=>n.mode===mode&&inRange(n,t))));
  }
  return {placed:nodes.map(n=>({...n,x:n.localX,y:n.localY})),uncovered:remaining.map(t=>({name:t.name,recipe:t.recipe,environment:t.environment})),complete:remaining.length===0};
}

// Greedy, conservative half-tile grid. Coverage is not a proof of in-game placement.
export function placePower(layout, generatorCount, poleCap) {
  const position=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*40,y:y*30}])));
  const occupied=new Set();
  const key=(x,y)=>`${x},${y}`;
  for(const p of layout.placed){const origin=position.get(p.plot);for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)occupied.add(key(origin.x+p.x+x,origin.y+p.y+y));}
  const targets=layout.placed.filter(p=>p.electric).map(p=>{const o=position.get(p.plot);return {...p,gx:o.x+p.x,gy:o.y+p.y}});
  const nodes=[];let generatorsPlaced=0;
  const touches=(node,t)=>node.x+node.radius>t.gx && node.x-node.radius<t.gx+t.w && node.y+node.radius>t.gy && node.y-node.radius<t.gy+t.h;
  const uncovered=()=>targets.filter(t=>!nodes.some(n=>touches(n,t)));
  function choose(size,radius,mustConnect){
    const remaining=uncovered();let best=null;
    for(let plot=1;plot<=layout.plots;plot++){const o=position.get(plot);
      for(let y=0;y<=30-size;y+=1)for(let x=0;x<=40-size;x+=1){
        let free=true;for(let yy=0;yy<size&&free;yy++)for(let xx=0;xx<size;xx++)if(occupied.has(key(o.x+x+xx,o.y+y+yy))){free=false;break}
        if(!free)continue;
        const node={x:o.x+x+size/2,y:o.y+y+size/2,radius};
        if(mustConnect && !nodes.some(n=>Math.abs(n.x-node.x)<n.radius+radius && Math.abs(n.y-node.y)<n.radius+radius))continue;
        const hits=remaining.filter(t=>touches(node,t)).length;
        const distance=remaining.length?Math.min(...remaining.map(t=>Math.max(Math.abs(node.x-(t.gx+t.w/2)),Math.abs(node.y-(t.gy+t.h/2))))):0;
        const score=hits*10000-distance;
        if(!best||score>best.score)best={plot,x,y,w:size,h:size,...node,score};
      }
    }
    if(best){const o=position.get(best.plot);for(let y=0;y<size;y++)for(let x=0;x<size;x++)occupied.add(key(o.x+best.x+x,o.y+best.y+y));nodes.push(best)}
    return best;
  }
  for(let i=0;i<generatorCount;i++){const p=choose(2,11,nodes.length>0);if(!p)break;p.name='Crackle Generator';p.recipe='Power';generatorsPlaced++}
  let poles=0;
  while(generatorsPlaced===generatorCount && nodes.length && uncovered().length && poles<poleCap){const p=choose(3,7,true);if(!p)break;p.name='Crackle Power Pole';p.recipe='Power';poles++}
  return {placed:nodes,generatorsPlaced,poles,uncovered:uncovered().length,complete:generatorsPlaced===generatorCount && uncovered().length===0};
}
