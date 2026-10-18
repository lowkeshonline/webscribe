'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AccountCredential, Credentials, Order, Service, ServiceVariant, Ticket } from '@/types';
import { PaginationControls } from '@/components/common/PaginationControls';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { HighlightPoints } from '@/components/common/HighlightPoints';
import { LoadingButton } from '@/components/common/LoadingButton';
import { copyTextToClipboard } from '@/lib/client/clipboard';
import { isValidEmail } from '@/lib/validation';
import {
  Plus,
  Save,
  Trash2,
  X,
  Search,
  Copy,
  Check,
  Eye,
  Pencil,
  Send,
  MessageCircle,
  CheckCircle2,
  Clock3,
} from 'lucide-react';

const emptyVariantDraft = (): ServiceVariant => ({
  id: '', name: '', originalPrice: 0, ourPrice: 0, regularPrice: 0, resellerPrice: 0, stockCount: 0, validityValue: 30, validityUnit: 'days', deliveryTime: '', description: '',
});

type PlanEditorTarget =
  | { mode: 'draft-add' }
  | { mode: 'draft-edit'; variantId: string }
  | { mode: 'service-add'; serviceId: string };

export const AdminDashboard: React.FC = () => {
  const {
    orders, 
    adminRejectOrder, 
    services,
    saveService,
    deleteService,
    tickets,
    resolveTicket,
    accountCredentials,
    createAccountCredential,
    updateAccountCredential,
    deleteAccountCredential,
    searchAccountCredentials,
    attachAccountToOrder,
    updateOrderFulfillment,
    isAdmin,
    openAuthModal,
    adminTab,
    setAdminTab,
    authLoading,
    adminTicketPage,
    adminTicketsLoading,
    adminTicketError,
    loadAdminTickets,
    adminFulfilledOrderPage,
    adminFulfilledOrdersLoading,
    adminFulfilledOrdersError,
    loadAdminFulfilledOrders,
  } = useApp();

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<Service | null>(null);
  const [planEditor, setPlanEditor] = useState<PlanEditorTarget | null>(null);
  const [planForm, setPlanForm] = useState<ServiceVariant>(emptyVariantDraft());
  const [planSaving, setPlanSaving] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountServiceId, setAccountServiceId] = useState('');
  const [accountForm, setAccountForm] = useState<Credentials & { accountId: string; profileName?: string; createdAt?: string; expiresAt?: string }>({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountDialogServiceId, setAccountDialogServiceId] = useState<string | null>(null);
  const [accountDialogSearch, setAccountDialogSearch] = useState('');
  const [accountDialogAccounts, setAccountDialogAccounts] = useState<AccountCredential[]>([]);
  const [accountDialogSearching, setAccountDialogSearching] = useState(false);
  const [accountDialogError, setAccountDialogError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingServiceFilter, setPendingServiceFilter] = useState('all');
  const [fulfilledServiceFilter, setFulfilledServiceFilter] = useState('all');
  const [fulfilledOrderSearchInput, setFulfilledOrderSearchInput] = useState('');
  const [fulfilledOrderSearch, setFulfilledOrderSearch] = useState('');
  const [orderAccountIds, setOrderAccountIds] = useState<Record<string, string>>({});
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [serviceDeleteError, setServiceDeleteError] = useState<string | null>(null);
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [orderActionLoading, setOrderActionLoading] = useState<Record<string, string>>({});
  const orderActionLoadingRef = useRef<Record<string, string>>({});
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceDeleting, setServiceDeleting] = useState(false);
  const [ticketActionLoading, setTicketActionLoading] = useState<Record<string, boolean>>({});
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [ticketView, setTicketView] = useState<'open' | 'resolved'>('open');
  const [ticketSearch, setTicketSearch] = useState('');


  const pendingOrders = orders.filter(o => o.paymentStatus === 'verification_pending');
  const newOrders = orders.filter(o => o.paymentStatus === 'pending_payment');
  const fulfilledOrders = adminFulfilledOrderPage.items;
  const normalizedTicketSearch = ticketSearch.trim().toLowerCase();
  const visibleTickets = tickets;
  const openTicketTotal = adminTicketPage.openTotal;
  const resolvedTicketTotal = adminTicketPage.resolvedTotal;

  // Ticket search: debounce only when search text is non-empty; instant on status/clear changes.
  useEffect(() => {
    if (!isAdmin || (adminTicketPage.status === ticketView && adminTicketPage.search === normalizedTicketSearch)) return;

    const delay = normalizedTicketSearch ? 350 : 0;
    const timeoutId = window.setTimeout(() => {
      void loadAdminTickets({ status: ticketView, page: 1, search: normalizedTicketSearch });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [adminTicketPage.search, adminTicketPage.status, isAdmin, loadAdminTickets, normalizedTicketSearch, ticketView]);

  // Fulfilled orders: react to service-filter or search changes; debounce search by 350ms.
  useEffect(() => {
    if (!isAdmin || adminTab !== 'payments') return;
    const serviceTitle = fulfilledServiceFilter;
    const queryServiceMatches = adminFulfilledOrderPage.serviceTitle === serviceTitle;
    const querySearchMatches = adminFulfilledOrderPage.search === fulfilledOrderSearch;
    const hasLoadedPage = adminFulfilledOrderPage.items.length > 0 || adminFulfilledOrderPage.total === 0;
    if (queryServiceMatches && querySearchMatches && hasLoadedPage) return;
    if (adminFulfilledOrdersLoading) return;
    const delay = !querySearchMatches && fulfilledOrderSearch ? 350 : 0;
    const timeoutId = window.setTimeout(() => {
      void loadAdminFulfilledOrders({
        page: queryServiceMatches && querySearchMatches ? adminFulfilledOrderPage.page : 1,
        serviceTitle,
        search: fulfilledOrderSearch,
      });
    }, delay);
    return () => window.clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminFulfilledOrderPage.items.length, adminFulfilledOrderPage.page, adminFulfilledOrderPage.serviceTitle, adminFulfilledOrderPage.search, adminFulfilledOrderPage.total, adminFulfilledOrdersLoading, adminTab, fulfilledServiceFilter, fulfilledOrderSearch, isAdmin, loadAdminFulfilledOrders]);
  const serviceFilters = (items: Order[]) => ['all', ...Array.from(new Set(items.map(order => order.serviceTitle)))];
  const filteredPendingOrders = pendingOrders.filter(order => pendingServiceFilter === 'all' || order.serviceTitle === pendingServiceFilter);
  const filteredFulfilledOrders = fulfilledOrders;
  const accountsForOrder = (order: Order) => accountCredentials.filter(account =>
    account.serviceId === order.serviceId
    || account.serviceTitle.trim().toLowerCase() === order.serviceTitle.trim().toLowerCase()
  );
  const accountOptionsForOrder = (order: Order) => accountsForOrder(order).map(account => ({
    value: account.id,
    selectedLabel: account.id,
    searchText: `${account.id} ${account.username || ''} ${account.status}`,
    label: (
      <span className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
        <span className="font-mono-code truncate text-[var(--color-text-primary)]">{account.id}</span>
        <span className="truncate text-[var(--color-text-secondary)]">{account.username || 'No email'}</span>
        <span className={`capitalize font-semibold ${account.status === 'assigned' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>{account.status}</span>
      </span>
    ),
  }));
  const accountMessage = (order: Order, channel: 'telegram' | 'whatsapp') => {
    const service = services.find(item => item.id === order.serviceId)
      || services.find(item => item.title.trim().toLowerCase() === order.serviceTitle.trim().toLowerCase());
    const clean = (value: unknown, fallback = '-') => String(value ?? fallback).replace(/[\r\n]+/g, ' ').trim() || fallback;
    const points = (value?: string) => value?.split(/\r?\n/).map(point => point.trim()).filter(Boolean) || [];
    const dos = points(order.dos || service?.dos);
    const donts = points(order.donts);
    const credentials = order.credentials;
    const emoji = channel === 'telegram';
    const bullet = emoji ? '•' : '-';
    const sections = [
      [
        `${emoji ? '👋 ' : ''}Hello ${clean(order.customerName, 'there')},`,
        `${emoji ? '🎉 ' : ''}Thanks for your purchase from Webscribe!`,
        `${emoji ? '📦 ' : ''}${order.accountId ? `Your ${clean(order.serviceTitle)} account is ready.` : `We are preparing your ${clean(order.serviceTitle)} account.`}`,
      ].join('\n'),
      [
        `${emoji ? '🧾 ' : ''}Order details`,
        '',
        `${bullet} Order ID: ${clean(order.id)}`,
        ...(order.variantName ? [`${bullet} Variant: ${clean(order.variantName)}`] : []),
      ].join('\n'),
      order.accountId ? [
        `${emoji ? '🔐 ' : ''}Account credentials`,
        '',
        `${bullet} Account ID: ${clean(order.accountId)}`,
        `${bullet} Email / Username: ${clean(credentials?.username)}`,
        `${bullet} Password: ${clean(credentials?.password)}`,
        ...(credentials?.pin ? [`${bullet} PIN: ${clean(credentials.pin)}`] : []),
        ...(order.expiresAt ? [`${bullet} Valid until: ${new Date(order.expiresAt).toLocaleDateString('en-IN')}`] : []),
      ].join('\n') : `${emoji ? '🔐 ' : ''}Account credentials will be shared in this chat.`,
      dos.length > 0 ? [
        `${emoji ? '📋 ' : ''}Plan details`,
        '',
        ...dos.map(point => `${bullet} ${clean(point)}`),
      ].join('\n') : '',
      donts.length > 0 ? [
        `${emoji ? '❌ ' : ''}Don'ts`,
        '',
        ...donts.map(point => `${bullet} ${clean(point)}`),
      ].join('\n') : '',
      `${emoji ? '🙏 ' : ''}Thank you for choosing Webscribe!`,
    ];

    return sections.filter(Boolean).join('\n\n');
  };
  const ticketContact = (ticket: Ticket) => {
    const method = ticket.contactMethod || (ticket.customerWhatsapp ? 'whatsapp' : 'telegram');
    const message = `Hello, this is regarding support ticket ${ticket.id} for order ${ticket.orderId}.`;
    if (method === 'whatsapp' && ticket.customerWhatsapp) {
      return { label: 'WhatsApp', url: `https://wa.me/${ticket.customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` };
    }
    if (ticket.customerTelegram) {
      return { label: 'Telegram', url: `https://t.me/${ticket.customerTelegram.replace(/^@/, '')}?text=${encodeURIComponent(message)}` };
    }
    return null;
  };
  const runOrderAction = async (orderId: string, action: () => Promise<void>, fallback: string, actionKey = 'action') => {
    if (orderActionLoadingRef.current[orderId]) return false;
    orderActionLoadingRef.current[orderId] = actionKey;
    setOrderActionLoading(prev => ({ ...prev, [orderId]: actionKey }));
    try {
      await action();
      setOrderErrors(prev => ({ ...prev, [orderId]: '' }));
      return true;
    } catch (error) {
      setOrderErrors(prev => ({
        ...prev,
        [orderId]: error instanceof Error ? error.message : fallback,
      }));
      return false;
    } finally {
      delete orderActionLoadingRef.current[orderId];
      setOrderActionLoading(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };
  const isOrderBusy = (orderId: string) => Boolean(orderActionLoading[orderId]);
  const saveOrderAccount = async (order: Order) => {
    const accountId = (orderAccountIds[order.id] || order.accountId || '').trim();
    if (!accountId) return;
    const saved = await runOrderAction(order.id, () => attachAccountToOrder(accountId, order.id), 'Unable to assign account.', 'assign');
    if (saved) {
      setOrderAccountIds(prev => ({ ...prev, [order.id]: accountId }));
    }
  };

  const newService = (): Service => ({
    id: `srv-${Date.now()}`,
    title: '',
    category: 'Streaming',
    logoUrl: '',
    brandColor: '#4fd1c5',
    description: '',
    originalPrice: 0,
    ourPrice: 0,
    regularPrice: 0,
    resellerPrice: 0,
    stockCount: 0,
    stockStatus: 'out_of_stock',
    validityValue: 30,
    validityUnit: 'days',
    deliveryTime: '',
    variantMode: 'single',
    priceStartsAt: 0,
    variants: [],
  });

  const openServiceForm = (service?: Service) => {
    setServiceDraft(service ? {
      ...service,
      variantMode: service.variants?.length ? 'multiple' : 'single',
      priceStartsAt: service.priceStartsAt || 0,
      validityValue: service.validityValue || 30,
      validityUnit: service.validityUnit || 'days',
      variants: service.variants || [],
    } : newService());
    setShowServiceForm(true);
  };

  const updateDraft = <K extends keyof Service>(field: K, value: Service[K]) => {
    setServiceDraft(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const numberInputValue = (value: number | undefined) => value ? String(value) : '';

  const deriveServiceWithVariants = (service: Service, variants: ServiceVariant[]): Service => {
    const first = variants[0];
    return {
      ...service,
      variants,
      variantMode: variants.length > 1 ? 'multiple' : 'single',
      ourPrice: first?.ourPrice ?? service.ourPrice,
      regularPrice: first?.ourPrice ?? service.regularPrice,
      originalPrice: first?.originalPrice ?? service.originalPrice,
      resellerPrice: first?.resellerPrice ?? service.resellerPrice,
      validityValue: first?.validityValue ?? service.validityValue,
      validityUnit: first?.validityUnit ?? service.validityUnit,
      deliveryTime: first?.deliveryTime ?? service.deliveryTime,
    };
  };

  const openPlanEditor = (target: PlanEditorTarget, variant?: ServiceVariant) => {
    setPlanForm(variant ? { ...variant } : emptyVariantDraft());
    setInventoryError(null);
    setPlanEditor(target);
  };

  const updatePlanForm = <K extends keyof ServiceVariant>(field: K, value: ServiceVariant[K]) => {
    setPlanForm(prev => ({ ...prev, [field]: value }));
  };

  const savePlan = async () => {
    if (!planEditor || planSaving) return;
    if (!planForm.name.trim()) {
      setInventoryError('Enter a plan name.');
      return;
    }
    if (!planForm.validityValue || planForm.validityValue < 1) {
      setInventoryError('Plan validity must be at least 1 day or month.');
      return;
    }
    const ourPrice = planForm.ourPrice ?? 0;
    const variant: ServiceVariant = {
      ...planForm,
      id: planForm.id || `variant-${Date.now()}`,
      regularPrice: ourPrice,
      resellerPrice: ourPrice,
      originalPrice: planForm.originalPrice || ourPrice,
    };
    const target = planEditor;
    if (target.mode === 'service-add') {
      const service = services.find(item => item.id === target.serviceId);
      if (!service) return;
      try {
        setPlanSaving(true);
        setInventoryError(null);
        await saveService(deriveServiceWithVariants(service, [...(service.variants || []), variant]));
        setPlanEditor(null);
      } catch (error) {
        setInventoryError(error instanceof Error ? error.message : 'Unable to save plan.');
      } finally {
        setPlanSaving(false);
      }
      return;
    }
    setServiceDraft(prev => {
      if (!prev) return prev;
      const variants = prev.variants || [];
      const nextVariants = target.mode === 'draft-edit'
        ? variants.map(item => (item.id === target.variantId ? variant : item))
        : [...variants, variant];
      return { ...prev, variants: nextVariants };
    });
    setPlanEditor(null);
  };

  const saveDraft = async () => {
    if (serviceSaving || !serviceDraft?.title.trim()) return;
    const variants = serviceDraft.variants || [];
    if (variants.length === 0) {
      setInventoryError('Add at least one plan before saving this service.');
      return;
    }
    if (variants.some(variant => !variant.validityValue || variant.validityValue < 1)) return;
    try {
      setServiceSaving(true);
      setInventoryError(null);
      await saveService({
        ...deriveServiceWithVariants(serviceDraft, variants),
        brandColor: serviceDraft.brandColor || '#176b87',
        stockStatus: serviceDraft.stockCount === 0 ? 'out_of_stock' : serviceDraft.stockCount <= 3 ? 'low_stock' : 'in_stock',
      });
      setShowServiceForm(false);
      setServiceDraft(null);
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Unable to save service.');
    } finally {
      setServiceSaving(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete || serviceDeleting) return;
    try {
      setServiceDeleting(true);
      setServiceDeleteError(null);
      await deleteService(serviceToDelete.id);
      if (serviceDraft?.id === serviceToDelete.id) {
        setShowServiceForm(false);
        setServiceDraft(null);
      }
      setServiceToDelete(null);
    } catch (error) {
      setServiceDeleteError(error instanceof Error ? error.message : 'Unable to delete service.');
    } finally {
      setServiceDeleting(false);
    }
  };

  const openAccountDialog = (serviceId: string) => {
    setAccountDialogServiceId(serviceId);
    setAccountDialogSearch('');
    setAccountDialogError(null);
    setAccountDialogAccounts(accountCredentials.filter(account => account.serviceId === serviceId && account.status === 'available'));
  };

  const handleAccountDialogSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountDialogServiceId || !accountDialogSearch.trim() || accountDialogSearching) return;

    setAccountDialogSearching(true);
    setAccountDialogError(null);
    try {
      const results = await searchAccountCredentials(accountDialogServiceId, accountDialogSearch);
      setAccountDialogAccounts(results);
    } catch (error) {
      setAccountDialogError(error instanceof Error ? error.message : 'Unable to search accounts.');
    } finally {
      setAccountDialogSearching(false);
    }
  };

  const resetAccountDialogSearch = () => {
    if (!accountDialogServiceId) return;
    setAccountDialogSearch('');
    setAccountDialogError(null);
    setAccountDialogAccounts(accountCredentials.filter(account => account.serviceId === accountDialogServiceId && account.status === 'available'));
  };

  const copyId = async (id: string) => {
    if (await copyTextToClipboard(id)) {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    }
  };
  const copyAccountId = copyId;
  const saveAccount = async () => {
    const service = services.find(item => item.id === accountServiceId);
    if (!service || !accountForm.username || !accountForm.password || !accountForm.createdAt || !accountForm.expiresAt) return;
    if (!isValidEmail(accountForm.username)) {
      setInventoryError('Enter a valid account email address.');
      return;
    }
    const createdAt = Date.parse(accountForm.createdAt);
    const expiresAt = Date.parse(accountForm.expiresAt);
    if (Number.isNaN(createdAt) || Number.isNaN(expiresAt)) {
      setInventoryError('Enter valid created and expiry dates.');
      return;
    }
    if (expiresAt <= createdAt) {
      setInventoryError('Expiry date must be after the created date.');
      return;
    }
    setAccountSaving(true);
    try {
      setInventoryError(null);
      if (accountForm.accountId) await updateAccountCredential(accountForm.accountId, service, accountForm);
      else await createAccountCredential(service, accountForm);
      setAccountForm({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) });
      setShowAccountForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save account.';
      setInventoryError(message);
      if (message.toLowerCase().includes('authentication')) openAuthModal();
    } finally { setAccountSaving(false); }
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete || accountDeleting) return;
    const id = accountToDelete;
    setAccountDeleting(true);
    try {
      await deleteAccountCredential(id);
      setAccountDialogAccounts(prev => prev.filter(account => account.id !== id));
      setAccountToDelete(null);
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Unable to delete account.');
    } finally {
      setAccountDeleting(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (ticketActionLoading[ticketId]) return;
    setTicketActionLoading(prev => ({ ...prev, [ticketId]: true }));
    setTicketActionError(null);
    try {
      await resolveTicket(ticketId, 'Issue resolved by admin.');
    } catch (error) {
      setTicketActionError(error instanceof Error ? error.message : 'Unable to resolve ticket.');
    } finally {
      setTicketActionLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  if (authLoading) return <section className="pt-5 px-4 max-w-6xl mx-auto"><div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded-lg bg-[var(--color-surface-hover)]" /><div className="h-24 rounded-2xl bg-[var(--color-surface-hover)]" /><div className="h-64 rounded-2xl bg-[var(--color-surface-hover)]" /></div></section>;

  if (!isAdmin) {
    return (
      <section className="py-6 px-4 max-w-4xl mx-auto pb-24">
        <div className="p-6 ws-panel text-center">
          <h2 className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
            Admin Sign In
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Sign in with the configured admin email to manage orders, inventory and tickets.
          </p>
          <button
            onClick={() => openAuthModal()}
            className="mt-4 h-11 px-5 rounded-[14px] ws-primary-button text-[13px] font-semibold"
          >
            Sign In as Admin
          </button>
        </div>
      </section>
    );
  }

  const tabMeta: Record<typeof adminTab, { title: string; subtitle: string }> = {
    overview: { title: 'Overview', subtitle: 'Snapshot of orders and tickets.' },
    payments: { title: 'Orders', subtitle: `${pendingOrders.length} UPI payment${pendingOrders.length === 1 ? '' : 's'} waiting to be verified.` },
    inventory: { title: 'Inventory', subtitle: 'Stock accounts, services, and pricing.' },
    tickets: { title: 'Tickets', subtitle: `${openTicketTotal} open · ${resolvedTicketTotal} resolved.` },
  };

  return (
    <section className="pt-5 px-4 max-w-6xl mx-auto pb-24">
      <div className="mb-5">
        <p className="text-xs font-semibold text-[var(--color-brand-violet)]">ADMIN</p>
        <h1 className="font-heading font-bold text-[30px] leading-tight text-[var(--color-text-primary)] mt-1">{tabMeta[adminTab].title}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{tabMeta[adminTab].subtitle}</p>
      </div>


      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['New orders', newOrders.length, 'text-[var(--color-brand-violet)]'],
              ['Pending review', pendingOrders.length, 'text-[var(--color-warning)]'],
              ['Fulfilled', adminFulfilledOrderPage.total, 'text-[var(--color-success)]'],
              ['Open tickets', openTicketTotal, 'text-[var(--color-danger)]'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="p-4 ws-panel">
                <span className="text-[11px] text-[var(--color-text-muted)] block">{label}</span>
                <strong className={`font-heading text-2xl ${color}`}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="ws-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Order activity</h3>
                <button onClick={() => setAdminTab('payments')} className="text-xs font-semibold text-[var(--color-brand-violet)]">View all</button>
              </div>
              <div className="space-y-2">
                {orders.slice(0, 6).map(order => (
                  <div key={order.id} className="flex items-center justify-between gap-3 p-3 ws-panel-muted">
                    <div className="min-w-0">
                      <span className="font-mono-code text-[10px] text-[var(--color-text-muted)]">{order.id}</span>
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{order.serviceTitle}</p>
                    </div>
                    <span className="text-[10px] font-semibold capitalize text-[var(--color-text-secondary)]">{order.paymentStatus.replaceAll('_', ' ')}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">No orders recorded yet.</p>}
              </div>
            </div>

            <div className="ws-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Ticket activity</h3>
                <button onClick={() => setAdminTab('tickets')} className="text-xs font-semibold text-[var(--color-brand-violet)]">View all</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 ws-panel-muted"><span className="text-[11px] text-[var(--color-text-muted)] block">Pending</span><strong className="text-xl text-[var(--color-warning)]">{openTicketTotal}</strong></div>
                <div className="p-3 ws-panel-muted"><span className="text-[11px] text-[var(--color-text-muted)] block">Resolved</span><strong className="text-xl text-[var(--color-success)]">{resolvedTicketTotal}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Payment Approvals */}
      {adminTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">{serviceFilters(pendingOrders).map(filter => <button key={filter} onClick={() => setPendingServiceFilter(filter)} className={`h-11 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap ${pendingServiceFilter === filter ? 'ws-primary-button' : 'ws-chip'}`}>{filter === 'all' ? 'All services' : filter}</button>)}</div>

          {filteredPendingOrders.length === 0 ? (
            <div className="p-8 ws-panel text-center text-xs text-[var(--color-text-muted)]">
              No pending UPI payments to verify at this time.
            </div>
          ) : (
            filteredPendingOrders.map(order => (
              <div
                key={order.id}
                className="p-4 ws-panel space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--color-card-border)] pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-code font-bold text-sm text-[var(--color-brand-violet)]">
                        {order.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyId(order.id)}
                        aria-label="Copy order ID"
                        title="Copy order ID"
                        className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0"
                      >
                        {copiedId === order.id ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <h4 className="font-heading font-semibold text-base text-[var(--color-text-primary)]">
                      {order.serviceTitle}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-bold text-xl text-[var(--color-success)]">
                      ₹{order.pricePaid}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block capitalize">
                      Role: {order.userRole}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 ws-panel-muted">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">Customer Info</span>
                    <span className="font-semibold text-[var(--color-text-primary)] block">{order.customerName}</span>
                    <span className="text-[var(--color-reseller-indigo)] font-mono-code">{order.contactMethod === 'whatsapp' ? order.customerWhatsapp : order.customerTelegram}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block capitalize">Preferred: {order.contactMethod}</span>
                  </div>

                  <div className="p-3 ws-panel-muted"><span className="text-[10px] text-[var(--color-text-muted)] block">Payment reference</span><span className="font-mono-code font-bold text-[var(--color-warning)] text-sm">{order.utrNumber || 'Not provided'}</span></div>
                </div>

                {order.accountId && <div className="p-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-xs">
                  <span className="text-[10px] text-[var(--color-success)] block">Attached account</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <strong className="font-mono-code text-[var(--color-text-primary)]">{order.accountId}</strong>
                    <button type="button" onClick={() => void copyId(order.accountId!)} aria-label="Copy account ID" title="Copy account ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">
                      {copiedId === order.accountId ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  {(() => { const account = accountCredentials.find(item => item.id === order.accountId); return <span className="text-[var(--color-text-secondary)] block">{account?.username || order.credentials?.username || 'Credentials attached'}</span>; })()}
                </div>}

                {/* Action Buttons */}
                {orderErrors[order.id] && <p role="alert" className="text-xs text-[var(--color-danger)]">{orderErrors[order.id]}</p>}
                <div className="flex items-center justify-center gap-1 sm:gap-2 pt-2">
                  <StyledDropdown
                    className="w-full flex-1 min-w-0 sm:flex-none sm:w-96"
                    disabled={isOrderBusy(order.id)}
                    value={orderAccountIds[order.id] ?? order.accountId ?? ''}
                    onChange={value => {
                      setOrderErrors(prev => ({ ...prev, [order.id]: '' }));
                      setOrderAccountIds(prev => ({ ...prev, [order.id]: value }));
                    }}
                    placeholder="Search account ID"
                    searchPlaceholder="Search account ID or email"
                    searchable
                    ariaLabel="Search account ID"
                    options={accountOptionsForOrder(order)}
                    menuClassName="min-w-[18rem] sm:min-w-[24rem] sm:max-w-[24rem]"
                    buttonClassName="rounded-[12px] text-xs"
                  />
                  <LoadingButton type="button" onClick={() => void saveOrderAccount(order)} loading={orderActionLoading[order.id] === 'assign'} disabled={isOrderBusy(order.id) || !(orderAccountIds[order.id] || order.accountId || '').trim()} aria-label="Save account assignment" title="Save account assignment" className="w-10 sm:w-auto h-10 px-0 sm:px-3 shrink-0 rounded-[12px] border border-[var(--color-success)]/40 text-[var(--color-success)] inline-flex items-center justify-center gap-1.5 disabled:opacity-40"><Check className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">Save</span></LoadingButton>
                  <StyledDropdown
                    value=""
                    onChange={value => void runOrderAction(order.id, () => adminRejectOrder(order.id, value as 'payment' | 'stock'), 'Unable to reject order.', 'reject')}
                    disabled={isOrderBusy(order.id)}
                    loading={orderActionLoading[order.id] === 'reject'}
                    ariaLabel="Reject order"
                    triggerContent={<span className="inline-flex items-center gap-1.5"><X className="w-4 h-4 shrink-0" /><span className="hidden sm:inline text-xs font-semibold">Reject</span></span>}
                    options={[
                      { value: 'payment', label: 'Issue with payment' },
                      { value: 'stock', label: 'Issue with stock' },
                    ]}
                    fullButton={false}
                    buttonClassName="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] border border-[var(--color-danger)]/50 text-[var(--color-danger)]"
                    menuPlacement="top"
                    menuClassName="left-auto right-0 min-w-44"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {order.customerTelegram && <button type="button" onClick={() => window.open(`https://t.me/${order.customerTelegram.replace(/^@/, '')}?text=${encodeURIComponent(accountMessage(order, 'telegram'))}`, '_blank', 'noopener,noreferrer')} aria-label="Message customer on Telegram" title="Message customer on Telegram" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">Telegram</span></button>}
                  {order.customerWhatsapp && <button type="button" onClick={() => window.open(`https://wa.me/${order.customerWhatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(accountMessage(order, 'whatsapp'))}`, '_blank', 'noopener,noreferrer')} aria-label="Message customer on WhatsApp" title="Message customer on WhatsApp" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">WhatsApp</span></button>}
                  <LoadingButton type="button" onClick={() => void runOrderAction(order.id, () => updateOrderFulfillment(order.id, true), 'Unable to mark order fulfilled.', 'fulfill')} loading={orderActionLoading[order.id] === 'fulfill'} disabled={isOrderBusy(order.id)} aria-label="Mark order fulfilled" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button text-xs font-semibold inline-flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline">Mark fulfilled</span></LoadingButton>
                </div>
              </div>
            ))
          )}

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Fulfilled orders</h3>
            </div>
            {/* Service filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">{['all', ...adminFulfilledOrderPage.serviceTypes].map(filter => <button key={filter} onClick={() => { setFulfilledServiceFilter(filter); }} className={`h-11 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap ${fulfilledServiceFilter === filter ? 'ws-primary-button' : 'ws-chip'}`}>{filter === 'all' ? 'All services' : filter}</button>)}</div>
            {/* Search */}
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                id="fulfilled-order-search"
                value={fulfilledOrderSearchInput}
                onChange={e => {
                  setFulfilledOrderSearchInput(e.target.value);
                  setFulfilledOrderSearch(e.target.value.trim());
                }}
                placeholder="Search by order ID, account ID, or Telegram…"
                aria-label="Search fulfilled orders"
                className="w-full h-12 pl-9 pr-10 rounded-[14px] ws-input text-[13px]"
              />
              {fulfilledOrderSearchInput && (
                <button
                  type="button"
                  onClick={() => { setFulfilledOrderSearchInput(''); setFulfilledOrderSearch(''); }}
                  aria-label="Clear order search"
                  className="absolute right-3 w-6 h-6 rounded-[8px] ws-chip flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {adminFulfilledOrdersError && <div role="alert" className="p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">{adminFulfilledOrdersError}</div>}
            {adminFulfilledOrdersLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" aria-label="Loading fulfilled orders">
                {[1, 2].map(item => <div key={item} className="h-56 rounded-2xl bg-[var(--color-surface-hover)] animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredFulfilledOrders.map(order => (
                <div key={`fulfilled-${order.id}`} className="p-4 ws-panel space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-code text-[10px] text-[var(--color-text-muted)]">{order.id}</span>
                        <button type="button" onClick={() => void copyId(order.id)} aria-label="Copy order ID" title="Copy order ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">
                          {copiedId === order.id ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">{order.serviceTitle}{order.variantName ? ` · ${order.variantName}` : ''}</h4>
                      <p className="text-xs text-[var(--color-text-secondary)]">{order.customerName} · {order.contactMethod === 'whatsapp' ? order.customerWhatsapp : order.customerTelegram}</p>
                    </div>
                    <strong className="text-sm text-[var(--color-success)] shrink-0">₹{order.pricePaid}</strong>
                  </div>
                  {order.accountId && <div className="p-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-xs">
                    <span className="text-[10px] text-[var(--color-success)] block">Attached account</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <strong className="font-mono-code text-[var(--color-text-primary)]">{order.accountId}</strong>
                      <button type="button" onClick={() => void copyId(order.accountId!)} aria-label="Copy account ID" title="Copy account ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">
                        {copiedId === order.accountId ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <span className="text-[var(--color-text-secondary)] block">{accountCredentials.find(account => account.id === order.accountId)?.username || order.credentials?.username || 'Credentials attached'}</span>
                  </div>}
                  <div className="flex items-center justify-center gap-2">
                    <StyledDropdown
                      className="w-full flex-1 min-w-0 sm:max-w-sm"
                      disabled={isOrderBusy(order.id)}
                      value={orderAccountIds[order.id] ?? order.accountId ?? ''}
                      onChange={value => setOrderAccountIds(prev => ({ ...prev, [order.id]: value }))}
                      placeholder="Search account ID"
                      searchPlaceholder="Search account ID or email"
                      searchable
                      ariaLabel="Search account ID"
                      options={accountOptionsForOrder(order)}
                      menuClassName="min-w-[18rem] sm:min-w-[24rem]"
                      buttonClassName="text-xs"
                    />
                    <LoadingButton type="button" onClick={() => void saveOrderAccount(order)} loading={orderActionLoading[order.id] === 'assign'} disabled={isOrderBusy(order.id) || !(orderAccountIds[order.id] ?? order.accountId ?? '').trim()} aria-label="Save account assignment" title="Save account assignment" className="w-10 sm:w-auto h-10 px-0 sm:px-3 shrink-0 rounded-[12px] border border-[var(--color-success)]/40 text-[var(--color-success)] inline-flex items-center justify-center gap-1.5 disabled:opacity-40"><Check className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">Save</span></LoadingButton>
                  </div>
                  {orderErrors[order.id] && <p role="alert" className="text-xs text-[var(--color-danger)]">{orderErrors[order.id]}</p>}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {order.customerTelegram && <button type="button" onClick={() => window.open(`https://t.me/${order.customerTelegram.replace(/^@/, '')}?text=${encodeURIComponent(accountMessage(order, 'telegram'))}`, '_blank', 'noopener,noreferrer')} className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5" aria-label="Message customer on Telegram" title="Message customer on Telegram"><Send className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">Telegram</span></button>}
                    {order.customerWhatsapp && <button type="button" onClick={() => window.open(`https://wa.me/${order.customerWhatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(accountMessage(order, 'whatsapp'))}`, '_blank', 'noopener,noreferrer')} className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5" aria-label="Message customer on WhatsApp" title="Message customer on WhatsApp"><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">WhatsApp</span></button>}
                    <LoadingButton type="button" onClick={() => void runOrderAction(order.id, () => updateOrderFulfillment(order.id, false), 'Unable to mark order pending.', 'pending')} loading={orderActionLoading[order.id] === 'pending'} disabled={isOrderBusy(order.id)} aria-label="Mark order pending" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button text-xs font-semibold inline-flex items-center justify-center gap-1.5"><Clock3 className="w-4 h-4" /><span className="hidden sm:inline">Mark pending</span></LoadingButton>
                  </div>
                </div>
              ))}
              {filteredFulfilledOrders.length === 0 && !adminFulfilledOrdersLoading && <p className="text-xs text-[var(--color-text-muted)]">{fulfilledOrderSearch ? 'No fulfilled orders match your search.' : 'No fulfilled orders recorded yet.'}</p>}
                </div>
                <PaginationControls
                  page={adminFulfilledOrderPage.page}
                  totalPages={adminFulfilledOrderPage.totalPages}
                  onPageChange={page => void loadAdminFulfilledOrders({ page, serviceTitle: fulfilledServiceFilter, search: fulfilledOrderSearch })}
                  disabled={adminFulfilledOrdersLoading}
                  label="Fulfilled orders"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Inventory & Stock Manager */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">
          {inventoryError && !showAccountForm && <div className="p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">{inventoryError}</div>}

          <div className="ws-panel p-4 space-y-4">
            <div className="flex items-center justify-between gap-3"><div><h4 className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Stock Accounts</h4><p className="text-[11px] text-[var(--color-text-muted)]">Accounts are grouped by service type.</p></div><button onClick={() => { setAccountForm({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) }); setAccountServiceId(''); setShowAccountForm(true); }} className="ws-primary-button h-11 px-3.5 rounded-[12px] text-xs font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Store New Account</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map(service => {
                const serviceAccounts = accountCredentials.filter(account => account.serviceId === service.id && account.status === 'available');
                return <div key={service.id} className="ws-panel-muted p-4 min-h-32 flex flex-col justify-between gap-4"><div><h5 className="text-sm font-semibold text-[var(--color-text-primary)]">{service.title}</h5><p className="text-xs text-[var(--color-text-muted)] mt-1">{serviceAccounts.length} available account{serviceAccounts.length === 1 ? '' : 's'}</p></div><button type="button" onClick={() => openAccountDialog(service.id)} className="w-full h-11 rounded-[12px] ws-secondary-button text-xs font-semibold">View Accounts</button></div>;
              })}
            </div>
            {accountCredentials.filter(account => account.status === 'available').length === 0 && <p className="text-xs text-[var(--color-text-muted)]">No available accounts yet.</p>}
          </div>

          {showAccountForm && (
            <div className="fixed inset-0 z-50 bg-[var(--color-shell)]/70 flex items-center justify-center p-4">
              <div role="dialog" aria-modal="true" className="w-full max-w-xl ws-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{accountForm.accountId ? 'Edit Account' : 'Store New Account'}</h4>
                  <button type="button" onClick={() => setShowAccountForm(false)} aria-label="Close account form" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                {inventoryError && <div role="alert" className="rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-3 text-xs text-[var(--color-danger)]">{inventoryError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <StyledDropdown className="sm:col-span-2" value={accountServiceId} onChange={setAccountServiceId} placeholder="Service type" ariaLabel="Service type" options={services.map(service => ({ value: service.id, label: service.title }))} buttonClassName="h-12 px-3.5 rounded-[14px] text-xs" />
                  <input type="email" inputMode="email" maxLength={254} value={accountForm.username || ''} onChange={event => setAccountForm(prev => ({ ...prev, username: event.target.value.replace(/\s/g, '').slice(0, 254) }))} pattern="[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}" title="Enter a valid account email address." placeholder="Account email" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.password || ''} onChange={event => setAccountForm(prev => ({ ...prev, password: event.target.value }))} placeholder="Account password" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input type="date" required value={accountForm.createdAt || ''} onChange={event => setAccountForm(prev => ({ ...prev, createdAt: event.target.value }))} aria-label="Created date" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input type="date" required value={accountForm.expiresAt || ''} onChange={event => setAccountForm(prev => ({ ...prev, expiresAt: event.target.value }))} aria-label="Expiry date" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.profileName || ''} onChange={event => setAccountForm(prev => ({ ...prev, profileName: event.target.value }))} placeholder="Profile name (optional)" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.pin || ''} onChange={event => setAccountForm(prev => ({ ...prev, pin: event.target.value }))} placeholder="PIN (optional)" className="h-12 px-3.5 rounded-[14px] ws-input" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAccountForm(false)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button>
                  <LoadingButton type="button" onClick={() => void saveAccount()} loading={accountSaving} loadingLabel="Saving..." disabled={!accountServiceId || !accountForm.username || !accountForm.password || !accountForm.createdAt || !accountForm.expiresAt} className="ws-primary-button h-11 px-4 rounded-[12px] text-xs font-semibold disabled:opacity-50">Save Account</LoadingButton>
                </div>
              </div>
            </div>
          )}

          {accountDialogServiceId && (
            <div className="fixed inset-0 z-[60] bg-[var(--color-shell)]/70 flex items-center justify-center p-4 pb-24 sm:pb-4">
              <div role="dialog" aria-modal="true" className="w-full max-w-xl max-h-[70dvh] sm:max-h-[70vh] overflow-y-auto ws-panel p-5 space-y-4">
                <div className="sticky top-0 z-10 -mx-5 px-5 pb-4 flex items-center justify-between gap-3 bg-[var(--color-surface-solid)]/95">
                  <div>
                    <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{services.find(service => service.id === accountDialogServiceId)?.title} Accounts</h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Available accounts are shown first. Search to find an assigned account.</p>
                  </div>
                  <button type="button" onClick={() => setAccountDialogServiceId(null)} aria-label="Close accounts" className="w-10 h-10 shrink-0 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleAccountDialogSearch} className="flex items-center gap-2">
                  <input
                    value={accountDialogSearch}
                    onChange={event => setAccountDialogSearch(event.target.value)}
                    placeholder="Search account ID or email"
                    aria-label="Search account ID or email"
                    className="min-w-0 flex-1 h-12 px-3.5 rounded-[14px] ws-input text-xs"
                  />
                  <LoadingButton type="submit" loading={accountDialogSearching} disabled={!accountDialogSearch.trim()} aria-label="Search accounts" className="w-10 h-10 shrink-0 rounded-xl ws-primary-button flex items-center justify-center disabled:opacity-50">
                    <Search className="w-4 h-4" />
                  </LoadingButton>
                  {accountDialogSearch && <button type="button" onClick={resetAccountDialogSearch} aria-label="Clear account search" className="w-10 h-10 shrink-0 rounded-xl ws-chip flex items-center justify-center"><X className="w-4 h-4" /></button>}
                </form>
                {accountDialogError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{accountDialogError}</p>}
                {accountDialogSearching && <p className="text-xs text-[var(--color-text-muted)]">Searching accounts...</p>}
                {!accountDialogSearching && accountDialogAccounts.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">{accountDialogSearch ? 'No matching accounts found.' : 'No available accounts in this service.'}</p>}
                {accountDialogAccounts.map(account => (
                  <div key={account.id} className="ws-panel-muted p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-mono-code font-bold text-[var(--color-text-primary)] truncate">{account.id}</span>
                        <span className={account.status === 'assigned' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}>{account.status === 'assigned' ? 'Assigned' : 'Available'}</span>
                      </div>
                      <button type="button" onClick={() => void copyAccountId(account.id)} className="ws-secondary-button h-9 px-2.5 rounded-[10px] flex items-center gap-1 shrink-0">{copiedId === account.id ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />} {copiedId === account.id ? 'Copied' : 'Copy ID'}</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--color-text-secondary)]">
                      <span><b>Email:</b> {account.username || '-'}</span>
                      <span><b>Profile:</b> {account.profileName || '-'}</span>
                      <span><b>Created:</b> {account.createdAt.slice(0, 10)}</span>
                      <span><b>Expires:</b> {account.expiresAt?.slice(0, 10) || '-'}</span>
                      <span><b>PIN:</b> {account.pin || '-'}</span>
                      <span className="flex items-center gap-2"><b>Password:</b> {visiblePasswords[account.id] ? account.password || '-' : '••••••••'}<button type="button" onClick={() => setVisiblePasswords(prev => ({ ...prev, [account.id]: !prev[account.id] }))} aria-label="Toggle password visibility" className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center"><Eye className="w-3.5 h-3.5" /></button></span>
                    </div>
                    {account.additionalInfo && <p className="text-[var(--color-text-secondary)]"><b>Additional info:</b> {account.additionalInfo}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setAccountForm({ accountId: account.id, username: account.username, password: account.password, pin: account.pin, profileName: account.profileName, createdAt: account.createdAt.slice(0, 10), expiresAt: account.expiresAt?.slice(0, 10), additionalInfo: account.additionalInfo }); setAccountServiceId(account.serviceId); setAccountDialogServiceId(null); setShowAccountForm(true); }} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-10 px-3 rounded-[10px] font-semibold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit account</button>
                      <button type="button" disabled={account.status === 'assigned'} onClick={() => setAccountToDelete(account.id)} className="border border-[var(--color-danger)]/40 text-[var(--color-danger)] h-10 px-3 rounded-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /> Delete account</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {serviceToDelete && <div className="fixed inset-0 z-[70] bg-[var(--color-shell)]/70 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm ws-panel p-5 space-y-4"><h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Delete service?</h4><p className="text-xs text-[var(--color-text-secondary)]">Remove <strong>{serviceToDelete.title}</strong> from the catalog and service management?</p>{serviceDeleteError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{serviceDeleteError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => { setServiceToDelete(null); setServiceDeleteError(null); }} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button><LoadingButton type="button" onClick={() => void confirmDeleteService()} loading={serviceDeleting} loadingLabel="Deleting..." className="h-11 px-4 rounded-[12px] border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-xs font-semibold inline-flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete service</LoadingButton></div></div></div>}
          {accountToDelete && <div className="fixed inset-0 z-[70] bg-[var(--color-shell)]/70 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm ws-panel p-5 space-y-4"><h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Delete stored account?</h4><p className="text-xs text-[var(--color-text-secondary)]">This will permanently remove account <span className="font-mono-code font-semibold">{accountToDelete}</span> from inventory.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setAccountToDelete(null)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button><LoadingButton type="button" onClick={() => void confirmDeleteAccount()} loading={accountDeleting} loadingLabel="Deleting..." className="h-11 px-4 rounded-[12px] border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-xs font-semibold">Delete account</LoadingButton></div></div></div>}
          <div className="flex items-center justify-between gap-3 pt-3"><h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Services</h3><button onClick={() => openServiceForm()} className="ws-primary-button h-11 px-4 rounded-[14px] text-[13px] font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Service</button></div>
          {showServiceForm && serviceDraft && (
            <div className="ws-panel p-5 space-y-4 border border-[var(--color-brand-violet)]/30">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{services.some(service => service.id === serviceDraft.id) ? 'Edit service' : 'New service'}</h4>
                <button onClick={() => setShowServiceForm(false)} aria-label="Close service form" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="text-xs">
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">OTT service name</label>
                <input value={serviceDraft.title} onChange={e => updateDraft('title', e.target.value)} placeholder="e.g. Netflix Premium" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
              </div>

              <div className="p-4 ws-panel-muted space-y-3">
                <div>
                  <h5 className="text-xs font-semibold text-[var(--color-text-primary)]">Plans</h5>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Each plan carries its own price, validity, delivery time and description. One plan sells directly on the card; two or more open the plans popup.</p>
                </div>
                {(serviceDraft.variants || []).map(variant => (
                  <div key={variant.id} className="p-3 ws-panel flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="block font-semibold text-[var(--color-text-primary)] truncate">{variant.name || 'Untitled plan'}</span>
                      <span className="block text-[11px] text-[var(--color-text-muted)] truncate">
                        ₹{variant.ourPrice ?? variant.regularPrice} • {variant.validityValue} {variant.validityUnit}
                        {variant.deliveryTime ? ` • ${variant.deliveryTime}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => openPlanEditor({ mode: 'draft-edit', variantId: variant.id }, variant)} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-10 px-3 rounded-[10px] font-semibold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                      <button type="button" onClick={() => updateDraft('variants', (serviceDraft.variants || []).filter(item => item.id !== variant.id))} aria-label={`Remove ${variant.name || 'plan'}`} className="border border-[var(--color-danger)]/40 text-[var(--color-danger)] h-10 px-3 rounded-[10px] font-semibold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => openPlanEditor({ mode: 'draft-add' })} type="button" className="ws-secondary-button h-11 px-3 rounded-[12px] text-xs font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add plan</button>
              </div>

              <LoadingButton onClick={() => void saveDraft()} loading={serviceSaving} loadingLabel="Saving service..." className="ws-primary-button h-11 px-4 rounded-[14px] text-[13px] font-semibold flex items-center gap-1.5"><Save className="w-4 h-4" /> Save service</LoadingButton>
            </div>
          )}

          {planEditor && (
            <div className="fixed inset-0 z-[75] bg-[var(--color-shell)]/70 flex items-center justify-center p-4">
              <div role="dialog" aria-modal="true" aria-label={planEditor.mode === 'draft-edit' ? 'Edit plan' : 'Add plan'} className="w-full max-w-xl max-h-[88vh] overflow-y-auto ws-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{planEditor.mode === 'draft-edit' ? 'Edit plan' : 'Add plan'}</h4>
                  <button onClick={() => setPlanEditor(null)} aria-label="Close plan form" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Plan name</label>
                    <input value={planForm.name} onChange={e => updatePlanForm('name', e.target.value)} placeholder="e.g. 4 screens · 1 month" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Price (₹)</label>
                    <input type="number" min="0" value={numberInputValue(planForm.ourPrice)} onChange={e => updatePlanForm('ourPrice', Number(e.target.value) || 0)} placeholder="499" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Original price (₹)</label>
                    <input type="number" min="0" value={numberInputValue(planForm.originalPrice)} onChange={e => updatePlanForm('originalPrice', Number(e.target.value) || 0)} placeholder="799" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Validity</label>
                    <div className="flex gap-2">
                      <input type="number" min="1" value={numberInputValue(planForm.validityValue)} onChange={e => updatePlanForm('validityValue', Number(e.target.value) || 0)} placeholder="30" className="min-w-0 flex-1 h-12 px-3.5 rounded-[14px] ws-input" />
                      <StyledDropdown className="w-28 shrink-0" value={planForm.validityUnit || 'days'} onChange={value => updatePlanForm('validityUnit', value as ServiceVariant['validityUnit'])} ariaLabel="Plan validity unit" options={[{ value: 'days', label: 'Days' }, { value: 'months', label: 'Months' }]} buttonClassName="h-12 px-3.5 rounded-[14px] text-xs" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Description — one point per line</label>
                    <textarea value={planForm.description || ''} onChange={e => updatePlanForm('description', e.target.value)} placeholder={'4K Ultra HD streaming\nWatch on 4 devices at once'} className="w-full px-3.5 py-3 rounded-[14px] ws-input min-h-28 text-xs" />
                    {planForm.description && <HighlightPoints className="mt-2" text={planForm.description} />}
                  </div>
                </div>

                {inventoryError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{inventoryError}</p>}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setPlanEditor(null)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button>
                  <LoadingButton type="button" onClick={() => void savePlan()} loading={planSaving} loadingLabel="Saving plan..." className="ws-primary-button h-11 px-4 rounded-[14px] text-xs font-semibold flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save plan</LoadingButton>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map(service => (
              <div
                key={service.id}
                className="p-4 ws-panel flex items-center justify-between flex-wrap sm:flex-nowrap gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-[14px] text-white flex items-center justify-center font-semibold text-base shrink-0"
                    style={{ backgroundColor: service.brandColor }}
                  >
                    {service.logoUrl ? <span className="w-full h-full rounded-[14px] bg-cover bg-center" style={{ backgroundImage: `url(${service.logoUrl})` }} /> : service.title.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)] truncate">
                      {service.title}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      ₹{service.ourPrice ?? service.regularPrice}
                      {service.originalPrice ? ` (was ₹${service.originalPrice})` : ''} • {service.variantMode === 'multiple' ? `${(service.variants || []).length} plans` : `${service.validityValue} ${service.validityUnit}`}
                      {service.deliveryTime ? ` • ${service.deliveryTime}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openPlanEditor({ mode: 'service-add', serviceId: service.id })} className="ws-chip h-10 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add plan</button>
                  <button onClick={() => openServiceForm(service)} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-10 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => { setServiceDeleteError(null); setServiceToDelete(service); }} className="border border-[var(--color-danger)]/40 text-[var(--color-danger)] h-10 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Support Tickets */}
      {adminTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setTicketView('open'); setTicketSearch(''); }}
              className={`h-11 px-4 rounded-full text-[13px] font-semibold ${ticketView === 'open' ? 'ws-primary-button' : 'ws-chip'}`}
            >
              Open ({openTicketTotal})
            </button>
            <button
              type="button"
              onClick={() => setTicketView('resolved')}
              className={`h-11 px-4 rounded-full text-[13px] font-semibold ${ticketView === 'resolved' ? 'ws-primary-button' : 'ws-chip'}`}
            >
              Resolved ({resolvedTicketTotal})
            </button>
          </div>

          {/* Search bar — available for both open and resolved */}
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              value={ticketSearch}
              onChange={event => setTicketSearch(event.target.value)}
              placeholder={ticketView === 'open' ? 'Search by ticket ID or order ID…' : 'Search resolved ticket, username, or order ID…'}
              aria-label={`Search ${ticketView} tickets`}
              className="w-full h-12 pl-9 pr-10 rounded-[14px] ws-input text-[13px]"
            />
            {ticketSearch && (
              <button
                type="button"
                onClick={() => setTicketSearch('')}
                aria-label="Clear ticket search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-[8px] ws-chip flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          {adminTicketError && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
              {adminTicketError}
            </div>
          )}
          {ticketActionError && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
              {ticketActionError}
            </div>
          )}

          {adminTicketsLoading ? (
            <div className="space-y-3" aria-label="Loading tickets">
              {[1, 2, 3].map(item => <div key={item} className="h-44 rounded-2xl bg-[var(--color-surface-hover)] animate-pulse" />)}
            </div>
          ) : adminTicketPage.total === 0 ? (
            <div className="p-8 ws-panel text-center text-xs text-[var(--color-text-muted)]">
              {normalizedTicketSearch
                ? `No ${ticketView} tickets match your search.`
                : ticketView === 'resolved' ? 'No resolved tickets.' : 'No open tickets.'}
            </div>
          ) : (
            <>
              {visibleTickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="p-4 ws-panel space-y-3"
                >
                <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-code font-bold text-xs text-[var(--color-danger)]">{ticket.id}</span>
                      <button type="button" onClick={() => void copyId(ticket.id)} aria-label="Copy ticket ID" title="Copy ticket ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">
                        {copiedId === ticket.id ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
                      {ticket.serviceTitle} - {ticket.issueCategory}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 ${
                    ticket.status === 'resolved' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                  }`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 ws-panel-muted">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">Related order</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono-code font-semibold text-[var(--color-text-primary)]">{ticket.orderId}</span>
                      <button type="button" onClick={() => void copyId(ticket.orderId)} aria-label="Copy order ID" title="Copy order ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">
                        {copiedId === ticket.orderId ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 ws-panel-muted flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Customer contact</span>
                      <span className="font-mono-code text-[var(--color-text-primary)] truncate block">
                        {ticket.contactMethod === 'whatsapp' ? ticket.customerWhatsapp : ticket.customerTelegram || ticket.customerWhatsapp || 'Not provided'}
                      </span>
                    </div>
                    {ticketContact(ticket) && (
                      <button
                        type="button"
                        onClick={() => { const contact = ticketContact(ticket); if (contact) window.open(contact.url, '_blank', 'noopener,noreferrer'); }}
                        className={`shrink-0 h-10 px-3 rounded-[12px] ws-secondary-button text-[11px] font-semibold inline-flex items-center gap-1.5`}
                        aria-label={`Message customer on ${ticketContact(ticket)?.label}`}
                      >
                        {ticketContact(ticket)?.label === 'WhatsApp' ? <MessageCircle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{ticketContact(ticket)?.label}</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] ws-panel-muted p-3">
                  &quot;{ticket.description}&quot;
                </p>

                {ticket.status !== 'resolved' && (
                  <LoadingButton
                    type="button"
                    loading={Boolean(ticketActionLoading[ticket.id])}
                    loadingLabel="Resolving..."
                    onClick={() => void handleResolveTicket(ticket.id)}
                    className="w-full sm:w-auto h-11 px-4 rounded-[12px] bg-[var(--color-success)] text-[var(--color-accent-ink)] text-xs font-semibold hover:opacity-90 flex items-center justify-center text-center gap-1.5"
                  >
                    Mark Ticket Resolved
                  </LoadingButton>
                )}
                </div>
              ))}
              <PaginationControls
                page={adminTicketPage.page}
                totalPages={adminTicketPage.totalPages}
                onPageChange={page => void loadAdminTickets({ status: ticketView, page, search: normalizedTicketSearch })}
                disabled={adminTicketsLoading}
                label="Tickets"
              />
            </>
          )}
        </div>
      )}
    </section>
  );
};
