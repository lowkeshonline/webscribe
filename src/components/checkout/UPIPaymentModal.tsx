'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Order } from '@/types';
import { X, Copy, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { HighlightPoints } from '@/components/common/HighlightPoints';
import { copyTextToClipboard } from '@/lib/client/clipboard';
import { LoadingButton } from '@/components/common/LoadingButton';
import {
  isValidFullName,
  isValidIndianWhatsappNumber,
  isValidTelegramUsername,
  sanitizeFullNameInput,
  sanitizeIndianWhatsappInput,
  sanitizeTelegramInput,
} from '@/lib/validation';

export const UPIPaymentModal: React.FC = () => {
  const { checkoutService, checkoutVariantId, closeCheckout, currentRole, placeOrder } = useApp();

  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp'>('telegram');
  const [customerName, setCustomerName] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(checkoutVariantId ?? checkoutService?.variants?.[0]?.id);

  if (!checkoutService) return null;

  const isReseller = currentRole === 'reseller';
  const variants = checkoutService.variants || [];
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0];
  const priceToPay = isReseller
    ? selectedVariant?.resellerPrice ?? checkoutService.resellerPrice
    : selectedVariant?.ourPrice ?? selectedVariant?.regularPrice ?? checkoutService.regularPrice;
  const upiId = 'theinfinix@ybl';
  const backupUpiId = 'lowkeshonline@ybl';
  const upiPaymentUri = `upi://pay?${new URLSearchParams({ pa: upiId, pn: 'Webscribe', am: String(priceToPay), cu: 'INR' })}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?${new URLSearchParams({ size: '220x220', data: upiPaymentUri })}`;
  const stepNumber = step === 'info' ? 1 : step === 'payment' ? 2 : 3;

  const handleCopyUPI = async () => {
    if (await copyTextToClipboard(upiId)) {
      setCopiedUPI(true);
      setTimeout(() => setCopiedUPI(false), 2000);
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFullName(customerName)) {
      setCheckoutError('Enter a valid full name using letters, spaces, apostrophes, periods, or hyphens.');
      return;
    }
    if (!isValidTelegramUsername(customerTelegram)) {
      setCheckoutError('Enter a valid Telegram username with 5-32 letters, numbers, or underscores.');
      return;
    }
    if (!isValidIndianWhatsappNumber(customerWhatsapp)) {
      setCheckoutError('Enter a valid Indian WhatsApp number: 10 digits starting with 6-9, optionally with +91.');
      return;
    }

    setCheckoutError(null);
    setStep('payment');
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutService || !utrNumber.trim() || uploading) return;

    setUploading(true);
    setCheckoutError(null);
    try {
      const order = await placeOrder(checkoutService, selectedVariant?.id, {
        customerName,
        customerTelegram,
        customerWhatsapp,
        contactMethod,
      }, utrNumber);
      setActiveOrder(order);
      setStep('success');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to submit payment verification.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-shell)]/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-[var(--color-surface)] border-t border-[var(--color-card-border)] sm:border rounded-t-[22px] sm:rounded-[22px] px-5 pt-3 pb-6 sm:p-6 overflow-y-auto max-h-[92vh] sm:max-h-[90vh]">
        {/* Bottom-sheet grabber */}
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-grabber)]" />

        {/* Step Progress */}
        <div className="flex gap-1.5 mb-5" aria-hidden="true">
          {[1, 2, 3].map(segment => (
            <span
              key={segment}
              className={`h-1 flex-1 rounded-full ${segment <= stepNumber ? 'bg-[var(--color-brand-violet)]' : 'bg-[var(--color-track)]'}`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--color-card-border)] mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-11 h-11 shrink-0 rounded-[12px] text-white flex items-center justify-center font-semibold text-lg"
              style={{ backgroundColor: checkoutService.brandColor }}
            >
              {checkoutService.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)] truncate">
                {checkoutService.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isReseller ? 'VIP Reseller Order' : 'Instant Checkout'}
              </p>
            </div>
          </div>
          <button
            onClick={closeCheckout}
            aria-label="Close checkout"
            className="w-11 h-11 rounded-[14px] ws-secondary-button flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Customer Details */}
        {step === 'info' && (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading font-bold text-2xl text-[var(--color-text-primary)]">
                Your details
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] pt-1.5">Step 1 of 3</span>
            </div>

            {/* Price Summary */}
            <div className="p-4 ws-panel-muted flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs text-[var(--color-text-muted)] mb-1">Total payable</span>
                <span className="font-heading font-bold text-[22px] text-[var(--color-brand-violet)]">
                  ₹{priceToPay}
                </span>
                {isReseller && (
                  <span className="ml-2 text-xs text-[var(--color-text-muted)] line-through">
                    ₹{checkoutService.regularPrice}
                  </span>
                )}
              </div>
              {isReseller && (
                <span className="px-2.5 py-1 rounded-full bg-[var(--color-reseller-bg)] text-[var(--color-reseller-indigo)] text-[11px] font-semibold flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" /> Reseller rate
                </span>
              )}
            </div>

            {(checkoutService.variants || []).length > 1 && (
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Choose a variant</label>
                <StyledDropdown
                  value={selectedVariant?.id || ''}
                  onChange={setSelectedVariantId}
                  ariaLabel="Choose a service variant"
                  options={(checkoutService.variants || []).map(variant => ({
                    value: variant.id,
                    label: <span>{variant.name} · ₹{isReseller ? variant.resellerPrice : variant.ourPrice ?? variant.regularPrice} · {variant.validityValue} {variant.validityUnit}</span>,
                  }))}
                  buttonClassName="h-12 px-3.5 rounded-[14px]"
                />
                {selectedVariant?.deliveryTime && (
                  <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">Estimated delivery: {selectedVariant.deliveryTime}</p>
                )}
              </div>
            )}

            {(checkoutService.variants || []).length === 1 && selectedVariant && !selectedVariant.description && (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {selectedVariant.name} · {selectedVariant.validityValue} {selectedVariant.validityUnit}
                {selectedVariant.deliveryTime ? ` · Delivery: ${selectedVariant.deliveryTime}` : ''}
              </p>
            )}

            {selectedVariant?.description && (
              <HighlightPoints text={selectedVariant.description} />
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="checkout-name" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                  Full name <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(sanitizeFullNameInput(e.target.value))}
                  maxLength={120}
                  className="w-full h-12 px-3.5 rounded-[14px] text-sm ws-input"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label htmlFor="checkout-telegram" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                  Telegram username <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  id="checkout-telegram"
                  type="text"
                  value={customerTelegram}
                  onChange={e => setCustomerTelegram(sanitizeTelegramInput(e.target.value))}
                  maxLength={33}
                  className="w-full h-12 px-3.5 rounded-[14px] text-sm ws-input"
                  placeholder="@username"
                  title="Use 5-32 letters, numbers, or underscores, optionally prefixed with @."
                />
              </div>
              <div>
                <label htmlFor="checkout-whatsapp" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                  WhatsApp number <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  id="checkout-whatsapp"
                  type="text"
                  inputMode="tel"
                  value={customerWhatsapp}
                  onChange={e => setCustomerWhatsapp(sanitizeIndianWhatsappInput(e.target.value))}
                  maxLength={16}
                  className="w-full h-12 px-3.5 rounded-[14px] text-sm ws-input"
                  placeholder="+91 9876543210"
                  title="Use an Indian mobile number starting with 6-9, with an optional +91 prefix."
                />
              </div>
              <div className="relative z-20">
                <span className="block text-xs text-[var(--color-text-muted)] mb-1.5">Receive order via</span>
                <StyledDropdown
                  value={contactMethod}
                  onChange={value => {
                    setContactMethod(value as 'telegram' | 'whatsapp');
                    setCheckoutError(null);
                  }}
                  ariaLabel="Receive order via"
                  options={[
                    { value: 'telegram', label: 'Telegram' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ]}
                  buttonClassName="h-12 px-3.5 rounded-[14px]"
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                  We use both contacts for delivery and support; this picks the channel we message first.
                </p>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-[12px] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
                {checkoutError}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-[52px] rounded-[16px] ws-primary-button text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            >
              <span>Continue to payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Semi-Automated UPI Payment QR & UTR Entry */}
        {step === 'payment' && (
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading font-bold text-2xl text-[var(--color-text-primary)]">
                Pay ₹{priceToPay} via UPI
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] pt-1.5 shrink-0">Step 2 of 3</span>
            </div>

            {/* UPI QR + instructions */}
            <div className="flex items-start gap-4">
              <div className="w-[132px] h-[132px] sm:w-40 sm:h-40 shrink-0 rounded-[14px] bg-[#f2f0eb] p-2">
                <Image
                  src={upiQrUrl}
                  alt="UPI Payment QR Code"
                  width={192}
                  height={192}
                  unoptimized
                  className="w-full h-full object-contain rounded-[8px]"
                />
              </div>
              <p className="text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
                Scan with any UPI app, pay the exact amount, then paste the 12-digit UTR below.
              </p>
            </div>

            {/* UPI ID One-Tap Copy */}
            <div className="flex flex-col gap-2">
              <div className="p-3 ws-panel-muted flex items-center justify-between gap-3">
                <div className="min-w-0 pl-1">
                  <span className="block text-[11px] text-[var(--color-text-muted)]">
                    Primary UPI ID
                  </span>
                  <span className="font-mono-code font-semibold text-[13px] text-[var(--color-text-primary)] truncate block">
                    {upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  className="h-11 px-3.5 rounded-[12px] ws-secondary-button text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedUPI ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUPI ? 'Copied' : 'Copy UPI'}</span>
                </button>
              </div>

              <span className="text-[11px] text-[var(--color-text-muted)]">
                Backup UPI ID: <span className="font-mono-code">{backupUpiId}</span>
              </span>
            </div>

            {/* UTR Input */}
            <div>
              <label htmlFor="checkout-utr" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                UTR number <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                id="checkout-utr"
                type="text"
                required
                pattern="[0-9]{12}"
                maxLength={12}
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4091 2233 8841"
                className="w-full h-12 px-3.5 rounded-[14px] text-sm font-mono-code ws-input"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                You can find the 12-digit UTR/Reference number in the payment details of your UPI app (GPay, PhonePe, Paytm) after successful payment.
              </p>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-[12px] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
                {checkoutError}
              </div>
            )}

            <LoadingButton
              type="submit"
              loading={uploading}
              loadingLabel="Verifying transaction..."
              disabled={utrNumber.length < 12}
              className="w-full h-[52px] rounded-[16px] ws-primary-button text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit for verification</span>
            </LoadingButton>
          </form>
        )}

        {/* STEP 3: Submission Confirmation */}
        {step === 'success' && activeOrder && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading font-bold text-2xl text-[var(--color-text-primary)]">
                Order submitted
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] pt-1.5 shrink-0">Step 3 of 3</span>
            </div>

            <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <p className="text-[13px] text-[var(--color-text-secondary)] text-center max-w-sm mx-auto">
              Your order ID <span className="font-mono-code font-semibold text-[var(--color-brand-violet)]">{activeOrder.id}</span> is recorded. Payment verification in progress.
            </p>

            <div className="p-4 ws-panel-muted text-left text-xs space-y-2.5">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Order secret key</span>
                <span className="font-mono-code font-semibold text-[var(--color-text-primary)]">{activeOrder.secretKey}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">UTR reference</span>
                <span className="font-mono-code text-[var(--color-text-primary)]">{activeOrder.utrNumber}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Account delivery</span>
                <span className="font-semibold text-[var(--color-brand-violet)]">
                  After verification
                </span>
              </div>
            </div>

            <button
              onClick={closeCheckout}
              className="w-full h-12 rounded-[14px] ws-primary-button text-[13px] font-semibold transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
