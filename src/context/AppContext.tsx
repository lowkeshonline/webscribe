'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserRole,
  UserProfile,
  AccountCredential,
  AdminOrderPage,
  AdminTicketPage,
  CustomerOrderPage,
  CustomerTicketPage,
  Credentials,
  Service,
  Order,
  Ticket,
  ServiceCategory,
} from '@/types';
import {
  attachAccountToOrderAction,
  createOrderAction,
  createAccountCredentialAction,
  deleteServiceAction,
  deleteAccountCredentialAction,
  updateOrderFulfillmentAction,
  updateAccountCredentialAction,
  createTicketAction,
  beginGoogleSignInAction,
  completeGoogleImplicitOAuthAction,
  completeGoogleOAuthAction,
  completeGoogleProfileAction,
  getBootstrapDataAction,
  listAdminDashboardAction,
  listAdminFulfilledOrdersAction,
  listAdminTicketsAction,
  listCustomerOrdersAction,
  listCustomerTicketsAction,
  listAccountCredentialsAction,
  searchAccountCredentialsAction,
  loginAction,
  logoutAction,
  rejectOrderAction,
  registerProfileAction,
  updateOwnProfileAction,
  searchProfilesAction,
  resolveTicketAction,
  upsertServiceAction,
  updateProfileRoleAction,
  updateServiceStockAction,
} from '@/app/actions/backend';

export type MobileTab = 'home' | 'catalog' | 'orders' | 'tickets' | 'admin';
export type AdminTab = 'overview' | 'payments' | 'inventory' | 'users' | 'tickets';
export type AuthMode = 'login' | 'register';

