'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  Clapperboard,
  MessageCircle,
  Music,
  Popcorn,
  QrCode,
  Search,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ServiceCategory } from '@/types';

const STEPS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: 'Choose',
    body: 'Browse streaming, music, AI tools and gaming. Plans and prices are on every card.',
    icon: Search,
  },
  {
    title: 'Pay by UPI',
    body: 'Enter your name, Telegram and WhatsApp, scan the QR, and submit your UTR number.',
    icon: QrCode,
  },
  {
    title: 'Receive',
    body: 'We verify the payment and send your account details on the channel you picked.',
    icon: MessageCircle,
  },
];

const CATEGORY_CARDS: {
  category: Exclude<ServiceCategory, 'All'>;
  title: string;
  tagline: string;
  example: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { category: 'Streaming', title: 'Streaming', tagline: 'Video and shows', example: 'Netflix and more', icon: Clapperboard, color: 'var(--color-danger)' },
  { category: 'Music', title: 'Music', tagline: 'Listen ad-free', example: 'Spotify and more', icon: Music, color: 'var(--color-success)' },
  { category: 'AI & Tools', title: 'AI & Tools', tagline: 'Work smarter', example: 'Subscriptions for tools', icon: Sparkles, color: '#8FB4F5' },
  { category: 'Gaming', title: 'Movie tickets and Food', tagline: 'Discounts on both', example: 'Vouchers and codes', icon: Popcorn, color: 'var(--color-warning)' },
];

export const HowItWorks: React.FC = () => (
  <section id="how" className="max-w-6xl mx-auto w-full px-4 pb-12 scroll-mt-20">
    <h2 className="font-heading font-bold text-[28px] text-[var(--color-text-primary)] mb-6">
      Three steps to your plan
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STEPS.map((step, index) => (
        <div key={step.title} className="ws-panel rounded-[24px] p-6">
          <div className="font-heading font-bold text-[40px] leading-none text-[var(--color-brand-violet)]">
            {index + 1}
          </div>
          <h3 className="mt-3 mb-2 flex items-center gap-2 text-[17px] font-semibold text-[var(--color-text-primary)]">
            <step.icon className="w-4.5 h-4.5 text-[var(--color-brand-violet)]" />
            {step.title}
          </h3>
          <p className="text-[14px] leading-[1.55] text-[var(--color-text-muted)]">
            {step.body}
          </p>
        </div>
      ))}
    </div>
  </section>
);

export const CategoryShowcase: React.FC = () => {
  const { setSelectedCategory, setActiveTab } = useApp();

  return (
    <section id="services" className="max-w-6xl mx-auto w-full px-4 pb-12 scroll-mt-20">
      <h2 className="font-heading font-bold text-[28px] text-[var(--color-text-primary)] mb-6">
        What you can get
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORY_CARDS.map(card => (
          <button
            key={card.category}
            type="button"
            onClick={() => {
              setSelectedCategory(card.category);
              setActiveTab('catalog');
            }}
            className="ws-panel rounded-[24px] p-5 flex flex-col gap-3.5 text-left transition-colors duration-300 hover:border-[var(--color-track)]"
          >
            <span
              className="w-12 h-12 rounded-[14px] flex items-center justify-center"
              style={{ backgroundColor: card.color, color: 'var(--color-accent-ink)' }}
            >
              <card.icon className="w-6 h-6" />
            </span>
            <span className="block">
              <span className="block text-[17px] font-semibold text-[var(--color-text-primary)]">
                {card.title}
              </span>
              <span className="block text-[13px] text-[var(--color-text-muted)]">
                {card.tagline}
              </span>
            </span>
            <span className="block text-[13px] text-[var(--color-text-secondary)]">
              {card.example}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export const ContactBand: React.FC = () => (
  <section className="max-w-6xl mx-auto w-full px-4 pb-12">
    <div className="rounded-[32px] bg-[var(--color-brand-violet)] text-[var(--color-accent-ink)] p-7 sm:p-12 flex flex-wrap gap-6 items-center justify-between">
      <h2 className="max-w-xl font-heading font-bold text-[28px] sm:text-[34px] leading-[1.1]">
        Looking for any other services?
      </h2>
      <a
        href="https://t.me/StrawHatLoki"
        target="_blank"
        rel="noopener noreferrer"
        className="h-[52px] px-7 rounded-[16px] bg-[var(--color-accent-ink)] text-[var(--color-text-primary)] font-semibold text-[15px] transition-opacity hover:opacity-90 inline-flex items-center"
      >
        Contact us
      </a>
    </div>
  </section>
);
