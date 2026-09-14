'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Order } from '@/types';
import { X, Copy, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { copyTextToClipboard } from '@/lib/client/clipboard';
import { LoadingButton } from '@/components/common/LoadingButton';

export const UPIPaymentModal: React.FC = () => {
  const { checkoutService, closeCheckout, currentRole, currentUser, placeOrder, openOrderDetails } = useApp();

  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp'>('telegram');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(checkoutService?.variants?.[0]?.id);

  if (!checkoutService) return null;

  const isReseller = currentRole === 'reseller';
  const selectedVariant = checkoutService.variantMode === 'multiple'
    ? checkoutService.variants?.find(variant => variant.id === selectedVariantId) || checkoutService.variants?.[0]
    : undefined;
  const priceToPay = isReseller
    ? selectedVariant?.resellerPrice ?? checkoutService.resellerPrice
    : selectedVariant?.ourPrice ?? selectedVariant?.regularPrice ?? checkoutService.regularPrice;
  const upiId = 'theinfinix@ybl';
  const backupUpiId = 'lowkeshonline@ybl';
  const upiPaymentUri = `upi://pay?${new URLSearchParams({ pa: upiId, pn: 'Webscribe', am: String(priceToPay), cu: 'INR' })}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?${new URLSearchParams({ size: '220x220', data: upiPaymentUri })}`;

  const handleCopyUPI = async () => {
    if (await copyTextToClipboard(upiId)) {
      setCopiedUPI(true);
      setTimeout(() => setCopiedUPI(false), 2000);
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedContact = contactMethod === 'telegram' ? currentUser?.telegram : currentUser?.whatsapp;
    if (!resolvedContact?.trim()) {
      setCheckoutError(
        contactMethod === 'telegram'
          ? 'Add a Telegram username to your profile before choosing Telegram delivery.'
          : 'Add a WhatsApp number to your profile before choosing WhatsApp delivery.'
      );
      return;
    }

    setCheckoutError(null);
    setStep('payment');
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutService || !currentUser || !utrNumber.trim() || uploading) return;

    setUploading(true);
    setCheckoutError(null);
    try {
      const order = await placeOrder(checkoutService, selectedVariant?.id, contactMethod, utrNumber);
      setActiveOrder(order);
      setStep('success');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to submit payment verification.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div className="w-full max-w-lg ws-panel rounded-t-[22px] sm:rounded-[22px] p-6 animate-in slide-in-from-bottom-4 duration-200 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-card-border)] mb-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-[14px] text-white flex items-center justify-center font-semibold text-lg"
              style={{ backgroundColor: checkoutService.brandColor }}
            >
              {checkoutService.title.charAt(0)}
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)]">
                {checkoutService.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isReseller ? 'VIP Reseller Order' : 'Instant Checkout'}
              </p>
            </div>
          </div>
          <button
            onClick={closeCheckout}
            className="w-8 h-8 rounded-full ws-chip flex items-center justify-center shrink-0 aspect-square hover:text-[var(--color-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Customer Details */}
        {step === 'info' && (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            {/* Price Summary Card */}
            <div className="p-4 ws-panel-muted flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">Total Payable Amount</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading font-bold text-2xl text-[var(--color-brand-violet)]">
                    ₹{priceToPay}
                  </span>
                  {isReseller && (
                    <span className="text-xs text-[var(--color-text-muted)] line-through">
                      ₹{checkoutService.regularPrice}
                    </span>
                  )}
                </div>
              </div>
              {isReseller && (
                <span className="px-3 py-1 rounded-full bg-[var(--color-reseller-bg)] text-[var(--color-reseller-indigo)] text-xs font-semibold border border-[var(--color-card-border)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Reseller Rate
                </span>
              )}
            </div>

            {checkoutService.variantMode === 'multiple' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Choose a variant</label>
                <StyledDropdown
                  value={selectedVariant?.id || ''}
                  onChange={setSelectedVariantId}
                  ariaLabel="Choose a service variant"
                  options={(checkoutService.variants || []).map(variant => ({
                    value: variant.id,
                    label: <span>{variant.name} · ₹{isReseller ? variant.resellerPrice : variant.ourPrice ?? variant.regularPrice} · {variant.validityValue} {variant.validityUnit}</span>,
                  }))}
                  buttonClassName="px-4 py-3 rounded-full"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="relative z-20">
                <span className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Receive Order Via</span>
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
                  buttonClassName="px-4 py-3 rounded-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                  {contactMethod === 'telegram' ? 'Telegram Username (For updates & support)' : 'WhatsApp Number (For updates & support)'}
                </label>
                <input
                  type="text"
                  value={contactMethod === 'telegram' ? (currentUser?.telegram ?? '') : (currentUser?.whatsapp ?? '')}
                  readOnly
                  placeholder={contactMethod === 'telegram' ? '@username' : '+91 9876543210'}
                  className="w-full px-4 py-3 rounded-full text-sm ws-input read-only:opacity-75"
                />
                {contactMethod === 'whatsapp' && !currentUser?.whatsapp && <p className="text-[11px] text-[var(--color-danger)] mt-1">No WhatsApp contact added to your profile. Add WhatsApp in Profile settings before ordering.</p>}
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Make sure this is accurate so we can resolve tickets or message credentials if needed.
                </p>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">
                {checkoutError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-full ws-primary-button font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all"
            >
              <span>Generate UPI QR Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Semi-Automated UPI Payment QR & UTR Entry */}
        {step === 'payment' && (
          <form onSubmit={handleSubmitVerification} className="space-y-4 text-center">
            {/* Dynamic UPI QR Container */}
            <div className="p-4 rounded-[24px] bg-white text-slate-900 shadow-lg inline-block border-4 border-slate-100 mx-auto">
              <Image 
                src={upiQrUrl} 
                alt="UPI Payment QR Code" 
                width={192}
                height={192}
                unoptimized
                className="w-48 h-48 mx-auto object-contain rounded-xl" 
              />
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Scan & Pay Exact Amount
                </span>
                <span className="font-heading font-bold text-2xl text-slate-900">
                  ₹{priceToPay}
                </span>
              </div>
            </div>

            {/* UPI ID One-Tap Copy */}
            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-full ws-panel-muted flex items-center justify-between max-w-sm mx-auto w-full">
                <div className="text-left pl-2">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">
                    Primary UPI VPA
                  </span>
                  <span className="font-mono-code font-bold text-xs text-[var(--color-text-primary)]">
                    {upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  className="px-3 py-1.5 rounded-full ws-primary-button text-xs font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  {copiedUPI ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUPI ? 'Copied' : 'Copy UPI'}</span>
                </button>
              </div>
              
              <div className="text-center">
                <span className="text-[10px] text-[var(--color-text-muted)] block">
                  Backup UPI ID: <span className="font-mono-code font-medium">{backupUpiId}</span>
                </span>
              </div>
            </div>

            {/* UTR Input */}
            <div className="text-left space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  12-Digit UPI UTR / Ref Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{12}"
                  maxLength={12}
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 428819039122"
                  className="w-full px-4 py-3 rounded-full text-sm font-mono-code ws-input"
                />
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                  You can find the 12-digit UTR/Reference number in the payment details of your UPI app (GPay, PhonePe, Paytm) after successful payment.
                </p>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">
                {checkoutError}
              </div>
            )}

            <LoadingButton
              type="submit"
              loading={uploading}
              loadingLabel="Verifying transaction..."
              disabled={utrNumber.length < 12}
              className="w-full py-3.5 rounded-full ws-primary-button font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Payment Verification</span>
            </LoadingButton>
          </form>
        )}

        {/* STEP 3: Submission Confirmation */}
        {step === 'success' && activeOrder && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="font-heading font-bold text-xl text-[var(--color-text-primary)] mb-1">
                Order Submitted
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
                Your order ID <span className="font-mono-code font-bold text-[var(--color-brand-violet)]">{activeOrder.id}</span> is recorded. Payment verification in progress.
              </p>
            </div>

            <div className="p-4 ws-panel-muted text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Order Secret Key:</span>
                <span className="font-mono-code font-bold text-[var(--color-text-primary)]">{activeOrder.secretKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">UTR Reference:</span>
                <span className="font-mono-code text-[var(--color-text-primary)]">{activeOrder.utrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Account delivery:</span>
                <span className="capitalize font-semibold text-[var(--color-brand-violet)]">
                  Account details after verification
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  closeCheckout();
                  openOrderDetails(activeOrder);
                }}
                className="flex-1 py-3 rounded-full ws-primary-button font-semibold text-xs"
              >
                Track Order Status
              </button>
              <button
                onClick={closeCheckout}
                className="px-4 py-3 rounded-full ws-chip text-[var(--color-text-primary)] font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
