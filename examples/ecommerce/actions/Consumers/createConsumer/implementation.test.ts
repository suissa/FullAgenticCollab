import test from 'node:test'; import assert from 'node:assert/strict'; import {createState,createUser,deactivateUser} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Consumers.createConsumer binds active user',()=>{const s=createState(); createUser(s,{id:'u1',name:'Ada'}); assert.deepEqual(run(s,{id:'c1',userId:'u1'}),{id:'c1',userId:'u1'});});
test('Consumers.createConsumer rejects inactive user',()=>{const s=createState(); createUser(s,{id:'u1',name:'Ada'}); deactivateUser(s,{id:'u1'}); assert.throws(()=>run(s,{id:'c1',userId:'u1'}),/active user/);});
