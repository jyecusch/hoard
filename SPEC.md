# Hoard — Product & Architecture Spec

Hoard is a self-hosted, local-first home inventory app for the classic problem: useful
but periodically-used things (tools, hobby gear, supplies) stored out of sight in opaque
containers. Hoard makes storing, finding, and using them easy without keeping them
visible: nested containers, pre-printed QR/DataMatrix labels on boxes, scan to see
what's inside, search to avoid re-buying things you already own, and lending tracking
so loaned tools don't get lost.

Ground-up rebuild of two earlier prototypes (Zero/Postgres/Next.js and Jazz classic);
their UI, schemas, and architecture are explicitly disposable — only the product goal
carries over. No data migration or backwards compatibility required. Old code lives in
git history of this repo.

## Product decisions (locked 2026-07-16)

- **Usage**: desktop and mobile equally important. Responsive web app + installable PWA.
  Scanning and rapid capture are first-class mobile actions; bulk management on desktop.
- **Rapid capture mode**: cataloging the whole house must be doable in a weekend.
  Dedicated capture loop locked to a current container: scan a pre-printed label (or
  skip), snap photo(s), type a quick name or accept the AI suggestion, hit next —
  ~10 seconds per item, then walk to the next one.
- **Search**: AI-enriched capture + instant fuzzy search. At capture time, an AI vision
  model suggests name, description, and rich search keywords/synonyms from the photo
  (stored on the item). Search itself is offline, typo-tolerant fuzzy matching over
  names/descriptions/tags/keywords — so "wire squeezer thing" finds the crimper. The app
  must work fully without an AI key (enrichment simply disabled).
- **Lending**: mark any item/container as "lent to <name>" with date + optional note.
  Borrower names are free text with autocomplete from past loans. Dashboard section
  shows everything currently lent out. Returning clears the status (loan history kept).
- **Sharing**: any container can be shared via invite links; each link carries a role
  chosen at creation — **viewer** (read-only) or **editor** (add/edit/move in that
  subtree). Sharing a container shares its whole subtree.
- **Labels**: pre-print + assign workflow. Generate PDF sheets of uniquely-coded labels
  in advance (QR **and** DataMatrix); stick one on a box; scanning an unassigned code
  prompts to link it to a new or existing container. Printed labels encode
  `https://<app>/c/<code>` so any camera app resolves into Hoard.
- **Item model**: minimal — name, description, tags, AI keywords, photos, code, loan
  status. No quantities, purchase info, or custom fields in v1.
- **Auth**: Better Auth email/password (not Jazz device secrets).
- **Sync**: self-hosted Jazz 2 sync server. v1 ships the production Docker Compose
  deploy setup.

## Stack (choices deliberate and confirmed — keep the dependency surface small)

- **TanStack Start** (React 19, Vite-based) in **SPA mode** — no SSR of app pages
  (local-first + auth-gated makes SSR useless), but server routes host:
  - `/api/auth/*` — **Better Auth** handler (email/password, `jwt` plugin exposing JWKS,
    **better-sqlite3** storage). No separate auth server.
  - `/api/enrich` — AI capture enrichment endpoint via **Vercel AI SDK** with a
    **configurable provider** (Anthropic/OpenAI/… chosen by env vars, e.g.
    `AI_PROVIDER` + `AI_MODEL` + provider API key). Key never reaches the client.
- **Jazz 2** (`jazz-tools@alpha`, 2.0.0-alpha.x — relational data model, public alpha)
  for data, sync, offline, permissions, blob storage. `jazzPlugin` from
  `jazz-tools/dev/vite` in dev. NOTE: Jazz 2 ≠ Jazz classic — classic APIs (`co.map`,
  Groups, invite links, FileStream) no longer exist. Reference dump:
  https://jazz.tools/llms-full.txt
- **Auth↔Jazz bridge**: client fetches JWT via Better Auth `authClient.token()`, passes
  it to `JazzProvider` as `jwtToken` (+ `onJWTExpired` refresh); Jazz server validates
  via `--jwks-url`; JWT `sub` = `session.user_id`.
