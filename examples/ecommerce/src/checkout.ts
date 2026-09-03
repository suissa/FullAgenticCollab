import { reserveStock, releaseStock, createPayment, authorizePayment, capturePayment, createDelivery } from './domain.ts';
import type { CommerceState } from './domain.ts';

export function checkout(state: CommerceState, input:{paymentId:string; deliveryId:string; consumerId:string; productId:string; quantity:number}) {
  const product = state.products.get(input.productId); if (!product || !product.active) throw new Error('active product required');
  const amountCents = product.priceCents * input.quantity;
  reserveStock(state, { productId: input.productId, quantity: input.quantity });
  try {
    createPayment(state, { id: input.paymentId, consumerId: input.consumerId, amountCents });
    authorizePayment(state, { id: input.paymentId });
    capturePayment(state, { id: input.paymentId });
    const delivery = createDelivery(state, { id: input.deliveryId, consumerId: input.consumerId, productId: input.productId, quantity: input.quantity });
    return { payment: state.payments.get(input.paymentId)!, delivery };
  } catch (error) {
    releaseStock(state, { productId: input.productId, quantity: input.quantity });
    throw error;
  }
}
