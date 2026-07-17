import { useCallback, useEffect, useMemo, useState } from 'react'
import { JazzProvider } from 'jazz-tools/react'
import { Package } from 'lucide-react'
import { authClient, fetchJazzToken } from '#/lib/auth-client'

/**
 * Bridges Better Auth -> Jazz.
 *
 * - Signed out: children render with no Jazz client (public routes like
 *   /login work; gated routes redirect via the _app layout).
 * - Signed in: children render only once the JWT is fetched and JazzProvider
 *   is mounted, keyed by user id so principal switches recreate the client.
 *
 * The config object identity matters: JazzProvider recreates the whole client
 * when config changes, so it must be memoized — a fresh object per render
 * means a client teardown/reconnect per render.
 */
export function JazzAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const [token, setToken] = useState<string | null>(null)

  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      setToken(null)
      return
    }
    let cancelled = false
    fetchJazzToken().then((t) => {
      if (!cancelled) setToken(t)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const config = useMemo(
    () =>
      token
        ? {
            appId: import.meta.env.VITE_JAZZ_APP_ID as string,
            serverUrl: import.meta.env.VITE_JAZZ_SERVER_URL as string,
            jwtToken: token,
          }
        : null,
    [token],
  )

  const onJWTExpired = useCallback(async () => {
    const fresh = await fetchJazzToken()
    if (!fresh) throw new Error('Session expired — please sign in again')
    return fresh
  }, [])

  if (isPending || (userId && !config)) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    )
  }

  if (!userId || !config) {
    return <>{children}</>
  }

  return (
    <JazzProvider key={userId} config={config} onJWTExpired={onJWTExpired}>
      {children}
    </JazzProvider>
  )
}
