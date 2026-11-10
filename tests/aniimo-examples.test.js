import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {findAniimoExample} from '../aniimo-examples.js';
test('examples match both required family and work level',()=>{
 assert.equal(findAniimoExample('Leisure',3,'Dewy').name,'Fragrancier');
 assert.equal(findAniimoExample('Leisure',4,'Flutternym').name,'Somniwing');
 assert.equal(findAniimoExample('Leisure',2,'Dewy'),null);
 assert.equal(findAniimoExample('Leisure',3,'Coinwisp'),null);
 assert.equal(findAniimoExample('Perfumery',4),null);
});
