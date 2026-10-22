'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AccountCredential, AdminOrdersPage, Credentials, Order, PaginatedResult, PaymentStatus, Service, ServiceVariant, Ticket } from '@/types';
import { listAdminAccountsAction, listAdminOrdersAction, listAssignableOrdersAction } from '@/app/actions/backend';
import { PaginationControls } from '@/components/common/PaginationControls';
import { StyledDropdown } from '@/components/common/StyledDropdown';
import { HighlightPoints } from '@/components/common/HighlightPoints';
import { LoadingButton } from '@/components/common/LoadingButton';
import { copyTextToClipboard } from '@/lib/client/clipboard';
import { isValidAccountIdentifier } from '@/lib/validation';
import { planPriceLabel, showPlanValidity } from '@/lib/planBooking';
import {
  Plus,
  Save,
  Trash2,
  X,
  Search,
  Copy,
  Check,
  Pencil,
  Send,
  MessageCircle,
  CheckCircle2,
  Clock3,
  Link2,
} from 'lucide-react';

const emptyVariantDraft = (): ServiceVariant => ({
  id: '', name: '', originalPrice: 0, ourPrice: 0, regularPrice: 0, resellerPrice: 0, stockCount: 0, validityValue: 30, validityUnit: 'days', deliveryTime: '', description: '', paymentCurrency: 'inr', isManualOrder: false,
});

