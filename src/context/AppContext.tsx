'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserRole,
  UserProfile,
  AccountCredential,
  AdminOrderPage,
  AdminTicketPage,
  Credentials,
  Service,
  Order,
  Ticket,
  ServiceCategory,
} from '@/types';
import {
  attachAccountToOrderAction,
  unassignAccountFromOrderAction,
  createOrderAction,
  createAccountCredentialAction,
  createTicketAction,
  deleteServiceAction,
  deleteAccountCredentialAction,
  updateOrderFulfillmentAction,
  updateAccountCredentialAction,
  getBootstrapDataAction,
  listAdminDashboardAction,
  listAdminFulfilledOrdersAction,
  listAdminTicketsAction,
  listAccountCredentialsAction,
  searchAccountCredentialsAction,
  loginAction,
  logoutAction,
  rejectOrderAction,
  resolveTicketAction,
  upsertServiceAction,
} from '@/app/actions/backend';
import { buildTelegramBookingUrl, requiresTelegramBooking } from '@/lib/planBooking';

export type MobileTab = 'home' | 'catalog' | 'support' | 'admin';
export type AdminTab = 'overview' | 'payments' | 'inventory' | 'tickets';
const ADMIN_TABS: AdminTab[] = ['overview', 'payments', 'inventory', 'tickets'];

interface OrderContactDetails {
  customerName: string;
  customerTelegram: string;
  customerWhatsapp: string;
  contactMethod: 'telegram' | 'whatsapp';
}

interface AppContextType {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  currentRole: UserRole;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  authError: string | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  services: Service[];
  accountCredentials: AccountCredential[];
  orders: Order[];
  tickets: Ticket[];
  adminTicketPage: AdminTicketPage;
  adminTicketsLoading: boolean;
  adminTicketError: string | null;
  loadAdminTickets: (input: { status: 'open' | 'resolved'; page?: number; search?: string }) => Promise<void>;
  adminFulfilledOrderPage: AdminOrderPage;
  adminFulfilledOrdersLoading: boolean;
  adminFulfilledOrdersError: string | null;
  loadAdminFulfilledOrders: (input: { page?: number; serviceTitle?: string; search?: string }) => Promise<void>;

  selectedCategory: ServiceCategory;
  setSelectedCategory: (cat: ServiceCategory) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  checkoutService: Service | null;
  checkoutVariantId: string | null;
  openCheckout: (service: Service, variantId?: string) => void;
  closeCheckout: () => void;

  placeOrder: (service: Service, variantId: string | undefined, contact: OrderContactDetails, utrNumber: string) => Promise<Order>;
  adminRejectOrder: (orderId: string, reason?: 'payment' | 'stock') => Promise<void>;

  resolveTicket: (ticketId: string, adminNote?: string) => Promise<void>;
  createTicket: (orderId: string, description: string) => Promise<void>;

