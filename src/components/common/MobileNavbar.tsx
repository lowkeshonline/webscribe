'use client';

import React from 'react';
import { useApp, MobileTab } from '@/context/AppContext';
import { House, LayoutGrid, LifeBuoy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const MobileNavbar: React.FC = () => {
  const { activeTab, setActiveTab, isAdmin, authLoading } = useApp();

  if (authLoading || isAdmin) return null;

  const navItems: { id: MobileTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Home', icon: House },
    { id: 'catalog', label: 'Catalog', icon: LayoutGrid },
    { id: 'support', label: 'Support', icon: LifeBuoy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-nav)] border-t border-[var(--color-card-border)]">
      <div className="max-w-md mx-auto px-3 pt-2 pb-safe flex items-stretch gap-2">
        {navItems.map(item => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 h-12 rounded-[14px] text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                isActive
                  ? 'bg-[var(--color-surface-hover)] text-[var(--color-brand-violet)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
