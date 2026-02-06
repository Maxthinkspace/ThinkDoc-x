import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Important:
 * `createClient()` throws if `supabaseUrl` is empty. In this repo, Supabase is optional
 * (many flows use the Hono backend instead). So we only create the client when env vars exist,
 * otherwise we export a small stub that fails lazily when used.
 */
export const supabase: any =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : {
        functions: {
          invoke: async () => {
            throw new Error(
              'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in packages/web-app/.env (or remove Supabase usage).'
            );
          },
        },
      };

