import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {nextUpgradeTargets} from '../rv-costs.js';
import {upgradeBalance,upgradeForecast} from '../upgrade-balance.js';

test('next RV targets contain coins and materials and stop at the known maximum',()=>{
 assert.deepEqual(nextUpgradeTargets(18),{coins:17100000,densified_timber_component:400,microcrystalline_ore_plate:220});
 assert.deepEqual(nextUpgradeTargets(21),{coins:52600000,densified_timber_component:1190,microcrystalline_ore_plate:10580});
 assert.deepEqual(nextUpgradeTargets(22),{});
 assert.deepEqual(nextUpgradeTargets(null),{});
});

test('forecast preserves negative balances and does not invent stock when rates fall',()=>{
 const state={hours:10,stock:{coins:10,wood_block:0},targets:{coins:1,wood_block:9}};
 const result={rows:[{rate:1,recipe:{id:'wood_block',yield:1,ingredients:{},seedCost:2}}],sales:[],daily:[]};
 const coins=upgradeBalance(result,state).find(x=>x.item==='coins');
 assert.equal(coins.available,-10);
 assert.equal(coins.difference,-11);
 assert.equal(upgradeForecast(result,state).reachable,false);
});
