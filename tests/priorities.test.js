import test from 'node:test';
import assert from 'node:assert/strict';
import {includeOptionalPriorities} from '../priorities.js';

test('older imports gain optional goals disabled, without changing active priorities or their order',()=>{
 const original=[{id:'event',enabled:true},{id:'coins',enabled:true},{id:'rv',enabled:false}];
 const result=includeOptionalPriorities(original);
 assert.deepEqual(result.slice(0,3),original);
 assert.deepEqual(result.slice(3),[{id:'daily',enabled:false},{id:'reserve',enabled:false}]);
 assert.equal(original.length,3);
});
test('an explicitly enabled reserve keeps its setting and position',()=>{
 const result=includeOptionalPriorities([{id:'reserve',enabled:true},{id:'coins',enabled:false}]);
 assert.deepEqual(result,[{id:'reserve',enabled:true},{id:'coins',enabled:false},{id:'daily',enabled:false}]);
});
