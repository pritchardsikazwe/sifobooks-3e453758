import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import { IS_LOCAL_BACKEND } from '@/lib/platform/backend-mode'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No bearer token provided');
    }
    const token = authHeader.slice(7).trim();
    if (!token) throw new Error('Unauthorized: No token provided');

    if (IS_LOCAL_BACKEND) {
      const { verifyToken } = await import('@/lib/db/auth');
      const { supabaseAdmin } = await import('./local-client.server');
      const result = await verifyToken(token);
      if (!result) throw new Error('Unauthorized: Invalid or expired token');
      return next({ context: { supabase: supabaseAdmin as any, userId: result.userId, claims: result.claims as any } });
    }

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set('apikey', key);
          headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw new Error('Unauthorized: Invalid token');
    return next({ context: { supabase: supabase as any, userId: data.claims.sub as string, claims: data.claims as any } });
  },
);
