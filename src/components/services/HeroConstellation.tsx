'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles } from 'lucide-react';

export const HeroConstellation: React.FC = () => {
  const { currentRole } = useApp();

  return (
    <section className="py-8 px-4 max-w-6xl mx-auto">
      {/* Role Banner / VIP Reseller Alert */}
      {currentRole === 'reseller' && (
        <div className="mb-6 p-4 ws-panel flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--color-reseller-bg)] text-[var(--color-reseller-indigo)] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
                VIP Reseller Margin Mode Active
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)]">
                You are viewing wholesale volume prices. Up to 40% discount applied automatically on all slots.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-[var(--color-reseller-bg)] border border-[var(--color-card-border)] text-[var(--color-reseller-indigo)] text-xs font-semibold">
            Admin Approved
          </span>
        </div>
      )}

      {/* Hero introduction */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="font-heading font-bold text-3xl sm:text-5xl text-[var(--color-text-primary)] mb-3 leading-tight">
          Premium OTT Services <br />
          <span className="text-[var(--color-brand-violet)]">at budget prices</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-6">
          Netflix 4K, ChatGPT Plus, Prime Video & Spotify, and many more.
        </p>
      </div>
    </section>
  );
};
