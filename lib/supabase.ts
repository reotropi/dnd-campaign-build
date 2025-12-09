import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create client component client (for client components) - RECOMMENDED APPROACH
export const createClient_Component = () => {
  return createClientComponentClient();
};

// Legacy client - only initializes on client side
let supabaseInstance: SupabaseClient | undefined;

function getSupabaseInstance(): SupabaseClient {
  // Only initialize on the client side
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used on the client side. Use createClient_Component() instead.');
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables:\n' +
        `NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}\n` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓' : '✗'}`
      );
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

// Proxy object that delays initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseInstance();
    const value = instance[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// Service role client (for API routes - server side only)
let supabaseAdminInstance: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase admin configuration');
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

// For backwards compatibility
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseAdmin();
    const value = instance[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
