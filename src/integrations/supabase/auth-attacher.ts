import { createMiddleware } from '@tanstack/react-start'

const TOKEN_KEY = "sifobooks-auth-token"

// Client-side middleware: attaches the JWT from localStorage to server function requests.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | null = null
    if (typeof window !== 'undefined') {
      token = localStorage.getItem(TOKEN_KEY)
    }
    return next({
      headers: token\n        ? {\n            Authorization: `Bearer ${token}`,\n            "X-SifoBooks-Auth": token,\n          }\n        : {},
    })
  },
)
