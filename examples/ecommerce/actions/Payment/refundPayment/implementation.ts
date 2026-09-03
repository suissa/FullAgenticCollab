import { refundPayment, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string}) => refundPayment(state,input);
