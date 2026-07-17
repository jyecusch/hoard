import { useMemo } from 'react'
import { useAll, useDb } from 'jazz-tools/react'
import { app } from '@schema'
import { generateInviteCode } from '#/lib/codes'
import type { Invite } from '@schema'

/**
 * Sharing. An `invites` row is a live invite link (/join/$code); accepting it
 * self-inserts a `shares` row, which the server-side policy validates against
 * the invite (code + role + container must match, invite not revoked).
 */

export function useContainerShares(containerId: string) {
  return useAll(app.shares.where({ containerId }))
}

export function useContainerInvites(containerId: string) {
  const invites = useAll(app.invites.where({ containerId }))
  return useMemo(() => (invites ?? []).filter((i) => !i.revoked), [invites])
}

/** Look up a (world-readable) invite by its code. undefined = still loading. */
export function useInviteByCode(code: string): Invite | null | undefined {
  const rows = useAll(app.invites.where({ code }).limit(1))
   
  return rows === undefined ? undefined : (rows[0] ?? null)
}

export function inviteUrl(code: string) {
  return `${window.location.origin}/join/${code}`
}

export function useShareActions() {
  const db = useDb()
  return useMemo(
    () => ({
      createInvite(containerId: string, role: 'viewer' | 'editor') {
        return db.insert(app.invites, {
          containerId,
          code: generateInviteCode(),
          role,
          revoked: false,
        })
      },
      revokeInvite(inviteId: string) {
        return db.update(app.invites, inviteId, { revoked: true })
      },
      acceptInvite(invite: Invite, userId: string, display: string) {
        return db.insert(app.shares, {
          containerId: invite.containerId,
          user_id: userId,
          role: invite.role,
          inviteCode: invite.code,
          display,
        })
      },
      removeShare(shareId: string) {
        return db.delete(app.shares, shareId)
      },
    }),
    [db],
  )
}
