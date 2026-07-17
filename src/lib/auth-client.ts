import { createAuthClient } from 'better-auth/react'
import { jwtClient } from 'better-auth/client/plugins'

/** Browser-side Better Auth client. Same-origin, so no baseURL needed. */
export const authClient = createAuthClient({
  plugins: [jwtClient()],
})

/** Fetch a fresh Jazz-compatible JWT for the current session (or null). */
export async function fetchJazzToken(): Promise<string | null> {
  const res = await authClient.token()
  if (res.error || !res.data.token) return null
  return res.data.token
}