interface RegisterProfileInput {
  fullName: string;
  email: string;
  telegram: string;
  whatsapp?: string;
  password: string;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  currentRole: UserRole;
  currentUser: UserProfile | null;
  users: UserProfile[];
  isAuthenticated: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  authMode: AuthMode;
  authError: string | null;
  authNotice: string | null;
  profileCompletionRequired: boolean;
  profileDraft: { fullName: string; email: string } | null;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  completeGoogleProfile: (input: { telegram?: string; whatsapp?: string }) => Promise<boolean>;
  registerProfile: (input: RegisterProfileInput) => Promise<boolean>;
  updateOwnProfile: (input: { telegram?: string; whatsapp?: string; oldPassword?: string; newPassword?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: UserProfile['role']) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;

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
  adminUserTotal: number;
  customerOrderPage: CustomerOrderPage;
  customerOrdersLoading: boolean;
  customerOrdersError: string | null;
  loadCustomerOrders: (input: { profileId: string; page?: number }) => Promise<void>;
  customerTicketPage: CustomerTicketPage;
  customerTicketsLoading: boolean;
  customerTicketsError: string | null;
  loadCustomerTickets: (input: { profileId: string; page?: number }) => Promise<void>;

  selectedCategory: ServiceCategory;
  setSelectedCategory: (cat: ServiceCategory) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  checkoutService: Service | null;
  openCheckout: (service: Service) => void;
  closeCheckout: () => void;

  selectedOrder: Order | null;
  openOrderDetails: (order: Order) => void;
  closeOrderDetails: () => void;

  placeOrder: (service: Service, variantId: string | undefined, contactMethod: 'telegram' | 'whatsapp', utrNumber: string) => Promise<Order>;
  adminRejectOrder: (orderId: string, reason?: 'payment' | 'stock') => Promise<void>;

  createTicket: (orderId: string, issueCategory: Ticket['issueCategory'], description: string) => Promise<void>;
  resolveTicket: (ticketId: string, adminNote?: string) => Promise<void>;

  updateServiceStock: (serviceId: string, newStock: number) => Promise<void>;
  saveService: (service: Service) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<void>;
  createAccountCredential: (service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => Promise<void>;
  updateAccountCredential: (accountId: string, service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => Promise<void>;
  deleteAccountCredential: (accountId: string) => Promise<void>;
  searchAccountCredentials: (serviceId: string, query: string) => Promise<AccountCredential[]>;
  attachAccountToOrder: (accountId: string, orderId: string) => Promise<void>;
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

const emptyCustomerOrderPage: CustomerOrderPage = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 };
const emptyCustomerTicketPage: CustomerTicketPage = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const activeTabState = useSyncExternalStore(
    onChange => subscribeToTabStorage('webscribe-active-tab', onChange),
    () => readStoredTab('webscribe-active-tab', 'home') as MobileTab,
    () => 'home',
  ) as MobileTab;
  const adminTab = useSyncExternalStore(
    onChange => subscribeToTabStorage('webscribe-admin-tab', onChange),
    () => readStoredTab('webscribe-admin-tab', 'overview') as AdminTab,
    () => 'overview',
  ) as AdminTab;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [profileCompletionRequired, setProfileCompletionRequired] = useState(false);
  const [profileDraft, setProfileDraft] = useState<{ fullName: string; email: string } | null>(null);
  const [oauthRecoveryReady, setOauthRecoveryReady] = useState(false);

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
  const [adminUserTotal, setAdminUserTotal] = useState(0);
  const adminFulfilledOrderRequestRef = useRef(0);
  const adminFulfilledOrderQueryRef = useRef<{ page?: number; serviceTitle?: string; search?: string }>({ page: 1, serviceTitle: 'all', search: '' });

  const [customerOrderPage, setCustomerOrderPage] = useState<CustomerOrderPage>(emptyCustomerOrderPage);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [customerOrdersError, setCustomerOrdersError] = useState<string | null>(null);
  const customerOrderRequestRef = useRef(0);
  const [customerTicketPage, setCustomerTicketPage] = useState<CustomerTicketPage>(emptyCustomerTicketPage);
  const [customerTicketsLoading, setCustomerTicketsLoading] = useState(false);
  const [customerTicketsError, setCustomerTicketsError] = useState<string | null>(null);
  const customerTicketRequestRef = useRef(0);

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [checkoutService, setCheckoutService] = useState<Service | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const currentRole: UserRole = isAdmin ? 'admin' : currentUser?.role || 'customer';
  const isAuthenticated = currentUser !== null;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('oauth_error') === 'google';
    const oauthReason = params.get('oauth_reason');
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    let cancelled = false;
    let timer: number | undefined;

    const clearOAuthParameters = () => {
      params.delete('code');
      params.delete('oauth_error');
      params.delete('oauth_reason');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };
    const clearImplicitOAuthParameters = () => {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    };
    const finishRecovery = () => {
      timer = window.setTimeout(() => {
        if (!cancelled) setOauthRecoveryReady(true);
      }, 0);
    };

    if (!code) {
      if (accessToken && refreshToken) {
        void completeGoogleImplicitOAuthAction({ accessToken, refreshToken }).then(result => {
          if (cancelled) return;
          clearImplicitOAuthParameters();
          if (!result.ok) {
            setAuthError(result.error);
            setAuthModalOpen(true);
          }
          finishRecovery();
        });
        return () => {
          cancelled = true;
          if (timer) window.clearTimeout(timer);
        };
      }

      if (oauthError) {
        clearOAuthParameters();
        timer = window.setTimeout(() => {
          if (cancelled) return;
          const message = oauthReason === 'missing_verifier'
            ? 'Google sign-in could not verify this browser. Start again from the same app address and ensure its /auth/callback URL is allowed in Supabase.'
            : 'Google sign-in could not be completed. Please try again.';
          setAuthError(message);
          setAuthModalOpen(true);
          setOauthRecoveryReady(true);
        }, 0);
      } else {
        finishRecovery();
      }
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }

    void completeGoogleOAuthAction(code).then(result => {
      if (cancelled) return;
      clearOAuthParameters();
      if (!result.ok) {
        setAuthError(result.error);
        setAuthModalOpen(true);
      }
      finishRecovery();
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

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

  const loadCustomerOrders = useCallback(async (input: { profileId: string; page?: number }) => {
    const requestId = customerOrderRequestRef.current + 1;
    customerOrderRequestRef.current = requestId;
    setCustomerOrdersLoading(true);
    setCustomerOrdersError(null);

    const result = await listCustomerOrdersAction({ profileId: input.profileId, page: input.page || 1 });
    if (requestId !== customerOrderRequestRef.current) return;

    if (result.ok) {
      setOrders(result.data.items);
      setCustomerOrderPage(result.data);
    } else {
      setCustomerOrdersError(result.error);
    }
    setCustomerOrdersLoading(false);
  }, []);

  const loadCustomerTickets = useCallback(async (input: { profileId: string; page?: number }) => {
    const requestId = customerTicketRequestRef.current + 1;
    customerTicketRequestRef.current = requestId;
    setCustomerTicketsLoading(true);
    setCustomerTicketsError(null);

    const result = await listCustomerTicketsAction({ profileId: input.profileId, page: input.page || 1 });
    if (requestId !== customerTicketRequestRef.current) return;

    if (result.ok) {
      setTickets(result.data.items);
      setCustomerTicketPage(result.data);
    } else {
      setCustomerTicketsError(result.error);
    }
    setCustomerTicketsLoading(false);
  }, []);

  const refreshAdminData = useCallback(async (adminEmail = currentUser?.email) => {
    if (!adminEmail) return;

    const result = await listAdminDashboardAction();
    if (!result.ok || !result.data) return;

    const dashboard = result.data;
    setOrders(dashboard.orders);
    await loadAdminTickets({ status: 'open', page: 1, search: '' });
    setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage(dashboard.fulfilledTotal));
    setAdminUserTotal(dashboard.userTotal);
    setAdminFulfilledOrdersError(null);
    setUsers(prev => {
      const adminProfiles = dashboard.users;
      return adminProfiles.length > 0 ? adminProfiles : prev;
    });
    setServices(dashboard.services);
    const accounts = await listAccountCredentialsAction();
    if (accounts.ok) setAccountCredentials(accounts.data);
  }, [currentUser?.email, loadAdminTickets]);

  const refreshCustomerData = useCallback(async (profileId = currentUser?.id) => {
    if (!profileId) return;

    await Promise.all([
      loadCustomerOrders({ profileId, page: 1 }),
      loadCustomerTickets({ profileId, page: 1 }),
    ]);
  }, [currentUser?.id, loadCustomerOrders, loadCustomerTickets]);

  useEffect(() => {
    if (!oauthRecoveryReady) return;

    const loadBootstrap = async () => {
      const result = await getBootstrapDataAction();
      if (!result.ok) return;
      const userFromSession = result.data.profile ? { ...result.data.profile, password: '' } : null;
      setServices(result.data.services);
      setOrders(result.data.orders);
      setTickets(result.data.tickets);
      setUsers(result.data.users);
      setAccountCredentials(result.data.accounts);
      setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage(result.data.fulfilledTotal));
      setAdminUserTotal(result.data.userTotal);
      setProfileCompletionRequired(result.data.profileCompletionRequired);
      setProfileDraft(result.data.profileDraft);
      if (!userFromSession) return;

      setCurrentUser(userFromSession);
      if (userFromSession.role === 'admin') {
        await loadAdminTickets({ status: 'open', page: 1, search: '' });
        if (window.location.pathname !== '/admin') router.replace('/admin');
      } else {
        await Promise.all([
          loadCustomerOrders({ profileId: userFromSession.id, page: 1 }),
          loadCustomerTickets({ profileId: userFromSession.id, page: 1 }),
        ]);
      }
    };

    void loadBootstrap().finally(() => {
      setAuthLoading(false);
    });
  }, [loadAdminTickets, loadCustomerOrders, loadCustomerTickets, oauthRecoveryReady, router]);


  const openAuthModal = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthNotice(null);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthError(null);
    setAuthNotice(null);
  };

  const setActiveTab = (tab: MobileTab) => {
    if (tab === 'admin' && !isAdmin) {
      openAuthModal('login');
      return;
    }
    window.localStorage.setItem('webscribe-active-tab', tab);
    window.dispatchEvent(new Event('webscribe-tab-change'));
  };

  const setAdminTab = (tab: AdminTab) => {
    window.localStorage.setItem('webscribe-admin-tab', tab);
    window.dispatchEvent(new Event('webscribe-tab-change'));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);

    const loginResult = await loginAction({ email: normalizedEmail, password });
    if (loginResult.ok) {
      const userFromDatabase = { ...loginResult.data, password: '' };
      setOrders([]);
      setTickets([]);
      setCustomerOrderPage(emptyCustomerOrderPage);
      setCustomerTicketPage(emptyCustomerTicketPage);
      setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage());
      setAdminUserTotal(0);
      setProfileCompletionRequired(false);
      setProfileDraft(null);
      setUsers(prev => [userFromDatabase, ...prev.filter(user => normalizeEmail(user.email) !== normalizedEmail)]);
      setCurrentUser(userFromDatabase);
      closeAuthModal();
      if (userFromDatabase.role === 'admin') {
        if (window.location.pathname !== '/admin') router.push('/admin');
        void refreshAdminData(userFromDatabase.email);
      } else {
        void refreshCustomerData(userFromDatabase.id);
      }
      return true;
    }

