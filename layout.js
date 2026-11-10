// Plot order and approximate facility footprints, in game tiles (Aniimax data).
export const GRID_SCALE=4, PLOT_WIDTH=80, PLOT_HEIGHT=60;
export const PLOT_GRID = [[13,14,15,16],[12,7,8,9],[11,4,3,6],[10,2,1,5]];
export const FOOTPRINTS = {'Farmland':[2,2],'Woodland':[4,4],'Mine':[5,5],'Well':[2,2],'Tidewhisper Sandcastle':[5,5],'Dewy House':[2,2],'Nimbus Bed':[5,5],'Starfall Hammock':[5,5],'Floral Windmill':[5,5],'Carousel Mill':[5.5,5.5],'Crafting Table':[4,4],'Claw Game Cooker':[3.5,3.5],'Simmering Pot':[1.5,1.5],'Phonolfactory Table':[3.5,3.5],'Bouncy Brew Keg':[3,3],'Blazing Stove':[2.5,1.75],'Pickling Jar':[2.5,2],'Jukebox Dryer':[2.5,2.5],'Joy Wheel Loom':[4,4],'Woodworking Bench':[2,1.5],'Chimney Kiln':[5.5,5.5],'Dance Pad Polisher':[2.5,2.5],'Aniipod Maker':[4.5,4.5],'Storage Unit':[2,2]};

