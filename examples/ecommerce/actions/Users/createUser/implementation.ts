import { createUser, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;name:string}) => createUser(state,input);
