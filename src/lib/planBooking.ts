import { Service, ServiceVariant } from '@/types';

export const TELEGRAM_BOOKING_HANDLE = 'StrawHatLoki';

export const isPercentPlan = (variant?: ServiceVariant) => variant?.paymentCurrency === 'percent';

export const requiresTelegramBooking = (variant?: ServiceVariant) =>
  Boolean(variant?.isManualOrder) || isPercentPlan(variant);

export const planPriceLabel = (variant: ServiceVariant | undefined, isReseller = false) => {
  if (!variant) return '';
  if (isPercentPlan(variant)) return `${variant.ourPrice ?? variant.regularPrice}% OFF`;
  const price = isReseller ? variant.resellerPrice : variant.ourPrice ?? variant.regularPrice;
  return `₹${price}`;
};

export const showPlanValidity = (service: Service) => !service.isOfferService;

export const buildTelegramBookingUrl = (service: Service, variant?: ServiceVariant, isReseller = false) => {
  const lines = [
    'Hi, I want to book this order:',
    `Service: ${service.title}`,
  ];
  if (variant) {
    lines.push(`Plan: ${variant.name}`);
    lines.push(`Price: ${planPriceLabel(variant, isReseller)}`);
    if (showPlanValidity(service)) {
      lines.push(`Validity: ${variant.validityValue} ${variant.validityUnit}`);
    }
  }
  return `https://t.me/${TELEGRAM_BOOKING_HANDLE}?text=${encodeURIComponent(lines.join('\n'))}`;
};
