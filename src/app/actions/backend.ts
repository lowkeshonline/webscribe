'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { AccountCredential, AdminOrderPage, AdminOrdersPage, AdminTicketPage, PaginatedResult, Service, UserProfile } from '@/types';
import { getSupabaseAdmin, getSupabaseAuth } from '@/lib/server/supabaseAdmin';
import { isAdminEmail, normalizeEmail } from '@/lib/server/authz';
import { getAdminPassword } from '@/lib/server/env';
import { decryptCredential, encryptCredential } from '@/lib/server/credentialCrypto';
import { mapOrderRow, mapProfileRow, mapServiceRow, mapTicketRow } from '@/lib/server/mappers';
import { isValidEmail, isValidFullName, isValidTelegramUsername, normalizeIndianWhatsappNumber } from '@/lib/validation';
import {
  getCurrentProfile,
  getCurrentSessionUser,
  refreshCurrentSession,
  requireCurrentAdmin,
  revokeCurrentSession,
  setAuthCookies,
} from '@/lib/server/session';
import { buildPaymentNotification, buildTicketNotification, sendTelegramMessage } from '@/lib/server/telegram';

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

class ActionError extends Error {}

const actionError = (message: string) => new ActionError(message);

const fail = <T = null,>(error: unknown): ActionResult<T> => {
  if (error instanceof ActionError) {
    return { ok: false, error: error.message };
  }

  if (error instanceof Error && (error.message === 'Authentication required.' || error.message.startsWith('Forbidden:'))) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: 'The request could not be completed. Please try again.' };
};

const asString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw actionError(`${field} is required.`);
  }
  return value.trim();
};

const asOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const normalizeTelegram = (value: unknown) => {
  const raw = asOptionalString(value);
  if (!raw) return undefined;
  if (!isValidTelegramUsername(raw)) {
    throw actionError('Enter a valid Telegram username with 5-32 letters, numbers, or underscores.');
  }
  const username = raw.replace(/^@/, '');
  return `@${username}`;
};

const normalizeWhatsapp = (value: unknown) => {
  const raw = asOptionalString(value);
  if (!raw) return undefined;
  const number = normalizeIndianWhatsappNumber(raw);
  if (!number) {
    throw actionError('Enter a valid Indian WhatsApp number: 10 digits starting with 6-9, optionally with +91.');
  }
  return number;
};

const normalizeInputEmail = (value: unknown) => {
  const email = normalizeEmail(asString(value, 'email'));
  if (!isValidEmail(email)) throw actionError('Enter a valid email address.');
  return email;
};

const normalizeFullName = (value: unknown) => {
  const fullName = asString(value, 'fullName').replace(/\s+/g, ' ');
  if (!isValidFullName(fullName)) {
    throw actionError('Enter a valid full name using letters, spaces, apostrophes, periods, or hyphens.');
  }
  return fullName;
};

const randomCode = (length: number) => {
  let code = '';
  while (code.length < length) {
    code += randomBytes(length).toString('base64url').replace(/[^a-zA-Z0-9]/g, '');
  }
  return code.slice(0, length).toUpperCase();
};

const nextOrderId = () => `ORD-${randomCode(10)}`;
const nextTicketId = () => `TCK-${randomCode(8)}`;
const nextAccountId = () => `ACC-${randomCode(6)}`;
const nextOrderSecret = () => `WS-${randomCode(24)}`;

const updateProfileClaims = async (authUserId: string, profileId: string, role: UserProfile['role']) => {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(authUserId, {
    app_metadata: { profile_id: profileId, role: role === 'reseller' ? 'reseller' : 'customer' },
  });
  if (error) throw error;
};

const refreshSessionWithProfileClaims = async (authUserId: string, email: string, password: string, profileId: string, role: UserProfile['role']) => {
  await updateProfileClaims(authUserId, profileId, role);
  const authClient = getSupabaseAuth();
  const { data, error: signInError } = await authClient.auth.signInWithPassword({ email, password });
  if (signInError || !data.session) throw signInError || new Error('Unable to refresh login session.');
  await setAuthCookies(data.session);
};
const addValidity = (from: Date, value: number, unit: 'days' | 'months') => {
  const result = new Date(from);
  if (unit === 'months') {
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + value);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
  } else {
    result.setDate(result.getDate() + value);
  }
  return result;
};

const mapAccountRow = (row: Record<string, unknown>): AccountCredential => ({
  id: String(row.id || ''),
  serviceId: String(row.service_id || ''),
  serviceTitle: String(row.service_title || ''),
  variantId: typeof row.variant_id === 'string' ? row.variant_id : undefined,
  variantName: typeof row.variant_name === 'string' ? row.variant_name : undefined,
  username: typeof row.username === 'string' ? row.username : undefined,
  profileName: typeof row.profile_name === 'string' ? row.profile_name : undefined,
  password: decryptCredential(row.password),
  pin: decryptCredential(row.pin),
  additionalInfo: decryptCredential(row.additional_info),
  status: row.status === 'assigned' ? 'assigned' : 'available',
  assignedOrderId: typeof row.assigned_order_id === 'string' ? row.assigned_order_id : undefined,
  createdAt: String(row.created_at || ''),
  expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
});

const mapTicketWithOrder = (row: Record<string, unknown>, order?: Record<string, unknown>) => mapTicketRow({
  ...row,
  customer_whatsapp: row.customer_whatsapp ?? order?.customer_whatsapp,
  contact_method: row.contact_method ?? order?.contact_method,
});

const ADMIN_TICKET_PAGE_SIZE = 10;
const ADMIN_ORDER_PAGE_SIZE = 10;
const ADMIN_ACCOUNT_PAGE_SIZE = 10;

const sanitizeTicketSearch = (value: unknown) => typeof value === 'string'
  ? value.trim().replace(/[\\%_,()]/g, '').slice(0, 100)
  : '';

const applyTicketSearch = <T extends { or: (filters: string) => T }>(query: T, search: string) => {
  if (!search) return query;
  return query.or(`id.ilike.%${search}%,customer_telegram.ilike.%${search}%,order_id.ilike.%${search}%`);
};