const isAccountExpired = (account: AccountCredential) => !account.expiresAt || Date.parse(account.expiresAt) <= Date.now();

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
    createAccountCredential,
    updateAccountCredential,
    deleteAccountCredential,
    attachAccountToOrder,
    unassignAccountFromOrder,
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
  } = useApp();

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<Service | null>(null);
  const [planEditor, setPlanEditor] = useState<PlanEditorTarget | null>(null);
  const [planForm, setPlanForm] = useState<ServiceVariant>(emptyVariantDraft());
  const [planSaving, setPlanSaving] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountServiceId, setAccountServiceId] = useState('');
  const [accountVariantId, setAccountVariantId] = useState('');
  const [accountForm, setAccountForm] = useState<Credentials & { accountId: string; profileName?: string; createdAt?: string; expiresAt?: string }>({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountPage, setAccountPage] = useState<PaginatedResult<AccountCredential>>({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountPageNumber, setAccountPageNumber] = useState(1);
  const [accountServiceFilter, setAccountServiceFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'available' | 'assigned'>('all');
  const [accountSearchInput, setAccountSearchInput] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState<AdminOrdersPage>({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1, paymentStatus: 'all', serviceTitle: 'all', serviceTypes: [], search: '' });
  const [ordersTableLoading, setOrdersTableLoading] = useState(false);
  const [ordersTableError, setOrdersTableError] = useState<string | null>(null);
  const [orderPageNumber, setOrderPageNumber] = useState(1);
  const [orderStatusFilter, setOrderStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [orderServiceFilter, setOrderServiceFilter] = useState('all');
  const [orderSearchInput, setOrderSearchInput] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [managedOrderId, setManagedOrderId] = useState<string | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const [assignOrderId, setAssignOrderId] = useState('');
  const [assignOrders, setAssignOrders] = useState<Order[]>([]);
  const [assignOrdersLoading, setAssignOrdersLoading] = useState(false);
  const [assignOrderSearchInput, setAssignOrderSearchInput] = useState('');
  const [assignOrderSearch, setAssignOrderSearch] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);
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
  const normalizedTicketSearch = ticketSearch.trim().toLowerCase();
  const visibleTickets = tickets;
  const openTicketTotal = adminTicketPage.openTotal;
  const resolvedTicketTotal = adminTicketPage.resolvedTotal;
  const managedOrder = orderPage.items.find(order => order.id === managedOrderId) || null;
  const assignAccount = accountPage.items.find(account => account.id === assignTargetId) || null;
  const assignAccountServiceId = assignAccount?.serviceId || '';
  const assignAccountServiceTitle = assignAccount?.serviceTitle || '';
  const assignAccountVariantId = assignAccount?.variantId || '';
  const assignAccountVariantName = assignAccount?.variantName || '';
  const assignAccountStatus = assignAccount?.status;
  const accountFormService = services.find(service => service.id === accountServiceId);
  const accountFormVariants = accountFormService?.variants || [];
  const planEditorService = planEditor?.mode === 'service-add'
    ? services.find(service => service.id === planEditor.serviceId)
    : serviceDraft;
  const planEditorIsOffer = Boolean(planEditorService?.isOfferService);
  const planEditorIsPercent = planForm.paymentCurrency === 'percent';
  const defaultAccountVariantId = (service: Service | undefined, preferred?: string) => {
    if (preferred) return preferred;
    const variants = service?.variants || [];
    return variants.length === 1 ? variants[0].id : '';
  };

  // Ticket search: debounce only when search text is non-empty; instant on status/clear changes.
  useEffect(() => {
    if (!isAdmin || (adminTicketPage.status === ticketView && adminTicketPage.search === normalizedTicketSearch)) return;

    const delay = normalizedTicketSearch ? 350 : 0;
    const timeoutId = window.setTimeout(() => {
      void loadAdminTickets({ status: ticketView, page: 1, search: normalizedTicketSearch });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [adminTicketPage.search, adminTicketPage.status, isAdmin, loadAdminTickets, normalizedTicketSearch, ticketView]);

  // Orders table: fetch only the latest 10 records for the selected page and filters.
  useEffect(() => {
    if (!isAdmin || adminTab !== 'payments') return;
    let active = true;
    setOrdersTableLoading(true);
    setOrdersTableError(null);
    void listAdminOrdersAction({
      page: orderPageNumber,
      paymentStatus: orderStatusFilter,
      serviceTitle: orderServiceFilter,
      search: orderSearch,
    }).then(result => {
      if (!active) return;
      if (result.ok) {
        setOrderPage(result.data);
        setOrderPageNumber(prev => (prev === result.data.page ? prev : result.data.page));
      } else {
        setOrdersTableError(result.error);
      }
    }).catch(error => {
      if (active) setOrdersTableError(error instanceof Error ? error.message : 'Unable to load orders.');
    }).finally(() => {
      if (active) setOrdersTableLoading(false);
    });
    return () => { active = false; };
  }, [orderPageNumber, orderSearch, orderServiceFilter, orderStatusFilter, ordersRefreshKey, adminTab, isAdmin]);

  // Debounce the orders search input.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOrderSearch(orderSearchInput.trim());
      setOrderPageNumber(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [orderSearchInput]);
  // Inventory accounts table: fetch only the latest 10 records for the selected page and filters.
  useEffect(() => {
    if (!isAdmin || adminTab !== 'inventory') return;
    let active = true;
    setAccountsLoading(true);
    setAccountsError(null);
    void listAdminAccountsAction({
      page: accountPageNumber,
      serviceId: accountServiceFilter,
      status: accountStatusFilter,
      search: accountSearch,
    }).then(result => {
      if (!active) return;
      if (result.ok) {
        setAccountPage(result.data);
        setAccountPageNumber(prev => (prev === result.data.page ? prev : result.data.page));
      } else {
        setAccountsError(result.error);
      }
    }).catch(error => {
      if (active) setAccountsError(error instanceof Error ? error.message : 'Unable to load accounts.');
    }).finally(() => {
      if (active) setAccountsLoading(false);
    });
    return () => { active = false; };
  }, [accountPageNumber, accountSearch, accountServiceFilter, accountStatusFilter, accountsRefreshKey, adminTab, isAdmin]);

  // Debounce the accounts search input.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAccountSearch(accountSearchInput.trim());
      setAccountPageNumber(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [accountSearchInput]);

  // Load orders for the assign-order dialog, filtered by the account's service.
  useEffect(() => {
    if (!assignTargetId || !assignAccountServiceId || assignAccountStatus === 'assigned') {
      setAssignOrders([]);
      setAssignOrdersLoading(false);
      return;
    }
    let active = true;
    const delay = assignOrderSearch ? 300 : 0;
    const timeoutId = window.setTimeout(() => {
      setAssignOrdersLoading(true);
      setAssignError(null);
      void listAssignableOrdersAction({ serviceId: assignAccountServiceId, serviceTitle: assignAccountServiceTitle, variantId: assignAccountVariantId, variantName: assignAccountVariantName, search: assignOrderSearch }).then(result => {
        if (!active) return;
        if (result.ok) setAssignOrders(result.data);
        else setAssignError(result.error);
      }).catch(error => {
        if (active) setAssignError(error instanceof Error ? error.message : 'Unable to load orders.');
      }).finally(() => {
        if (active) setAssignOrdersLoading(false);
      });
    }, delay);
    return () => { active = false; window.clearTimeout(timeoutId); };
  }, [assignAccountServiceId, assignAccountServiceTitle, assignAccountVariantId, assignAccountVariantName, assignAccountStatus, assignOrderSearch, assignTargetId]);

  // Debounce the assign-order search input.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setAssignOrderSearch(assignOrderSearchInput.trim()), 350);
    return () => window.clearTimeout(timeoutId);
  }, [assignOrderSearchInput]);

  const assignOrderOptions = assignOrders.map(order => ({
    value: order.id,
    selectedLabel: `${order.id} · ${order.customerName}`,
    searchText: `${order.id} ${order.customerName}`,
    label: (
      <span className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
        <span className="font-mono-code truncate text-[var(--color-text-primary)]">{order.id}</span>
        <span className="truncate text-[var(--color-text-secondary)]">{order.customerName}</span>
        <span className={`text-[10px] font-semibold capitalize ${order.accountId ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}`}>{order.paymentStatus.replaceAll('_', ' ')}{order.accountId ? ' · account attached' : ''}</span>
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
        `${bullet} Email / Mobile: ${clean(credentials?.username)}`,
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
  const paymentStatusLabel = (status: PaymentStatus) => ({
    pending_payment: 'Pending payment',
    verification_pending: 'Verification pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[status]);
  const paymentStatusClass = (status: PaymentStatus) => ({
    pending_payment: 'bg-[var(--color-brand-violet)]/10 text-[var(--color-brand-violet)]',
    verification_pending: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
    completed: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    cancelled: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  }[status]);
  const runOrderAction = async (orderId: string, action: () => Promise<void>, fallback: string, actionKey = 'action') => {
    if (orderActionLoadingRef.current[orderId]) return false;
    orderActionLoadingRef.current[orderId] = actionKey;
    setOrderActionLoading(prev => ({ ...prev, [orderId]: actionKey }));
    try {
      await action();
      setOrderErrors(prev => ({ ...prev, [orderId]: '' }));
      setOrdersRefreshKey(prev => prev + 1);
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
  const openAssignDialog = (account: AccountCredential) => {
    setAssignTargetId(account.id);
    setAssignOrderId('');
    setAssignOrderSearchInput('');
    setAssignOrderSearch('');
    setAssignOrders([]);
    setAssignError(null);
  };

  const saveAccountOrder = async () => {
    if (!assignAccount || !assignOrderId || assignSaving) return;
    setAssignSaving(true);
    setAssignError(null);
    try {
      await attachAccountToOrder(assignAccount.id, assignOrderId);
      setAssignTargetId(null);
      setAssignOrderId('');
      setAccountsRefreshKey(prev => prev + 1);
      setOrdersRefreshKey(prev => prev + 1);
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Unable to assign order.');
    } finally {
      setAssignSaving(false);
    }
  };

  const unassignAccountOrder = async () => {
    if (!assignAccount || assignSaving) return;
    setAssignSaving(true);
    setAssignError(null);
    try {
      await unassignAccountFromOrder(assignAccount.id);
      setAssignTargetId(null);
      setAccountsRefreshKey(prev => prev + 1);
      setOrdersRefreshKey(prev => prev + 1);
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Unable to unassign order.');
    } finally {
      setAssignSaving(false);
    }
  };

  const openInventoryForOrder = (order: Order) => {
    const search = order.accountId ? order.id : '';
    setManagedOrderId(null);
    setAdminTab('inventory');
    setAccountPageNumber(1);
    setAccountServiceFilter(order.serviceId);
    setAccountStatusFilter(order.accountId ? 'all' : 'available');
    setAccountSearchInput(search);
    setAccountSearch(search);
  };

  const openOrdersForAccount = (orderId: string) => {
    setAssignTargetId(null);
    setAssignError(null);
    setAdminTab('payments');
    setOrderPageNumber(1);
    setOrderStatusFilter('all');
    setOrderServiceFilter('all');
    setOrderSearchInput(orderId);
    setOrderSearch(orderId);
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
    isOfferService: false,
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
    if (!planEditorIsOffer && (!planForm.validityValue || planForm.validityValue < 1)) {
      setInventoryError('Plan validity must be at least 1 day or month.');
      return;
    }
    if (planEditorIsPercent && (!planForm.ourPrice || planForm.ourPrice < 1 || planForm.ourPrice > 100)) {
      setInventoryError('Enter a discount percentage from 1 to 100.');
      return;
    }
    const ourPrice = planForm.ourPrice ?? 0;
    const variant: ServiceVariant = {
      ...planForm,
      id: planForm.id || `variant-${Date.now()}`,
      regularPrice: planEditorIsPercent ? 0 : ourPrice,
      resellerPrice: planEditorIsPercent ? 0 : ourPrice,
      originalPrice: planEditorIsPercent || planEditorIsOffer ? 0 : planForm.originalPrice || ourPrice,
      paymentCurrency: planForm.paymentCurrency || 'inr',
      isManualOrder: Boolean(planForm.isManualOrder),
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
    if (!serviceDraft.isOfferService && variants.some(variant => !variant.validityValue || variant.validityValue < 1)) {
      setInventoryError('Plan validity must be at least 1 day or month.');
      return;
    }
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

  const editAccount = (account: AccountCredential) => {
    setAccountForm({ accountId: account.id, username: account.username, password: account.password, pin: account.pin, profileName: account.profileName, createdAt: account.createdAt.slice(0, 10), expiresAt: account.expiresAt?.slice(0, 10), additionalInfo: account.additionalInfo });
    setAccountServiceId(account.serviceId);
    setAccountVariantId(defaultAccountVariantId(services.find(service => service.id === account.serviceId), account.variantId));
    setShowAccountForm(true);
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
    if (!service || !accountForm.username || !accountForm.createdAt || !accountForm.expiresAt) return;
    if (accountFormVariants.length > 0 && !accountVariantId) {
      setInventoryError('Select a plan for this account.');
      return;
    }
    if (!isValidAccountIdentifier(accountForm.username)) {
      setInventoryError('Enter a valid account email or mobile number.');
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
    const isNewAccount = !accountForm.accountId;
    try {
      setInventoryError(null);
      const accountPayload = { ...accountForm, variantId: accountVariantId || undefined };
      if (accountForm.accountId) await updateAccountCredential(accountForm.accountId, service, accountPayload);
      else await createAccountCredential(service, accountPayload);
      setAccountForm({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) });
      setShowAccountForm(false);
      if (isNewAccount) {
        setAccountServiceFilter('all');
        setAccountStatusFilter('all');
        setAccountSearchInput('');
        setAccountSearch('');
      }
      setAccountPageNumber(1);
      setAccountsRefreshKey(prev => prev + 1);
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
      setAccountToDelete(null);
      setAccountsRefreshKey(prev => prev + 1);
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

      {/* TAB 1: Orders */}
      {adminTab === 'payments' && (
        <div className="space-y-4">
          <div className="ws-panel p-4 space-y-4">
            <div>
              <h4 className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Orders</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">All orders, newest first, 10 records per page.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_190px] gap-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input value={orderSearchInput} onChange={event => setOrderSearchInput(event.target.value)} placeholder="Search order ID, customer, or account" aria-label="Search orders" className="w-full h-11 pl-10 pr-10 rounded-[12px] ws-input text-xs" />
                {orderSearchInput && (
                  <button type="button" onClick={() => setOrderSearchInput('')} aria-label="Clear order search" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-[8px] ws-chip flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <StyledDropdown value={orderServiceFilter} onChange={value => { setOrderServiceFilter(value); setOrderPageNumber(1); }} ariaLabel="Filter orders by service" options={[{ value: 'all', label: 'All services' }, ...orderPage.serviceTypes.map(title => ({ value: title, label: title }))]} buttonClassName="h-11 px-3.5 rounded-[12px] text-xs" />
              <StyledDropdown value={orderStatusFilter} onChange={value => { setOrderStatusFilter(value as PaymentStatus | 'all'); setOrderPageNumber(1); }} ariaLabel="Filter orders by payment status" options={[{ value: 'all', label: 'All statuses' }, { value: 'pending_payment', label: 'Pending payment' }, { value: 'verification_pending', label: 'Verification pending' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} buttonClassName="h-11 px-3.5 rounded-[12px] text-xs" />
            </div>

            {ordersTableError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{ordersTableError}</p>}

            <div className="overflow-x-auto rounded-[14px] border border-[var(--color-card-border)]">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="bg-[var(--color-canvas)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Order ID</th>
                    <th className="px-3 py-3 font-semibold">Service</th>
                    <th className="px-3 py-3 font-semibold">Customer</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Payment</th>
                    <th className="px-3 py-3 font-semibold">Delivery</th>
                    <th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersTableLoading && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--color-text-muted)]">Loading orders...</td></tr>
                  )}
                  {!ordersTableLoading && orderPage.items.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--color-text-muted)]">No orders match the current filters.</td></tr>
                  )}
                  {!ordersTableLoading && orderPage.items.map(order => (
                    <tr key={order.id} className="border-t border-[var(--color-card-border)] align-middle">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-code font-semibold text-[var(--color-text-primary)]">{order.id}</span>
                          <button type="button" onClick={() => void copyId(order.id)} aria-label={`Copy order ${order.id}`} className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0">{copiedId === order.id ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)]">{order.serviceTitle}{order.variantName ? ` · ${order.variantName}` : ''}</td>
                      <td className="px-3 py-3">
                        <span className="block font-semibold text-[var(--color-text-primary)]">{order.customerName}</span>
                        <span className="block font-mono-code text-[11px] text-[var(--color-text-muted)]">{order.contactMethod === 'whatsapp' ? order.customerWhatsapp : order.customerTelegram}</span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[var(--color-success)]">₹{order.pricePaid}</td>
                      <td className="px-3 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold ${paymentStatusClass(order.paymentStatus)}`}>{paymentStatusLabel(order.paymentStatus)}</span></td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)] capitalize">{order.deliveryStatus.replaceAll('_', ' ')}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <button type="button" onClick={() => { setOrderErrors(prev => ({ ...prev, [order.id]: '' })); setManagedOrderId(order.id); }} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-9 px-3 rounded-[10px] font-semibold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Manage</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--color-text-muted)]">Showing {orderPage.items.length === 0 ? 0 : (orderPage.page - 1) * orderPage.pageSize + 1}-{(orderPage.page - 1) * orderPage.pageSize + orderPage.items.length} of {orderPage.total} order{orderPage.total === 1 ? '' : 's'}</p>
              <PaginationControls page={orderPage.page} totalPages={orderPage.totalPages} onPageChange={setOrderPageNumber} disabled={ordersTableLoading} label="Orders" />
            </div>
          </div>

          {managedOrder && (
            <div className="fixed inset-0 z-[70] bg-[var(--color-shell)]/70 flex items-center justify-center p-4">
              <div role="dialog" aria-modal="true" aria-label={`Manage order ${managedOrder.id}`} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto ws-panel p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-code font-bold text-sm text-[var(--color-brand-violet)]">{managedOrder.id}</span>
                      <button type="button" onClick={() => void copyId(managedOrder.id)} aria-label="Copy order ID" title="Copy order ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">{copiedId === managedOrder.id ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}</button>
                    </div>
                    <h4 className="font-heading font-semibold text-base text-[var(--color-text-primary)]">{managedOrder.serviceTitle}{managedOrder.variantName ? ` · ${managedOrder.variantName}` : ''}</h4>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Placed {new Date(managedOrder.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${paymentStatusClass(managedOrder.paymentStatus)}`}>{paymentStatusLabel(managedOrder.paymentStatus)}</span>
                    <button type="button" onClick={() => setManagedOrderId(null)} aria-label="Close order details" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 ws-panel-muted">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">Customer</span>
                    <span className="font-semibold text-[var(--color-text-primary)] block">{managedOrder.customerName}</span>
                    <span className="text-[var(--color-reseller-indigo)] font-mono-code">{managedOrder.contactMethod === 'whatsapp' ? managedOrder.customerWhatsapp : managedOrder.customerTelegram}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block capitalize">Preferred: {managedOrder.contactMethod}</span>
                  </div>
                  <div className="p-3 ws-panel-muted">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">Payment</span>
                    <span className="font-semibold text-[var(--color-success)] block text-sm">₹{managedOrder.pricePaid}</span>
                    <span className="text-[var(--color-warning)] font-mono-code block">UTR: {managedOrder.utrNumber || 'Not provided'}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block capitalize">Role: {managedOrder.userRole} · Delivery: {managedOrder.deliveryStatus.replaceAll('_', ' ')}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs ${managedOrder.accountId ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5' : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-[10px] block ${managedOrder.accountId ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>Account assignment</span>
                      {managedOrder.accountId ? (
                        <>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <strong className="font-mono-code text-[var(--color-text-primary)]">{managedOrder.accountId}</strong>
                            <button type="button" onClick={() => void copyId(managedOrder.accountId!)} aria-label="Copy account ID" title="Copy account ID" className="w-7 h-7 rounded-[8px] ws-secondary-button flex items-center justify-center shrink-0">{copiedId === managedOrder.accountId ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}</button>
                          </div>
                          <span className="text-[var(--color-text-secondary)] block">{managedOrder.credentials?.username || 'Credentials attached'}</span>
                        </>
                      ) : <span className="text-[var(--color-text-secondary)]">No account assigned yet.</span>}
                    </div>
                    <button type="button" onClick={() => openInventoryForOrder(managedOrder)} className="h-9 px-3 rounded-[10px] border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] font-semibold inline-flex items-center gap-1.5 shrink-0"><Link2 className="w-3.5 h-3.5" /> Manage in Inventory</button>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Assign or unassign order IDs from the Inventory tab.</p>
                </div>

                {orderErrors[managedOrder.id] && <p role="alert" className="text-xs text-[var(--color-danger)]">{orderErrors[managedOrder.id]}</p>}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {managedOrder.customerTelegram && <button type="button" onClick={() => window.open(`https://t.me/${managedOrder.customerTelegram.replace(/^@/, '')}?text=${encodeURIComponent(accountMessage(managedOrder, 'telegram'))}`, '_blank', 'noopener,noreferrer')} aria-label="Message customer on Telegram" title="Message customer on Telegram" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">Telegram</span></button>}
                  {managedOrder.customerWhatsapp && <button type="button" onClick={() => window.open(`https://wa.me/${managedOrder.customerWhatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(accountMessage(managedOrder, 'whatsapp'))}`, '_blank', 'noopener,noreferrer')} aria-label="Message customer on WhatsApp" title="Message customer on WhatsApp" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button inline-flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline text-xs font-semibold">WhatsApp</span></button>}
                  {managedOrder.paymentStatus !== 'cancelled' && (
                    <StyledDropdown
                      value=""
                      onChange={value => { void runOrderAction(managedOrder.id, () => adminRejectOrder(managedOrder.id, value as 'payment' | 'stock'), 'Unable to reject order.', 'reject').then(ok => { if (ok) setManagedOrderId(null); }); }}
                      disabled={isOrderBusy(managedOrder.id)}
                      loading={orderActionLoading[managedOrder.id] === 'reject'}
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
                  )}
                  {managedOrder.paymentStatus === 'verification_pending' && (
                    <LoadingButton type="button" onClick={() => void runOrderAction(managedOrder.id, () => updateOrderFulfillment(managedOrder.id, true), 'Unable to mark order fulfilled.', 'fulfill').then(ok => { if (ok) setManagedOrderId(null); })} loading={orderActionLoading[managedOrder.id] === 'fulfill'} disabled={isOrderBusy(managedOrder.id)} aria-label="Mark order fulfilled" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-primary-button text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"><CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline">Mark fulfilled</span></LoadingButton>
                  )}
                  {managedOrder.paymentStatus === 'completed' && (
                    <LoadingButton type="button" onClick={() => void runOrderAction(managedOrder.id, () => updateOrderFulfillment(managedOrder.id, false), 'Unable to mark order pending.', 'pending').then(ok => { if (ok) setManagedOrderId(null); })} loading={orderActionLoading[managedOrder.id] === 'pending'} disabled={isOrderBusy(managedOrder.id)} aria-label="Mark order pending" className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-[12px] ws-secondary-button text-xs font-semibold inline-flex items-center justify-center gap-1.5"><Clock3 className="w-4 h-4" /><span className="hidden sm:inline">Mark pending</span></LoadingButton>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Inventory & Stock Manager */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">
          {inventoryError && !showAccountForm && <div className="p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">{inventoryError}</div>}

          <div className="ws-panel p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Stock Accounts</h4>
                <p className="text-[11px] text-[var(--color-text-muted)]">Combined account inventory. Newest accounts first, 10 records per page.</p>
              </div>
              <button onClick={() => { setAccountForm({ accountId: '', createdAt: new Date().toISOString().slice(0, 10) }); setAccountServiceId(''); setAccountVariantId(''); setShowAccountForm(true); }} className="ws-primary-button h-11 px-3.5 rounded-[12px] text-xs font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Store New Account</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_170px] gap-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input value={accountSearchInput} onChange={event => setAccountSearchInput(event.target.value)} placeholder="Search account ID, email, mobile, or order ID" aria-label="Search accounts" className="w-full h-11 pl-10 pr-10 rounded-[12px] ws-input text-xs" />
                {accountSearchInput && (
                  <button type="button" onClick={() => setAccountSearchInput('')} aria-label="Clear account search" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-[8px] ws-chip flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <StyledDropdown value={accountServiceFilter} onChange={value => { setAccountServiceFilter(value); setAccountPageNumber(1); }} ariaLabel="Filter accounts by service" options={[{ value: 'all', label: 'All services' }, ...services.map(service => ({ value: service.id, label: service.title }))]} buttonClassName="h-11 px-3.5 rounded-[12px] text-xs" />
              <StyledDropdown value={accountStatusFilter} onChange={value => { setAccountStatusFilter(value as 'all' | 'available' | 'assigned'); setAccountPageNumber(1); }} ariaLabel="Filter accounts by status" options={[{ value: 'all', label: 'All statuses' }, { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }]} buttonClassName="h-11 px-3.5 rounded-[12px] text-xs" />
            </div>

            {accountsError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{accountsError}</p>}

            <div className="overflow-x-auto rounded-[14px] border border-[var(--color-card-border)]">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="bg-[var(--color-canvas)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Account ID</th>
                    <th className="px-3 py-3 font-semibold">Service</th>
                    <th className="px-3 py-3 font-semibold">Email / Mobile</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Order</th>
                    <th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsLoading && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--color-text-muted)]">Loading accounts...</td></tr>
                  )}
                  {!accountsLoading && accountPage.items.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--color-text-muted)]">No accounts match the current filters.</td></tr>
                  )}
                  {!accountsLoading && accountPage.items.map(account => (
                    <tr key={account.id} className="border-t border-[var(--color-card-border)] align-middle">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-code font-semibold text-[var(--color-text-primary)]">{account.id}</span>
                          <button type="button" onClick={() => void copyAccountId(account.id)} aria-label={`Copy account ${account.id}`} className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0">{copiedId === account.id ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)]">{account.serviceTitle || '-'}{account.variantName ? ` · ${account.variantName}` : ''}</td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)]">{account.username || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold capitalize ${account.status === 'assigned' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-[var(--color-success)]/10 text-[var(--color-success)]'}`}>{account.status}</span>
                          {isAccountExpired(account) && <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--color-danger)]/10 text-[var(--color-danger)]">Expired</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {account.assignedOrderId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-code text-[var(--color-text-primary)]">{account.assignedOrderId}</span>
                            <button type="button" onClick={() => void copyId(account.assignedOrderId!)} aria-label={`Copy assigned order ${account.assignedOrderId}`} className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0">{copiedId === account.assignedOrderId ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                          </div>
                        ) : <span className="text-[var(--color-text-muted)]">-</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" disabled={account.status !== 'assigned' && isAccountExpired(account)} onClick={() => openAssignDialog(account)} title={account.status !== 'assigned' && isAccountExpired(account) ? 'Expired accounts cannot be assigned to orders.' : undefined} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-9 px-3 rounded-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><Link2 className="w-3.5 h-3.5" /> {account.status === 'assigned' ? 'Manage' : 'Assign'}</button>
                          <button type="button" onClick={() => editAccount(account)} className="border border-[var(--color-brand-violet)]/40 text-[var(--color-brand-violet)] h-9 px-3 rounded-[10px] font-semibold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                          <button type="button" disabled={account.status === 'assigned'} onClick={() => setAccountToDelete(account.id)} className="border border-[var(--color-danger)]/40 text-[var(--color-danger)] h-9 px-3 rounded-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--color-text-muted)]">Showing {accountPage.items.length === 0 ? 0 : (accountPage.page - 1) * accountPage.pageSize + 1}-{(accountPage.page - 1) * accountPage.pageSize + accountPage.items.length} of {accountPage.total} record{accountPage.total === 1 ? '' : 's'}</p>
              <PaginationControls page={accountPage.page} totalPages={accountPage.totalPages} onPageChange={setAccountPageNumber} disabled={accountsLoading} label="Accounts" />
            </div>
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
                  <StyledDropdown className="sm:col-span-2" value={accountServiceId} onChange={value => { setAccountServiceId(value); setAccountVariantId(defaultAccountVariantId(services.find(service => service.id === value))); }} placeholder="Service type" ariaLabel="Service type" options={services.map(service => ({ value: service.id, label: service.title }))} buttonClassName="h-12 px-3.5 rounded-[14px] text-xs" />
                  {accountFormVariants.length > 0 && (
                    <StyledDropdown className="sm:col-span-2" value={accountVariantId} onChange={setAccountVariantId} placeholder="Plan" ariaLabel="Plan" options={accountFormVariants.map(variant => ({ value: variant.id, label: variant.name }))} buttonClassName="h-12 px-3.5 rounded-[14px] text-xs" />
                  )}
                  <input type="text" inputMode="text" maxLength={254} value={accountForm.username || ''} onChange={event => setAccountForm(prev => ({ ...prev, username: event.target.value.replace(/\s/g, '').slice(0, 254) }))} title="Enter a valid account email or mobile number." placeholder="Account email or mobile number" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.password || ''} onChange={event => setAccountForm(prev => ({ ...prev, password: event.target.value }))} placeholder="Account password (optional)" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input type="date" required value={accountForm.createdAt || ''} onChange={event => setAccountForm(prev => ({ ...prev, createdAt: event.target.value }))} aria-label="Created date" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input type="date" required value={accountForm.expiresAt || ''} onChange={event => setAccountForm(prev => ({ ...prev, expiresAt: event.target.value }))} aria-label="Expiry date" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.profileName || ''} onChange={event => setAccountForm(prev => ({ ...prev, profileName: event.target.value }))} placeholder="Profile name (optional)" className="h-12 px-3.5 rounded-[14px] ws-input" />
                  <input value={accountForm.pin || ''} onChange={event => setAccountForm(prev => ({ ...prev, pin: event.target.value }))} placeholder="PIN (optional)" className="h-12 px-3.5 rounded-[14px] ws-input" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAccountForm(false)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button>
                  <LoadingButton type="button" onClick={() => void saveAccount()} loading={accountSaving} loadingLabel="Saving..." disabled={!accountServiceId || (accountFormVariants.length > 0 && !accountVariantId) || !accountForm.username || !accountForm.createdAt || !accountForm.expiresAt} className="ws-primary-button h-11 px-4 rounded-[12px] text-xs font-semibold disabled:opacity-50">Save Account</LoadingButton>
                </div>
              </div>
            </div>
          )}

          {assignAccount && (
            <div className="fixed inset-0 z-[72] bg-[var(--color-shell)]/70 flex items-center justify-center p-4">
              <div role="dialog" aria-modal="true" aria-label={`Assign order to account ${assignAccount.id}`} className="w-full max-w-xl ws-panel p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{assignAccount.status === 'assigned' ? 'Manage assignment' : 'Assign order'}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono-code text-xs font-semibold text-[var(--color-brand-violet)]">{assignAccount.id}</span>
                      <button type="button" onClick={() => void copyId(assignAccount.id)} aria-label={`Copy account ${assignAccount.id}`} className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0">{copiedId === assignAccount.id ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{assignAccount.serviceTitle || 'No service'}{assignAccount.variantName ? ` · ${assignAccount.variantName}` : ''} · {assignAccount.username || 'No identifier'}</p>
                  </div>
                  <button type="button" onClick={() => { setAssignTargetId(null); setAssignError(null); }} aria-label="Close assignment dialog" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
                </div>

                {assignAccount.status === 'assigned' && assignAccount.assignedOrderId ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-xs">
                      <span className="text-[10px] text-[var(--color-success)] block">Assigned order</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <strong className="font-mono-code text-[var(--color-text-primary)]">{assignAccount.assignedOrderId}</strong>
                        <button type="button" onClick={() => void copyId(assignAccount.assignedOrderId!)} aria-label={`Copy assigned order ${assignAccount.assignedOrderId}`} className="ws-chip w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0">{copiedId === assignAccount.assignedOrderId ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      </div>
                      <span className="text-[var(--color-text-secondary)] block mt-1">Unassign this order before assigning a different one.</span>
                    </div>
                    {assignError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{assignError}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => openOrdersForAccount(assignAccount.assignedOrderId!)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold mr-auto">View order</button>
                      <button type="button" onClick={() => { setAssignTargetId(null); setAssignError(null); }} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Close</button>
                      <LoadingButton type="button" onClick={() => void unassignAccountOrder()} loading={assignSaving} loadingLabel="Unassigning..." className="h-11 px-4 rounded-[12px] border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-xs font-semibold">Unassign order</LoadingButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                      <input value={assignOrderSearchInput} onChange={event => { setAssignOrderSearchInput(event.target.value); setAssignOrderId(''); setAssignError(null); }} placeholder="Search order ID or customer" aria-label="Search orders for assignment" className="w-full h-11 pl-10 pr-3.5 rounded-[12px] ws-input text-xs" />
                    </div>
                    <StyledDropdown
                      value={assignOrderId}
                      onChange={value => { setAssignOrderId(value); setAssignError(null); }}
                      options={assignOrderOptions}
                      placeholder="Select an order"
                      disabled={assignOrdersLoading}
                      loading={assignOrdersLoading}
                      ariaLabel="Select order to assign"
                      buttonClassName="rounded-[12px] text-xs"
                    />
                    <p className="text-[10px] text-[var(--color-text-muted)]">Showing up to 25 active orders for {assignAccount.serviceTitle || 'this service'}{assignAccount.variantName ? ` · ${assignAccount.variantName}` : ''}. Search by order ID or customer to narrow the list.</p>
                    {assignError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{assignError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setAssignTargetId(null); setAssignError(null); }} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button>
                      <LoadingButton type="button" onClick={() => void saveAccountOrder()} loading={assignSaving} loadingLabel="Assigning..." disabled={!assignOrderId || assignOrdersLoading} className="ws-primary-button h-11 px-4 rounded-[12px] text-xs font-semibold disabled:opacity-50">Assign account</LoadingButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {serviceToDelete && <div className="fixed inset-0 z-[70] bg-[var(--color-shell)]/70 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm ws-panel p-5 space-y-4"><h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Delete service?</h4><p className="text-xs text-[var(--color-text-secondary)]">Remove <strong>{serviceToDelete.title}</strong> from the catalog and service management? Services with stored accounts or past orders are hidden instead of deleted.</p>{serviceDeleteError && <p role="alert" className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-2.5 text-xs text-[var(--color-danger)]">{serviceDeleteError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => { setServiceToDelete(null); setServiceDeleteError(null); }} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button><LoadingButton type="button" onClick={() => void confirmDeleteService()} loading={serviceDeleting} loadingLabel="Deleting..." className="h-11 px-4 rounded-[12px] border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-xs font-semibold inline-flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete service</LoadingButton></div></div></div>}
          {accountToDelete && <div className="fixed inset-0 z-[70] bg-[var(--color-shell)]/70 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm ws-panel p-5 space-y-4"><h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Delete stored account?</h4><p className="text-xs text-[var(--color-text-secondary)]">This will permanently remove account <span className="font-mono-code font-semibold">{accountToDelete}</span> from inventory.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setAccountToDelete(null)} className="h-11 px-4 rounded-[12px] ws-secondary-button text-xs font-semibold">Cancel</button><LoadingButton type="button" onClick={() => void confirmDeleteAccount()} loading={accountDeleting} loadingLabel="Deleting..." className="h-11 px-4 rounded-[12px] border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-xs font-semibold">Delete account</LoadingButton></div></div></div>}
          <div className="flex items-center justify-between gap-3 pt-3"><h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Services</h3><button onClick={() => openServiceForm()} className="ws-primary-button h-11 px-4 rounded-[14px] text-[13px] font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Service</button></div>
          {showServiceForm && serviceDraft && (
            <div className="ws-panel p-5 space-y-4 border border-[var(--color-brand-violet)]/30">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-base text-[var(--color-text-primary)]">{services.some(service => service.id === serviceDraft.id) ? 'Edit service' : 'New service'}</h4>
                <button onClick={() => setShowServiceForm(false)} aria-label="Close service form" className="w-10 h-10 rounded-[12px] ws-secondary-button flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">OTT service name</label>
                  <input value={serviceDraft.title} onChange={e => updateDraft('title', e.target.value)} placeholder="e.g. Netflix Premium" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Image URL</label>
                  <input type="url" value={serviceDraft.logoUrl || ''} onChange={e => updateDraft('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Service type</label>
                  <StyledDropdown
                    value={serviceDraft.isOfferService ? 'offer' : 'regular'}
                    onChange={value => updateDraft('isOfferService', value === 'offer')}
                    ariaLabel="Service type"
                    options={[{ value: 'regular', label: 'Regular service' }, { value: 'offer', label: 'Offer service — hide validity and original price' }]}
                    buttonClassName="h-12 px-3.5 rounded-[14px] text-xs"
                  />
                </div>
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
                        {planPriceLabel(variant)}
                        {showPlanValidity(serviceDraft) ? ` • ${variant.validityValue} ${variant.validityUnit}` : ''}
                        {variant.isManualOrder ? ' • Manual order' : ''}
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
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Payment currency</label>
                    <StyledDropdown
                      value={planForm.paymentCurrency || 'inr'}
                      onChange={value => updatePlanForm('paymentCurrency', value as ServiceVariant['paymentCurrency'])}
                      ariaLabel="Payment currency"
                      options={[{ value: 'inr', label: 'INR (₹)' }, { value: 'percent', label: 'Percentage (%)' }]}
                      buttonClassName="h-12 px-3.5 rounded-[14px] text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2.5 h-12 mt-[22px] px-3.5 rounded-[14px] border border-[var(--color-card-border)] cursor-pointer text-[11px] text-[var(--color-text-secondary)]">
                    <input type="checkbox" checked={Boolean(planForm.isManualOrder)} onChange={event => updatePlanForm('isManualOrder', event.target.checked)} className="w-4 h-4 accent-[var(--color-brand-violet)]" />
                    Manual order
                  </label>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">{planEditorIsPercent ? 'Discount (%)' : 'Price (₹)'}</label>
                    <input type="number" min={planEditorIsPercent ? '1' : '0'} max={planEditorIsPercent ? '100' : undefined} value={numberInputValue(planForm.ourPrice)} onChange={e => updatePlanForm('ourPrice', Number(e.target.value) || 0)} placeholder={planEditorIsPercent ? '20' : '499'} className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                  </div>
                  {!planEditorIsPercent && !planEditorIsOffer && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Original price (₹)</label>
                      <input type="number" min="0" value={numberInputValue(planForm.originalPrice)} onChange={e => updatePlanForm('originalPrice', Number(e.target.value) || 0)} placeholder="799" className="w-full h-12 px-3.5 rounded-[14px] ws-input" />
                    </div>
                  )}
                  {!planEditorIsOffer && (
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5">Validity</label>
                      <div className="flex gap-2">
                        <input type="number" min="1" value={numberInputValue(planForm.validityValue)} onChange={e => updatePlanForm('validityValue', Number(e.target.value) || 0)} placeholder="30" className="min-w-0 flex-1 h-12 px-3.5 rounded-[14px] ws-input" />
                        <StyledDropdown className="w-28 shrink-0" value={planForm.validityUnit || 'days'} onChange={value => updatePlanForm('validityUnit', value as ServiceVariant['validityUnit'])} ariaLabel="Plan validity unit" options={[{ value: 'days', label: 'Days' }, { value: 'months', label: 'Months' }]} buttonClassName="h-12 px-3.5 rounded-[14px] text-xs" />
                      </div>
                    </div>
                  )}
                  {planEditorIsPercent && (
                    <p className="col-span-2 text-[11px] text-[var(--color-text-muted)]">Percentage plans show “{planForm.ourPrice || 0}% OFF” and use the Book your order Telegram button.</p>
                  )}
                  {planForm.isManualOrder && !planEditorIsPercent && (
                    <p className="col-span-2 text-[11px] text-[var(--color-text-muted)]">Manual orders use the Book your order Telegram button instead of UPI checkout.</p>
                  )}
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
                      {planPriceLabel(service.variants?.[0]) || `₹${service.ourPrice ?? service.regularPrice}`}
                      {!service.isOfferService && service.variants?.[0]?.paymentCurrency !== 'percent' && service.originalPrice ? ` (was ₹${service.originalPrice})` : ''}
                      {service.isOfferService
                        ? ' • Offer service'
                        : ` • ${service.variantMode === 'multiple' ? `${(service.variants || []).length} plans` : `${service.validityValue} ${service.validityUnit}`}`}
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