export function layoutPlan(rows, boughtPlots, {storage=false}={}) {
  const count=Math.max(1,Math.min(16,Number(boughtPlots)||1));
  const plots=Array.from({length:count},()=>Array.from({length:PLOT_HEIGHT},()=>new Uint8Array(PLOT_WIDTH)));
  const climateByPlot=Array(count).fill(null);
  const objects=[], unplaced=[];
  for(const row of rows){
    for(let i=0;i<Math.ceil(row.units-1e-7);i++) objects.push({name:row.recipe.facility,recipe:row.recipe.id,environment:row.recipe.environment||'',level:row.recipe.worker.level,electric:!!row.recipe.worker.electric,weight:Math.max(0,Number(row.rate)||0)/Math.max(1,Math.ceil(row.units-1e-7))});
  }
  if(storage&&rows.length)objects.push({name:'Storage Unit',recipe:'',environment:'',level:1,electric:false,infrastructure:true});
  objects.sort((a,b)=>{const x=FOOTPRINTS[a.name]||[2,2],y=FOOTPRINTS[b.name]||[2,2];return Number(b.infrastructure)-Number(a.infrastructure)||Number(b.electric)-Number(a.electric)||(a.environment||'').localeCompare(b.environment||'')||y[0]*y[1]-x[0]*x[1]});
  const placed=[];
  for(const item of objects){
    const size=FOOTPRINTS[item.name];if(!size){unplaced.push(item);continue}
    const w=Math.ceil(size[0]*GRID_SCALE), h=Math.ceil(size[1]*GRID_SCALE);let found=false;
    const climateSensitive=item.name==='Farmland'||item.name==='Woodland'||!!item.environment;
    const mode=item.environment||'neutral';
    const order=Array.from({length:count},(_,i)=>i).sort((a,b)=>Number(climateByPlot[b]===mode)-Number(climateByPlot[a]===mode)||a-b);
    for(const pi of order){if(found)break;if(climateSensitive&&climateByPlot[pi]!==null&&climateByPlot[pi]!==mode)continue;
    for(let y=6;y<=PLOT_HEIGHT-h&&!found;y++)for(let x=6;x<=PLOT_WIDTH-w&&!found;x++){
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
  const position=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*PLOT_WIDTH,y:y*PLOT_HEIGHT}])));
  const occupied=new Set(),key=(x,y)=>`${x},${y}`;
  const objects=layout.placed.map(p=>{const o=position.get(p.plot);return {...p,gx:o.x+p.x,gy:o.y+p.y}});
  for(const p of objects)for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)occupied.add(key(p.gx+x,p.gy+y));
  const modes={Scorching:'Heat Furnace',Warm:'Heat Furnace',Freeze:'Cooling Unit',Cool:'Cooling Unit',Adequate:'Sunlamp'};
  const nodes=[],remaining=[],used={};
  const inRange=(node,target)=>node.x+18>target.gx&&node.x-18<target.gx+target.w&&node.y+18>target.gy&&node.y-18<target.gy+target.h;
  const crop=p=>p.name==='Farmland'||p.name==='Woodland'||!!p.environment;
  for(const mode of Object.keys(modes)){
    const targets=objects.filter(p=>p.environment===mode), type=modes[mode];
    const def=definitions.find(d=>d.name===type);const level=Number(rv)||0;
    const cap=def&&level>=Number(def.unlocks['1'])?(def.counts[Math.min(level-1,def.counts.length-1)]||0):0;
    while(targets.some(t=>!nodes.some(n=>n.mode===mode&&inRange(n,t))) && (used[type]||0)<cap){
      const size=type==='Cooling Unit'?8:4;let best=null;
      for(let plot=1;plot<=layout.plots;plot++){const o=position.get(plot);
        for(let y=0;y<=PLOT_HEIGHT-size;y+=2)for(let x=0;x<=PLOT_WIDTH-size;x+=2){
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

// Greedy, conservative quarter-tile footprint grid with half-tile candidate positions. Coverage is not a proof of in-game placement.
// A pole or generator must physically intersect an already powered node's range.
export function powerReachesNode(source, target) {
  return source.x+source.radius>target.x-target.w/2 && source.x-source.radius<target.x+target.w/2 &&
         source.y+source.radius>target.y-target.h/2 && source.y-source.radius<target.y+target.h/2;
}

export function placePower(layout, generatorCount, poleCap) {
  const position=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*PLOT_WIDTH,y:y*PLOT_HEIGHT}])));
  const occupied=new Set();
  const key=(x,y)=>`${x},${y}`;
  for(const p of layout.placed){const origin=position.get(p.plot);for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)occupied.add(key(origin.x+p.x+x,origin.y+p.y+y));}
  const targets=layout.placed.filter(p=>p.electric).map(p=>{const o=position.get(p.plot);return {...p,source:p,gx:o.x+p.x,gy:o.y+p.y}});
  const nodes=[];let generatorsPlaced=0;
  const touches=(node,t)=>node.x+node.radius>t.gx && node.x-node.radius<t.gx+t.w && node.y+node.radius>t.gy && node.y-node.radius<t.gy+t.h;
  const uncovered=()=>targets.filter(t=>!nodes.some(n=>touches(n,t)));
  function choose(size,radius,mustConnect){
    const remaining=uncovered();let best=null;
    for(let plot=1;plot<=layout.plots;plot++){const o=position.get(plot);
      for(let y=0;y<=PLOT_HEIGHT-size;y+=2)for(let x=0;x<=PLOT_WIDTH-size;x+=2){
        let free=true;for(let yy=0;yy<size&&free;yy++)for(let xx=0;xx<size;xx++)if(occupied.has(key(o.x+x+xx,o.y+y+yy))){free=false;break}
        if(!free)continue;
        const node={x:o.x+x+size/2,y:o.y+y+size/2,w:size,h:size,radius};
        if(mustConnect && !nodes.some(n=>powerReachesNode(n,node)))continue;
        const hits=remaining.filter(t=>touches(node,t)).length;
        const distance=remaining.length?Math.min(...remaining.map(t=>Math.max(Math.abs(node.x-(t.gx+t.w/2)),Math.abs(node.y-(t.gy+t.h/2))))):0;
        const score=hits*10000-distance;
        if(!best||score>best.score)best={plot,localX:x,localY:y,w:size,h:size,...node,score};
      }
    }
    if(best){const o=position.get(best.plot);for(let y=0;y<size;y++)for(let x=0;x<size;x++)occupied.add(key(o.x+best.localX+x,o.y+best.localY+y));nodes.push(best)}
    return best;
  }
  for(let i=0;i<generatorCount;i++){const p=choose(8,22,nodes.length>0);if(!p)break;p.name='Crackle Generator';p.recipe='Power';generatorsPlaced++}
  // Move uncovered electric facilities into unused powered space when possible.
  // Climate-dependent facilities stay in place so their growing conditions cannot change.
  function moveUncovered(){
  for(const target of uncovered()){
    if(target.environment||target.name==='Farmland'||target.name==='Woodland')continue;
    const old=position.get(target.plot);for(let y=0;y<target.h;y++)for(let x=0;x<target.w;x++)occupied.delete(key(old.x+target.x+x,old.y+target.y+y));
    let spot=null;
    for(let plot=1;plot<=layout.plots&&!spot;plot++){const o=position.get(plot);
      for(let y=0;y<=PLOT_HEIGHT-target.h&&!spot;y+=2)for(let x=0;x<=PLOT_WIDTH-target.w&&!spot;x+=2){
        const candidate={gx:o.x+x,gy:o.y+y,w:target.w,h:target.h};if(!nodes.some(n=>touches(n,candidate)))continue;
        let free=true;for(let yy=0;yy<target.h&&free;yy++)for(let xx=0;xx<target.w;xx++)if(occupied.has(key(o.x+x+xx,o.y+y+yy))){free=false;break}
        if(free)spot={plot,x,y,gx:o.x+x,gy:o.y+y};
      }
    }
    if(spot){Object.assign(target,spot);Object.assign(target.source,{plot:spot.plot,x:spot.x,y:spot.y})}
    const o=position.get(target.plot);for(let y=0;y<target.h;y++)for(let x=0;x<target.w;x++)occupied.add(key(o.x+target.x+x,o.y+target.y+y));
  }
  }
  let poles=0;
  if(generatorsPlaced===generatorCount)moveUncovered();
  while(generatorsPlaced===generatorCount && nodes.length && uncovered().length && poles<poleCap){
    const p=choose(6,14,true);if(!p)break;p.name='Crackle Power Pole';p.recipe='Power';poles++;
    moveUncovered();
  }
  // Remove poles that do not contribute to coverage or to the connected network.
  {
    const covered=targets.filter(t=>nodes.some(n=>touches(n,t)));
    const connected=list=>{
      const seen=new Set(list.filter(n=>n.name==='Crackle Generator'));let changed=true;
      while(changed){changed=false;for(const n of list)if(!seen.has(n)&&[...seen].some(o=>powerReachesNode(o,n))){seen.add(n);changed=true}}
      return seen.size===list.length&&covered.every(t=>list.some(n=>touches(n,t)));
    };
    for(let i=nodes.length-1;i>=0;i--)if(nodes[i].name==='Crackle Power Pole'&&connected(nodes.filter((_,j)=>j!==i))){nodes.splice(i,1);poles--}
  }
  return {placed:nodes.map(n=>({...n,x:n.localX,y:n.localY})),generatorsPlaced,poles,uncovered:uncovered().length,complete:generatorsPlaced===generatorCount && uncovered().length===0};
}

