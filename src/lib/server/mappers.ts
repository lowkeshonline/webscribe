import 'server-only';

import {
  DeliveryMethod,
  DeliveryStatus,
  Order,
  PaymentStatus,
  Service,
  ServiceCategory,
  StockStatus,
  Ticket,
  TicketStatus,
  UserProfile,
} from '@/types';
import { decryptCredential } from './credentialCrypto';

type DbRecord = Record<string, unknown>;

const str = (row: DbRecord, key: string) => String(row[key] ?? '');
const optionalStr = (row: DbRecord, key: string) => {
  const value = row[key];
  return typeof value === 'string' && value ? value : undefined;
};

/** Legacy plan variants stored their details in dos/donts before the description field existed. */
const legacyPlanDescription = (variant: DbRecord) => {
  const points = [optionalStr(variant, 'dos'), optionalStr(variant, 'donts')]
    .filter((text): text is string => Boolean(text))
    .flatMap(text => text.split(/\r?\n/).map(point => point.trim()).filter(Boolean));
  return points.length ? Array.from(new Set(points)).join('\n') : undefined;
};
const num = (row: DbRecord, key: string) => Number(row[key] ?? 0);
const bool = (row: DbRecord, key: string) => Boolean(row[key]);
export const mapServiceRow = (row: DbRecord): Service => ({
  id: str(row, 'id'),
  title: str(row, 'title'),
  category: str(row, 'category') as ServiceCategory,
  logoUrl: optionalStr(row, 'logo_url'),
  brandColor: str(row, 'brand_color'),
  description: str(row, 'description'),
  dos: optionalStr(row, 'dos'),
  donts: optionalStr(row, 'donts'),
  deliveryTime: optionalStr(row, 'delivery_time'),
  regularPrice: num(row, 'our_price') || num(row, 'regular_price'),
  originalPrice: num(row, 'original_price') || num(row, 'regular_price'),
  ourPrice: num(row, 'our_price') || num(row, 'regular_price'),
  resellerPrice: num(row, 'reseller_price'),
  stockCount: num(row, 'stock_count'),
  stockStatus: str(row, 'stock_status') as StockStatus,
  validityValue: num(row, 'validity_value') || 30,
  validityUnit: row.validity_unit === 'months' ? 'months' : 'days',
  variantMode: row.variant_mode === 'multiple' ? 'multiple' : 'single',
  priceStartsAt: row.price_starts_at == null ? undefined : num(row, 'price_starts_at'),
  variants: Array.isArray(row.variants) ? row.variants.map((variant) => {
    const item = variant as Record<string, unknown>;
    return {
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      originalPrice: Number(item.originalPrice ?? item.original_price ?? item.regularPrice ?? item.regular_price ?? 0),
      ourPrice: Number(item.ourPrice ?? item.our_price ?? item.regularPrice ?? item.regular_price ?? 0),
      regularPrice: Number(item.regularPrice ?? item.regular_price ?? 0),
      resellerPrice: Number(item.resellerPrice ?? item.reseller_price ?? 0),
      stockCount: Number(item.stockCount ?? item.stock_count ?? 0),
      validityValue: Number(item.validityValue ?? item.validity_value ?? 30),
      validityUnit: item.validityUnit === 'months' || item.validity_unit === 'months' ? 'months' : 'days',
      deliveryTime: optionalStr(item, 'deliveryTime') ?? optionalStr(item, 'delivery_time'),
      description: optionalStr(item, 'description') ?? legacyPlanDescription(item),
      dos: optionalStr(item, 'dos'),
      donts: optionalStr(item, 'donts'),
    };
  }) : [],
  isPopular: bool(row, 'is_popular'),
});

export const mapOrderRow = (row: DbRecord): Order => ({
  id: str(row, 'id'),
  secretKey: str(row, 'secret_key'),
  serviceId: str(row, 'service_id'),
  serviceTitle: str(row, 'service_title'),
  variantId: optionalStr(row, 'variant_id'),
  variantName: optionalStr(row, 'variant_name'),
  serviceCategory: str(row, 'service_category') as ServiceCategory,
  userRole: str(row, 'user_role') as Order['userRole'],
  pricePaid: num(row, 'price_paid'),
  regularPrice: num(row, 'regular_price'),
  resellerDiscount: row.reseller_discount == null ? undefined : num(row, 'reseller_discount'),
  customerName: str(row, 'customer_name'),
  customerTelegram: str(row, 'customer_telegram'),
  customerWhatsapp: optionalStr(row, 'customer_whatsapp'),
  contactMethod: row.contact_method === 'whatsapp' ? 'whatsapp' : 'telegram',
  paymentStatus: str(row, 'payment_status') as PaymentStatus,
  utrNumber: optionalStr(row, 'utr_number'),
  paymentProofName: optionalStr(row, 'payment_proof_name'),
  deliveryMethod: str(row, 'delivery_method') as DeliveryMethod,
  deliveryStatus: str(row, 'delivery_status') as DeliveryStatus,
  credentials: typeof row.credentials === 'object' && row.credentials ? {
    username: optionalStr(row.credentials as DbRecord, 'username'),
    password: decryptCredential((row.credentials as DbRecord).password),
    pin: decryptCredential((row.credentials as DbRecord).pin),
    additionalInfo: decryptCredential((row.credentials as DbRecord).additionalInfo),
  } : undefined,
  accountId: optionalStr(row, 'account_id'),
  dos: optionalStr(row, 'dos'),
  donts: optionalStr(row, 'donts'),
  expiresAt: optionalStr(row, 'expires_at'),
  createdAt: str(row, 'created_at'),
});

export const mapTicketRow = (row: DbRecord): Ticket => ({
  id: str(row, 'id'),
  orderId: str(row, 'order_id'),
  serviceTitle: str(row, 'service_title'),
  customerTelegram: str(row, 'customer_telegram'),
  customerWhatsapp: optionalStr(row, 'customer_whatsapp'),
  contactMethod: row.contact_method === 'whatsapp' ? 'whatsapp' : row.contact_method === 'telegram' ? 'telegram' : undefined,
  issueCategory: str(row, 'issue_category') as Ticket['issueCategory'],
  description: str(row, 'description'),
  status: str(row, 'status') as TicketStatus,
  adminNote: optionalStr(row, 'admin_note'),
  createdAt: str(row, 'created_at'),
});

export const mapProfileRow = (row: DbRecord): UserProfile => ({
  id: str(row, 'id'),
  fullName: str(row, 'full_name'),
  email: str(row, 'email'),
  telegram: str(row, 'telegram'),
  whatsapp: optionalStr(row, 'whatsapp'),
  password: '',
  role: str(row, 'role') as UserProfile['role'],
  createdAt: str(row, 'created_at'),
});
