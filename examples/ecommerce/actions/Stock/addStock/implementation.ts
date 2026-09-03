import { addStock, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{productId:string;quantity:number}) => addStock(state,input);
