'use client';

import { useApp } from '@/context/AppContext';
import { Header } from '@/components/common/Header';
import { MobileNavbar } from '@/components/common/MobileNavbar';
import { HeroConstellation } from '@/components/services/HeroConstellation';
import { CategoryShowcase, ContactBand, HowItWorks } from '@/components/services/LandingSections';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SupportPage } from '@/components/support/SupportPage';
import { UPIPaymentModal } from '@/components/checkout/UPIPaymentModal';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuthModal } from '@/components/auth/AuthModal';

export default function Home() {
  const {
    activeTab,
    services,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    checkoutService,
    authLoading,
  } = useApp();

  const catalogServices = services.filter(service => selectedCategory === 'All' || service.category === selectedCategory).filter(service => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (authLoading) {
    return <div className="app-shell min-h-screen text-[var(--color-text-primary)]"><Header /><main className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse space-y-5"><div className="h-36 rounded-[20px] bg-[var(--color-surface-hover)]" /><div className="h-7 w-56 rounded-[10px] bg-[var(--color-surface-hover)]" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-52 rounded-[20px] bg-[var(--color-surface-hover)]" />)}</div></div></main></div>;
  }

  return (
    <div className="app-shell min-h-screen text-[var(--color-text-primary)] pb-28">
      {/* Top Fixed Header */}
      <Header />

      {/* Main View Switcher */}
      <main>
        {/* VIEW 1: LANDING */}
        {activeTab === 'home' && (
          <div>
            <HeroConstellation />
            <HowItWorks />
            <CategoryShowcase />
            <ContactBand />
          </div>
        )}

        {/* VIEW 2: FULL CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div className="max-w-6xl mx-auto px-4 pt-5 pb-12">
            <div className="mb-5">
              <h1 className="font-heading font-bold text-[30px] text-[var(--color-text-primary)] leading-tight">
                Catalog
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Every service, one place.
              </p>
            </div>

            <label className="block max-w-xl mb-4">
              <span className="block mb-1.5 text-xs text-[var(--color-text-muted)]">Search services</span>
              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Netflix, Spotify…"
                aria-label="Search services"
                className="w-full h-12 px-3.5 rounded-[14px] text-[15px] ws-input placeholder-[var(--color-text-muted)]"
              />
            </label>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
              {(['All', 'Streaming', 'Music', 'AI & Tools', 'Gaming'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-11 px-5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'ws-primary-button'
                      : 'ws-chip hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {catalogServices.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SUPPORT */}
        {activeTab === 'support' && <SupportPage />}

        {/* VIEW 5: ADMIN DASHBOARD VIEW */}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Checkout Payment Modal Drawer */}
      {checkoutService && <UPIPaymentModal />}

      {/* Authentication & Profile Modal */}
      <AuthModal />

      {/* Mobile-First Bottom Navigation Bar */}
      <MobileNavbar />
    </div>
  );
}
