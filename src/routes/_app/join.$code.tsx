import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAll, useSession } from 'jazz-tools/react'
import { Loader2, PartyPopper } from 'lucide-react'
import { app } from '@schema'
import { useInviteByCode, useShareActions } from '#/lib/shares'
import { authClient } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/_app/join/$code')({
  component: JoinPage,
})

function JoinPage() {
  const { code } = Route.useParams()
  const session = useSession()
  const { data: authSession } = authClient.useSession()
  const invite = useInviteByCode(code)
  const myShares = useAll(
    session ? app.shares.where({ user_id: session.user_id }) : undefined,
  )
  const actions = useShareActions()
  const [display, setDisplay] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (invite === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!invite || invite.revoked) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>
              This invite link is invalid or has been revoked. Ask for a fresh link.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const existing = myShares?.find((s) => s.containerId === invite.containerId)
  if (existing) {
    return <Navigate to="/i/$id" params={{ id: invite.containerId }} replace />
  }

  async function accept() {
    if (busy || !session) return
    setBusy(true)
    setError(null)
    try {
      const name = display.trim() || authSession?.user.name || 'Someone'
      await actions.acceptInvite(invite!, session.user_id, name).wait({ tier: 'edge' })
      // Hard navigation on purpose: a fresh page re-establishes all query
      // subscriptions, so the newly shared subtree is evaluated from scratch.
      window.location.assign(`/i/${invite!.containerId}`)
    } catch {
      setError('Couldn’t join — the invite may have just been revoked.')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" /> You’re invited
          </CardTitle>
          <CardDescription>
            You’ve been given{' '}
            <strong>{invite.role === 'editor' ? 'edit' : 'view'} access</strong> to a shared
            space and everything inside it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-display">Your name (shown to the owner)</Label>
            <Input
              id="join-display"
              placeholder={authSession?.user.name ?? 'Your name'}
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={accept} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Join
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
