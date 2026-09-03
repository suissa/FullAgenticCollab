import test from 'node:test'; import assert from 'node:assert/strict'; import {createState} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Products.createProduct stores integer price',()=>{const s=createState(); assert.equal(run(s,{id:'p1',name:'Book',priceCents:2500}).priceCents,2500);});
test('Products.createProduct rejects non-positive price',()=>{const s=createState(); assert.throws(()=>run(s,{id:'p1',name:'Book',priceCents:0}),/positive integer/);});
