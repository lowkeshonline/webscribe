import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
export const getSupabaseAuth = () => createClient(
  getRequiredEnv('SUPABASE_URL'),
  getRequiredEnv('SUPABASE_ANON_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
