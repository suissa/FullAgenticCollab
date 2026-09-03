import { cancelPayment, type CommerceState } from '../../../src/domain.ts';
export const run=(state:CommerceState,input:{id:string})=>cancelPayment(state,input);
