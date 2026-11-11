import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {productionRates} from '../production-rates.js';
test('production rates add gross recipe output and relevant byproducts',()=>{
 const rows=[{rate:2,recipe:{id:'quick_coconut',output:'coconut',facility:'Woodland',yield:10,byproductYield:122}},{rate:1,recipe:{id:'cocoa',facility:'Woodland',yield:6,byproductYield:122}}];
 const amounts=Object.fromEntries(productionRates(rows).map(r=>[r.item,r]));
 assert.equal(amounts.coconut.hour,20);assert.equal(amounts.coconut.day,480);
 assert.equal(amounts.wood_block.hour,366);assert.equal(amounts.wood_block.minute,6.1);
});
