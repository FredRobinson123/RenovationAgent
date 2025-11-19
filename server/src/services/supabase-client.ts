import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverConfig } from '../config/server-config.js';

const { supabaseUrl, supabaseServiceRoleKey } = serverConfig;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.'
  );
}

export type SupabaseAdminClient = SupabaseClient;

export const supabaseAdminClient: SupabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

