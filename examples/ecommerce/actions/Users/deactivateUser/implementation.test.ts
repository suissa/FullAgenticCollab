import test from 'node:test'; import assert from 'node:assert/strict'; import {createState,createUser} from '../../../src/domain.ts'; import {run} from './implementation.ts';
test('Users.deactivateUser preserves identity and changes active',()=>{const s=createState(); createUser(s,{id:'u1',name:'Ada'}); assert.equal(run(s,{id:'u1'}).active,false); assert.equal(s.users.has('u1'),true);});
