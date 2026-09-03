import { reserveStock, releaseStock, commitStock, createPayment, authorizePayment, capturePayment, refundPayment, cancelPayment, createDelivery, updateDeliveryStatus } from './domain.ts';
import type { CommerceState } from './domain.ts';

export function checkout(state:CommerceState,input:{paymentId:string;deliveryId:string;consumerId:string;productId:string;quantity:number}) {
  const product=state.products.get(input.productId); if(!product||!product.active) throw new Error('active product required');
  const amountCents=product.priceCents*input.quantity;
  let createdPayment=false; let createdDelivery=false;
  reserveStock(state,{productId:input.productId,quantity:input.quantity});
  try {
    createPayment(state,{id:input.paymentId,consumerId:input.consumerId,amountCents}); createdPayment=true;
    authorizePayment(state,{id:input.paymentId});
    const delivery=createDelivery(state,{id:input.deliveryId,consumerId:input.consumerId,productId:input.productId,quantity:input.quantity}); createdDelivery=true;
    capturePayment(state,{id:input.paymentId});
    commitStock(state,{productId:input.productId,quantity:input.quantity});
    return {payment:state.payments.get(input.paymentId)!,delivery};
  } catch(error) {
    if(createdDelivery){const delivery=state.deliveries.get(input.deliveryId); if(delivery?.status==='created') updateDeliveryStatus(state,{id:input.deliveryId,status:'cancelled'});}
    if(createdPayment){const payment=state.payments.get(input.paymentId); if(payment?.status==='captured') refundPayment(state,{id:input.paymentId}); else if(payment?.status==='created'||payment?.status==='authorized') cancelPayment(state,{id:input.paymentId});}
    const stock=state.stock.get(input.productId); if(stock && stock.reserved>=input.quantity) releaseStock(state,{productId:input.productId,quantity:input.quantity});
    throw error;
  }
}
