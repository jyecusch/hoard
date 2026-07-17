# Hoard

Self-hosted, local-first home inventory. Organize your stuff into nested containers,
stick pre-printed QR/DataMatrix labels on opaque boxes, scan a label to see what's
inside, search vaguely ("wire squeezer thing") and still find the crimper, and keep
track of tools you've lent out.

> **Note**: this is a personal project for organizing my own home, and the code is
> written almost entirely by AI (Claude) with me directing. It scratches my itch and
> is shared as-is — expect pragmatic choices over polish, and use accordingly.

Built on [Jazz 2](https://jazz.tools) (public alpha) — the app reads and writes a local
replica that syncs to your own Jazz server; everything works offline and updates in
real time across devices. See `SPEC.md` for the full product/architecture spec.

## Features

- **Nested containers**: House → Garage → Shelf → Tub → Item, any depth.
- **Pre-print + assign labels**: generate PDF sheets of uniquely-coded QR/DataMatrix
  labels (`/labels`), stick them on boxes, then scanning an unassigned label offers to
  link it to a new or existing container.
- **Scan to open** (`/scan`): camera scanning (QR + DataMatrix) or type the code.
- **Rapid capture** (`/capture`): scan label (optional) → photo → AI-suggested name →
  save & next. ~10 seconds per item for weekend-cataloging the whole house.
- **AI-enriched search**: at capture time an AI vision model (provider-configurable,
  optional) writes rich keywords/synonyms; search itself is instant, offline, and
  typo-tolerant (Cmd-K on desktop, Search tab on mobile).
- **Photos**: compressed client-side, synced as blobs, gallery + fullscreen viewer.
- **Lending**: "lent to Sarah since 3 Jul" on any item, dashboard list of everything
  currently out, borrower autocomplete from history.
- **Sharing**: invite links (viewer or editor) for any container — share the whole
  garage or a single box; the subtree is shared recursively. Server-enforced
  permissions (`permissions.ts`).
- **Favorites**, dark mode, installable PWA, responsive desktop/mobile UI.

## Stack

TanStack Start (React 19, SPA mode) · Jazz 2 (`jazz-tools@alpha`) · Better Auth
(email/password, JWT bridge to Jazz) · Tailwind 4 + shadcn/ui · bwip-js + pdf-lib
(labels) · barcode-detector (scanning) · fuse.js (search) · Vercel AI SDK (capture
enrichment).

Key files:

- `schema.ts` — the data model (Jazz relational tables). **Keep exactly one file named
  `schema.ts` in the repo** (the Jazz tooling discovers it by name); import it via the
  `@schema` alias.
- `permissions.ts` — server-enforced row policies (read the comments; some guards are
  load-bearing).
- `src/lib/` — data layer hooks (inventory, photos, loans, shares, favorites, search).
- `src/routes/` — file-based routes; `_app/` is the auth-gated app shell,
  `api/` are server routes (Better Auth, AI enrich).
- `deploy/` — production Docker Compose setup (see `deploy/README.md`).

## Development

```bash
npm install
npm run auth:migrate   # create the Better Auth sqlite tables (first run only)
npm run dev            # app + embedded Jazz dev server on http://localhost:4300
```

`.env` is created automatically by the Jazz vite plugin (app id) — add
`BETTER_AUTH_SECRET` (any long random string) and optionally AI enrichment vars (see
`.env.example`).

HTTPS is required for camera access on real phones; for LAN testing use a tunnel or
run behind a local TLS proxy.

### Dev gotchas (Jazz 2 alpha)

- **Changing `schema.ts` after you have data** requires a migration
  (`npx jazz-tools@alpha migrations create …`) — or, in dev, just wipe the local server
  store: `rm -rf node_modules/.cache/jazz-dev-server` and restart. Symptom of a missing
  migration: "permissions schema X is not connected to the previous schema Y" and
  broken reads.
- **Don't select the `$canEdit` magic column** in queries — in the current alpha it
  silently empties results for rows readable via shares. Editability is derived
  client-side in `src/lib/inventory.ts`.
- Permission-only edits to `permissions.ts` hot-push in dev and don't need migrations.
- After a user's access set changes (e.g. accepting an invite), live subscriptions
  don't pick up newly-readable rows; the app does a hard navigation at that point.

### Scripts

```bash
npm run dev            # dev server (app + Jazz + auth)
npm run build          # production build
npm run lint           # eslint
npm run auth:migrate   # (re)create Better Auth sqlite schema
npm test               # vitest
```

## Deployment

Two options, same architecture (app server + self-hosted Jazz sync server + Caddy
with automatic HTTPS):

- **Prebuilt images (homelab)**: GitHub Actions builds multi-arch images to GHCR on
  every push to `main` (`ghcr.io/jyecusch/hoard/app` and `…/jazz`); run them with
  [`deploy/homelab/`](./deploy/homelab/README.md). The app image is configured
  entirely at runtime via env vars — no rebuild to point it at your domain.
- **Build from source**: [`deploy/README.md`](./deploy/README.md).
