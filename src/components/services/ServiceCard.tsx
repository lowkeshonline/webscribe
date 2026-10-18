'use client';

import React, { useState } from 'react';
import { Service, ServiceVariant } from '@/types';
import { useApp } from '@/context/AppContext';
import { ChevronDown, X } from 'lucide-react';
import { HighlightPoints } from '@/components/common/HighlightPoints';

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { currentRole, openCheckout } = useApp();
  const variants = service.variants || [];
  const hasVariants = variants.length > 1;
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(variants[0]?.id);
  const [plansOpen, setPlansOpen] = useState(false);

  const isReseller = currentRole === 'reseller';
  const priceOf = (variant: ServiceVariant) => (isReseller ? variant.resellerPrice : variant.ourPrice ?? variant.regularPrice);
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0];
  const cheapestVariant = variants.length
    ? variants.reduce((cheapest, variant) => (priceOf(variant) < priceOf(cheapest) ? variant : cheapest))
    : undefined;
  const displayVariant = hasVariants ? cheapestVariant : variants[0];
  const ourPrice = displayVariant ? priceOf(displayVariant) : service.ourPrice ?? service.regularPrice;
  const originalPrice = displayVariant ? displayVariant.originalPrice ?? ourPrice : service.originalPrice ?? ourPrice;
  const resellerPrice = displayVariant ? displayVariant.resellerPrice : service.resellerPrice;
  const discountPercent = Math.round(((ourPrice - resellerPrice) / Math.max(1, ourPrice)) * 100);
  const selectedPrice = selectedVariant ? priceOf(selectedVariant) : ourPrice;
  const selectedOriginalPrice = selectedVariant ? selectedVariant.originalPrice ?? selectedPrice : originalPrice;

  const ctaClass = 'h-11 min-h-11 px-[22px] rounded-[14px] text-sm font-semibold ws-primary-button hover:opacity-90 active:scale-95 transition-transform shrink-0';

  const buySelectedPlan = () => {
    setPlansOpen(false);
    openCheckout(service, selectedVariant?.id);
  };

  return (
    <>
      <div className="group ws-panel p-4 flex flex-col gap-3 transition-colors duration-300 hover:border-[var(--color-track)]">

        {/* Brand & title */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 shrink-0 rounded-[12px] flex items-center justify-center text-white font-semibold text-lg overflow-hidden"
              style={{ backgroundColor: service.brandColor }}
            >
              {service.logoUrl ? <span role="img" aria-label={`${service.title} logo`} className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${service.logoUrl})` }} /> : service.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)] leading-tight truncate">
                {service.title}
              </h3>
              <span className="text-xs text-[var(--color-text-muted)]">
                {hasVariants ? `${variants.length} plans` : `${displayVariant?.validityValue ?? service.validityValue} ${displayVariant?.validityUnit ?? service.validityUnit}`}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-2 leading-[1.45]">
            {service.description}
          </p>
        )}

        {/* Pricing & CTA */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={`font-heading font-bold text-[22px] leading-none ${isReseller ? 'text-[var(--color-brand-violet)]' : 'text-[var(--color-text-primary)]'}`}>
              ₹{isReseller ? resellerPrice : ourPrice}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] line-through">
              ₹{originalPrice}
            </span>
            {isReseller && discountPercent > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-reseller-bg)] text-[var(--color-reseller-indigo)]">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {hasVariants ? (
            <button
              type="button"
              onClick={() => setPlansOpen(true)}
              className="h-11 min-h-11 px-[22px] rounded-[14px] text-sm font-semibold ws-secondary-button shrink-0 ml-auto active:scale-95 transition-transform"
            >
              View Plans
            </button>
          ) : (
            <button
              onClick={() => openCheckout(service, displayVariant?.id)}
              className={`${ctaClass} ml-auto`}
            >
              {isReseller ? 'Bulk Order' : 'Purchase'}
            </button>
          )}
        </div>
      </div>

      {/* Plans popup — multiple-plan services only */}
      {hasVariants && plansOpen && (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-shell)]/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setPlansOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${service.title} plans`}
            onClick={event => event.stopPropagation()}
            className="w-full max-w-lg bg-[var(--color-surface)] border-t border-[var(--color-card-border)] sm:border rounded-t-[22px] sm:rounded-[22px] px-5 pt-3 pb-6 sm:p-6 overflow-y-auto max-h-[92vh] sm:max-h-[90vh]"
          >
            {/* Bottom-sheet grabber */}
            <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-grabber)]" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--color-card-border)] mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 shrink-0 rounded-[12px] flex items-center justify-center text-white font-semibold text-lg overflow-hidden"
                  style={{ backgroundColor: service.brandColor }}
                >
                  {service.logoUrl ? <span role="img" aria-label={`${service.title} logo`} className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${service.logoUrl})` }} /> : service.title.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)] truncate">
                    {service.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {service.category} · {variants.length} plans
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlansOpen(false)}
                aria-label="Close plans"
                className="w-11 h-11 rounded-[14px] ws-secondary-button flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Plans — selecting a plan expands its details */}
            <div className="space-y-2">
              {variants.map(variant => {
                const active = variant.id === selectedVariant?.id;
                return (
                  <div
                    key={variant.id}
                    className={`rounded-[14px] border transition-colors ${active ? 'border-[var(--color-brand-violet)] bg-[var(--color-surface-hover)]' : 'border-[var(--color-card-border)] hover:border-[var(--color-track)]'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      aria-pressed={active}
                      aria-expanded={Boolean(variant.description)}
                      className="w-full text-left px-3 py-2.5"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{variant.name}</span>
                          {variant.description ? (
                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform ${active ? 'rotate-180' : ''}`} />
                          ) : null}
                        </span>
                        <span className="flex items-baseline gap-1.5 shrink-0">
                          <span className={`font-heading font-bold text-sm ${isReseller ? 'text-[var(--color-brand-violet)]' : 'text-[var(--color-text-primary)]'}`}>₹{priceOf(variant)}</span>
                          {variant.originalPrice ? <span className="text-[11px] text-[var(--color-text-muted)] line-through">₹{variant.originalPrice}</span> : null}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">
                        {variant.validityValue} {variant.validityUnit}
                      </span>
                    </button>
                    {active && variant.description ? (
                      <div className="px-3 pb-3">
                        <HighlightPoints text={variant.description} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Selected plan & purchase */}
            <div className="mt-5 pt-4 border-t border-[var(--color-card-border)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] text-[var(--color-text-muted)] truncate">{selectedVariant?.name}</span>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className={`font-heading font-bold text-[22px] leading-none ${isReseller ? 'text-[var(--color-brand-violet)]' : 'text-[var(--color-text-primary)]'}`}>
                      ₹{selectedPrice}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] line-through">
                      ₹{selectedOriginalPrice}
                    </span>
                  </div>
                </div>
                <button
                  onClick={buySelectedPlan}
                  className={`${ctaClass} ml-auto`}
                >
                  {isReseller ? 'Bulk Order' : 'Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
