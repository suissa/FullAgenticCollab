import test from 'node:test'; import assert from 'node:assert/strict'; import {createState,createProduct} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Products.updateProductPrice changes price',()=>{const s=createState(); createProduct(s,{id:'p1',name:'Book',priceCents:2500}); assert.equal(run(s,{id:'p1',priceCents:3000}).priceCents,3000);});