    setAuthError(loginResult.error);
    return false;
  };

  const signInWithGoogle = async () => {
    const result = await beginGoogleSignInAction();
    if (!result.ok) {
      setAuthError(result.error);
      return false;
    }
    window.location.assign(result.data.url);
    return true;
  };

  const completeGoogleProfile = async (input: { telegram?: string; whatsapp?: string }) => {
    const result = await completeGoogleProfileAction(input);
    if (!result.ok) {
      setAuthError(result.error);
      return false;
    }

    const nextUser = { ...result.data, password: '' };
    setCurrentUser(nextUser);
    setProfileCompletionRequired(false);
    setProfileDraft(null);
    setAuthError(null);
    setUsers(prev => [nextUser, ...prev.filter(user => normalizeEmail(user.email) !== normalizeEmail(nextUser.email))]);
    await refreshCustomerData(nextUser.id);
    return true;
  };

  const registerProfile = async (input: RegisterProfileInput) => {
    const normalizedEmail = normalizeEmail(input.email);

    const backendProfile = await registerProfileAction({
      fullName: input.fullName,
      email: normalizedEmail,
      telegram: input.telegram,
      whatsapp: input.whatsapp,
      password: input.password,
    });

    if (!backendProfile.ok) {
      setAuthError(backendProfile.error);
      return false;
    }

    if (backendProfile.data.requiresEmailConfirmation || !backendProfile.data.profile) {
      setAuthNotice('Check your email and confirm the address, then return here to sign in.');
      return false;
    }

    const nextUser = { ...backendProfile.data.profile, password: '' };

    setOrders([]);
    setTickets([]);
    setCustomerOrderPage(emptyCustomerOrderPage);
    setCustomerTicketPage(emptyCustomerTicketPage);
    setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage());
    setAdminUserTotal(0);
    setProfileCompletionRequired(false);
    setProfileDraft(null);
    setUsers(prev => [nextUser, ...prev.filter(user => normalizeEmail(user.email) !== normalizedEmail)]);
    setCurrentUser(nextUser);
    closeAuthModal();
    return true;
  };

  const logout = async () => {
    const wasAdmin = isAdmin;
    await logoutAction();
    setCurrentUser(null);
    setOrders([]);
    setTickets([]);
    setCustomerOrderPage(emptyCustomerOrderPage);
    setCustomerTicketPage(emptyCustomerTicketPage);
    setAdminFulfilledOrderPage(emptyAdminFulfilledOrderPage());
    setAdminUserTotal(0);
    setProfileCompletionRequired(false);
    setProfileDraft(null);
    setCheckoutService(null);
    setSelectedOrder(null);
    if (activeTabState === 'admin') setActiveTab('home');
    if (wasAdmin && window.location.pathname === '/admin') router.push('/');
  };

  const updateUserRole = async (userId: string, role: UserProfile['role']) => {
    if (!isAdmin) return;
    if (currentUser?.email) {
      const result = await updateProfileRoleAction({
        adminEmail: currentUser.email,
        profileId: userId,
        role,
      });
      if (!result.ok) throw new Error(result.error);
    }
    setUsers(prev => prev.map(user => (user.id === userId ? { ...user, role } : user)));
    setCurrentUser(prev => (prev?.id === userId ? { ...prev, role } : prev));
  };

  const searchUsers = async (query: string) => {
    if (!isAdmin || !query.trim()) {
      setUsers([]);
      return;
    }
    const result = await searchProfilesAction(query);
    if (!result.ok) throw new Error(result.error);
    setUsers(result.data);
  };

  const openCheckout = (service: Service) => {
    if (!currentUser) {
      openAuthModal('register');
      return;
    }
    setCheckoutService(service);
  };

  const closeCheckout = () => {
    setCheckoutService(null);
  };

  const openOrderDetails = (order: Order) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const placeOrder = async (service: Service, variantId: string | undefined, contactMethod: 'telegram' | 'whatsapp', utrNumber: string): Promise<Order> => {
    if (!currentUser) {
      throw new Error('A customer profile is required before placing an order.');
    }

    const backendOrder = await createOrderAction({
      profileId: currentUser.id,
      serviceId: service.id,
      variantId: service.variantMode === 'multiple' ? variantId : undefined,
      contactMethod,
      utrNumber,
    });

    if (backendOrder.ok) {
      setOrders(prev => customerOrderPage.page === 1
        ? [backendOrder.data, ...prev.filter(order => order.id !== backendOrder.data.id)].slice(0, customerOrderPage.pageSize)
        : prev);
      setCustomerOrderPage(prev => ({
        ...prev,
        items: prev.page === 1
          ? [backendOrder.data, ...prev.items.filter(order => order.id !== backendOrder.data.id)].slice(0, prev.pageSize)
          : prev.items,
        total: prev.total + (prev.items.some(order => order.id === backendOrder.data.id) ? 0 : 1),
        totalPages: Math.max(1, Math.ceil((prev.total + (prev.items.some(order => order.id === backendOrder.data.id) ? 0 : 1)) / prev.pageSize)),
      }));
      return backendOrder.data;
    }
    throw new Error(backendOrder.error);
  };

  const updateOwnProfile = async (input: { telegram?: string; whatsapp?: string; oldPassword?: string; newPassword?: string }) => {
    const result = await updateOwnProfileAction(input);
    if (!result.ok) throw new Error(result.error);
    setCurrentUser({ ...result.data, password: '' });
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

  const createTicket = async (orderId: string, issueCategory: Ticket['issueCategory'], description: string) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    const backendTicket = await createTicketAction({
      profileId: currentUser.id,
      orderId,
      issueCategory,
      description,
    });

    if (backendTicket.ok) {
      await loadCustomerTickets({ profileId: currentUser.id, page: 1 });
      return;
    }
    throw new Error(backendTicket.error);
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

  const updateServiceStock = async (serviceId: string, newStock: number) => {
    if (!isAdmin) return;
    if (currentUser?.email) {
      const backendService = await updateServiceStockAction({
        adminEmail: currentUser.email,
        serviceId,
        stockCount: newStock,
      });

      if (backendService.ok) {
        setServices(prev => prev.map(s => (s.id === serviceId ? backendService.data : s)));
        return;
      }
      throw new Error(backendService.error);
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

  const createAccountCredential = async (service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => {
    const result = await createAccountCredentialAction({ serviceId: service.id, serviceTitle: service.title, credentials });
    if (!result.ok) throw new Error(result.error);
    setAccountCredentials(prev => [result.data, ...prev]);
  };

  const updateAccountCredential = async (accountId: string, service: Service, credentials: Credentials & { profileName?: string; createdAt?: string; expiresAt?: string }) => {
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
        theme,
        toggleTheme,
        activeTab: activeTabState,
        setActiveTab,
        adminTab,
        setAdminTab,
        currentRole,
        currentUser,
        users,
        isAuthenticated,
        authLoading,
        isAdmin,
        authModalOpen,
        authMode,
        authError,
        authNotice,
        profileCompletionRequired,
        profileDraft,
        openAuthModal,
        closeAuthModal,
        login,
        signInWithGoogle,
        completeGoogleProfile,
        registerProfile,
        updateOwnProfile,
        logout,
        updateUserRole,
        searchUsers,
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
        adminUserTotal,
        customerOrderPage,
        customerOrdersLoading,
        customerOrdersError,
        loadCustomerOrders,
        customerTicketPage,
        customerTicketsLoading,
        customerTicketsError,
        loadCustomerTickets,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        checkoutService,
        openCheckout,
        closeCheckout,
        selectedOrder,
        openOrderDetails,
        closeOrderDetails,
        placeOrder,
        adminRejectOrder,
        createTicket,
        resolveTicket,
        updateServiceStock,
        saveService,
        deleteService,
        createAccountCredential,
        updateAccountCredential,
        deleteAccountCredential,
        searchAccountCredentials,
        attachAccountToOrder,
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
