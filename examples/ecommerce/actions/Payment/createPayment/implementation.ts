import { createPayment, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;consumerId:string;amountCents:number}) => createPayment(state,input);
