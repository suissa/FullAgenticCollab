# Delivery.updateDeliveryStatus

Advances a delivery only through allowed transitions: `created → in_transit|cancelled` and `in_transit → delivered|cancelled`. Terminal states cannot advance.
