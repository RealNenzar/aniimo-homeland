import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {displayName,hasTranslation} from '../names.js';

test('every catalog recipe, facility and ingredient has all four language names',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url)));
 const ids=new Set(catalog.flatMap(recipe=>[recipe.id,recipe.facility,...Object.keys(recipe.ingredients)]));
 const missing=[...ids].filter(id=>!hasTranslation(id));
 assert.deepEqual(missing,[]);
 for(const id of ids)for(const language of ['de','en','ru','fr'])assert.ok(displayName(id,language),`${id}: ${language}`);
});

test('common production names follow selected language',()=>{
 assert.equal(displayName('milled_rice','de'),'Gemahlener Reis');
 assert.equal(displayName('milled_rice','ru'),'Молотый рис');
 assert.equal(displayName('milled_rice','fr'),'Riz moulu');
 assert.equal(displayName('milled_rice','en'),'Milled Rice');
});
