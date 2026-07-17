import { schema as s } from 'jazz-tools'

/**
 * Hoard data model. See SPEC.md.
 *
 * Naming constraints from Jazz 2: columns holding a `s.ref()` must end in
 * `Id`/`_id` (arrays: `Ids`/`_ids`). Relation names derive from the column:
 * `parentId` -> `parent`, reverse `containersViaParent`.
 */
const schema = {
  // Both hoards (top-level), containers, and items. Items can't hold children.
  containers: s.table({
    name: s.string(),
    description: s.string().optional(),
    isItem: s.boolean(),
    // Assigned label code (from a pre-printed sheet). Unset until claimed.
    code: s.string().optional(),
    tags: s.array(s.string()),
    // AI-generated search keywords/synonyms from capture enrichment.
    keywords: s.array(s.string()),
    parentId: s.ref('containers').optional(), // null = top-level hoard
  }),

  // Lending: a row with returnedAt unset means the thing is currently out.
  loans: s.table({
    containerId: s.ref('containers'),
    borrower: s.string(),
    note: s.string().optional(),
    lentAt: s.timestamp(),
    returnedAt: s.timestamp().optional(),
  }),

  photos: s.table({
    containerId: s.ref('containers'),
    fileId: s.ref('files'),
    order: s.int(),
  }),

  // Conventional blob tables — exact shape required by db.createFileFromBlob
  // and friends. Do not rename.
  file_parts: s.table({
    data: s.bytes(),
  }),
  files: s.table({
    name: s.string().optional(),
    mimeType: s.string(),
    partIds: s.array(s.ref('file_parts')),
    partSizes: s.array(s.int()),
  }),

  // Per-user favorites (owner = $createdBy).
  favorites: s.table({
    containerId: s.ref('containers'),
  }),

  // Access grants. Self-inserted on invite acceptance (inviteCode set, policy
  // validates it against `invites`) or added directly by someone with edit
  // access to the container.
  shares: s.table({
    containerId: s.ref('containers'),
    user_id: s.string(),
    role: s.enum('viewer', 'editor'),
    inviteCode: s.string().optional(),
    // Self-reported display name, set when accepting an invite (household
    // trust level — it's cosmetic, not an identity claim).
    display: s.string().optional(),
  }),

  // Invite links: /join/$code. Rows are world-readable by design — the code is
  // the secret, and an invitee needs to resolve code -> containerId + role.
  invites: s.table({
    containerId: s.ref('containers'),
    code: s.string(),
    role: s.enum('viewer', 'editor'),
    revoked: s.boolean(),
  }),
}

type AppSchema = s.Schema<typeof schema>
export const app: s.App<AppSchema> = s.defineApp(schema)

export type Container = s.RowOf<typeof app.containers>
export type Loan = s.RowOf<typeof app.loans>
export type Photo = s.RowOf<typeof app.photos>
export type Favorite = s.RowOf<typeof app.favorites>
export type Share = s.RowOf<typeof app.shares>
export type Invite = s.RowOf<typeof app.invites>

/** Max supported container nesting depth (house -> room -> shelf -> box -> ...). */
export const MAX_NESTING_DEPTH = 10
