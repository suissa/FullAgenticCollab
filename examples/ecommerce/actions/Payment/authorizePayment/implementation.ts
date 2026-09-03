import { authorizePayment, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string}) => authorizePayment(state,input);
