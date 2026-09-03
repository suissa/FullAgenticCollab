import { createConsumer, type CommerceState } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;userId:string}) => createConsumer(state,input);
