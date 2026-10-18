export type UserRole = 'customer' | 'reseller' | 'admin';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  telegram: string;
  whatsapp?: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export type ServiceCategory = 'All' | 'Streaming' | 'Music' | 'AI & Tools' | 'Gaming';

export type DeliveryMethod = 'instant' | 'telegram';
export type ServiceVariantMode = 'single' | 'multiple';
export type ServiceValidityUnit = 'days' | 'months';

export interface ServiceVariant {
  id: string;
  name: string;
  originalPrice?: number;
  ourPrice?: number;
  regularPrice: number;
  resellerPrice: number;
  stockCount: number;
  validityValue: number;
  validityUnit: ServiceValidityUnit;
  deliveryTime?: string;
  /** Per-plan highlights, one point per line. */
  description?: string;
  dos?: string;
  donts?: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Service {
  id: string;
  title: string;
  category: ServiceCategory;
  logoUrl?: string;
  brandColor: string;
  description: string;
  dos?: string;
  donts?: string;
  regularPrice: number;
  originalPrice?: number;
  ourPrice?: number;
  resellerPrice: number;
  stockCount: number;
  stockStatus: StockStatus;
  validityValue: number;
  validityUnit: ServiceValidityUnit;
  deliveryTime?: string;
  variantMode?: ServiceVariantMode;
  priceStartsAt?: number;
  variants?: ServiceVariant[];
  isPopular?: boolean;
}

export type PaymentStatus = 
  | 'pending_payment'
  | 'verification_pending'
  | 'completed'
  | 'cancelled';

export type DeliveryStatus = 
  | 'pending'
  | 'delivered'
  | 'action_required';

export interface Credentials {
  username?: string;
  password?: string;
  pin?: string;
  additionalInfo?: string;
}

export type AccountStatus = 'available' | 'assigned';

export interface AccountCredential {
  id: string;
  serviceId: string;
  serviceTitle: string;
  username?: string;
  profileName?: string;
  password?: string;
  pin?: string;
  additionalInfo?: string;
  status: AccountStatus;
  assignedOrderId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Order {
  id: string;
  secretKey: string;
  serviceId: string;
  serviceTitle: string;
  variantId?: string;
  variantName?: string;
  serviceCategory: ServiceCategory;
  userRole: UserRole;
  pricePaid: number;
  regularPrice: number;
  resellerDiscount?: number;
  customerName: string;
  customerTelegram: string;
  customerWhatsapp?: string;
  contactMethod: 'telegram' | 'whatsapp';
  paymentStatus: PaymentStatus;
  utrNumber?: string;
  paymentProofName?: string;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  credentials?: Credentials;
  accountId?: string;
  dos?: string;
  donts?: string;
  expiresAt?: string;
  createdAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id: string;
  orderId: string;
  serviceTitle: string;
  customerTelegram: string;
  customerWhatsapp?: string;
  contactMethod?: 'telegram' | 'whatsapp';
  issueCategory: 'Account Locked' | 'Invalid Password' | 'Buffering / Quality' | 'Other';
  description: string;
  status: TicketStatus;
  adminNote?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminTicketPage extends PaginatedResult<Ticket> {
  status: 'open' | 'resolved';
  search: string;
  openTotal: number;
  resolvedTotal: number;
}

export interface AdminOrderPage extends PaginatedResult<Order> {
  serviceTitle: string;
  serviceTypes: string[];
  search: string;
}