// Clip a centered coverage square to each plot, including across plot boundaries.
export function coverageSegments(node, radius) {
  const positions=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*PLOT_WIDTH,y:y*PLOT_HEIGHT}])));
  const origin=positions.get(node.plot);
  if(!origin)return [];
  const cx=origin.x+node.x+node.w/2,cy=origin.y+node.y+node.h/2;
  return [...positions].flatMap(([plot,p])=>{
    const x=Math.max(p.x,cx-radius),y=Math.max(p.y,cy-radius),x2=Math.min(p.x+PLOT_WIDTH,cx+radius),y2=Math.min(p.y+PLOT_HEIGHT,cy+radius);
    return x2>x&&y2>y?[{plot,x:x-p.x,y:y-p.y,w:x2-x,h:y2-y}]:[];
  });
}

// Repack climate-sensitive production around devices before accepting uncovered fields.
// The 9×9 square uses the same positive-area overlap rule as Aniimax.
export function packClimate(layout, rv, definitions) {
  const types={Scorching:'Heat Furnace',Warm:'Heat Furnace',Freeze:'Cooling Unit',Cool:'Cooling Unit',Adequate:'Sunlamp'};
  const position=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*PLOT_WIDTH,y:y*PLOT_HEIGHT}])));
  const original=layout.placed.filter(p=>types[p.environment]);
  if(!original.length)return {placed:[],uncovered:[],complete:true};
  const fixed=layout.placed.filter(p=>!types[p.environment]);
  const placed=[],nodes=[],used={};
  const global=p=>{const o=position.get(p.plot);return {x:o.x+p.x,y:o.y+p.y,w:p.w,h:p.h}};
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const square=p=>{const g=global(p);return {x:g.x+g.w/2-18,y:g.y+g.h/2-18,w:36,h:36}};
  const climateSensitive=p=>p.name==='Farmland'||p.name==='Woodland'||!!p.environment;
  for(const mode of Object.keys(types)){
    let todo=original.filter(p=>p.environment===mode).sort((a,b)=>b.w*b.h-a.w*a.h);
    const type=types[mode],def=definitions.find(d=>d.name===type),cap=def&&rv>=Number(def.unlocks['1'])?(def.counts[Math.min(rv-1,def.counts.length-1)]||0):0;
    while(todo.length&&(used[type]||0)<cap){
      let best=null;const size=type==='Cooling Unit'?8:4;
      for(let plot=1;plot<=layout.plots;plot++)for(const cy of [12,28,44])for(const cx of [16,32,48,64]){
        const node={plot,x:cx,y:cy,w:size,h:size,name:type,recipe:mode,mode,level:1,electric:false,infrastructure:true};
        const n=global(node),area=square(node),blocked=[...fixed,...placed,...nodes].map(global);
        if(blocked.some(o=>overlap(n,o)))continue;
        if([...fixed,...placed].some(p=>climateSensitive(p)&&p.environment!==mode&&overlap(area,global(p))))continue;
        if(nodes.some(p=>overlap(area,square(p))))continue;
        const chosen=[];
        for(const item of todo){let found=null;
          for(let y=0;y<=PLOT_HEIGHT-item.h&&!found;y+=2)for(let x=0;x<=PLOT_WIDTH-item.w&&!found;x+=2){
            const p={...item,plot,x,y},g=global(p);
            if(!overlap(g,area)||overlap(g,n)||blocked.some(o=>overlap(g,o))||chosen.some(o=>overlap(g,global(o))))continue;
            if(nodes.some(o=>o.mode!==mode&&overlap(g,square(o))))continue;
            found=p;
          }
          if(found)chosen.push(found);
        }
        if(chosen.length&&(!best||chosen.length>best.chosen.length)){best={node,chosen};if(chosen.length===todo.length)break;}
      }
      if(!best)break;
      nodes.push(best.node);placed.push(...best.chosen);used[type]=(used[type]||0)+1;
      const counts=new Map();for(const p of best.chosen){const key=JSON.stringify([p.name,p.recipe,p.level,p.w,p.h]);counts.set(key,(counts.get(key)||0)+1)}
      todo=todo.filter(p=>{const key=JSON.stringify([p.name,p.recipe,p.level,p.w,p.h]),n=counts.get(key)||0;if(n){counts.set(key,n-1);return false}return true});
    }
    // Keep crops that could not be assigned at their old positions only if still free.
    for(const item of todo){const g=global(item);if([...fixed,...placed,...nodes].some(p=>overlap(g,global(p)))||nodes.some(n=>n.mode!==mode&&overlap(g,square(n))))layout.unplaced.push(item);else placed.push(item)}
  }
  layout.placed=[...fixed,...placed];
  const uncovered=placed.filter(p=>types[p.environment]&&!nodes.some(n=>n.mode===p.environment&&overlap(global(p),square(n))));
  return {placed:nodes,uncovered,complete:uncovered.length===0};
}

