'use client';

import React from 'react';
import { useApp, AdminTab } from '@/context/AppContext';
import { BarChart3, ClipboardList, Package, Ticket, Users } from 'lucide-react';

const items: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'payments', label: 'Orders', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'users', label: 'Users', icon: Users },
];

export const AdminNavbar: React.FC = () => {
  const { adminTab, setAdminTab, orders, adminTicketPage } = useApp();
  const pendingOrders = orders.filter(order => order.paymentStatus === 'verification_pending').length;
  const openTickets = adminTicketPage.openTotal;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface-solid)]/95 border-t border-[var(--color-card-border)] pb-safe">
      <div className="max-w-xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-around gap-1">
        {items.map(item => {
          const Icon = item.icon;
          const badge = item.id === 'payments' ? pendingOrders : item.id === 'tickets' ? openTickets : 0;
          const active = adminTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAdminTab(item.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-1.5 rounded-[14px] text-[10px] transition-colors ${active ? 'bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--color-brand-violet)] text-white text-[9px] font-semibold leading-4">{badge}</span>}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
