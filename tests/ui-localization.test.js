import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {translate, gameTerm} from '../i18n.js';

test('planning labels and material priorities use the selected language',()=>{
 assert.equal(translate('Wood Blocks','de'),'Holzblöcke');
 assert.equal(translate('Mineral Sand','de'),'Mineralsand');
 assert.equal(translate('Wood Blocks','ru'),'Деревянные блоки');
 assert.equal(translate('Mineral Sand','fr'),'Sable minéral');
 assert.equal(translate('Nächstes RV-Level','en'),'Next RV level');
 assert.equal(translate('Planungsbereiche','fr'),'Sections de planification');
 assert.equal(gameTerm('Perfumery','ru'),'Парфюмерия');
});