  saveService: (service: Service) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<void>;
  createAccountCredential: (service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => Promise<void>;
  updateAccountCredential: (accountId: string, service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => Promise<void>;
  deleteAccountCredential: (accountId: string) => Promise<void>;
  searchAccountCredentials: (serviceId: string, query: string) => Promise<AccountCredential[]>;
  attachAccountToOrder: (accountId: string, orderId: string) => Promise<void>;
  unassignAccountFromOrder: (accountId: string) => Promise<void>;
  updateOrderFulfillment: (orderId: string, fulfilled: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const subscribeToTabStorage = (key: string, onChange: () => void) => {
  const handleStorage = (event: StorageEvent) => { if (event.key === key) onChange(); };
  window.addEventListener('storage', handleStorage);
  window.addEventListener('webscribe-tab-change', onChange);
  return () => { window.removeEventListener('storage', handleStorage); window.removeEventListener('webscribe-tab-change', onChange); };
};

const readStoredTab = (key: string, fallback: string) => typeof window === 'undefined' ? fallback : window.localStorage.getItem(key) || fallback;

const MOBILE_TABS: MobileTab[] = ['home', 'catalog', 'support', 'admin'];

const readStoredMobileTab = () => {
  const stored = readStoredTab('webscribe-active-tab', 'home') as MobileTab;
  return MOBILE_TABS.includes(stored) ? stored : 'home';
};

const emptyAdminFulfilledOrderPage = (total = 0): AdminOrderPage => ({
  items: [],
  page: 1,
  pageSize: 10,
  total,
  totalPages: Math.max(1, Math.ceil(total / 10)),
  serviceTitle: 'all',
  serviceTypes: [],
  search: '',
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const activeTabState = useSyncExternalStore<MobileTab>(
    onChange => subscribeToTabStorage('webscribe-active-tab', onChange),
    () => readStoredMobileTab(),
    () => 'home',
  );
  const adminTab = useSyncExternalStore<AdminTab>(
    onChange => subscribeToTabStorage('webscribe-admin-tab', onChange),
    () => {
      const stored = readStoredTab('webscribe-admin-tab', 'overview') as AdminTab;
      return ADMIN_TABS.includes(stored) ? stored : 'overview';
    },
    () => 'overview',
  );

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [accountCredentials, setAccountCredentials] = useState<AccountCredential[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [adminTicketPage, setAdminTicketPage] = useState<AdminTicketPage>({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    status: 'open',
    search: '',
    openTotal: 0,
    resolvedTotal: 0,
  });
  const [adminTicketsLoading, setAdminTicketsLoading] = useState(false);
  const [adminTicketError, setAdminTicketError] = useState<string | null>(null);
  const adminTicketRequestRef = useRef(0);
  const adminTicketQueryRef = useRef<{ status: 'open' | 'resolved'; page?: number; search?: string }>({ status: 'open', page: 1, search: '' });
  const [adminFulfilledOrderPage, setAdminFulfilledOrderPage] = useState<AdminOrderPage>(() => emptyAdminFulfilledOrderPage());
  const [adminFulfilledOrdersLoading, setAdminFulfilledOrdersLoading] = useState(false);
  const [adminFulfilledOrdersError, setAdminFulfilledOrdersError] = useState<string | null>(null);
  const adminFulfilledOrderRequestRef = useRef(0);
  const adminFulfilledOrderQueryRef = useRef<{ page?: number; serviceTitle?: string; search?: string }>({ page: 1, serviceTitle: 'all', search: '' });

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [checkoutService, setCheckoutService] = useState<Service | null>(null);
  const [checkoutVariantId, setCheckoutVariantId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const currentRole: UserRole = isAdmin ? 'admin' : currentUser?.role || 'customer';
  const isAuthenticated = currentUser !== null;

  const loadAdminTickets = useCallback(async (input: { status: 'open' | 'resolved'; page?: number; search?: string }) => {
    const requestId = adminTicketRequestRef.current + 1;
    adminTicketRequestRef.current = requestId;
    const query = { ...input, page: input.page || 1, search: input.search || '' };
    adminTicketQueryRef.current = query;
    setAdminTicketsLoading(true);
    setAdminTicketError(null);

    const result = await listAdminTicketsAction(query);
    if (requestId !== adminTicketRequestRef.current) return;

    if (result.ok) {
      setTickets(result.data.items);
      setAdminTicketPage(result.data);
    } else {
      setAdminTicketError(result.error);
    }
    setAdminTicketsLoading(false);
  }, []);

  const loadAdminFulfilledOrders = useCallback(async (input: { page?: number; serviceTitle?: string; search?: string }) => {
    const requestId = adminFulfilledOrderRequestRef.current + 1;
    adminFulfilledOrderRequestRef.current = requestId;
    const query = { ...input, page: input.page || 1, serviceTitle: input.serviceTitle || 'all', search: input.search ?? '' };
    adminFulfilledOrderQueryRef.current = query;
    setAdminFulfilledOrdersLoading(true);
    setAdminFulfilledOrdersError(null);

    const result = await listAdminFulfilledOrdersAction(query);
    if (requestId !== adminFulfilledOrderRequestRef.current) return;

    if (result.ok) {
      setAdminFulfilledOrderPage(result.data);
    } else {
      setAdminFulfilledOrdersError(result.error);
    }
    setAdminFulfilledOrdersLoading(false);
  }, []);

  const refreshAdminData = useCallback(async (adminEmail = currentUser?.email) => {
    if (!adminEmail) return;

    const result = await listAdminDashboardAction();
    if (!result.ok || !result.data) return;

    const dashboard = result.data;
    setOrders(dashboard.orders);
    await loadAdminTickets({ status: 'open', page: 1, search: '' });
    setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage(dashboard.fulfilledTotal));
    setAdminFulfilledOrdersError(null);
    setServices(dashboard.services);
    const accounts = await listAccountCredentialsAction();
    if (accounts.ok) setAccountCredentials(accounts.data);
  }, [currentUser?.email, loadAdminTickets]);

  useEffect(() => {
    const loadBootstrap = async () => {
      const result = await getBootstrapDataAction();
      if (!result.ok) return;
      const userFromSession = result.data.profile ? { ...result.data.profile, password: '' } : null;
      setServices(result.data.services);
      setOrders(result.data.orders);
      setTickets(result.data.tickets);
      setAccountCredentials(result.data.accounts);
      setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage(result.data.fulfilledTotal));
      if (!userFromSession) return;

      setCurrentUser(userFromSession);
      await loadAdminTickets({ status: 'open', page: 1, search: '' });
      if (window.location.pathname !== '/admin') router.replace('/admin');
    };

    void loadBootstrap().finally(() => {
      setAuthLoading(false);
    });
  }, [loadAdminTickets, router]);


  const openAuthModal = () => {
    setAuthError(null);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthError(null);
  };

  const setActiveTab = (tab: MobileTab) => {
    if (tab === 'admin' && !isAdmin) {
      openAuthModal();
      return;
    }
    window.localStorage.setItem('webscribe-active-tab', tab);
    window.dispatchEvent(new Event('webscribe-tab-change'));
  };

  const setAdminTab = (tab: AdminTab) => {
    window.localStorage.setItem('webscribe-admin-tab', tab);
    window.dispatchEvent(new Event('webscribe-tab-change'));
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);

    const loginResult = await loginAction({ email: normalizedEmail, password });
    if (loginResult.ok) {
      const userFromDatabase = { ...loginResult.data, password: '' };
      setOrders([]);
      setTickets([]);
      setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage());
      setCurrentUser(userFromDatabase);
      closeAuthModal();
      if (window.location.pathname !== '/admin') router.push('/admin');
      void refreshAdminData(userFromDatabase.email);
      return true;
    }

    setAuthError(loginResult.error);
    return false;
  };

  const logout = async () => {
    const wasAdmin = isAdmin;
    await logoutAction();
    setCurrentUser(null);
    setOrders([]);
    setTickets([]);
    setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage());
    setCheckoutService(null);
    if (activeTabState === 'admin') setActiveTab('home');
    if (wasAdmin && window.location.pathname === '/admin') router.push('/');
  };

  const openCheckout = (service: Service, variantId?: string) => {
    const variant = variantId
      ? (service.variants || []).find(item => item.id === variantId)
      : (service.variants || [])[0];
    if (requiresTelegramBooking(variant)) {
      window.open(buildTelegramBookingUrl(service, variant, currentRole === 'reseller'), '_blank', 'noopener,noreferrer');
      return;
    }
    setCheckoutService(service);
    setCheckoutVariantId(variantId ?? null);
  };

  const closeCheckout = () => {
    setCheckoutService(null);
    setCheckoutVariantId(null);
  };

  const placeOrder = async (service: Service, variantId: string | undefined, contact: OrderContactDetails, utrNumber: string): Promise<Order> => {
    const backendOrder = await createOrderAction({
      serviceId: service.id,
      variantId: (service.variants || []).length > 0 ? variantId : undefined,
      customerName: contact.customerName,
      customerTelegram: contact.customerTelegram,
      customerWhatsapp: contact.customerWhatsapp,
      contactMethod: contact.contactMethod,
      utrNumber,
    });

    if (backendOrder.ok) return backendOrder.data;
    throw new Error(backendOrder.error);
  };

  const adminRejectOrder = async (orderId: string, reason: 'payment' | 'stock' = 'payment') => {
    if (!isAdmin) return;
    if (currentUser?.email) {
      const backendOrder = await rejectOrderAction({
        adminEmail: currentUser.email,
        orderId,
        reason,
      });

      if (backendOrder.ok) {
        setOrders(prev => prev.map(ord => (ord.id === orderId ? backendOrder.data : ord)));
        return;
      }
      throw new Error(backendOrder.error);
    }
    throw new Error('Authentication required.');
  };

  const createTicket = async (orderId: string, description: string) => {
    const result = await createTicketAction({ orderId, description });
    if (!result.ok) throw new Error(result.error);
    setTickets(prev => [result.data, ...prev]);
  };

  const resolveTicket = async (ticketId: string, adminNote?: string) => {
    if (!isAdmin) return;
    if (currentUser?.email) {
      const backendTicket = await resolveTicketAction({
        adminEmail: currentUser.email,
        ticketId,
        adminNote,
      });

      if (backendTicket.ok) {
        setTickets(prev => prev.map(t => (t.id === ticketId ? backendTicket.data : t)));
        void loadAdminTickets(adminTicketQueryRef.current);
        return;
      }
      throw new Error(backendTicket.error);
    }
    throw new Error('Authentication required.');
  };

  const saveService = async (service: Service) => {
    if (!isAdmin || !currentUser?.email) throw new Error('Admin access required.');
    const result = await upsertServiceAction({ adminEmail: currentUser.email, service });
    if (!result.ok) throw new Error(result.error);
    setServices(prev => [result.data, ...prev.filter(item => item.id !== result.data.id)]);
    return result.data;
  };

  const deleteService = async (serviceId: string) => {
    const result = await deleteServiceAction(serviceId);
    if (!result.ok) throw new Error(result.error);
    setServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const createAccountCredential = async (service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string; variantId?: string }) => {
    const result = await createAccountCredentialAction({ serviceId: service.id, serviceTitle: service.title, credentials });
    if (!result.ok) throw new Error(result.error);
    setAccountCredentials(prev => [result.data, ...prev]);
  };

  const updateAccountCredential = async (accountId: string, service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string; variantId?: string }) => {
    const result = await updateAccountCredentialAction({ accountId, serviceId: service.id, serviceTitle: service.title, credentials });
    if (!result.ok) throw new Error(result.error);
    setAccountCredentials(prev => prev.map(account => account.id === accountId ? result.data : account));
  };

  const deleteAccountCredential = async (accountId: string) => {
    const result = await deleteAccountCredentialAction(accountId);
    if (!result.ok) throw new Error(result.error);
    setAccountCredentials(prev => prev.filter(account => account.id !== accountId));
  };

  const searchAccountCredentials = async (serviceId: string, query: string) => {
    const result = await searchAccountCredentialsAction({ serviceId, query });
    if (!result.ok) throw new Error(result.error);
    setAccountCredentials(prev => [
      ...result.data,
      ...prev.filter(account => !result.data.some(found => found.id === account.id)),
    ]);
    return result.data;
  };

  const attachAccountToOrder = async (accountId: string, orderId: string) => {
    const result = await attachAccountToOrderAction({ accountId, orderId });
    if (!result.ok) throw new Error(result.error);
    setOrders(prev => prev.map(order => order.id === orderId ? result.data : order));
    setAdminFulfilledOrderPage(prev => ({
      ...prev,
      items: prev.items.map(order => order.id === orderId ? result.data : order),
    }));
    setAccountCredentials(prev => prev.map(account => account.id === accountId ? { ...account, status: 'assigned' as const, assignedOrderId: orderId } : account).map(account => account.assignedOrderId === orderId && account.id !== accountId ? { ...account, status: 'available' as const, assignedOrderId: undefined } : account));
  };

  const unassignAccountFromOrder = async (accountId: string) => {
    const result = await unassignAccountFromOrderAction({ accountId });
    if (!result.ok) throw new Error(result.error);
    const updatedAccount = result.data.account;
    const updatedOrder = result.data.order;
    setAccountCredentials(prev => prev.some(account => account.id === accountId)
      ? prev.map(account => account.id === accountId ? updatedAccount : account)
      : [...prev, updatedAccount]);
    if (updatedOrder) {
      setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
      setAdminFulfilledOrderPage(prev => ({
        ...prev,
        items: prev.items.map(order => order.id === updatedOrder.id ? updatedOrder : order),
      }));
    }
  };

  const updateOrderFulfillment = async (orderId: string, fulfilled: boolean) => {
    const result = await updateOrderFulfillmentAction({ orderId, fulfilled });
    if (!result.ok) throw new Error(result.error);
    if (isAdmin) {
      setOrders(prev => fulfilled
        ? prev.filter(order => order.id !== orderId)
        : [result.data, ...prev.filter(order => order.id !== orderId)]);
      void loadAdminFulfilledOrders(adminFulfilledOrderQueryRef.current);
      return;
    }
    setOrders(prev => prev.map(order => order.id === orderId ? result.data : order));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab: activeTabState,
        setActiveTab,
        adminTab,
        setAdminTab,
        currentRole,
        currentUser,
        isAuthenticated,
        authLoading,
        isAdmin,
        authModalOpen,
        authError,
        openAuthModal,
        closeAuthModal,
        login,
        logout,
        services,
        accountCredentials,
        orders,
        tickets,
        adminTicketPage,
        adminTicketsLoading,
        adminTicketError,
        loadAdminTickets,
        adminFulfilledOrderPage,
        adminFulfilledOrdersLoading,
        adminFulfilledOrdersError,
        loadAdminFulfilledOrders,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        checkoutService,
        checkoutVariantId,
        openCheckout,
        closeCheckout,
        placeOrder,
        adminRejectOrder,
        createTicket,
        resolveTicket,
        saveService,
        deleteService,
        createAccountCredential,
        updateAccountCredential,
        deleteAccountCredential,
        searchAccountCredentials,
        attachAccountToOrder,
        unassignAccountFromOrder,
        updateOrderFulfillment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
