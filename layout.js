// Plot order and approximate facility footprints, in game tiles (Aniimax data).
export const PLOT_GRID = [[13,14,15,16],[12,7,8,9],[11,4,3,6],[10,2,1,5]];
export const FOOTPRINTS = {'Farmland':[2,2],'Woodland':[4,4],'Mine':[5,5],'Well':[2,2],'Tidewhisper Sandcastle':[5,5],'Dewy House':[2,2],'Nimbus Bed':[5,5],'Starfall Hammock':[5,5],'Floral Windmill':[5,5],'Carousel Mill':[5.5,5.5],'Crafting Table':[4,4],'Claw Game Cooker':[3.5,3.5],'Simmering Pot':[1.5,1.5],'Phonolfactory Table':[3.5,3.5],'Bouncy Brew Keg':[3,3],'Blazing Stove':[2.5,1.75],'Pickling Jar':[2.5,2],'Jukebox Dryer':[2.5,2.5],'Joy Wheel Loom':[4,4],'Woodworking Bench':[2,1.5],'Chimney Kiln':[5.5,5.5],'Dance Pad Polisher':[2.5,2.5],'Aniipod Maker':[4.5,4.5]};

export function layoutPlan(rows, boughtPlots) {
  const count=Math.max(1,Math.min(16,Number(boughtPlots)||1));
  const plots=Array.from({length:count},()=>Array.from({length:30},()=>new Uint8Array(40)));
  const grouped=new Map(), objects=[], unplaced=[];
  for(const row of rows){
    const key=`${row.recipe.facility}:${row.recipe.group}:${row.recipe.worker.electric?'e':'a'}`;
    if(row.shared){const group=grouped.get(key)||{...row,units:0,recipes:[]};group.units+=row.units;group.recipes.push(row.recipe.id);grouped.set(key,group)}
    else for(let i=0;i<Math.round(row.units);i++) objects.push({name:row.recipe.facility,recipe:row.recipe.id,electric:!!row.recipe.worker.electric});
  }
  for(const g of grouped.values())for(let i=0;i<Math.ceil(g.units-1e-8);i++)objects.push({name:g.recipe.facility,recipe:g.recipes.join(' / '),electric:!!g.recipe.worker.electric});
  objects.sort((a,b)=>{const x=FOOTPRINTS[a.name]||[2,2],y=FOOTPRINTS[b.name]||[2,2];return Number(b.electric)-Number(a.electric)||y[0]*y[1]-x[0]*x[1]});
  const placed=[];
  for(const item of objects){
    const size=FOOTPRINTS[item.name];if(!size){unplaced.push(item);continue}
    const w=Math.ceil(size[0]*2), h=Math.ceil(size[1]*2);let found=false;
    for(let pi=0;pi<plots.length&&!found;pi++)for(let y=0;y<=30-h&&!found;y++)for(let x=0;x<=40-w&&!found;x++){
      let free=true;for(let yy=y;yy<y+h&&free;yy++)for(let xx=x;xx<x+w;xx++)if(plots[pi][yy][xx]){free=false;break}
      if(!free)continue;
      for(let yy=y;yy<y+h;yy++)plots[pi][yy].fill(1,x,x+w);
      placed.push({...item,plot:pi+1,x,y,w,h});found=true;
    }
    if(!found)unplaced.push(item);
  }
  return {plots:count,placed,unplaced};
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
