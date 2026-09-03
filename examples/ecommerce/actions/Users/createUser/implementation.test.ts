import test from 'node:test'; import assert from 'node:assert/strict'; import {createState} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Users.createUser creates an active user',()=>{const s=createState(); assert.deepEqual(run(s,{id:'u1',name:'Ada'}),{id:'u1',name:'Ada',active:true});});
test('Users.createUser rejects duplicate id',()=>{const s=createState(); run(s,{id:'u1',name:'Ada'}); assert.throws(()=>run(s,{id:'u1',name:'Other'}),/already exists/);});
