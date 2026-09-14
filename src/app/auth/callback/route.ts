import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAuth } from '@/lib/server/supabaseAdmin';
import { createOAuthCookieStorage, setAuthCookiesOnResponse } from '@/lib/server/session';

export const runtime = 'nodejs';

const redirectToHome = (request: Request, query = '') => {
  const destination = new URL('/', request.url);
  if (query) destination.search = query;
  return NextResponse.redirect(destination);
};

const redirectToFailure = (request: Request, reason: 'missing_code' | 'missing_verifier' | 'exchange_failed') => {
  return redirectToHome(request, `?oauth_error=google&oauth_reason=${reason}`);
};

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code');
  if (!code) return redirectToFailure(request, 'missing_code');

  try {
    const cookieStore = await cookies();
    if (!cookieStore.get('ws_google_oauth_verifier')?.value) {
      return redirectToFailure(request, 'missing_verifier');
    }
    const { data, error } = await getSupabaseAuth({
      flowType: 'pkce',
      storage: createOAuthCookieStorage(cookieStore),
    }).auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error('Google OAuth callback exchange failed:', error);
      return redirectToFailure(request, 'exchange_failed');
    }
    const response = redirectToHome(request);
    setAuthCookiesOnResponse(response, data.session);
    return response;
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return redirectToFailure(request, 'exchange_failed');
  }
}