const sanitizeOrderSearch = (value: unknown) => typeof value === 'string'
  ? value.trim().replace(/[\\%_,()]/g, '').slice(0, 100)
  : '';

// Searches orders by order ID, account ID, customer name, or customer contact.
const applyOrderSearch = <T extends { or: (filters: string) => T; ilike: (col: string, pattern: string) => T }>(query: T, search: string) => {
  if (!search) return query;
  return query.or(`id.ilike.%${search}%,account_id.ilike.%${search}%,customer_name.ilike.%${search}%,customer_telegram.ilike.%${search}%,customer_whatsapp.ilike.%${search}%`);
};

export async function getBootstrapDataAction(): Promise<ActionResult<{
  profile: UserProfile | null;
  services: Service[];
  orders: ReturnType<typeof mapOrderRow>[];
  tickets: ReturnType<typeof mapTicketRow>[];
  users: UserProfile[];
  accounts: AccountCredential[];
  fulfilledTotal: number;
  userTotal: number;
}>> {
  try {
    const supabase = getSupabaseAdmin();
    const sessionUser = await getCurrentSessionUser();
    const profile = await getCurrentProfile() || (!sessionUser ? await refreshCurrentSession() : null);

    if (!profile || !isAdminEmail(profile.email)) {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('is_popular', { ascending: false })
        .order('title', { ascending: true });
      if (error) throw error;
      return {
        ok: true,
        data: {
          profile: null,
          services: (data || []).map(mapServiceRow),
          orders: [],
          tickets: [],
          users: [],
          accounts: [],
          fulfilledTotal: 0,
          userTotal: 0,
        },
      };
    }

    const [orders, services, accounts, fulfilledCount, userCount] = await Promise.all([
      supabase.from('orders').select('*').neq('payment_status', 'completed').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('is_active', true).order('title', { ascending: true }),
      supabase.from('account_credentials').select('*').eq('status', 'available').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'completed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    for (const result of [orders, services, accounts, fulfilledCount, userCount]) {
      if (result.error) throw result.error;
    }
    return {
      ok: true,
      data: {
        profile,
        services: (services.data || []).map(mapServiceRow),
        orders: (orders.data || []).map(mapOrderRow),
        tickets: [],
        users: [],
        accounts: (accounts.data || []).map(row => mapAccountRow(row as Record<string, unknown>)),
        fulfilledTotal: fulfilledCount.count || 0,
        userTotal: userCount.count || 0,
      },
    };

  } catch (error) {
    return fail(error);
  }
}

const getOrCreateProfileForAuthUser = async (input: {
  fullName: string;
  email: string;
  telegram?: string;
  whatsapp?: string;
  authUserId: string;
}): Promise<UserProfile> => {
  const supabase = getSupabaseAdmin();
  const email = normalizeInputEmail(input.email);
  const authUserId = asString(input.authUserId, 'authUserId');
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) {
    if (existing.auth_user_id && existing.auth_user_id !== authUserId) {
      throw new Error('Profile ownership mismatch.');
    }
    if (!existing.auth_user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfileRow(data);
    }
    return mapProfileRow(existing);
  }

  const telegram = normalizeTelegram(input.telegram);
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!telegram && !whatsapp) throw actionError('Telegram username or WhatsApp number is required.');
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: authUserId,
      full_name: normalizeFullName(input.fullName),
      email,
      telegram: telegram || '',
      whatsapp: whatsapp || null,
      role: 'customer',
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapProfileRow(data);
};

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<UserProfile>> {
  try {
    const supabase = getSupabaseAdmin();
    const email = normalizeInputEmail(input.email);
    if (!isAdminEmail(email)) throw actionError('This sign-in is for administrators only.');
    const password = asString(input.password, 'password');

    const authClient = getSupabaseAuth();
    let signIn = await authClient.auth.signInWithPassword({ email, password });

    const configuredAdminPassword = getAdminPassword();
    if (signIn.error && configuredAdminPassword && password === configuredAdminPassword) {
      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Webscribe Admin', telegram: '@admin' },
      });

      if (created.error && !created.error.message.toLowerCase().includes('already')) {
        throw created.error;
      }

      signIn = await authClient.auth.signInWithPassword({ email, password });
    }

    if (signIn.error) throw actionError('Invalid email or password.');
    if (!signIn.data.user?.email || !signIn.data.session) {
      throw new Error('Unable to create login session.');
    }

    const profile = await getOrCreateProfileForAuthUser({
      fullName: String(signIn.data.user.user_metadata?.full_name || 'Webscribe Admin'),
      email,
      telegram: String(signIn.data.user.user_metadata?.telegram || '@admin'),
      whatsapp: typeof signIn.data.user.user_metadata?.whatsapp === 'string' ? signIn.data.user.user_metadata.whatsapp : undefined,
      authUserId: signIn.data.user.id,
    });

    const expectedClaimRole = profile.role === 'reseller' ? 'reseller' : 'customer';
    const metadata = signIn.data.user.app_metadata || {};
    const userMetadata = signIn.data.user.user_metadata || {};
    const userMetadataMatches = userMetadata.full_name === profile.fullName
      && String(userMetadata.telegram || '') === profile.telegram
      && String(userMetadata.whatsapp || '') === String(profile.whatsapp || '');
    if (!userMetadataMatches) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(signIn.data.user.id, {
        user_metadata: { full_name: profile.fullName, telegram: profile.telegram, whatsapp: profile.whatsapp || '' },
      });
      if (metadataError) throw metadataError;
    }
    if (metadata.profile_id === profile.id && metadata.role === expectedClaimRole && userMetadataMatches) {
      await setAuthCookies(signIn.data.session);
    } else {
      await refreshSessionWithProfileClaims(signIn.data.user.id, email, password, profile.id, profile.role);
    }
    return { ok: true, data: { ...profile, role: 'admin' as const } };
  } catch (error) {
    return fail(error);
  }
}

export async function logoutAction(): Promise<ActionResult<{ loggedOut: true }>> {
  try {
    await revokeCurrentSession();
    return { ok: true, data: { loggedOut: true } };
  } catch (error) {
    return fail(error);
  }
}

