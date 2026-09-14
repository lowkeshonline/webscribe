'use client';

import React from 'react';
import { Service } from '@/types';
import { useApp } from '@/context/AppContext';
import { ShoppingBag, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { currentRole, openCheckout } = useApp();

  const isReseller = currentRole === 'reseller';
  const ourPrice = service.ourPrice ?? service.regularPrice;
  const originalPrice = service.originalPrice ?? ourPrice;
  const displayPrice = service.variantMode === 'multiple' ? service.priceStartsAt ?? ourPrice : ourPrice;
  const discountAmount = ourPrice - service.resellerPrice;
  const discountPercent = Math.round((discountAmount / Math.max(1, ourPrice)) * 100);

  return (
    <div className="group relative ws-panel p-4 hover:shadow-[var(--shadow-card)] transition-all duration-300 flex flex-col justify-between overflow-hidden">

      <div>
        {/* Brand Banner & Category Pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white font-semibold text-lg shadow-sm overflow-hidden"
              style={{ backgroundColor: service.brandColor }}
            >
              {service.logoUrl ? <span role="img" aria-label={`${service.title} logo`} className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${service.logoUrl})` }} /> : service.title.charAt(0)}
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)] leading-tight group-hover:text-[var(--color-brand-violet)] transition-colors">
                {service.title}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                {service.category}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4">
          {service.description}
        </p>
      </div>

      <div>
        {/* Stock & Delivery Status */}
        <div className="flex items-center justify-between text-xs py-2 border-t border-[var(--color-card-border)]/60 mb-3">
          {/* Stock Indicator */}
          <div className="flex items-center gap-1.5">
            {service.stockStatus === 'in_stock' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-[11px] font-medium text-[var(--color-success)]">
                  {service.stockCount} Available
                </span>
              </>
            ) : service.stockStatus === 'low_stock' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                <span className="text-[11px] font-medium text-[var(--color-warning)]">
                  Only {service.stockCount} left
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
                <span className="text-[11px] font-medium text-[var(--color-danger)]">
                  Restocking
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <CalendarClock className="w-3 h-3" />
            <span>{service.variantMode === 'multiple' ? 'Per variant' : `${service.validityValue} ${service.validityUnit}`}</span>
          </div>
        </div>

        {(service.dos || service.donts) && <div className="space-y-1 mb-3 text-[11px] text-[var(--color-text-muted)]">
          {service.dos?.split('\n').filter(Boolean).slice(0, 2).map((point, index) => <span key={`do-${index}`} className="flex gap-1.5 items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{point}</span>)}
          {service.donts?.split('\n').filter(Boolean).slice(0, 2).map((point, index) => <span key={`dont-${index}`} className="flex gap-1.5 items-start"><XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />{point}</span>)}
        </div>}

        {/* Pricing & Order CTA */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Dynamic Price Display */}
          <div>
            {isReseller ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--color-text-muted)] line-through">
                    ₹{originalPrice}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-reseller-bg)] text-[var(--color-reseller-indigo)]">
                    {discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading font-bold text-xl text-[var(--color-reseller-indigo)]">
                    ₹{service.resellerPrice}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">/slot</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
                    ₹{displayPrice}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{service.variantMode === 'multiple' ? 'starts at' : '/month'}</span>
              </div>
            )}
          </div>

          {/* Checkout Trigger CTA */}
          <button
            onClick={() => openCheckout(service)}
            disabled={service.stockStatus === 'out_of_stock'}
            className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
              service.stockStatus === 'out_of_stock'
                ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-not-allowed'
                : isReseller
                ? 'bg-[var(--color-reseller-indigo)] hover:opacity-90 text-white shadow-[var(--shadow-glow-reseller)]'
                : 'ws-primary-button hover:opacity-90'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isReseller ? 'Bulk Order' : 'Purchase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
