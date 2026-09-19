import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { verifyToken } from '@/lib/db/auth'
import { supabaseAdmin } from './client.server'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const result = await verifyToken(token);
    if (!result) {
      throw new Error('Unauthorized: Invalid or expired token');
    }

    return next({
      context: {
        supabase: supabaseAdmin,
        userId: result.userId,
        claims: result.claims,
      },
    });
  },
);