- **UI**: Tailwind 4 + shadcn/ui primitives, lucide icons.
- **Codes**: `bwip-js` renders QR + DataMatrix; camera scanning via the native
  BarcodeDetector API with zxing WASM polyfill (`barcode-detector` package).
- **Label PDFs**: `pdf-lib`, generated fully client-side.
- **Search**: `fuse.js` client-side fuzzy over synced data (inventory scale = thousands
  of rows; all readable rows subscribed locally).
- **PWA**: `vite-plugin-pwa`.

## Data model (Jazz 2 tables, `schema.ts`)

- `containers`: `name`, `description?`, `isItem` (items can't hold children), `code?`
  (assigned label code), `tags` (string array), `keywords` (string array, AI-generated
  synonyms), `parentId? → containers` (null = top-level hoard). Owner = `$createdBy`.
- `loans`: `containerId → containers`, `borrower` (free text), `lentAt` (timestamp),
  `note?`, `returnedAt?` (null = currently out). Autocomplete borrowers from past rows.
- `photos`: `containerId → containers`, `fileId → files`, `order`.
- `files` / `file_parts`: Jazz 2's conventional blob tables (exact shape required by
  `db.createFileFromBlob` / `db.loadFileAsBlob`).
- `favorites`: `containerId` (+ `$createdBy` = the favoriting user).
- `shares`: `containerId`, `user_id`, `role` enum(viewer|editor), `inviteCode?`
  (validated against `invites` by policy when self-inserted on accept).
- `invites`: `containerId`, `code` (unguessable), `role` enum(viewer|editor), `revoked`.

Label codes are short unguessable IDs, pre-generated at PDF time, stored nowhere until
assigned (the code value on a container claims it).

## Permissions (`permissions.ts`, server-enforced)

- Containers: creator full access; users with a `shares` row on the container **or any
  ancestor** get read (viewer) or read+write (editor) via recursive
  `allowedTo.read("parentId", { maxDepth })`-style policies.
- Photos/files/file_parts/loans inherit access from their container
  (`readReferencing`); `files`/`file_parts` need direct insert grants (created before
  the parent row exists).
- `shares` insert allowed when a live matching `invites` row exists (code + role match,
  not revoked, `user_id` = inserting session) — invite acceptance mechanism.
- `invites` managed by container creator/editors.

## Routes

- `/` dashboard: my hoards, shared with me, favorites, currently lent out
- `/login`, `/signup`
- `/i/$id` container/item detail: breadcrumbs, photos, description, tags, contents tree,
  add/move/delete, code management, lend/return, share dialog
- `/capture` rapid capture mode (choose target container, then loop: scan label → photo
  → AI-suggested name → save & next)
- `/c/$code` code resolution: known → `/i/$id`; unknown → link-it flow (new or existing
  container, or jump into capture)
- `/scan` camera scanner
- `/labels` label sheet generator (paper sizes, sheet presets, custom layout, QR or
  DataMatrix, rect/circular, skip positions → PDF)
- `/join/$code` accept invite
- `/search` (mobile tab; cmd-k dialog on desktop)
- `/settings` account/theme

## UX shape

- Desktop: left sidebar (hoards tree, favorites, lent out, search), content pane.
- Mobile: bottom tab bar — Home, Search, **Scan/Capture** center action, Labels,
  Settings. Dark/light theme.

## Deploy (`deploy/`)

Docker Compose: TanStack Start app (Node, serves SPA + auth + enrich), Jazz sync server
(`jazz-tools server --jwks-url http://app/api/auth/jwks`), Caddy reverse proxy with
automatic TLS. Volumes: auth sqlite, Jazz data dir. Schema/permissions published via
`jazz-tools deploy`. Docs in `deploy/README.md`.

## Non-goals (v1)

- Data migration from old prototypes; quantities/valuations/custom fields; embeddings/
  semantic search at query time; public anonymous sharing beyond invite links; native
  apps; loan due-date reminders.
