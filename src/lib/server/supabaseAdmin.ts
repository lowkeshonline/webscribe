import 'server-only';

import { createClient, SupabaseClient, SupportedStorage } from '@supabase/supabase-js';
import { getRequiredEnv } from './env';

let adminClient: SupabaseClient | undefined;

export const getSupabaseAdmin = () => {
  if (!adminClient) {
    adminClient = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return adminClient;
};

// Auth sign-in mutates the Supabase client's in-memory session. Keep it isolated
// from the cached service-role client used for database mutations.
export const getSupabaseAuth = (options: {
  flowType?: 'implicit' | 'pkce';
  storage?: SupportedStorage;
} = {}) => createClient(
  getRequiredEnv('SUPABASE_URL'),
  getRequiredEnv('SUPABASE_ANON_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      // Supabase only honors a custom storage adapter when persistence is
      // enabled. OAuth supplies a cookie-backed adapter for the PKCE verifier;
      // ordinary server-side Auth clients remain memory-only.
      persistSession: Boolean(options.storage),
      ...options,
    },
  },
);