export async function searchProfilesAction(query: string): Promise<ActionResult<UserProfile[]>> {
  try {
    await requireCurrentAdmin();
    const search = asString(query, 'search').replace(/[%,()]/g, ' ').trim();
    if (!search) return { ok: true, data: [] };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${search}%,telegram.ilike.%${search}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return { ok: true, data: (data || []).map(mapProfileRow) };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProfileRoleAction(input: {
  adminEmail: string;
  profileId: string;
  role: UserProfile['role'];
}): Promise<ActionResult<UserProfile>> {
  try {
    await requireCurrentAdmin();
    const role = input.role === 'reseller' ? 'reseller' : 'customer';
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', asString(input.profileId, 'profileId'))
      .select('*')
      .single();

    if (error) throw error;
    if (data.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(data.auth_user_id, {
        app_metadata: { profile_id: data.id, role },
      });
      if (authError) throw authError;
    }
    revalidatePath('/admin');
    return { ok: true, data: mapProfileRow(data) };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertServiceAction(input: {
  adminEmail: string;
  service: Service;
}): Promise<ActionResult<Service>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const service = input.service;
    const { data, error } = await supabase
      .from('services')
      .upsert({
        id: asString(service.id, 'service.id'),
        title: asString(service.title, 'service.title'),
        category: service.category,
        logo_url: service.logoUrl || null,
        brand_color: service.brandColor || '#176b87',
        description: asOptionalString(service.description) || null,
        dos: asOptionalString(service.dos) || null,
        donts: asOptionalString(service.donts) || null,
        delivery_time: asOptionalString(service.deliveryTime) || null,
        original_price: service.originalPrice ?? service.regularPrice,
        our_price: service.ourPrice ?? service.regularPrice,
        regular_price: service.ourPrice ?? service.regularPrice,
        reseller_price: service.resellerPrice,
        stock_count: service.stockCount,
        stock_status: service.stockStatus,
        validity_value: service.validityValue || 30,
        validity_unit: service.validityUnit || 'days',
        variant_mode: service.variantMode || 'single',
        price_starts_at: service.priceStartsAt ?? null,
        variants: service.variants || [],
        is_popular: Boolean(service.isPopular),
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, data: mapServiceRow(data) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteServiceAction(serviceId: string): Promise<ActionResult<null>> {
  try {
    await requireCurrentAdmin();
    const id = asString(serviceId, 'serviceId');
    const supabase = getSupabaseAdmin();
    const { count, error: accountError } = await supabase
      .from('account_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id);
    if (accountError) throw accountError;

    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id);
    if (orderError) throw orderError;

    // Stored accounts and order history reference the service, so hide it instead of deleting it.
    const { error } = count || orderCount
      ? await supabase.from('services').update({ is_active: false }).eq('id', id)
      : await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, data: null };
  } catch (error) {
    return fail(error);
  }
}

export async function listAccountCredentialsAction(): Promise<ActionResult<AccountCredential[]>> {
  try {
    await requireCurrentAdmin();
    const now = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin()
      .from('account_credentials')
      .select('*')
      .eq('status', 'available')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data || []).map(row => mapAccountRow(row as Record<string, unknown>)) };
  } catch (error) { return fail(error); }
}

export async function listAdminAccountsAction(input: {
  page?: number;
  serviceId?: string;
  status?: 'all' | 'available' | 'assigned';
  search?: string;
}): Promise<ActionResult<PaginatedResult<AccountCredential>>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const serviceId = typeof input.serviceId === 'string' && input.serviceId !== 'all' ? input.serviceId.trim() : '';
    const status = input.status === 'available' || input.status === 'assigned' ? input.status : 'all';
    const search = typeof input.search === 'string'
      ? input.search.trim().replace(/[\\%_,()]/g, '').slice(0, 100)
      : '';

    let countQuery = supabase.from('account_credentials').select('id', { count: 'exact', head: true });
    if (serviceId) countQuery = countQuery.eq('service_id', serviceId);
    if (status !== 'all') countQuery = countQuery.eq('status', status);
    if (search) countQuery = countQuery.or(`id.ilike.%${search}%,username.ilike.%${search}%,assigned_order_id.ilike.%${search}%`);
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_ACCOUNT_PAGE_SIZE));
    const requestedPage = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page || 1)) : 1;
    const page = Math.min(requestedPage, totalPages);

    let accountQuery = supabase
      .from('account_credentials')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (serviceId) accountQuery = accountQuery.eq('service_id', serviceId);
    if (status !== 'all') accountQuery = accountQuery.eq('status', status);
    if (search) accountQuery = accountQuery.or(`id.ilike.%${search}%,username.ilike.%${search}%,assigned_order_id.ilike.%${search}%`);
    const { data, error } = await accountQuery.range(
      (page - 1) * ADMIN_ACCOUNT_PAGE_SIZE,
      page * ADMIN_ACCOUNT_PAGE_SIZE - 1,
    );
    if (error) throw error;

    return {
      ok: true,
      data: {
        items: (data || []).map(row => mapAccountRow(row as Record<string, unknown>)),
        page,
        pageSize: ADMIN_ACCOUNT_PAGE_SIZE,
        total,
        totalPages,
      },
    };
  } catch (error) { return fail(error); }
}

export async function searchAccountCredentialsAction(input: { serviceId: string; query: string }): Promise<ActionResult<AccountCredential[]>> {
  try {
    await requireCurrentAdmin();
    const serviceId = asString(input.serviceId, 'serviceId');
    const query = asString(input.query, 'query').replace(/[%_,()]/g, '').trim();
    if (!query) throw actionError('Enter an account ID or email to search.');
    const now = new Date().toISOString();
    const pattern = `%${query}%`;
    const { data, error } = await getSupabaseAdmin()
      .from('account_credentials')
      .select('*')
      .eq('service_id', serviceId)
      .or(`id.ilike.${pattern},username.ilike.${pattern}`)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data || []).map(row => mapAccountRow(row as Record<string, unknown>)) };
  } catch (error) { return fail(error); }
}

