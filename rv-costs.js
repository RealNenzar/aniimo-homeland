// RV upgrade requirements, sourced from the attributed RV data.
export const rvCosts={2:[140,'wood_block',3],3:[800,'wood_block',25],4:[2900,'wood_block',100,'mineral_sand',120],5:[7300,'wood_block',550,'mineral_sand',250],6:[32000,'wood_block',1300,'mineral_sand',700],7:[69000,'rough_lumber',290,'coarse_sifted_ore',360],8:[180000,'rough_lumber',1100,'coarse_sifted_ore',640],9:[260000,'rough_lumber',1520,'coarse_sifted_ore',800],10:[510000,'rough_lumber',2000,'coarse_sifted_ore',2400],11:[680000,'standard_planks',320,'sintered_ore_brick',350],12:[1060000,'standard_planks',910,'sintered_ore_brick',480],13:[1930000,'standard_planks',1230,'sintered_ore_brick',760],14:[2620000,'standard_planks',1590,'sintered_ore_brick',1060],15:[3760000,'laminated_beams',390,'refined_ore',150],16:[4900000,'laminated_beams',480,'refined_ore',310],17:[8630000,'laminated_beams',630,'refined_ore',380],18:[11600000,'laminated_beams',800,'refined_ore',520],19:[17100000,'densified_timber_component',400,'microcrystalline_ore_plate',220],20:[20800000,'densified_timber_component',490,'microcrystalline_ore_plate',270],21:[34300000,'densified_timber_component',830,'microcrystalline_ore_plate',3720],22:[52600000,'densified_timber_component',1190,'microcrystalline_ore_plate',10580]};

export function nextUpgradeTargets(current) {
  const level=Number(current);
  if(!Number.isInteger(level) || level<1 || level>=22)return {};
  const costs=rvCosts[level+1];
  if(!costs)return {};
  const targets={coins:costs[0]};
  for(let i=1;i<costs.length;i+=2)targets[costs[i]]=costs[i+1];
  return targets;
}

export function futureUpgradeTargets(current, target=22) {
  const start=Math.max(1,Math.min(22,Math.floor(Number(current)||1)));
  const end=Math.max(start,Math.min(22,Math.floor(Number(target)||22)));
  const totals={};
  for(let level=start+1;level<=end;level++){const costs=rvCosts[level];if(!costs)continue;for(let i=1;i<costs.length;i+=2)totals[costs[i]]=(totals[costs[i]]||0)+costs[i+1];}
  return totals;
}
