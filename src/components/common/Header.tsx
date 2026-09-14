'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LoadingButton } from '@/components/common/LoadingButton';
import { Sun, Moon, Shield, Sparkles, User, ShoppingBag, LogOut, UserPlus } from 'lucide-react';
import {
  INDIAN_WHATSAPP_PATTERN,
  PASSWORD_PATTERN,
  TELEGRAM_USERNAME_PATTERN,
  isValidIndianWhatsappNumber,
  isValidPasswordLength,
  isValidTelegramUsername,
  sanitizeIndianWhatsappInput,
  sanitizeTelegramInput,
} from '@/lib/validation';

export const Header: React.FC = () => {
  const { 
    theme, 
    toggleTheme, 
    currentRole, 
    currentUser,
    isAuthenticated,
    authLoading,
    isAdmin,
    openAuthModal,
    logout, 
    orders,
    setActiveTab,
    updateOwnProfile
  } = useApp();

  const pendingCount = orders.filter(
    o => o.paymentStatus === 'verification_pending' || o.deliveryStatus === 'action_required'
  ).length;

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const validateProfileInputs = () => {
    if (!telegram.trim() && !whatsapp.trim()) {
      return 'Add at least one valid contact method: Telegram or WhatsApp.';
    }
    if (telegram.trim() && !isValidTelegramUsername(telegram)) {
      return 'Enter a valid Telegram username with 5-32 letters, numbers, or underscores.';
    }
    if (whatsapp.trim() && !isValidIndianWhatsappNumber(whatsapp)) {
      return 'Enter a valid Indian WhatsApp number: 10 digits starting with 6-9, optionally with +91.';
    }
    if (newPassword && !oldPassword) {
      return 'Enter your old password before choosing a new password.';
    }
    if (newPassword && !isValidPasswordLength(newPassword)) {
      return 'New password must be between 8 and 72 characters.';
    }
    return null;
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileSaving) return;

    const validationError = validateProfileInputs();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateOwnProfile({ telegram, whatsapp, oldPassword: oldPassword || undefined, newPassword: newPassword || undefined });
      setProfileOpen(false);
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface-solid)]/95 dark:bg-[var(--color-surface-solid)]/95 border-b border-[var(--color-card-border)]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-[14px] ws-primary-button flex items-center justify-center font-semibold transition-transform group-hover:scale-[1.03]">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              <span className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
                Webscribe
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--color-brand-violet)]" />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
              OTT Engine & Reseller Hub
            </p>
          </div>
        </div>



        {/* Controls: Account & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Account Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (authLoading) return;
                if (!isAuthenticated) {
                  openAuthModal('login');
                  return;
                }
                setIsAccountMenuOpen(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
              currentRole === 'reseller' 
                ? 'bg-[var(--color-reseller-bg)] border-[var(--color-card-border)] text-[var(--color-reseller-indigo)] shadow-[var(--shadow-glow-reseller)]' 
                : currentRole === 'admin'
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
                : 'bg-[var(--color-surface)] border-[var(--color-card-border)] text-[var(--color-text-primary)]'
            }`}>
              {currentRole === 'reseller' ? (
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-reseller-indigo)]" />
              ) : currentRole === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-red-500 dark:text-red-300" />
              ) : (
                <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              )}
              <span className="capitalize">{authLoading ? 'Checking session...' : isAuthenticated ? currentRole : 'Sign In'}</span>
            </button>

            {/* Account Dropdown */}
            {isAccountMenuOpen && isAuthenticated && (
              <div className="absolute right-0 top-full mt-2 w-60 ws-panel py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-[var(--color-card-border)]">
                  <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
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
                    className="w-full px-3 py-3 text-left text-xs font-medium flex items-center justify-between hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-red-500 dark:text-red-300" />
                      Admin Dashboard
                    </span>
                    {pendingCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}
                <button onClick={() => { setTelegram(currentUser?.telegram || ''); setWhatsapp(currentUser?.whatsapp || ''); setProfileError(null); setProfileOpen(true); setIsAccountMenuOpen(false); }} className="w-full px-3 py-3 text-left text-xs font-medium hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]">Profile settings</button>
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
                  className="w-full px-3 py-3 text-left text-xs font-medium flex items-center gap-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </LoadingButton>
              </div>
            )}
          </div>

          {!authLoading && !isAuthenticated && (
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="hidden sm:flex px-3 py-1.5 rounded-full ws-primary-button text-xs font-semibold items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Profile
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-full ws-chip flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[var(--color-brand-violet)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--color-text-primary)]" />
            )}
          </button>
        </div>
      </div>
      {profileOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleProfileSubmit} noValidate className="w-full max-w-md ws-panel p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Profile settings</h2>
              <button type="button" onClick={() => setProfileOpen(false)} className="w-8 h-8 rounded-full ws-chip flex items-center justify-center" aria-label="Close profile settings">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div>
              <label htmlFor="profile-name" className="text-xs text-[var(--color-text-muted)]">Name</label>
              <input id="profile-name" value={currentUser.fullName} readOnly className="w-full mt-1 px-3 py-2.5 rounded-xl ws-input opacity-70" />
            </div>
            <div>
              <label htmlFor="profile-email" className="text-xs text-[var(--color-text-muted)]">Email</label>
              <input id="profile-email" value={currentUser.email} readOnly className="w-full mt-1 px-3 py-2.5 rounded-xl ws-input opacity-70" />
            </div>
            <div>
              <label htmlFor="profile-telegram" className="text-xs text-[var(--color-text-muted)]">Telegram username</label>
              <input
                id="profile-telegram"
                value={telegram}
                onChange={event => setTelegram(sanitizeTelegramInput(event.target.value))}
                pattern={TELEGRAM_USERNAME_PATTERN}
                maxLength={33}
                title="Use 5-32 letters, numbers, or underscores, optionally prefixed with @."
                className="w-full mt-1 px-3 py-2.5 rounded-xl ws-input"
                placeholder="@username"
              />
            </div>
            <div>
              <label htmlFor="profile-whatsapp" className="text-xs text-[var(--color-text-muted)]">WhatsApp number</label>
              <input
                id="profile-whatsapp"
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={event => setWhatsapp(sanitizeIndianWhatsappInput(event.target.value))}
                pattern={INDIAN_WHATSAPP_PATTERN}
                maxLength={16}
                title="Use an Indian mobile number starting with 6-9, with an optional +91 prefix."
                className="w-full mt-1 px-3 py-2.5 rounded-xl ws-input"
                placeholder="+91 9876543210"
              />
            </div>

            <details className="border-t border-[var(--color-card-border)] pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text-primary)]">Change password (optional)</summary>
              <div className="space-y-2 mt-2">
                <input type="password" value={oldPassword} onChange={event => setOldPassword(event.target.value)} maxLength={72} placeholder="Old password" className="w-full px-3 py-2.5 rounded-xl ws-input" />
                <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} maxLength={72} pattern={PASSWORD_PATTERN} title="Use between 8 and 72 characters." placeholder="New password" className="w-full px-3 py-2.5 rounded-xl ws-input" />
              </div>
            </details>

            {profileError && <p role="alert" className="text-xs text-[var(--color-danger)]">{profileError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setProfileOpen(false)} className="px-4 py-2.5 rounded-xl ws-chip text-xs font-semibold">Cancel</button>
              <LoadingButton type="submit" loading={profileSaving} loadingLabel="Saving..." className="px-4 py-2.5 rounded-xl ws-primary-button text-xs font-semibold inline-flex items-center justify-center gap-1.5">Save changes</LoadingButton>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
