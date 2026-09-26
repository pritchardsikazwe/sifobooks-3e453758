import { createMiddleware } from '@tanstack/react-start'
import { IS_LOCAL_BACKEND } from '@/lib/platform/backend-mode'
import { cloudSupabase } from './cloud-client'

const TOKEN_KEY = "sifobooks-auth-token"

// Client-side middleware: attaches the signed-in user's token to server function requests.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | null = null
    if (typeof window !== 'undefined') {
      if (IS_LOCAL_BACKEND) {
        token = localStorage.getItem(TOKEN_KEY)
      } else {
        const { data } = await cloudSupabase.auth.getSession()
        token = data.session?.access_token ?? null
      }
    }

    return next({
      headers: token
        ? IS_LOCAL_BACKEND
          ? { Authorization: `Bearer ${token}`, "X-SifoBooks-Auth": token }
          : { Authorization: `Bearer ${token}` }
        : {},
    })
  },
)