export async function createAccountCredentialAction(input: {
  serviceId: string;
  serviceTitle: string;
  credentials: { username?: string; password?: string; pin?: string; additionalInfo?: string; profileName?: string; createdAt?: string; expiresAt?: string; variantId?: string };
}): Promise<ActionResult<AccountCredential>> {
  try {
    await requireCurrentAdmin();
    const serviceId = asString(input.serviceId, 'serviceId');
    const supabase = getSupabaseAdmin();
    const { data: service, error: serviceError } = await supabase.from('services').select('title, variants').eq('id', serviceId).eq('is_active', true).single();
    if (serviceError) throw serviceError;
    const planVariants = Array.isArray(service.variants) ? service.variants as Array<Record<string, unknown>> : [];
    const selectedPlan = planVariants.find(variant => String(variant.id ?? '') === String(input.credentials.variantId ?? ''));
    if (planVariants.length && !selectedPlan) throw actionError('Select a plan for this account.');
    const createdAt = asString(input.credentials.createdAt, 'createdAt');
    const expiresAt = asString(input.credentials.expiresAt, 'expiresAt');
    const username = normalizeInputEmail(input.credentials.username);
    const password = asString(input.credentials.password, 'account password');
    if (Number.isNaN(Date.parse(createdAt)) || Number.isNaN(Date.parse(expiresAt))) throw actionError('Created and expiry dates must be valid.');
    if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw actionError('Expiry date must be after the created date.');
    if (Date.parse(expiresAt) <= Date.now()) throw actionError('Expiry date must be in the future.');
    const { data, error } = await supabase.from('account_credentials').insert({
      id: nextAccountId(),
      service_id: serviceId,
      service_title: service.title,
      profile_name: asOptionalString(input.credentials.profileName) || null,
      variant_id: selectedPlan ? String(selectedPlan.id) : null,
      variant_name: selectedPlan ? String(selectedPlan.name ?? '') : null,
      username,
      password: encryptCredential(password),
      pin: encryptCredential(asOptionalString(input.credentials.pin)),
      additional_info: encryptCredential(asOptionalString(input.credentials.additionalInfo)),
      created_at: createdAt,
      expires_at: expiresAt,
    }).select('*').single();
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true, data: mapAccountRow(data as Record<string, unknown>) };
  } catch (error) { return fail(error); }
}

export async function updateAccountCredentialAction(input: { accountId: string; serviceId: string; serviceTitle: string; credentials: { username?: string; password?: string; pin?: string; additionalInfo?: string; profileName?: string; createdAt?: string; expiresAt?: string; variantId?: string } }): Promise<ActionResult<AccountCredential>> {
  try {
    await requireCurrentAdmin();
    const serviceId = asString(input.serviceId, 'serviceId');
    const supabase = getSupabaseAdmin();
    const { data: service, error: serviceError } = await supabase.from('services').select('title, variants').eq('id', serviceId).eq('is_active', true).single();
    if (serviceError) throw serviceError;
    const planVariants = Array.isArray(service.variants) ? service.variants as Array<Record<string, unknown>> : [];
    const selectedPlan = planVariants.find(variant => String(variant.id ?? '') === String(input.credentials.variantId ?? ''));
    if (planVariants.length && !selectedPlan) throw actionError('Select a plan for this account.');
    const accountId = asString(input.accountId, 'accountId');
    const { data: existing, error: existingError } = await supabase.from('account_credentials').select('service_id, status, assigned_order_id').eq('id', accountId).single();
    if (existingError) throw existingError;
    if (existing.status === 'assigned' && existing.service_id !== serviceId) throw actionError('Unassign this account from its order before changing its service.');
    if (existing.status === 'assigned' && typeof existing.assigned_order_id === 'string') {
      const { data: assignedOrder, error: assignedOrderError } = await supabase.from('orders').select('variant_id').eq('id', existing.assigned_order_id).maybeSingle();
      if (assignedOrderError) throw assignedOrderError;
      const assignedVariantId = typeof assignedOrder?.variant_id === 'string' ? assignedOrder.variant_id : '';
      if (assignedVariantId && assignedVariantId !== (selectedPlan ? String(selectedPlan.id) : '')) throw actionError('This account is assigned to an order for a different plan. Unassign it before changing its plan.');
    }
    const createdAt = asString(input.credentials.createdAt, 'createdAt');
    const expiresAt = asString(input.credentials.expiresAt, 'expiresAt');
    const username = normalizeInputEmail(input.credentials.username);
    const password = asString(input.credentials.password, 'account password');
    if (Number.isNaN(Date.parse(createdAt)) || Number.isNaN(Date.parse(expiresAt))) throw actionError('Created and expiry dates must be valid.');
    if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw actionError('Expiry date must be after the created date.');
    if (Date.parse(expiresAt) <= Date.now()) throw actionError('Expiry date must be in the future.');
    const encryptedPassword = encryptCredential(password);
    const encryptedPin = encryptCredential(asOptionalString(input.credentials.pin));
    const encryptedAdditionalInfo = encryptCredential(asOptionalString(input.credentials.additionalInfo));
    const { data, error } = await supabase.from('account_credentials').update({ service_id: serviceId, service_title: service.title, variant_id: selectedPlan ? String(selectedPlan.id) : null, variant_name: selectedPlan ? String(selectedPlan.name ?? '') : null, profile_name: input.credentials.profileName || null, username, password: encryptedPassword, pin: encryptedPin, additional_info: encryptedAdditionalInfo, created_at: createdAt, expires_at: expiresAt }).eq('id', accountId).select('*').single();
    if (error) throw error;
    if (existing.status === 'assigned' && typeof existing.assigned_order_id === 'string') {
      const { error: orderError } = await supabase.from('orders').update({ credentials: { username, password: encryptedPassword, pin: encryptedPin, additionalInfo: encryptedAdditionalInfo } }).eq('id', existing.assigned_order_id);
      if (orderError) throw orderError;
    }
    return { ok: true, data: mapAccountRow(data as Record<string, unknown>) };
  } catch (error) { return fail(error); }
}

export async function deleteAccountCredentialAction(accountId: string): Promise<ActionResult<null>> {
  try {
    await requireCurrentAdmin();
    const id = asString(accountId, 'accountId');
    const { data: account, error: lookupError } = await getSupabaseAdmin().from('account_credentials').select('status, assigned_order_id').eq('id', id).single();
    if (lookupError) throw lookupError;
    if (account.status === 'assigned' || account.assigned_order_id) throw actionError('This account is assigned to an order. Unassign it from Inventory before deleting.');
    const { error } = await getSupabaseAdmin().from('account_credentials').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true, data: null };
  } catch (error) { return fail(error); }
}

