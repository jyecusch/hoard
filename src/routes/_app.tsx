import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { AppShell } from '#/components/app-shell'

/** Auth-gated layout for the whole app UI. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const { data } = await authClient.getSession()
    if (!data) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname !== '/' ? location.pathname : undefined,
        },
      })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { data: session, isPending } = authClient.useSession()

  // beforeLoad guarantees a session on entry; this guard covers sign-out.
  if (isPending || !session) return null

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <Outlet />
    </AppShell>
  )
}
