import { createDelivery, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;consumerId:string;productId:string;quantity:number}) => createDelivery(state,input);
