export type User = { id: string; name: string; active: boolean };
export type Consumer = { id: string; userId: string };
export type Product = { id: string; name: string; priceCents: number; active: boolean };
export type StockItem = { productId: string; available: number; reserved: number };
export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'cancelled';
export type Payment = { id: string; consumerId: string; amountCents: number; status: PaymentStatus };
export type DeliveryStatus = 'created' | 'in_transit' | 'delivered' | 'cancelled';
export type Delivery = { id: string; consumerId: string; productId: string; quantity: number; status: DeliveryStatus };

export type CommerceState = {
  users: Map<string, User>;
  consumers: Map<string, Consumer>;
  products: Map<string, Product>;
  stock: Map<string, StockItem>;
  payments: Map<string, Payment>;
  deliveries: Map<string, Delivery>;
};

export function createState(): CommerceState {
  return { users:new Map(), consumers:new Map(), products:new Map(), stock:new Map(), payments:new Map(), deliveries:new Map() };
}

function requirePositiveInteger(value:number, field:string) { if(!Number.isInteger(value)||value<=0) throw new Error(`${field} must be a positive integer`); }

export function createUser(state:CommerceState,input:{id:string;name:string}) { if(!input.id||!input.name.trim()) throw new Error('id and name are required'); if(state.users.has(input.id)) throw new Error('user already exists'); const user:User={id:input.id,name:input.name.trim(),active:true}; state.users.set(user.id,user); return user; }
export function deactivateUser(state:CommerceState,input:{id:string}) { const user=state.users.get(input.id); if(!user) throw new Error('user not found'); const next={...user,active:false}; state.users.set(input.id,next); return next; }
export function createConsumer(state:CommerceState,input:{id:string;userId:string}) { if(state.consumers.has(input.id)) throw new Error('consumer already exists'); const user=state.users.get(input.userId); if(!user||!user.active) throw new Error('active user required'); const consumer:Consumer={id:input.id,userId:input.userId}; state.consumers.set(input.id,consumer); return consumer; }
export function createProduct(state:CommerceState,input:{id:string;name:string;priceCents:number}) { requirePositiveInteger(input.priceCents,'priceCents'); if(!input.id||!input.name.trim()) throw new Error('id and name are required'); if(state.products.has(input.id)) throw new Error('product already exists'); const product:Product={id:input.id,name:input.name.trim(),priceCents:input.priceCents,active:true}; state.products.set(input.id,product); return product; }
export function updateProductPrice(state:CommerceState,input:{id:string;priceCents:number}) { requirePositiveInteger(input.priceCents,'priceCents'); const product=state.products.get(input.id); if(!product) throw new Error('product not found'); const next={...product,priceCents:input.priceCents}; state.products.set(input.id,next); return next; }
export function addStock(state:CommerceState,input:{productId:string;quantity:number}) { requirePositiveInteger(input.quantity,'quantity'); if(!state.products.has(input.productId)) throw new Error('product not found'); const current=state.stock.get(input.productId)??{productId:input.productId,available:0,reserved:0}; const next={...current,available:current.available+input.quantity}; state.stock.set(input.productId,next); return next; }
export function reserveStock(state:CommerceState,input:{productId:string;quantity:number}) { requirePositiveInteger(input.quantity,'quantity'); const current=state.stock.get(input.productId); if(!current) throw new Error('stock not found'); if(current.available<input.quantity) throw new Error('insufficient stock'); const next={...current,available:current.available-input.quantity,reserved:current.reserved+input.quantity}; state.stock.set(input.productId,next); return next; }
export function releaseStock(state:CommerceState,input:{productId:string;quantity:number}) { requirePositiveInteger(input.quantity,'quantity'); const current=state.stock.get(input.productId); if(!current) throw new Error('stock not found'); if(current.reserved<input.quantity) throw new Error('insufficient reserved stock'); const next={...current,available:current.available+input.quantity,reserved:current.reserved-input.quantity}; state.stock.set(input.productId,next); return next; }
export function commitStock(state:CommerceState,input:{productId:string;quantity:number}) { requirePositiveInteger(input.quantity,'quantity'); const current=state.stock.get(input.productId); if(!current) throw new Error('stock not found'); if(current.reserved<input.quantity) throw new Error('insufficient reserved stock'); const next={...current,reserved:current.reserved-input.quantity}; state.stock.set(input.productId,next); return next; }

export function createPayment(state:CommerceState,input:{id:string;consumerId:string;amountCents:number}) { requirePositiveInteger(input.amountCents,'amountCents'); if(!state.consumers.has(input.consumerId)) throw new Error('consumer not found'); if(state.payments.has(input.id)) throw new Error('payment already exists'); const payment:Payment={id:input.id,consumerId:input.consumerId,amountCents:input.amountCents,status:'created'}; state.payments.set(input.id,payment); return payment; }
function transitionPayment(state:CommerceState,id:string,from:PaymentStatus,to:PaymentStatus) { const payment=state.payments.get(id); if(!payment) throw new Error('payment not found'); if(payment.status!==from) throw new Error(`payment must be ${from}`); const next={...payment,status:to}; state.payments.set(id,next); return next; }
export const authorizePayment=(state:CommerceState,input:{id:string})=>transitionPayment(state,input.id,'created','authorized');
export const capturePayment=(state:CommerceState,input:{id:string})=>transitionPayment(state,input.id,'authorized','captured');
export const refundPayment=(state:CommerceState,input:{id:string})=>transitionPayment(state,input.id,'captured','refunded');
export function cancelPayment(state:CommerceState,input:{id:string}) { const payment=state.payments.get(input.id); if(!payment) throw new Error('payment not found'); if(payment.status!=='created'&&payment.status!=='authorized') throw new Error('payment must be created or authorized'); const next:Payment={...payment,status:'cancelled'}; state.payments.set(input.id,next); return next; }

export function createDelivery(state:CommerceState,input:{id:string;consumerId:string;productId:string;quantity:number}) { requirePositiveInteger(input.quantity,'quantity'); if(!state.consumers.has(input.consumerId)) throw new Error('consumer not found'); if(!state.products.has(input.productId)) throw new Error('product not found'); if(state.deliveries.has(input.id)) throw new Error('delivery already exists'); const delivery:Delivery={...input,status:'created'}; state.deliveries.set(input.id,delivery); return delivery; }
export function updateDeliveryStatus(state:CommerceState,input:{id:string;status:DeliveryStatus}) { const delivery=state.deliveries.get(input.id); if(!delivery) throw new Error('delivery not found'); const allowed:Record<DeliveryStatus,DeliveryStatus[]>={created:['in_transit','cancelled'],in_transit:['delivered','cancelled'],delivered:[],cancelled:[]}; if(!allowed[delivery.status].includes(input.status)) throw new Error('invalid delivery transition'); const next={...delivery,status:input.status}; state.deliveries.set(input.id,next); return next; }
