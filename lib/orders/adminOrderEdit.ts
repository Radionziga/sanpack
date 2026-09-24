import type { RequestOrder } from '@/types';
import { getOrderAmountOrZero } from '@/lib/orders/orderAmounts';

export function isStatusOnlyOrderEdit(draft: RequestOrder, current: RequestOrder) {
  return draft.status !== current.status
    && draft.contactName === current.contactName
    && draft.phone === current.phone
    && draft.deliveryAddress === current.deliveryAddress
    && draft.deliveryDate === current.deliveryDate
    && draft.deliveryWindow === current.deliveryWindow
    && draft.notes === current.notes
    && getOrderAmountOrZero(draft.adjustment) === getOrderAmountOrZero(current.adjustment)
    && draft.items === current.items;
}