const attachAccountToOrder = async (accountId: string, orderId: string) => {
  const supabase = getSupabaseAdmin();
  const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (orderError) throw orderError;
  const { data: account, error: accountError } = await supabase.from('account_credentials')
    .select('*').eq('id', accountId).single();
  if (accountError) throw accountError;
  if (!account.expires_at || Date.parse(account.expires_at) <= Date.now()) {
    throw actionError('This account has expired and cannot be assigned.');
  }
  if (account.status === 'assigned' && account.assigned_order_id !== order.id) {
    throw actionError('This account is already assigned to another order.');
  }
  if (account.service_id !== order.service_id) {
    const sameServiceTitle = String(account.service_title || '').trim().toLowerCase() === String(order.service_title || '').trim().toLowerCase();
    if (!sameServiceTitle) throw actionError('Account service does not match this order.');
    const { error: normalizeError } = await supabase.from('account_credentials').update({ service_id: order.service_id, service_title: order.service_title }).eq('id', account.id);
    if (normalizeError) throw normalizeError;
  }
  const accountVariantId = typeof account.variant_id === 'string' ? account.variant_id : '';
  const orderVariantId = typeof order.variant_id === 'string' ? order.variant_id : '';
  const accountVariantName = String(account.variant_name || '').trim().toLowerCase();
  const orderVariantName = String(order.variant_name || '').trim().toLowerCase();
  const samePlan = accountVariantId === orderVariantId || Boolean(accountVariantName && orderVariantName && accountVariantName === orderVariantName);
  if (accountVariantId && orderVariantId && !samePlan) throw actionError('Account plan does not match this order.');
  const encryptedPassword = encryptCredential(account.password);
  const encryptedPin = encryptCredential(account.pin);
  const encryptedAdditionalInfo = encryptCredential(account.additional_info);
  const credentials = { username: account.username, password: encryptedPassword, pin: encryptedPin, additionalInfo: encryptedAdditionalInfo };
  const alreadyAttached = account.status === 'assigned' && account.assigned_order_id === order.id;
  if (!alreadyAttached) {
    const { data: claimed, error: claimError } = await supabase.from('account_credentials').update({ status: 'assigned', assigned_order_id: order.id, password: encryptedPassword, pin: encryptedPin, additional_info: encryptedAdditionalInfo }).eq('id', account.id).eq('status', 'available').select('id').maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) throw actionError('This account was already assigned.');
  } else if (account.password !== encryptedPassword || account.pin !== encryptedPin || account.additional_info !== encryptedAdditionalInfo) {
    const { error: encryptionError } = await supabase.from('account_credentials').update({ password: encryptedPassword, pin: encryptedPin, additional_info: encryptedAdditionalInfo }).eq('id', account.id);
    if (encryptionError) throw encryptionError;
  }

  const { data: updated, error: updateError } = await supabase.from('orders').update({
    credentials,
    account_id: account.id,
    payment_status: order.payment_status,
    delivery_status: 'pending',
    expires_at: order.expires_at,
  }).eq('id', order.id).select('*').single();
  if (updateError) {
    if (!alreadyAttached) {
      await supabase.from('account_credentials').update({ status: 'available', assigned_order_id: null }).eq('id', account.id).eq('assigned_order_id', order.id);
    }
    throw updateError;
  }
  if (order.account_id && order.account_id !== account.id) {
    const { error: releaseError } = await supabase
      .from('account_credentials')
      .update({ status: 'available', assigned_order_id: null })
      .eq('id', order.account_id)
      .eq('assigned_order_id', order.id);
    if (releaseError) {
      await supabase.from('orders').update({ account_id: order.account_id, credentials: order.credentials }).eq('id', order.id);
      if (!alreadyAttached) {
        await supabase.from('account_credentials').update({ status: 'available', assigned_order_id: null }).eq('id', account.id).eq('assigned_order_id', order.id);
      }
      throw releaseError;
    }
  }
  return mapOrderRow(updated);
};

export async function attachAccountToOrderAction(input: { accountId: string; orderId: string }): Promise<ActionResult<ReturnType<typeof mapOrderRow>>> {
  try { await requireCurrentAdmin(); return { ok: true, data: await attachAccountToOrder(asString(input.accountId, 'accountId'), asString(input.orderId, 'orderId')) }; }
  catch (error) { return fail(error); }
}

export async function unassignAccountFromOrderAction(input: { accountId: string }): Promise<ActionResult<{ account: AccountCredential; order: ReturnType<typeof mapOrderRow> | null }>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const accountId = asString(input.accountId, 'accountId');
    const { data: account, error: accountError } = await supabase.from('account_credentials').select('*').eq('id', accountId).single();
    if (accountError) throw accountError;
    const orderId = typeof account.assigned_order_id === 'string' ? account.assigned_order_id : '';
    if (!orderId || account.status !== 'assigned') throw actionError('This account is not assigned to an order.');

    const { data: released, error: releaseError } = await supabase
      .from('account_credentials')
      .update({ status: 'available', assigned_order_id: null })
      .eq('id', accountId)
      .eq('assigned_order_id', orderId)
      .select('*')
      .maybeSingle();
    if (releaseError) throw releaseError;
    if (!released) throw actionError('This account was already unassigned.');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ account_id: null, credentials: null, delivery_status: 'pending' })
      .eq('id', orderId)
      .eq('account_id', accountId)
      .select('*')
      .maybeSingle();
    if (orderError) {
      await supabase.from('account_credentials').update({ status: 'assigned', assigned_order_id: orderId }).eq('id', accountId).eq('status', 'available');
      throw orderError;
    }

    revalidatePath('/admin');
    return { ok: true, data: { account: mapAccountRow(released as Record<string, unknown>), order: order ? mapOrderRow(order) : null } };
  } catch (error) { return fail(error); }
}

