import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {visibleUnlockRecipes,setRecipeIgnored} from '../recipe-options.js';
import {prepare} from '../solver.js';

const recipes=[
 {id:'normal',facility:'Farmland',event:null,facilityLevel:1,verified:true,seconds:3600,ingredients:{},yield:1},
 {id:'shop_recipe',facility:'Farmland',event:null,facilityLevel:1,verified:true,seconds:3600,ingredients:{},yield:1},
 {id:'magic_pumpkin',facility:'Farmland',event:'magical_wonder_night',facilityLevel:1,verified:true,seconds:3600,ingredients:{},yield:1},
];
test('unlock list contains event and shop recipes, not ordinary RV recipes',()=>{
 assert.deepEqual(visibleUnlockRecipes(recipes,['shop_recipe']).map(r=>r.id),['shop_recipe','magic_pumpkin']);
 assert.deepEqual(visibleUnlockRecipes(recipes,['shop_recipe'],'kürbis',name=>name==='magic_pumpkin'?'Kürbis':name).map(r=>r.id),['magic_pumpkin']);
});
test('ignore list excludes a normal recipe from solver and can restore it',()=>{
 const state={facilities:{Farmland:{count:1,level:1,skill:3}},autoWorkers:true,modules:{},special:[],notes:[],disabled:setRecipeIgnored([],'normal',true),event:false,unverified:false};
 assert.equal(prepare(recipes,state).some(r=>r.id==='normal'),false);
 state.disabled=setRecipeIgnored(state.disabled,'normal',false);
 assert.equal(prepare(recipes,state).some(r=>r.id==='normal'),true);
});
