import type { RequestItem, RequestOrder } from '@/types';

export type CustomerRequestOrder = Pick<RequestOrder,
  'id' | 'requestNumber' | 'contactName' | 'phone' | 'deliveryAddress' |
  'deliveryDate' | 'deliveryWindow' | 'notes' | 'status' | 'currency' |
  'subtotal' | 'adjustment' | 'total' | 'createdAt' | 'updatedAt'
> & { items: RequestItem[] };

export function projectCustomerOrder(order: RequestOrder): CustomerRequestOrder {
  return {
    id: order.id,
    requestNumber: order.requestNumber,
    contactName: order.contactName,
    phone: order.phone,
    deliveryAddress: order.deliveryAddress,
    deliveryDate: order.deliveryDate,
    deliveryWindow: order.deliveryWindow,
    notes: order.notes,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    adjustment: order.adjustment,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map(({ product: _product, variant: _variant, ...item }) => item),
  };
}