export async function updateOrderFulfillmentAction(input: { orderId: string; fulfilled: boolean }): Promise<ActionResult<ReturnType<typeof mapOrderRow>>> {
  try {
    await requireCurrentAdmin();
    const id = asString(input.orderId, 'orderId');
    const supabase = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await supabase.from('orders').select('*').eq('id', id).single();
    if (lookupError) throw lookupError;
    if (input.fulfilled && existing.payment_status === 'cancelled') {
      throw actionError('A rejected order cannot be marked fulfilled.');
    }

    let expiresAt: string | null = null;
    if (input.fulfilled) {
      expiresAt = existing.expires_at || null;
      if (!expiresAt) {
        const { data: service } = await supabase.from('services').select('validity_value, validity_unit, variants').eq('id', existing.service_id).maybeSingle();
        const variants = Array.isArray(service?.variants) ? service.variants as Array<Record<string, unknown>> : [];
        const selectedVariant = variants.find(variant => String(variant.id ?? '') === String(existing.variant_id ?? ''));
        const validityValue = Number(selectedVariant?.validityValue ?? selectedVariant?.validity_value ?? service?.validity_value ?? 30);
        const validityUnit = selectedVariant?.validityUnit === 'months' || selectedVariant?.validity_unit === 'months' || service?.validity_unit === 'months' ? 'months' : 'days';
        expiresAt = addValidity(new Date(), Math.max(1, validityValue), validityUnit).toISOString();
      }
    }

    const { data, error } = await supabase.from('orders').update({
      payment_status: input.fulfilled ? 'completed' : 'verification_pending',
      delivery_status: input.fulfilled ? 'delivered' : 'pending',
      expires_at: expiresAt,
    }).eq('id', id).select('*').single();
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true, data: mapOrderRow(data) };
  } catch (error) { return fail(error); }
}

export async function createOrderAction(input: {
  serviceId: string;
  variantId?: string;
  customerName: string;
  customerTelegram: string;
  customerWhatsapp: string;
  contactMethod?: 'telegram' | 'whatsapp';
  utrNumber: string;
}): Promise<ActionResult<ReturnType<typeof mapOrderRow>>> {
  try {
    const supabase = getSupabaseAdmin();
    const serviceId = asString(input.serviceId, 'serviceId');
    const utrNumber = asString(input.utrNumber, 'utrNumber');
    if (!/^\d{12}$/.test(utrNumber)) {
      throw actionError('Enter a valid 12-digit UPI UTR number.');
    }
    const customerName = normalizeFullName(input.customerName);
    const customerTelegram = normalizeTelegram(input.customerTelegram);
    if (!customerTelegram) throw actionError('Enter your Telegram username so we can deliver the order.');
    const customerWhatsapp = normalizeWhatsapp(input.customerWhatsapp);
    if (!customerWhatsapp) throw actionError('Enter your WhatsApp number so we can deliver the order.');

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single();

    if (serviceError) throw serviceError;
    if (!service) throw actionError('Service not found.');
    const contactMethod = input.contactMethod === 'whatsapp' ? 'whatsapp' : 'telegram';

    const variants = Array.isArray(service.variants) ? service.variants as Array<Record<string, unknown>> : [];
    const isVariantService = service.variant_mode === 'multiple' || variants.length > 0;
    const selectedVariant = isVariantService
      ? variants.find(variant => String(variant.id ?? '') === input.variantId)
      : undefined;
    if (isVariantService && !selectedVariant) throw actionError('Select a service variant.');
    const pricePaid = Number(selectedVariant?.ourPrice ?? selectedVariant?.our_price ?? selectedVariant?.regularPrice ?? service.regular_price);
    const variantText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('orders')
      .select('id')
      .eq('utr_number', utrNumber)
      .limit(1)
      .maybeSingle();
    if (existingOrderError) throw existingOrderError;
    if (existingOrder) {
      throw actionError('This UTR number has already been submitted.');
    }

    const orderId = nextOrderId();
    const secretKey = nextOrderSecret();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        secret_key: secretKey,
        profile_id: null,
        service_id: service.id,
        service_title: service.title,
        dos: variantText(selectedVariant?.description) || variantText(selectedVariant?.dos) || service.dos || null,
        donts: variantText(selectedVariant?.donts) || service.donts || null,
        variant_id: selectedVariant ? String(selectedVariant.id) : null,
        variant_name: selectedVariant ? String(selectedVariant.name ?? '') : null,
        service_category: service.category,
        user_role: 'customer',
        price_paid: pricePaid,
        regular_price: Number(selectedVariant?.ourPrice ?? selectedVariant?.our_price ?? selectedVariant?.regularPrice ?? service.regular_price),
        reseller_discount: null,
        customer_name: customerName,
        customer_telegram: customerTelegram,
        customer_whatsapp: customerWhatsapp,
        contact_method: contactMethod,
        payment_status: 'verification_pending',
        utr_number: utrNumber,
        delivery_method: 'instant',
        delivery_status: 'pending',
      })
      .select('*')
      .single();

    if (orderError) throw orderError;

    const mapped = mapOrderRow(order);
    await sendTelegramMessage({
      orderId: mapped.id,
      message: buildPaymentNotification({
        id: mapped.id,
        serviceTitle: service.title,
        serviceCategory: service.category,
        serviceDescription: service.description || undefined,
        customerName: mapped.customerName,
        customerTelegram: mapped.customerTelegram,
        customerWhatsapp: mapped.customerWhatsapp,
        contactMethod: mapped.contactMethod,
        pricePaid: mapped.pricePaid,
        originalPrice: Number(selectedVariant?.originalPrice ?? selectedVariant?.original_price ?? service.original_price ?? service.regular_price ?? 0),
        resellerPrice: Number(selectedVariant?.resellerPrice ?? selectedVariant?.reseller_price ?? service.reseller_price ?? 0),
        userRole: mapped.userRole,
        secretKey: mapped.secretKey,
        utrNumber: mapped.utrNumber,
      }),
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, data: mapped };
  } catch (error) {
    return fail(error);
  }
}

