'use client';

import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { LoadingButton } from '@/components/common/LoadingButton';
import { EMAIL_PATTERN, isValidEmail } from '@/lib/validation';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authError, closeAuthModal, login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim() || !password) {
      setValidationError('Enter your email and password.');
      return;
    }
    if (!isValidEmail(email)) {
      setValidationError('Enter a valid email address.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    let success = false;
    try {
      success = await login(email, password);
    } finally {
      setIsSubmitting(false);
    }

    if (success) {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-shell)]/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] border-t border-[var(--color-card-border)] sm:border rounded-t-[22px] sm:rounded-[22px] px-5 pt-3 pb-6 sm:p-6">
        {/* Bottom-sheet grabber */}
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-grabber)]" />

        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-card-border)] mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-11 h-11 rounded-[12px] bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </span>
              <h2 className="font-heading font-bold text-2xl text-[var(--color-text-primary)]">
                Admin Sign In
              </h2>
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-2">
              Sign in with your admin email and password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setValidationError(null); closeAuthModal(); }}
            className="w-11 h-11 rounded-[14px] ws-secondary-button flex items-center justify-center shrink-0"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value.replace(/\s/g, '').slice(0, 254))}
              pattern={EMAIL_PATTERN}
              maxLength={254}
              title="Enter a valid email address, such as you@example.com."
              className="w-full h-12 px-3.5 rounded-[14px] text-sm ws-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              autoComplete="current-password"
              required
              type="password"
              maxLength={72}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-3.5 rounded-[14px] text-sm ws-input"
              placeholder="Your password"
            />
          </div>

          {(validationError || authError) && (
            <div className="p-3 rounded-[12px] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
              {validationError || authError}
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingLabel="Please wait..."
            className="w-full h-[52px] rounded-[16px] ws-primary-button text-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </LoadingButton>
        </form>
      </div>
    </div>
  );
};
