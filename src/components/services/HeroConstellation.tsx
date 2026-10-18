'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ArrowRight, Star } from 'lucide-react';

export const HeroConstellation: React.FC = () => {
  const { currentRole, setActiveTab } = useApp();

  return (
    <section className="max-w-6xl mx-auto w-full px-4 pt-10 sm:pt-16 pb-12">
      {/* Role Banner */}
      {currentRole === 'reseller' && (
        <div className="mb-6 rounded-[14px] border border-[var(--color-banner-border)] bg-[var(--color-banner)] px-3.5 py-2.5 text-xs text-[var(--color-brand-violet)]">
          Reseller pricing active · wholesale margin shown on every card
        </div>
      )}

      {/* Hero introduction */}
      <h1 className="font-heading font-bold text-[40px] sm:text-[64px] leading-[1.02] text-[var(--color-text-primary)] max-w-3xl">
        Premium OTT services at budget prices
      </h1>
      <p className="mt-4 max-w-xl text-[15px] sm:text-[17px] leading-[1.55] text-[var(--color-text-muted)]">
        Pick a service, pay with UPI, and get your credentials on Telegram or WhatsApp. No account needed to buy.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className="ws-primary-button h-[52px] px-7 rounded-[16px] text-[15px] inline-flex items-center gap-2 active:scale-95 transition-transform"
        >
          Browse the catalog
          <ArrowRight className="w-4 h-4" />
        </button>
        <a
          href="https://t.me/Webscibe_Reviews"
          target="_blank"
          rel="noopener noreferrer"
          className="ws-secondary-button h-[52px] px-7 rounded-[16px] text-[15px] font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Star className="w-4 h-4 text-[var(--color-brand-violet)] fill-current" />
          Read real customer reviews
        </a>
      </div>
    </section>
  );
};
