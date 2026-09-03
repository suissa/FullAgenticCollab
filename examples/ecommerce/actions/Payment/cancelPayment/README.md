# Payment.cancelPayment

Cancels a payment before capture. `created` and `authorized` payments may be cancelled; captured payments must use `refundPayment` instead. Checkout uses this as a compensation when a later pre-capture step fails.
