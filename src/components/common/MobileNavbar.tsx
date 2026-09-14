'use client';

import React from 'react';
import { useApp, MobileTab } from '@/context/AppContext';
import { Compass, Grid, ShoppingBag, HelpCircle, ShieldAlert } from 'lucide-react';

export const MobileNavbar: React.FC = () => {
  const { activeTab, setActiveTab, orders, tickets, currentRole, currentUser, isAdmin, authLoading } = useApp();

  // Customer data is already profile-scoped by the server actions.
  const visibleOrders = isAdmin || currentUser ? orders : [];
  const visibleTickets = isAdmin || currentUser ? tickets : [];

  const activeOrdersCount = visibleOrders.filter(
    o => o.paymentStatus === 'verification_pending' || o.deliveryStatus === 'action_required'
  ).length;

  const openTicketsCount = visibleTickets.filter(t => t.status === 'open').length;

  if (authLoading || isAdmin) return null;

  const navItems: { id: MobileTab; label: string; icon: React.ElementType; badge?: number; adminOnly?: boolean }[] = [
    { id: 'home', label: 'Explore', icon: Compass },
    { id: 'catalog', label: 'Catalog', icon: Grid },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, badge: activeOrdersCount },
    { id: 'tickets', label: 'Support', icon: HelpCircle, badge: openTicketsCount },
    { id: 'admin', label: 'Admin Hub', icon: ShieldAlert, badge: activeOrdersCount, adminOnly: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface-solid)]/95 border-t border-[var(--color-card-border)] pb-safe">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.adminOnly && currentRole !== 'admin') {
            return null;
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-[14px] transition-all ${
                isActive 
                  ? 'bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] font-semibold' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-[var(--color-brand-violet)] text-white dark:text-[#181715] text-[9px] font-semibold leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
