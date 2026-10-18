'use client';

import React from 'react';
import { useApp, AdminTab } from '@/context/AppContext';

const items: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Orders' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'tickets', label: 'Tickets' },
];

export const AdminNavbar: React.FC = () => {
  const { adminTab, setAdminTab, orders, adminTicketPage, isAdmin, authLoading } = useApp();
  const pendingOrders = orders.filter(order => order.paymentStatus === 'verification_pending').length;
  const openTickets = adminTicketPage.openTotal;

  if (authLoading || !isAdmin) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-nav)] border-t border-[var(--color-card-border)]">
      <div className="max-w-xl mx-auto px-3 pt-2 pb-safe flex items-stretch gap-1.5">
        {items.map(item => {
          const badge = item.id === 'payments' ? pendingOrders : item.id === 'tickets' ? openTickets : 0;
          const active = adminTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAdminTab(item.id)}
              className={`flex min-w-0 flex-1 h-12 items-center justify-center gap-1.5 rounded-[14px] px-2 text-xs font-semibold transition-colors ${active ? 'bg-[var(--color-surface-hover)] text-[var(--color-brand-violet)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              <span className="truncate">{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-[9px] bg-[var(--color-danger)] text-[var(--color-accent-ink)] text-[10px] font-semibold flex items-center justify-center shrink-0">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
