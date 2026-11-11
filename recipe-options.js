// Only explicitly known shop notes and event recipes need attention in the
// unlock list. Ordinary recipes remain in the catalog for automatic planning.
export function recipeMatches(recipe,query,displayName=x=>x){
 const q=String(query||'').trim().toLocaleLowerCase();
 if(!q)return true;
 return [recipe.id,recipe.facility,displayName(recipe.id),displayName(recipe.facility)]
  .some(value=>String(value||'').toLocaleLowerCase().replaceAll('_',' ').includes(q.replaceAll('_',' ')));
}
export function visibleUnlockRecipes(catalog,special,query='',displayName=x=>x){
 const notes=new Set(special||[]);
 return catalog.filter(recipe=>(notes.has(recipe.id)||Boolean(recipe.event))&&recipeMatches(recipe,query,displayName));
}
// The ignored list remains keyed by recipe id, preserving imported settings.
export function setRecipeIgnored(disabled,id,ignored){
 const result=new Set(disabled||[]);
 if(ignored)result.add(id);else result.delete(id);
 return [...result];
}
