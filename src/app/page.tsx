'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/common/Header';
import { AmbientBackground } from '@/components/common/AmbientBackground';
import { MobileNavbar } from '@/components/common/MobileNavbar';
import { HeroConstellation } from '@/components/services/HeroConstellation';
import { ServiceCard } from '@/components/services/ServiceCard';
import { UPIPaymentModal } from '@/components/checkout/UPIPaymentModal';
import { OrderDetailsModal } from '@/components/delivery/OrderDetailsModal';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuthModal } from '@/components/auth/AuthModal';
import { PaginationControls } from '@/components/common/PaginationControls';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { LoadingButton } from '@/components/common/LoadingButton';
import { getCustomerOrderStatus, getCustomerOrderStatusLabel } from '@/lib/orderStatus';
import { CheckCircle2, CircleUserRound, LifeBuoy, Plus, Search, ShoppingBag, XCircle } from 'lucide-react';

export default function Home() {
  const {
    activeTab,
    setActiveTab,
    services,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    orders,
    tickets,
    customerOrderPage,
    customerOrdersLoading,
    customerOrdersError,
    loadCustomerOrders,
    customerTicketPage,
    customerTicketsLoading,
    customerTicketsError,
    loadCustomerTickets,
    createTicket,
    openOrderDetails,
    currentUser,
    isAuthenticated,
    isAdmin,
    openAuthModal,
    checkoutService,
    authLoading,
  } = useApp();

  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicketOrderId, setNewTicketOrderId] = useState('');
  const [newTicketIssue, setNewTicketIssue] = useState<'Account Locked' | 'Invalid Password' | 'Buffering / Quality' | 'Other'>('Account Locked');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketSubmitting, setNewTicketSubmitting] = useState(false);
  const [newTicketFeedback, setNewTicketFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const exploreServices = services;
  const catalogServices = services.filter(service => selectedCategory === 'All' || service.category === selectedCategory).filter(service => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Customer order and ticket actions already scope their results to the
  // authenticated profile. Do not match on contact text, since customers may
  // use WhatsApp or have a differently formatted Telegram username.
  const visibleOrders = isAdmin || currentUser ? orders : [];
  const visibleTickets = isAdmin || currentUser ? tickets : [];

  const customerDashboardCards = currentUser && !isAdmin ? [
    {
      label: 'Total orders',
      value: customerOrderPage.total,
      icon: ShoppingBag,
      tone: 'text-[var(--color-brand-violet)]',
      onClick: () => setActiveTab('orders'),
    },
    {
      label: 'Ready access',
      value: visibleOrders.filter(order => {
        const status = getCustomerOrderStatus(order);
        return status === 'assigned' || status === 'fulfilled';
      }).length,
      icon: CheckCircle2,
      tone: 'text-emerald-500',
      onClick: () => setActiveTab('orders'),
    },
    {
      label: 'Support tickets',
      value: customerTicketPage.total,
      icon: LifeBuoy,
      tone: 'text-sky-500',
      onClick: () => setActiveTab('tickets'),
    },
    {
      label: 'Access level',
      value: currentUser.role === 'reseller' ? 'Reseller' : 'Customer',
      icon: CircleUserRound,
      tone: 'text-amber-500',
      onClick: undefined,
    },
  ] as const : [];

  const openAddTicketForm = () => {
    setNewTicketOrderId(current => visibleOrders.some(order => order.id === current) ? current : visibleOrders[0]?.id || '');
    setNewTicketFeedback(null);
    setShowAddTicket(true);
  };

  const handleAddTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !newTicketOrderId || !newTicketDescription.trim() || newTicketSubmitting) return;
    setNewTicketSubmitting(true);
    setNewTicketFeedback(null);
    try {
      await createTicket(newTicketOrderId, newTicketIssue, newTicketDescription);
      setNewTicketDescription('');
      setShowAddTicket(false);
      setNewTicketFeedback({ type: 'success', message: 'Support ticket created. Admin has been notified.' });
    } catch (error) {
      setNewTicketFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Unable to create support ticket.' });
    } finally {
      setNewTicketSubmitting(false);
    }
  };

  const authRequiredPanel = (
    <div className="p-8 ws-panel text-center">
      <h2 className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
        Profile Required
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-md mx-auto">
        Create or sign in to your customer profile before viewing orders, filing tickets, or buying accounts.
      </p>
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => openAuthModal('login')}
          className="px-4 py-2 rounded-full ws-chip text-xs font-semibold"
        >
          Sign In
        </button>
        <button
          onClick={() => openAuthModal('register')}
          className="px-4 py-2 rounded-full ws-primary-button text-xs font-semibold"
        >
          Create Profile
        </button>
      </div>
    </div>
  );

  if (authLoading) {
    return <div className="app-shell min-h-screen text-[var(--color-text-primary)]"><AmbientBackground /><Header /><main className="relative z-10 max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse space-y-5"><div className="h-36 rounded-3xl bg-[var(--color-surface-hover)]" /><div className="h-7 w-56 rounded-lg bg-[var(--color-surface-hover)]" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-52 rounded-2xl bg-[var(--color-surface-hover)]" />)}</div></div></main></div>;
  }

  return (
    <div className="app-shell min-h-screen text-[var(--color-text-primary)] pb-20 md:pb-12">
      <AmbientBackground />

      {/* Top Fixed Header */}
      <Header />

      {/* Main View Switcher */}
      <main className="relative z-10">
        {/* VIEW 1: HOME EXPLORE VIEW */}
        {activeTab === 'home' && (
          <div>
            <HeroConstellation />

            {customerDashboardCards.length > 0 && (
              <div className="max-w-6xl mx-auto px-4 pb-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Customer dashboard">
                  {customerDashboardCards.map(card => {
                    const Icon = card.icon;
                    const CardContent = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--color-text-muted)]">{card.label}</span>
                          <Icon className={`w-4 h-4 ${card.tone}`} aria-hidden="true" />
                        </div>
                        <strong className="mt-3 block font-heading text-xl text-[var(--color-text-primary)]">
                          {card.value}
                        </strong>
                      </>
                    );

                    return card.onClick ? (
                      <button
                        key={card.label}
                        type="button"
                        onClick={card.onClick}
                        className="p-4 ws-panel text-left hover:border-[var(--color-brand-violet)] transition-colors"
                      >
                        {CardContent}
                      </button>
                    ) : (
                      <div key={card.label} className="p-4 ws-panel">
                        {CardContent}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog Section Header */}
            <div className="max-w-6xl mx-auto px-4 pt-4 pb-12 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
                    Available Inventory
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Live subscriptions & instant slot availability
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-semibold text-[var(--color-brand-violet)] hover:underline flex items-center gap-1"
                >
                  View All ({exploreServices.length})
                </button>
              </div>

              {/* High Density Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exploreServices.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>

            {/* Active Orders Shelf (Quick Access) */}
            {visibleOrders.length > 0 && (
              <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="p-6 ws-panel">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-[var(--color-brand-violet)]" />
                      <h3 className="font-heading font-semibold text-base text-[var(--color-text-primary)]">
                        Your Purchases
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-[var(--color-brand-violet)] font-semibold hover:underline"
                    >
                      View All ({isAdmin ? visibleOrders.length : customerOrderPage.total})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {visibleOrders.slice(0, 3).map(order => (
                      <div
                        key={order.id}
                        onClick={() => openOrderDetails(order)}
                        className="p-3.5 ws-panel-muted cursor-pointer hover:border-[var(--color-brand-violet)] transition-colors flex items-center justify-between gap-2"
                        >
                        <div>
                          <span className="font-heading font-semibold text-xs text-[var(--color-text-primary)] block">
                            {order.serviceTitle}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono-code">
                            {order.id}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          getCustomerOrderStatus(order) === 'fulfilled'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : getCustomerOrderStatus(order) === 'assigned'
                              ? 'bg-sky-500/10 text-sky-500'
                              : getCustomerOrderStatus(order) === 'cancelled'
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {getCustomerOrderStatusLabel(getCustomerOrderStatus(order))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: FULL CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="font-heading font-bold text-2xl text-[var(--color-text-primary)] mb-1">
                All Subscription Services
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Browse streaming passes, AI tools, gaming accounts, and music plans.
              </p>
            </div>

            <label className="relative block max-w-xl mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search OTT service, AI tool, or category..."
                aria-label="Search catalog"
                className="w-full pl-9 pr-3 py-3 rounded-xl text-sm ws-input placeholder-[var(--color-text-muted)]"
              />
            </label>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
              {(['All', 'Streaming', 'Music', 'AI & Tools', 'Gaming'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'ws-primary-button'
                      : 'ws-chip hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catalogServices.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: MY ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="font-heading font-bold text-2xl text-[var(--color-text-primary)] mb-1">
                My Orders & Deliveries
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Click on any order to view credentials, password PIN, or account status.
              </p>
            </div>

            {!isAuthenticated ? (
              authRequiredPanel
            ) : customerOrdersLoading ? (
              <div className="space-y-3" aria-label="Loading orders">
                {[1, 2, 3].map(item => <div key={item} className="h-20 rounded-2xl bg-[var(--color-surface-hover)] animate-pulse" />)}
              </div>
            ) : customerOrdersError ? (
              <div role="alert" className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">
                {customerOrdersError}
              </div>
            ) : customerOrderPage.total === 0 ? (
              <div className="p-8 ws-panel text-center text-xs text-[var(--color-text-muted)]">
                You have not placed any orders yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => openOrderDetails(order)}
                    className="p-4 ws-panel hover:border-[var(--color-brand-violet)] transition-colors cursor-pointer flex items-center justify-between flex-wrap gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-[var(--color-brand-violet-wash)] text-[var(--color-brand-violet)] flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
                            {order.serviceTitle}
                          </h4>
                          <span className="text-[10px] font-mono-code font-bold text-[var(--color-text-muted)]">
                            {order.id}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Paid ₹{order.pricePaid} • {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        getCustomerOrderStatus(order) === 'fulfilled'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : getCustomerOrderStatus(order) === 'assigned'
                            ? 'bg-sky-500/10 text-sky-500'
                            : getCustomerOrderStatus(order) === 'cancelled'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {getCustomerOrderStatusLabel(getCustomerOrderStatus(order))}
                      </span>
                    </div>
                  </div>
                ))}
                <PaginationControls
                  page={customerOrderPage.page}
                  totalPages={customerOrderPage.totalPages}
                  onPageChange={page => currentUser && void loadCustomerOrders({ profileId: currentUser.id, page })}
                  disabled={customerOrdersLoading}
                  label="Orders"
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: SUPPORT TICKETS VIEW */}
        {activeTab === 'tickets' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-bold text-2xl text-[var(--color-text-primary)] mb-1">
                  Support & Ticket Resolution
                </h1>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Track issues reported for your account subscriptions.
                </p>
              </div>
              {isAuthenticated && !isAdmin && (
                <button
                  type="button"
                  onClick={openAddTicketForm}
                  className="shrink-0 px-3 py-2 rounded-xl ws-primary-button text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add ticket</span>
                </button>
              )}
            </div>

            {isAuthenticated && !isAdmin && showAddTicket && (
              <form onSubmit={handleAddTicket} className="mb-4 p-4 ws-panel space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">Add ticket</h2>
                  <button type="button" onClick={() => setShowAddTicket(false)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Related order</label>
                  <StyledDropdown
                    value={newTicketOrderId}
                    onChange={setNewTicketOrderId}
                    ariaLabel="Related order"
                    placeholder="Select an order"
                    options={visibleOrders.map(order => ({ value: order.id, label: <span>{order.serviceTitle} · <span className="font-mono-code">{order.id}</span></span> }))}
                    buttonClassName="px-3 py-2.5 rounded-xl text-xs"
                  />
                  {visibleOrders.length === 0 && <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">Place an order before submitting a support ticket.</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Issue type</label>
                  <StyledDropdown
                    value={newTicketIssue}
                    onChange={value => setNewTicketIssue(value as typeof newTicketIssue)}
                    ariaLabel="Issue type"
                    options={[
                      { value: 'Account Locked', label: 'Account Locked / Screen Full' },
                      { value: 'Invalid Password', label: 'Invalid Password' },
                      { value: 'Buffering / Quality', label: 'Buffering / Quality issue' },
                      { value: 'Other', label: 'Other Query' },
                    ]}
                    buttonClassName="px-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newTicketDescription}
                    onChange={event => setNewTicketDescription(event.target.value)}
                    placeholder="Explain what happened..."
                    className="w-full px-3 py-2.5 rounded-xl ws-input text-xs"
                  />
                </div>
                <LoadingButton type="submit" loading={newTicketSubmitting} loadingLabel="Submitting..." disabled={!newTicketOrderId} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--color-danger)] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                  Submit ticket
                </LoadingButton>
              </form>
            )}

            {newTicketFeedback && (
              <div role={newTicketFeedback.type === 'error' ? 'alert' : 'status'} className={`mb-4 p-3 rounded-xl border text-xs flex items-start gap-2 ${newTicketFeedback.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-[var(--color-danger)]' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                {newTicketFeedback.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{newTicketFeedback.message}</span>
              </div>
            )}

            {!isAuthenticated ? (
              authRequiredPanel
            ) : customerTicketsLoading ? (
              <div className="space-y-3" aria-label="Loading tickets">
                {[1, 2, 3].map(item => <div key={item} className="h-32 rounded-2xl bg-[var(--color-surface-hover)] animate-pulse" />)}
              </div>
            ) : customerTicketsError ? (
              <div role="alert" className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-danger)]">
                {customerTicketsError}
              </div>
            ) : customerTicketPage.total === 0 ? (
              <div className="p-8 ws-panel text-center text-xs text-[var(--color-text-muted)]">
                No tickets reported yet. Use Add ticket to report an issue with an order.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="p-4 ws-panel space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono-code font-bold text-xs text-[var(--color-brand-violet)]">
                          {ticket.id}
                        </span>
                        <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
                          {ticket.serviceTitle} - {ticket.issueCategory}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] ws-panel-muted p-3">
                      &quot;{ticket.description}&quot;
                    </p>
                    {ticket.adminNote && (
                      <p className="text-xs text-emerald-500 font-semibold">
                        Admin Note: {ticket.adminNote}
                      </p>
                    )}
                  </div>
                ))}
                <PaginationControls
                  page={customerTicketPage.page}
                  totalPages={customerTicketPage.totalPages}
                  onPageChange={page => currentUser && void loadCustomerTickets({ profileId: currentUser.id, page })}
                  disabled={customerTicketsLoading}
                  label="Tickets"
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: ADMIN DASHBOARD VIEW */}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Checkout Payment Modal Drawer */}
      {checkoutService && <UPIPaymentModal />}

      <OrderDetailsModal />

      {/* Authentication & Profile Modal */}
      <AuthModal />

      {/* Mobile-First Bottom Navigation Bar */}
      <MobileNavbar />
    </div>
  );
}
