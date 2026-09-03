import { updateDeliveryStatus, type CommerceState, type DeliveryStatus } from '../../../src/domain.ts';
export const run = (state:CommerceState,input:{id:string;status:DeliveryStatus}) => updateDeliveryStatus(state,input);
