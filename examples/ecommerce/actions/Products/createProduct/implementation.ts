import { createProduct, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;name:string;priceCents:number}) => createProduct(state,input);
