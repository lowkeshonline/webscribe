'use client';

import React, { useState } from 'react';
import { X, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { LoadingButton } from '@/components/common/LoadingButton';
import {
  EMAIL_PATTERN,
  INDIAN_WHATSAPP_PATTERN,
  PASSWORD_PATTERN,
  TELEGRAM_USERNAME_PATTERN,
  isValidEmail,
  isValidFullName,
  isValidIndianWhatsappNumber,
  isValidPasswordLength,
  isValidTelegramUsername,
  sanitizeFullNameInput,
  sanitizeIndianWhatsappInput,
  sanitizeTelegramInput,
} from '@/lib/validation';

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
    <path fill="#34A853" d="M12 21.5c2.43 0 4.47-.8 5.96-2.17l-3.14-2.45c-.87.58-1.98.92-2.82.92-2.35 0-4.35-1.59-5.06-3.73H3.7v2.53A9 9 0 0 0 12 21.5Z" />
    <path fill="#FBBC05" d="M6.94 14.07A5.4 5.4 0 0 1 6.66 12c0-.72.13-1.42.28-2.07V7.4H3.7A9 9 0 0 0 3 12c0 1.45.35 2.82.7 4.07l3.24-2Z" />
    <path fill="#EA4335" d="M12 6.2c1.32 0 2.51.45 3.45 1.34l2.58-2.58C16.47 3.55 14.43 2.5 12 2.5a9 9 0 0 0-8.3 4.9l3.24 2.53C7.65 7.79 9.65 6.2 12 6.2Z" />
  </svg>
);

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authMode,
    authError,
    authNotice,
    closeAuthModal,
    openAuthModal,
    login,
    signInWithGoogle,
    registerProfile,
    profileCompletionRequired,
    profileDraft,
    completeGoogleProfile,
    logout,
  } = useApp();

  const [fullName, setFullName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionTelegram, setCompletionTelegram] = useState('');
  const [completionWhatsapp, setCompletionWhatsapp] = useState('');
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionLoggingOut, setCompletionLoggingOut] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleProfileCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completionSubmitting) return;

    if (completionTelegram && !isValidTelegramUsername(completionTelegram)) {
      setValidationError('Enter a valid Telegram username with 5-32 letters, numbers, or underscores.');
      return;
    }
    if (completionWhatsapp && !isValidIndianWhatsappNumber(completionWhatsapp)) {
      setValidationError('Enter a valid Indian WhatsApp number: 10 digits starting with 6-9, optionally with +91.');
      return;
    }
    if (!completionTelegram && !completionWhatsapp) {
      setValidationError('Add at least one valid contact method: Telegram or WhatsApp.');
      return;
    }

    setValidationError(null);
    setCompletionSubmitting(true);
    try {
      const success = await completeGoogleProfile({ telegram: completionTelegram, whatsapp: completionWhatsapp });
      if (success) {
        setCompletionTelegram('');
        setCompletionWhatsapp('');
      }
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const handleCompletionLogout = async () => {
    if (completionLoggingOut) return;
    setCompletionLoggingOut(true);
    try {
      await logout();
    } finally {
      setCompletionLoggingOut(false);
    }
  };

  if (!authModalOpen && !profileCompletionRequired) return null;

  if (profileCompletionRequired) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-md ws-panel rounded-t-[22px] sm:rounded-[22px] p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[var(--color-card-border)] mb-4">
            <span className="w-9 h-9 rounded-[14px] bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Complete your profile</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Add one contact method so we can deliver your orders.</p>
            </div>
          </div>

          <form onSubmit={handleGoogleProfileCompletion} noValidate className="space-y-3">
            <div>
              <label htmlFor="google-profile-name" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Name</label>
              <input id="google-profile-name" value={profileDraft?.fullName || ''} readOnly className="w-full px-4 py-3 rounded-full text-sm ws-input opacity-70" />
            </div>
            <div>
              <label htmlFor="google-profile-email" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Email</label>
              <input id="google-profile-email" value={profileDraft?.email || ''} readOnly className="w-full px-4 py-3 rounded-full text-sm ws-input opacity-70" />
            </div>
            <div>
              <label htmlFor="google-profile-telegram" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Telegram username</label>
              <input id="google-profile-telegram" value={completionTelegram} onChange={event => setCompletionTelegram(sanitizeTelegramInput(event.target.value))} pattern={TELEGRAM_USERNAME_PATTERN} maxLength={33} title="Use 5-32 letters, numbers, or underscores, optionally prefixed with @." className="w-full px-4 py-3 rounded-full text-sm ws-input" placeholder="@username" />
            </div>
            <div>
              <label htmlFor="google-profile-whatsapp" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">WhatsApp number</label>
              <input id="google-profile-whatsapp" value={completionWhatsapp} onChange={event => setCompletionWhatsapp(sanitizeIndianWhatsappInput(event.target.value))} pattern={INDIAN_WHATSAPP_PATTERN} inputMode="tel" maxLength={16} title="Use an Indian mobile number starting with 6-9, with an optional +91 prefix." className="w-full px-4 py-3 rounded-full text-sm ws-input" placeholder="+91 9876543210" />
            </div>

            {(validationError || authError) && <div role="alert" className="p-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">{validationError || authError}</div>}

            <p className="text-[11px] text-[var(--color-text-muted)]">Please add at least one delivery contact: Telegram or WhatsApp.</p>
            <LoadingButton type="submit" loading={completionSubmitting} loadingLabel="Saving..." className="w-full py-3 rounded-full ws-primary-button text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Save and continue
            </LoadingButton>
          </form>

          <LoadingButton type="button" loading={completionLoggingOut} loadingLabel="Signing out..." onClick={() => void handleCompletionLogout()} className="w-full mt-3 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center justify-center gap-1.5">
            Sign out and use another account
          </LoadingButton>
        </div>
      </div>
    );
  }

  const isRegister = authMode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isRegister) {
      if (!isValidFullName(fullName)) {
        setValidationError('Enter a valid full name using letters, spaces, apostrophes, periods, or hyphens.');
        return;
      }
      if (telegram && !isValidTelegramUsername(telegram)) {
        setValidationError('Enter a valid Telegram username with 5-32 letters, numbers, or underscores.');
        return;
      }
      if (whatsapp && !isValidIndianWhatsappNumber(whatsapp)) {
        setValidationError('Enter a valid Indian WhatsApp number: 10 digits starting with 6-9, optionally with +91.');
        return;
      }
      if (!telegram && !whatsapp) {
        setValidationError('Add at least one valid contact method: Telegram or WhatsApp.');
        return;
      }
      if (!isValidEmail(email)) {
        setValidationError('Enter a valid email address.');
        return;
      }
      if (!isValidPasswordLength(password)) {
        setValidationError('Password must be between 8 and 72 characters.');
        return;
      }
    } else if (!email.trim() || !password) {
      setValidationError('Enter your email and password.');
      return;
    } else if (!isValidEmail(email)) {
      setValidationError('Enter a valid email address.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    let success = false;
    try {
      success = isRegister
        ? await registerProfile({ fullName, telegram, whatsapp, email, password })
        : await login(email, password);
    } finally {
      setIsSubmitting(false);
    }

    if (success) {
      setFullName('');
      setTelegram('');
      setWhatsapp('');
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md ws-panel rounded-t-[22px] sm:rounded-[22px] p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-card-border)] mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-[14px] bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] flex items-center justify-center">
                {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              </span>
              <h2 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">
                {isRegister ? 'Create Customer Profile' : 'Sign In'}
              </h2>
            </div>
            {isRegister && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                Profiles start as regular customers. Reseller access is granted from the admin dashboard.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setValidationError(null); closeAuthModal(); }}
            className="w-8 h-8 rounded-full ws-chip flex items-center justify-center shrink-0 aspect-square hover:text-[var(--color-text-primary)]"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <LoadingButton
          type="button"
          loading={isSubmitting}
          loadingLabel="Redirecting..."
          onClick={() => void handleGoogleSignIn()}
          className="w-full py-3 rounded-full ws-chip text-sm font-semibold flex items-center justify-center gap-2"
        >
          <GoogleIcon className="w-4 h-4" />
          Continue with Google
        </LoadingButton>

        <div className="flex items-center gap-3 my-4 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          <span className="h-px flex-1 bg-[var(--color-card-border)]" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-[var(--color-card-border)]" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {isRegister && (
            <>
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-fullname"
                  name="fullName"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={e => setFullName(sanitizeFullNameInput(e.target.value))}
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-full text-sm ws-input"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label htmlFor="auth-telegram" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                  Telegram Username
                </label>
                <input
                  id="auth-telegram"
                  name="telegram"
                  autoComplete="username"
                  value={telegram}
                  onChange={e => setTelegram(sanitizeTelegramInput(e.target.value))}
                  pattern={TELEGRAM_USERNAME_PATTERN}
                  maxLength={33}
                  title="Use 5-32 letters, numbers, or underscores, optionally prefixed with @."
                  className="w-full px-4 py-3 rounded-full text-sm ws-input"
                  placeholder="@username"
                />
              </div>
              <div><label htmlFor="auth-whatsapp" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">WhatsApp Number</label><input id="auth-whatsapp" value={whatsapp} onChange={e => setWhatsapp(sanitizeIndianWhatsappInput(e.target.value))} pattern={INDIAN_WHATSAPP_PATTERN} inputMode="tel" maxLength={16} title="Use an Indian mobile number starting with 6-9, with an optional +91 prefix." className="w-full px-4 py-3 rounded-full text-sm ws-input" placeholder="+91 9876543210" /></div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
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
              className="w-full px-4 py-3 rounded-full text-sm ws-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              type="password"
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
              pattern={isRegister ? PASSWORD_PATTERN : undefined}
              title={isRegister ? 'Use between 8 and 72 characters.' : undefined}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-full text-sm ws-input"
              placeholder={isRegister ? 'Minimum 8 characters' : 'Your password'}
            />
          </div>

          {(validationError || authError) && (
            <div className="p-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">
              {validationError || authError}
            </div>
          )}

          {authNotice && (
            <div role="status" className="p-3 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              {authNotice}
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingLabel="Please wait..."
            disabled={Boolean(authNotice)}
            className="w-full py-3 rounded-full ws-primary-button text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{isRegister ? 'Create Profile' : 'Sign In'}</span>
          </LoadingButton>
        </form>

        <button
          type="button"
          onClick={() => { setValidationError(null); openAuthModal(isRegister ? 'login' : 'register'); }}
          className="w-full mt-3 text-xs font-semibold text-[var(--color-brand-violet)] hover:underline"
        >
          {isRegister ? 'Already have a profile? Sign in' : 'New customer? Create a profile'}
        </button>
      </div>
    </div>
  );
};
