import { deactivateUser, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string}) => deactivateUser(state,input);
