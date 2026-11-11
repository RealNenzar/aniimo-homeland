// Gross output; ingredients, sales and event orders are accounted for elsewhere.
export function productionRates(rows){
 const rates=new Map();
 const add=(id,rate)=>rates.set(id,(rates.get(id)||0)+rate);
 for(const row of rows){
  const recipe=row.recipe, rate=Number(row.rate)||0;
  add(recipe.output||recipe.id,rate*(Number(recipe.yield)||0));
  if(recipe.byproductYield&&recipe.facility==='Woodland')add('wood_block',rate*recipe.byproductYield);
  if(recipe.byproductYield&&recipe.facility==='Mine')add('mineral_sand',rate*recipe.byproductYield);
 }
 return [...rates].filter(([,rate])=>rate>1e-9).map(([item,hour])=>({item,minute:hour/60,hour,day:hour*24}));
}
