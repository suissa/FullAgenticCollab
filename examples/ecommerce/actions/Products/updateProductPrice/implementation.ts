import { updateProductPrice, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;priceCents:number}) => updateProductPrice(state,input);
