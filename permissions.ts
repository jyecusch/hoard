import { schema as s } from 'jazz-tools'
import { app, MAX_NESTING_DEPTH } from './schema'

/**
 * Server-enforced row policies. See SPEC.md.
 *
 * Access model:
 * - The creator of a container has full access to it.
 * - A `shares` row grants a user access to a container and (via recursive
 *   parent inheritance) its whole subtree: viewer = read, editor = read+write.
 * - Loans/photos inherit from their container; favorites are per-user.
 * - Invite acceptance: anyone holding a live invite code may self-insert a
 *   matching `shares` row for themselves.
 */
export default s.definePermissions(
  app,
  ({ policy, anyOf, allOf, allowedTo, isCreator, session }) => {
    const depth = { maxDepth: MAX_NESTING_DEPTH }

    // -- containers -------------------------------------------------------
    // NOTE: inherited access (allowedTo.*('parent')) passes vacuously when
    // parentId is null, so every parent-inheritance branch must be guarded
    // with an explicit parentId-not-null check or top-level hoards leak to
    // every user.
    const canRead = (c: { id: any }) =>
      anyOf([
        isCreator,
        policy.shares.exists.where({ containerId: c.id, user_id: session.user_id }),
        allOf([{ parentId: { ne: null } }, allowedTo.read('parent', depth)]),
      ])
    const canEdit = (c: { id: any }) =>
      anyOf([
        isCreator,
        policy.shares.exists.where({
          containerId: c.id,
          user_id: session.user_id,
          role: 'editor',
        }),
        allOf([{ parentId: { ne: null } }, allowedTo.update('parent', depth)]),
      ])

    policy.containers.allowRead.where(canRead)
    // A new top-level hoard is always allowed (you become its creator);
    // nesting requires edit access to the parent.
    policy.containers.allowInsert.where(
      anyOf([
        { parentId: null },
        allOf([{ parentId: { ne: null } }, allowedTo.update('parent', depth)]),
      ]),
    )
    policy.containers.allowUpdate.whereOld(canEdit).whereNew(canEdit)
    policy.containers.allowDelete.where(canEdit)

    // -- loans / photos: inherit from their container -----------------------
    for (const table of [policy.loans, policy.photos]) {
      table.allowRead.where(allowedTo.read('container', depth))
      table.allowInsert.where(allowedTo.update('container', depth))
      table.allowUpdate.whereOld(allowedTo.update('container', depth))
      table.allowDelete.where(allowedTo.update('container', depth))
    }

    // -- files / file_parts: docs-blessed blob pattern ----------------------
    // Created before the referencing photo row exists, so inserts are direct.
    policy.files.allowInsert.always()
    policy.file_parts.allowInsert.always()
    policy.files.allowRead.where(allowedTo.readReferencing(policy.photos, 'fileId'))
    policy.file_parts.allowRead.where(allowedTo.readReferencing(policy.files, 'partIds'))
    policy.files.allowDelete.where(allowedTo.deleteReferencing(policy.photos, 'fileId'))
    policy.file_parts.allowDelete.where(
      allowedTo.deleteReferencing(policy.files, 'partIds'),
    )

    // -- favorites: strictly per-user ---------------------------------------
    policy.favorites.managedByCreator()

    // -- shares -------------------------------------------------------------
    policy.shares.allowRead.where(
      anyOf([{ user_id: session.user_id }, allowedTo.update('container', depth)]),
    )
    policy.shares.allowInsert.where((share) =>
      anyOf([
        // Managers add members directly.
        allowedTo.update('container', depth),
        // Invite acceptance: self-insert with a live, matching invite code.
        allOf([
          { user_id: session.user_id },
          policy.invites.exists.where({
            containerId: share.containerId,
            code: share.inviteCode,
            role: share.role,
            revoked: false,
          }),
        ]),
      ]),
    )
    policy.shares.allowUpdate.whereOld(allowedTo.update('container', depth))
    policy.shares.allowDelete.where(
      anyOf([
        { user_id: session.user_id }, // leave a share yourself
        allowedTo.update('container', depth), // or be removed by a manager
      ]),
    )

    // -- invites ------------------------------------------------------------
    // World-readable: the unguessable code is the secret, and invitees must
    // resolve code -> container + role before they have any other access.
    policy.invites.allowRead.always()
    policy.invites.allowInsert.where(allowedTo.update('container', depth))
    policy.invites.allowUpdate.whereOld(allowedTo.update('container', depth))
    policy.invites.allowDelete.where(allowedTo.update('container', depth))
  },
)
