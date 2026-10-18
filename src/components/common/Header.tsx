'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LoadingButton } from '@/components/common/LoadingButton';
import { Shield, Sparkles, User, LogOut, LifeBuoy } from 'lucide-react';
export const Header: React.FC = () => {
  const { 
    currentRole, 
    currentUser,
    isAuthenticated,
    authLoading,
    isAdmin,
    logout, 
    orders,
    activeTab,
    setActiveTab
  } = useApp();

  const pendingCount = orders.filter(
    o => o.paymentStatus === 'verification_pending' || o.deliveryStatus === 'action_required'
  ).length;

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface-solid)]/95 border-b border-[var(--color-card-border)]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <svg role="img" aria-label="Webscribe mark" viewBox="0 0 48 48" className="w-[34px] h-[34px] shrink-0">
            <rect width="48" height="48" rx="12" fill="var(--color-brand-violet)" />
            <path d="M10 15 L17.5 34 L24 21 L30.5 34 L38 15" fill="none" stroke="var(--color-accent-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="12" r="3" fill="var(--color-accent-ink)" />
          </svg>
          <div>
            <span className="font-heading font-semibold text-base text-[var(--color-text-primary)] block leading-tight">
              Webscribe
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">
              OTT Engine
            </p>
          </div>
        </div>

        {/* Primary navigation — guests browse and get support without an account */}
        {!isAdmin && (
          <nav className="hidden sm:flex items-center gap-4 ml-auto" aria-label="Primary">
            {activeTab === 'home' && (
              <>
                <a
                  href="#how"
                  className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  How it works
                </a>
                <a
                  href="#services"
                  className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Services
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className={`text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                activeTab === 'support'
                  ? 'text-[var(--color-brand-violet)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              Support
            </button>
          </nav>
        )}

        {/* Account — guests sign in at /admin, so nothing shows here */}
        {isAuthenticated && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (authLoading) return;
              setIsAccountMenuOpen(prev => !prev);
            }}
            className="h-11 min-h-11 px-3.5 rounded-[14px] border border-[var(--color-card-border)] bg-[var(--color-surface)] text-[13px] font-medium text-[var(--color-text-primary)] flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            {currentRole === 'reseller' ? (
              <Sparkles className="w-4 h-4 text-[var(--color-brand-violet)]" />
            ) : currentRole === 'admin' ? (
              <Shield className="w-4 h-4 text-[var(--color-danger)]" />
            ) : (
              <User className="w-4 h-4 text-[var(--color-text-muted)]" />
            )}
            <span className="capitalize">
              {authLoading ? 'Checking…' : currentRole}
            </span>
          </button>

          {/* Account Dropdown */}
          {isAccountMenuOpen && isAuthenticated && (
            <div className="absolute right-0 top-full mt-2 w-64 ws-panel p-1.5 z-50">
              <div className="px-3 py-2 border-b border-[var(--color-card-border)] mb-1">
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                  {currentUser?.fullName}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {currentUser?.email}
                </div>
              </div>
              <div className="px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                Role: <span className="font-semibold capitalize text-[var(--color-text-primary)]">{currentRole}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full min-h-11 px-3 rounded-[12px] text-left text-[13px] font-medium flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--color-danger)]" />
                    Admin Dashboard
                  </span>
                  {pendingCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-[9px] bg-[var(--color-danger)] text-[var(--color-accent-ink)] text-[10px] font-semibold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              <LoadingButton
                type="button"
                loading={loggingOut}
                loadingLabel="Signing out..."
                onClick={async () => {
                  if (loggingOut) return;
                  setLoggingOut(true);
                  try {
                    await logout();
                  } finally {
                    setLoggingOut(false);
                    setIsAccountMenuOpen(false);
                  }
                }}
                className="w-full min-h-11 px-3 rounded-[12px] text-left text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
              >
                <LogOut className="w-4 h-4 text-[var(--color-text-muted)]" />
                Sign Out
              </LoadingButton>
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  );
};
