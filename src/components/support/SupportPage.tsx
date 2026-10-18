'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LoadingButton } from '@/components/common/LoadingButton';
import { CheckCircle2, LifeBuoy, MessageSquareText, Package, XCircle } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const { createTicket } = useApp();

  const [orderId, setOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !orderId.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTicket(orderId.trim(), description.trim());
      setOrderId('');
      setDescription('');
      setSuccessOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-12 h-12 rounded-[14px] bg-[var(--color-reseller-bg)] text-[var(--color-brand-violet)] flex items-center justify-center shrink-0">
          <LifeBuoy className="w-6 h-6" />
        </span>
        <div>
          <h1 className="font-heading font-bold text-[30px] text-[var(--color-text-primary)] leading-tight">
            Support
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            File a ticket with your order ID and we will get back to you.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ws-panel p-4 sm:p-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <Package className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            Order ID
          </span>
          <input
            required
            value={orderId}
            onChange={event => setOrderId(event.target.value)}
            placeholder="ORD-XXXXXXXXXX"
            aria-label="Order ID"
            className="w-full h-12 px-3.5 rounded-[14px] ws-input font-mono-code text-[15px] placeholder-[var(--color-text-muted)]"
          />
          <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
            Shown on the confirmation screen after you submit your payment.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <MessageSquareText className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            Issue explanation
          </span>
          <textarea
            required
            rows={5}
            maxLength={1500}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Explain the issue with your order or account..."
            className="w-full px-3.5 py-3 rounded-[14px] ws-input text-[15px] placeholder-[var(--color-text-muted)] resize-y"
          />
          <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
            {description.length}/1500
          </span>
        </label>

        <LoadingButton
          type="submit"
          loading={submitting}
          loadingLabel="Creating ticket..."
          disabled={!orderId.trim() || !description.trim()}
          className="w-full h-12 rounded-[14px] ws-primary-button text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Create ticket
        </LoadingButton>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-[14px] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs flex items-start gap-2"
        >
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--color-shell)]/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ticket created"
            className="w-full max-w-md bg-[var(--color-surface)] border-t border-[var(--color-card-border)] sm:border rounded-t-[22px] sm:rounded-[22px] px-5 pt-3 pb-6 sm:p-6 text-center space-y-4"
          >
            <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-grabber)]" />
            <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
                Successfully created
              </h2>
              <p className="mt-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                Ticket resolution takes around 30 minutes to 48 Hours depending on the supply.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              className="w-full h-12 rounded-[14px] ws-primary-button text-[13px] font-semibold transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
