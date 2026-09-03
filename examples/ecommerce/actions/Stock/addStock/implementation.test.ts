import test from 'node:test'; import assert from 'node:assert/strict'; import {createState,createProduct} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Stock.addStock increases availability',()=>{const s=createState(); createProduct(s,{id:'p1',name:'Book',priceCents:100}); assert.equal(run(s,{productId:'p1',quantity:10}).available,10);});
