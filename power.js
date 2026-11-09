export const ELECTRIC_FACILITIES = new Set(['Mine','Well','Carousel Mill','Crafting Table','Jukebox Dryer','Claw Game Cooker','Joy Wheel Loom','Phonolfactory Table','Bouncy Brew Keg','Simmering Pot','Blazing Stove','Woodworking Bench','Chimney Kiln','Pickling Jar','Aniipod Maker','Dance Pad Polisher']);
const heavy = new Set(['Mine','Well','Aniipod Maker','Dance Pad Polisher']);
export function facilityWatts(name, level) { return (Number(level)||1) * (heavy.has(name) ? 30 : 15); }
export const GENERATOR_WATTS = [0,600,800,1000,1200,1500];
export const MODULE_RV = [0,12,14,16,18,20];
export function poleLimit(module) { return Math.max(0, Math.min(5, module || 0)) * 6; }
export function powerSummary(state) {
  const p = state.power || {};
  let draw = 0;
  for (const [name, entry] of Object.entries(state.facilities || {})) {
    const groups = entry.groups || [entry];
    for (const g of groups) if (g.electric && ELECTRIC_FACILITIES.has(name)) draw += (+g.count || 0) * (+g.level || 1) * (heavy.has(name) ? 30 : 15);
  }
  const level = Math.max(0, Math.min(5, Number(p.level) || 0));
  const rv = Number(state.currentRv)||0;
  const maxCount = rv>=18?3:rv>=15?2:rv>=12?1:0;
  const watts = Math.max(0, Number(p.watts) || 0);
  const needed = draw && watts ? Math.ceil((draw * 1.2) / watts) : 0;
  const count = p.enabled && level <= Number(p.module) ? Math.min(maxCount,needed) : 0;
  const output = count * watts;
  return {draw, output, count, needed, maxCount, efficiency: draw ? Math.min(1.2, output / draw) : 0, maxOutput: count * (GENERATOR_WATTS[level] || 0)};
}
