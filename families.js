// Family requirements for dedicated leisure facilities, keyed by facility and recipe.
export const FAMILY_RECIPES = {
  'Nimbus Bed': {wool:'Nimbi', quick_wool:'Nimbi', petals:'Iris'},
  'Starfall Hammock': {star:'Celestis', gold_speck_cap:'Coinwisp'},
  'Floral Windmill': {scales:'Flutternym', quick_scales:'Flutternym'},
  'Dewy House': {aromathyst:'Dewy', quick_aromathyst:'Dewy'},
  'Tidewhisper Sandcastle': {sea_salt:'Susuta', quick_sea_salt:'Susuta', pearl:'Shelly', quick_pearl:'Shelly', sweet_cone:'Sugarfish'}
};
export const FAMILIES = [...new Set(Object.values(FAMILY_RECIPES).flatMap(group => Object.values(group)))];
export function recipeFamily(recipe) { return FAMILY_RECIPES[recipe.facility]?.[recipe.id] || null; }
