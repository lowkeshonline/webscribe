import 'server-only';

import { cookies } from 'next/headers';
import { Session } from '@supabase/supabase-js';
import { getSupabaseAdmin, getSupabaseAuth } from './supabaseAdmin';
import { isAdminEmail, normalizeEmail } from './authz';
import { mapProfileRow } from './mappers';

const ACCESS_COOKIE = 'ws_access_token';
const REFRESH_COOKIE = 'ws_refresh_token';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

type CookieWriter = Pick<Awaited<ReturnType<typeof cookies>>, 'set'>;

const writeAuthCookies = (cookieStore: CookieWriter, session: Session) => {
  const maxAge = session.expires_in || 60 * 60 * 24 * 7;

  cookieStore.set(ACCESS_COOKIE, session.access_token, {
    ...cookieOptions,
    maxAge,
  });

  cookieStore.set(REFRESH_COOKIE, session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
};

export const setAuthCookies = async (session: Session) => {
  writeAuthCookies(await cookies(), session);
};

export const clearAuthCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
};

export const refreshCurrentSession = async () => {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const { data, error } = await getSupabaseAuth().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    await clearAuthCookies();
    return null;
  }
  await setAuthCookies(data.session);
  return getCurrentProfile();
};

export const revokeCurrentSession = async () => {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  try {
    if (accessToken) {
      await getSupabaseAdmin().auth.admin.signOut(accessToken, 'global');
    }
  } finally {
    await clearAuthCookies();
  }
};

export const getCurrentSessionUser = async () => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const authClient = getSupabaseAuth();
  let authUserId: string | undefined;
  let email: string | undefined;
  let appMetadata: Record<string, unknown> = {};
  let userMetadata: Record<string, unknown> = {};
  let claims: Record<string, unknown> | null = null;

  try {
    const claimsResult = await authClient.auth.getClaims(token);
    if (!claimsResult.error && claimsResult.data?.claims?.sub && typeof claimsResult.data.claims.email === 'string') {
      claims = claimsResult.data.claims as Record<string, unknown>;
    }
  } catch {
    // Use the Auth API fallback below for unexpected local verification errors.
  }

  if (claims) {
    authUserId = String(claims.sub);
    email = normalizeEmail(claims.email as string);
    appMetadata = claims.app_metadata && typeof claims.app_metadata === 'object'
      ? claims.app_metadata as Record<string, unknown>
      : {};
    userMetadata = claims.user_metadata && typeof claims.user_metadata === 'object'
      ? claims.user_metadata as Record<string, unknown>
      : {};
  } else {
    // Some Supabase projects still use signing/configuration combinations that
    // cannot be verified locally. Validate the token with Auth before treating
    // the request as anonymous rather than silently dropping a valid session.
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user || typeof data.user.email !== 'string') return null;
    authUserId = data.user.id;
    email = normalizeEmail(data.user.email);
    appMetadata = data.user.app_metadata && typeof data.user.app_metadata === 'object'
      ? data.user.app_metadata as Record<string, unknown>
      : {};
    userMetadata = data.user.user_metadata && typeof data.user.user_metadata === 'object'
      ? data.user.user_metadata as Record<string, unknown>
      : {};
  }

  return {
    authUserId: authUserId as string,
    email: email as string,
    profileId: typeof appMetadata.profile_id === 'string' ? appMetadata.profile_id : undefined,
    role: appMetadata.role === 'reseller' ? 'reseller' as const : undefined,
    fullName: typeof userMetadata.full_name === 'string' ? userMetadata.full_name : undefined,
    telegram: typeof userMetadata.telegram === 'string' ? userMetadata.telegram : undefined,
    whatsapp: typeof userMetadata.whatsapp === 'string' ? userMetadata.whatsapp : undefined,
  };
};

export const getCurrentProfile = async () => {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) return null;

  if (sessionUser.profileId) {
    return {
      id: sessionUser.profileId,
      fullName: sessionUser.fullName || sessionUser.email,
      email: sessionUser.email,
      telegram: sessionUser.telegram || '',
      whatsapp: sessionUser.whatsapp,
      password: '',
      role: isAdminEmail(sessionUser.email) ? 'admin' as const : sessionUser.role || 'customer' as const,
      createdAt: '',
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', sessionUser.email)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const profile = mapProfileRow(data);
  return isAdminEmail(profile.email) ? { ...profile, role: 'admin' as const } : profile;
};

const requireCurrentProfile = async () => {
  const profile = await getCurrentProfile() || await refreshCurrentSession();
  if (!profile) {
    throw new Error('Authentication required.');
  }
  return profile;
};

export const requireCurrentAdmin = async () => {
  const profile = await requireCurrentProfile();
  if (!isAdminEmail(profile.email)) {
    throw new Error('Forbidden: admin access required.');
  }
  return profile;
};