export async function rejectOrderAction(input: {
  adminEmail: string;
  orderId: string;
  reason?: 'payment' | 'stock';
}): Promise<ActionResult<ReturnType<typeof mapOrderRow>>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const orderId = asString(input.orderId, 'orderId');
    const { data: existing, error: readError } = await supabase
      .from('orders')
      .select('account_id')
      .eq('id', orderId)
      .single();
    if (readError) throw readError;
    if (existing.account_id) {
      const { error: releaseError } = await supabase
        .from('account_credentials')
        .update({ status: 'available', assigned_order_id: null })
        .eq('id', existing.account_id)
        .eq('assigned_order_id', orderId);
      if (releaseError) throw releaseError;
    }
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: 'cancelled', delivery_status: 'pending', account_id: null, credentials: null, expires_at: null })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      if (existing.account_id) {
        await supabase
          .from('account_credentials')
          .update({ status: 'assigned', assigned_order_id: orderId })
          .eq('id', existing.account_id)
          .eq('status', 'available');
      }
      throw error;
    }
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, data: mapOrderRow(data) };
  } catch (error) {
    return fail(error);
  }
}

export async function createTicketAction(input: {
  orderId: string;
  description: string;
}): Promise<ActionResult<ReturnType<typeof mapTicketRow>>> {
  try {
    const supabase = getSupabaseAdmin();
    const orderId = asString(input.orderId, 'orderId');
    const description = asString(input.description, 'description');
    if (description.length > 1500) {
      throw actionError('Ticket description must be 1500 characters or fewer.');
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw actionError('Order not found. Check the order ID and try again.');

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        id: nextTicketId(),
        order_id: order.id,
        service_title: order.service_title,
        customer_telegram: order.customer_telegram,
        issue_category: 'Other',
        description,
        status: 'open',
      })
      .select('*')
      .single();

    if (error) throw error;
    const mapped = mapTicketWithOrder(data as Record<string, unknown>, order as Record<string, unknown>);

    await sendTelegramMessage({
      ticketId: mapped.id,
      orderId: mapped.orderId,
      message: buildTicketNotification(mapped),
    });

    revalidatePath('/admin');
    return { ok: true, data: mapped };
  } catch (error) {
    return fail(error);
  }
}

