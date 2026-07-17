import { useState } from 'react'
import { useSession } from 'jazz-tools/react'
import { Check, Copy, Eye, Link2, Pencil, Trash2, UserX } from 'lucide-react'
import {
  inviteUrl,
  useContainerInvites,
  useContainerShares,
  useShareActions,
} from '#/lib/shares'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Separator } from '#/components/ui/separator'

export function ShareDialog({
  open,
  onOpenChange,
  containerId,
  containerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  containerId: string
  containerName: string
}) {
  const session = useSession()
  const shares = useContainerShares(containerId) ?? []
  const invites = useContainerInvites(containerId)
  const actions = useShareActions()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyInvite(id: string, code: string) {
    await navigator.clipboard.writeText(inviteUrl(code))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share “{containerName}”</DialogTitle>
          <DialogDescription>
            Anyone with an invite link gets access to this and everything inside it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => actions.createInvite(containerId, 'viewer')}
          >
            <Eye className="mr-1 h-4 w-4" /> New view link
          </Button>
          <Button className="flex-1" onClick={() => actions.createInvite(containerId, 'editor')}>
            <Pencil className="mr-1 h-4 w-4" /> New edit link
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                  …/join/{invite.code}
                </span>
                <Badge variant={invite.role === 'editor' ? 'default' : 'secondary'}>
                  {invite.role}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Copy link"
                  onClick={() => copyInvite(invite.id, invite.code)}
                >
                  {copiedId === invite.id ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Revoke link"
                  onClick={() => actions.revokeInvite(invite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Revoking a link stops new people joining — people who already joined keep access
              until removed below.
            </p>
          </div>
        )}

        {shares.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium">People with access</p>
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-2 py-1 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(share.display ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {share.display ?? 'Someone'}
                    {share.user_id === session?.user_id && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>
                  <Badge variant={share.role === 'editor' ? 'default' : 'secondary'}>
                    {share.role}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Remove access"
                    onClick={() => actions.removeShare(share.id)}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
