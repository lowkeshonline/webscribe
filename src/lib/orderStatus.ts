import { Order } from '@/types';

export type CustomerOrderStatus = 'fulfilled' | 'assigned' | 'verification_pending' | 'payment_pending' | 'cancelled';

const hasDeliverable = (order: Pick<Order, 'accountId' | 'credentials'>) => Boolean(
  order.accountId
  || order.credentials?.username
  || order.credentials?.password
  || order.credentials?.pin
  || order.credentials?.additionalInfo,
);

export const getCustomerOrderStatus = (order: Pick<Order, 'paymentStatus' | 'accountId' | 'credentials'>): CustomerOrderStatus => {
  if (order.paymentStatus === 'completed') return 'fulfilled';
  if (order.paymentStatus === 'cancelled') return 'cancelled';
  if (hasDeliverable(order)) return 'assigned';
  if (order.paymentStatus === 'verification_pending') return 'verification_pending';
  return 'payment_pending';
};

export const getCustomerOrderStatusLabel = (status: CustomerOrderStatus) => {
  switch (status) {
    case 'fulfilled':
      return 'Delivered / Ready';
    case 'assigned':
      return 'Account Attached';
    case 'verification_pending':
      return 'Verifying UTR';
    case 'cancelled':
      return 'Rejected';
    default:
      return 'Payment Pending';
  }
};
