import { reserveStock, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{productId:string;quantity:number}) => reserveStock(state,input);
