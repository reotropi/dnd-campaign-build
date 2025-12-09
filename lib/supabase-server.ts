import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Create server component client (for server components only)
export const createClient_Server = () => {
  return createServerComponentClient({ cookies });
};
