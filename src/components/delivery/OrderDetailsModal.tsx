'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { copyTextToClipboard } from '@/lib/client/clipboard';
import { LoadingButton } from '@/components/common/LoadingButton';
import { getCustomerOrderStatus, getCustomerOrderStatusLabel } from '@/lib/orderStatus';
import { X, Copy, Check, Eye, EyeOff, ShieldCheck, HelpCircle, Key, Lock, CheckCircle2, XCircle } from 'lucide-react';

export const OrderDetailsModal: React.FC = () => {
  const { selectedOrder, closeOrderDetails, createTicket } = useApp();

  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  type IssueCategory = 'Account Locked' | 'Invalid Password' | 'Buffering / Quality' | 'Other';

  const [issueCategory, setIssueCategory] = useState<IssueCategory>('Account Locked');
  const [issueDesc, setIssueDesc] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!selectedOrder) return null;

  const customerOrderStatus = getCustomerOrderStatus(selectedOrder);
  const hasAttachedCredentials = customerOrderStatus === 'assigned' || customerOrderStatus === 'fulfilled';

  const handleCopy = async (text: string, label: string) => {
    if (await copyTextToClipboard(text)) {
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleFileTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim() || isSubmittingTicket) return;
    setIsSubmittingTicket(true);
    setTicketFeedback(null);
    try {
      await createTicket(selectedOrder.id, issueCategory, issueDesc);
      setShowTicketForm(false);
      setIssueDesc('');
      setTicketFeedback({ type: 'success', message: 'Support ticket created. Admin has been notified.' });
    } catch (error) {
      setTicketFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Unable to create support ticket.' });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div className="w-full max-w-lg ws-panel rounded-t-[22px] sm:rounded-[22px] p-6 animate-in slide-in-from-bottom-4 duration-200 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-card-border)] mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-base text-[var(--color-text-primary)]">
                {selectedOrder.serviceTitle}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                customerOrderStatus === 'fulfilled'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : customerOrderStatus === 'assigned'
                    ? 'bg-sky-500/10 text-sky-500'
                    : customerOrderStatus === 'cancelled'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-amber-500/10 text-amber-500'
              }`}>
                {getCustomerOrderStatusLabel(customerOrderStatus)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Order ID: <span className="font-mono-code font-bold text-[var(--color-text-primary)]">{selectedOrder.id}</span>
            </p>
          </div>
          <button
            onClick={closeOrderDetails}
            className="w-8 h-8 rounded-full ws-chip flex items-center justify-center shrink-0 aspect-square hover:text-[var(--color-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order status and account details */}
        {customerOrderStatus === 'verification_pending' ? (
          <div className="p-4 ws-panel-muted text-center space-y-2 mb-4">
            <ShieldCheck className="w-8 h-8 text-[var(--color-warning)] mx-auto" />
            <h4 className="font-heading font-semibold text-sm text-[var(--color-warning)]">
              UPI Payment Under Verification
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)]">
              UTR <span className="font-mono-code font-bold">{selectedOrder.utrNumber}</span> is being matched by our admin team. Account details will be unlocked shortly.
            </p>
          </div>
        ) : selectedOrder.deliveryMethod === 'instant' && hasAttachedCredentials && selectedOrder.credentials ? (
          /* INSTANT CREDENTIAL DISPATCH CARD */
          <div className="space-y-4 mb-4">
            <div className="p-4 ws-panel-muted shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-card-border)]">
                <span className="text-xs font-semibold text-[var(--color-brand-violet)] flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> Delivered Account Credentials
                </span>
                <span className="text-[10px] text-[var(--color-success)] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Username */}
                {selectedOrder.credentials.username && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-card-border)]">
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Email / Username</span>
                      <span className="font-mono-code font-bold text-[var(--color-text-primary)]">
                        {selectedOrder.credentials.username}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedOrder.credentials?.username || '', 'user')}
                      className="px-2.5 py-1 rounded-lg ws-chip text-[var(--color-text-primary)] font-semibold flex items-center gap-1"
                    >
                      {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* Password */}
                {selectedOrder.credentials.password && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-card-border)]">
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Password</span>
                      <span className="font-mono-code font-bold text-[var(--color-text-primary)]">
                        {showPassword ? selectedOrder.credentials.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 rounded-lg ws-chip text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(selectedOrder.credentials?.password || '', 'pass')}
                        className="px-2.5 py-1 rounded-lg ws-chip text-[var(--color-text-primary)] font-semibold flex items-center gap-1"
                      >
                        {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* PIN Code */}
                {selectedOrder.credentials.pin && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-card-border)]">
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Profile PIN</span>
                      <span className="font-mono-code font-bold text-[var(--color-warning)]">
                        {selectedOrder.credentials.pin}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedOrder.credentials?.pin || '', 'pin')}
                      className="px-2.5 py-1 rounded-lg ws-chip text-[var(--color-text-primary)] font-semibold flex items-center gap-1"
                    >
                      {copiedKey === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {(selectedOrder.dos || selectedOrder.donts) && (
                <div className="mt-3 p-2.5 ws-panel-muted text-[11px] text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-text-primary)] block mb-1">Account guidance:</span>
                  {selectedOrder.dos && <div className="space-y-1">{selectedOrder.dos.split('\n').filter(Boolean).map((point, index) => <span key={`do-${index}`} className="flex gap-1.5 items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{point}</span>)}</div>}
                  {selectedOrder.donts && <div className="space-y-1 mt-2">{selectedOrder.donts.split('\n').filter(Boolean).map((point, index) => <span key={`dont-${index}`} className="flex gap-1.5 items-start"><XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />{point}</span>)}</div>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 ws-panel-muted text-center space-y-2 mb-4">
            <Key className="w-8 h-8 text-[var(--color-brand-violet)] mx-auto" />
            <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
              Account details pending
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Your account details will appear here after the admin completes the order.
            </p>
          </div>
        )}

        {/* Support Ticket Filing Toggle */}
        <div className="pt-2 border-t border-[var(--color-card-border)]">
          {!showTicketForm ? (
            <button
              onClick={() => setShowTicketForm(true)}
              className="w-full py-2.5 rounded-full ws-chip hover:text-[var(--color-text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Have an issue with this account? Report Ticket</span>
            </button>
          ) : (
            <form onSubmit={handleFileTicket} className="space-y-3 p-3 ws-panel-muted">
              <h4 className="font-heading font-semibold text-xs text-[var(--color-danger)] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> File Ticket for {selectedOrder.id}
              </h4>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                  Issue Type
                </label>
                <StyledDropdown
                  value={issueCategory}
                  onChange={value => setIssueCategory(value as IssueCategory)}
                  ariaLabel="Issue type"
                  options={[
                    { value: 'Account Locked', label: 'Account Locked / Screen Full' },
                    { value: 'Invalid Password', label: 'Invalid Password' },
                    { value: 'Buffering / Quality', label: 'Buffering / Quality issue' },
                    { value: 'Other', label: 'Other Query' },
                  ]}
                  buttonClassName="px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={issueDesc}
                  onChange={e => setIssueDesc(e.target.value)}
                  placeholder="Explain what happened..."
                  className="w-full px-3 py-2 rounded-xl ws-input text-xs"
                />
              </div>

              <div className="flex gap-2">
                <LoadingButton
                  type="submit"
                  loading={isSubmittingTicket}
                  loadingLabel="Submitting..."
                  className="flex-1 py-2 rounded-full bg-[var(--color-danger)] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  Submit Ticket
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  className="px-3 py-2 rounded-full ws-chip text-xs text-[var(--color-text-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {ticketFeedback && (
            <div
              role={ticketFeedback.type === 'error' ? 'alert' : 'status'}
              className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${ticketFeedback.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-[var(--color-danger)]' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}
            >
              {ticketFeedback.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{ticketFeedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