// Storage limits reported by Aniimo Camp for RV levels 1–20.
export const STORAGE_LIMITS=[0,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,8,8,8];
export function placeStorage(layout, limit){
 const pos=new Map(PLOT_GRID.flatMap((row,y)=>row.map((n,x)=>[n,{x:x*PLOT_WIDTH,y:y*PLOT_HEIGHT}])));
 const used=new Set(),key=(x,y)=>`${x},${y}`;
 for(const p of layout.placed){const o=pos.get(p.plot);for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)used.add(key(o.x+p.x+x,o.y+p.y+y))}
 const targets=layout.placed.filter(p=>!p.infrastructure&&p.name!=='Storage Unit').map(p=>{const o=pos.get(p.plot);return {x:o.x+p.x+p.w/2,y:o.y+p.y+p.h/2,weight:Math.max(.001,Number(p.weight)||1)}});
 const stores=[];if(!targets.length)return stores;
 for(let i=0;i<Math.max(0,Math.floor(limit));i++){let best=null;
  for(let plot=1;plot<=layout.plots;plot++){const o=pos.get(plot);for(let y=0;y<=PLOT_HEIGHT-8;y+=4)for(let x=0;x<=PLOT_WIDTH-8;x+=4){
   let free=true;for(let yy=0;yy<8&&free;yy++)for(let xx=0;xx<8;xx++)if(used.has(key(o.x+x+xx,o.y+y+yy))){free=false;break}if(!free)continue;
   const cx=o.x+x+4,cy=o.y+y+4;const score=targets.reduce((sum,t)=>{const d=Math.hypot(t.x-cx,t.y-cy);return sum+t.weight*Math.min(d,...stores.map(s=>Math.hypot(t.x-s.cx,t.y-s.cy)))},0);
   if(!best||score<best.score)best={plot,x,y,cx,cy,score};
  }}
  if(!best)break;const o=pos.get(best.plot);for(let y=0;y<8;y++)for(let x=0;x<8;x++)used.add(key(o.x+best.x+x,o.y+best.y+y));stores.push({...best,name:'Storage Unit',recipe:'',w:8,h:8,level:1,electric:false,infrastructure:true});
 }
 return stores;
}