export async function listAdminTicketsAction(input: {
  status: 'open' | 'resolved';
  page?: number;
  search?: string;
}): Promise<ActionResult<AdminTicketPage>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const status = input.status === 'resolved' ? 'resolved' : 'open';
    const search = sanitizeTicketSearch(input.search);

    let openCountQuery = supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved');
    let resolvedCountQuery = supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'resolved');

    if (status === 'open' && search) openCountQuery = applyTicketSearch(openCountQuery, search);
    if (status === 'resolved' && search) resolvedCountQuery = applyTicketSearch(resolvedCountQuery, search);

    const [openCount, resolvedCount] = await Promise.all([openCountQuery, resolvedCountQuery]);
    if (openCount.error) throw openCount.error;
    if (resolvedCount.error) throw resolvedCount.error;

    const openTotal = openCount.count || 0;
    const resolvedTotal = resolvedCount.count || 0;
    const total = status === 'open' ? openTotal : resolvedTotal;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_TICKET_PAGE_SIZE));
    const requestedPage = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page || 1)) : 1;
    const page = Math.min(requestedPage, totalPages);

    let ticketQuery = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    ticketQuery = status === 'resolved'
      ? ticketQuery.eq('status', 'resolved')
      : ticketQuery.neq('status', 'resolved');
    ticketQuery = applyTicketSearch(ticketQuery, search);

    const { data, error } = await ticketQuery.range(
      (page - 1) * ADMIN_TICKET_PAGE_SIZE,
      page * ADMIN_TICKET_PAGE_SIZE - 1,
    );
    if (error) throw error;

    const rows = (data || []) as Array<Record<string, unknown>>;
    const orderIds = rows.map(row => row.order_id).filter((id): id is string => typeof id === 'string' && Boolean(id));
    const { data: orders, error: ordersError } = orderIds.length
      ? await supabase.from('orders').select('id, customer_whatsapp, contact_method').in('id', orderIds)
      : { data: [], error: null };
    if (ordersError) throw ordersError;

    const orderById = new Map((orders || []).map(order => [order.id, order as Record<string, unknown>]));
    return {
      ok: true,
      data: {
        items: rows.map(row => mapTicketWithOrder(row, orderById.get(row.order_id))),
        page,
        pageSize: ADMIN_TICKET_PAGE_SIZE,
        total,
        totalPages,
        status,
        search,
        openTotal,
        resolvedTotal,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function listAdminFulfilledOrdersAction(input: {
  page?: number;
  serviceTitle?: string;
  search?: string;
}): Promise<ActionResult<AdminOrderPage>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const serviceTitle = typeof input.serviceTitle === 'string' && input.serviceTitle.trim() && input.serviceTitle !== 'all'
      ? input.serviceTitle.trim().slice(0, 200)
      : '';
    const search = sanitizeOrderSearch(input.search);

    let countQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'completed');
    if (serviceTitle) countQuery = countQuery.eq('service_title', serviceTitle);
    countQuery = applyOrderSearch(countQuery, search);

    const [countResult, serviceResult] = await Promise.all([
      countQuery,
      supabase.from('orders').select('service_title').eq('payment_status', 'completed').order('service_title', { ascending: true }),
    ]);
    if (countResult.error) throw countResult.error;
    if (serviceResult.error) throw serviceResult.error;

    const total = countResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE));
    const requestedPage = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page || 1)) : 1;
    const page = Math.min(requestedPage, totalPages);
    let orderQuery = supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (serviceTitle) orderQuery = orderQuery.eq('service_title', serviceTitle);
    orderQuery = applyOrderSearch(orderQuery, search);

    const { data, error } = await orderQuery.range(
      (page - 1) * ADMIN_ORDER_PAGE_SIZE,
      page * ADMIN_ORDER_PAGE_SIZE - 1,
    );
    if (error) throw error;

    return {
      ok: true,
      data: {
        items: (data || []).map(mapOrderRow),
        page,
        pageSize: ADMIN_ORDER_PAGE_SIZE,
        total,
        totalPages,
        serviceTitle: serviceTitle || 'all',
        search,
        serviceTypes: Array.from(new Set((serviceResult.data || []).map(row => row.service_title).filter((title): title is string => typeof title === 'string' && Boolean(title)))),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function listAdminOrdersAction(input: {
  page?: number;
  paymentStatus?: 'all' | 'pending_payment' | 'verification_pending' | 'completed' | 'cancelled';
  serviceTitle?: string;
  search?: string;
}): Promise<ActionResult<AdminOrdersPage>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const paymentStatus = input.paymentStatus === 'pending_payment'
      || input.paymentStatus === 'verification_pending'
      || input.paymentStatus === 'completed'
      || input.paymentStatus === 'cancelled'
      ? input.paymentStatus
      : '';
    const serviceTitle = typeof input.serviceTitle === 'string' && input.serviceTitle.trim() && input.serviceTitle !== 'all'
      ? input.serviceTitle.trim().slice(0, 200)
      : '';
    const search = sanitizeOrderSearch(input.search);

    let countQuery = supabase.from('orders').select('id', { count: 'exact', head: true });
    if (paymentStatus) countQuery = countQuery.eq('payment_status', paymentStatus);
    if (serviceTitle) countQuery = countQuery.eq('service_title', serviceTitle);
    countQuery = applyOrderSearch(countQuery, search);

    const [countResult, serviceResult] = await Promise.all([
      countQuery,
      supabase.from('orders').select('service_title').order('service_title', { ascending: true }),
    ]);
    if (countResult.error) throw countResult.error;
    if (serviceResult.error) throw serviceResult.error;

    const total = countResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE));
    const requestedPage = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page || 1)) : 1;
    const page = Math.min(requestedPage, totalPages);
    let orderQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (paymentStatus) orderQuery = orderQuery.eq('payment_status', paymentStatus);
    if (serviceTitle) orderQuery = orderQuery.eq('service_title', serviceTitle);
    orderQuery = applyOrderSearch(orderQuery, search);

    const { data, error } = await orderQuery.range(
      (page - 1) * ADMIN_ORDER_PAGE_SIZE,
      page * ADMIN_ORDER_PAGE_SIZE - 1,
    );
    if (error) throw error;

    return {
      ok: true,
      data: {
        items: (data || []).map(mapOrderRow),
        page,
        pageSize: ADMIN_ORDER_PAGE_SIZE,
        total,
        totalPages,
        paymentStatus: paymentStatus || 'all',
        serviceTitle: serviceTitle || 'all',
        search,
        serviceTypes: Array.from(new Set((serviceResult.data || []).map(row => row.service_title).filter((title): title is string => typeof title === 'string' && Boolean(title)))),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

const ASSIGNABLE_ORDER_LIMIT = 25;

export async function listAssignableOrdersAction(input: {
  serviceId?: string;
  serviceTitle?: string;
  variantId?: string;
  variantName?: string;
  search?: string;
}): Promise<ActionResult<ReturnType<typeof mapOrderRow>[]>> {
  try {
    await requireCurrentAdmin();
    const serviceId = asString(input.serviceId, 'serviceId');
    const serviceTitle = asOptionalString(input.serviceTitle);
    const variantId = asOptionalString(input.variantId);
    const variantName = asOptionalString(input.variantName);
    const search = sanitizeOrderSearch(input.search);
    const now = new Date().toISOString();
    const buildQuery = () => applyOrderSearch(
      getSupabaseAdmin()
        .from('orders')
        .select('*')
        .neq('payment_status', 'cancelled')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(ASSIGNABLE_ORDER_LIMIT),
      search,
    );
    const { data: idMatches, error: idError } = await buildQuery().eq('service_id', serviceId);
    if (idError) throw idError;
    let titleMatches: Record<string, unknown>[] = [];
    if (serviceTitle) {
      const { data, error } = await buildQuery().ilike('service_title', serviceTitle);
      if (error) throw error;
      titleMatches = (data || []) as Record<string, unknown>[];
    }
    const merged = new Map<string, Record<string, unknown>>();
    [...((idMatches || []) as Record<string, unknown>[]), ...titleMatches].forEach(row => merged.set(String(row.id), row));
    let rows = Array.from(merged.values())
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)));
    if (variantId || variantName) {
      const wantedName = (variantName || '').trim().toLowerCase();
      rows = rows.filter(row => {
        const rowVariantId = typeof row.variant_id === 'string' ? row.variant_id : '';
        const rowVariantName = String(row.variant_name || '').trim().toLowerCase();
        if (!rowVariantId && !rowVariantName) return true;
        if (variantId && rowVariantId) return rowVariantId === variantId;
        return Boolean(wantedName && rowVariantName === wantedName);
      });
    }
    return { ok: true, data: rows.slice(0, ASSIGNABLE_ORDER_LIMIT).map(mapOrderRow) };
  } catch (error) { return fail(error); }
}

export async function resolveTicketAction(input: {
  adminEmail: string;
  ticketId: string;
  adminNote?: string;
}): Promise<ActionResult<ReturnType<typeof mapTicketRow>>> {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        admin_note: asOptionalString(input.adminNote) || 'Resolved by admin.',
      })
      .eq('id', asString(input.ticketId, 'ticketId'))
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/admin');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_whatsapp, contact_method')
      .eq('id', data.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    return { ok: true, data: mapTicketWithOrder(data as Record<string, unknown>, order as Record<string, unknown> | undefined) };
  } catch (error) {
    return fail(error);
  }
}

export async function listAdminDashboardAction() {
  try {
    await requireCurrentAdmin();
    const supabase = getSupabaseAdmin();
    const [orders, services, fulfilledCount, userCount] = await Promise.all([
      supabase.from('orders').select('*').neq('payment_status', 'completed').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('is_active', true).order('title', { ascending: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'completed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    for (const result of [orders, services, fulfilledCount, userCount]) {
      if (result.error) throw result.error;
    }

    return {
      ok: true as const,
      data: {
        orders: (orders.data || []).map(mapOrderRow),
        tickets: [],
        users: [],
        services: (services.data || []).map(mapServiceRow),
        fulfilledTotal: fulfilledCount.count || 0,
        userTotal: userCount.count || 0,
      },
    };
  } catch (error) {
    return fail(error);
  }
}
