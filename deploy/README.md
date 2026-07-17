# Hoard — production deployment

> **Homelab / prebuilt images:** if you just want to run Hoard from the images
> published to GHCR by CI (no building on the server), use
> [`homelab/`](./homelab/README.md) instead. This document covers the
> build-from-source compose stack; the architecture is identical.

Docker Compose stack, three services:

| Service | What it runs                                                                                           | Persistent data                 |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `app`   | TanStack Start app (SPA + `/api/auth/*` Better Auth + `/api/enrich`) served by srvx on port 3000        | `auth-data` → `/data` (sqlite)  |
| `jazz`  | Jazz 2 sync server (`jazz-tools server`) on port 4200, external-JWT auth via the app's JWKS             | `jazz-data` → `/data`           |
| `caddy` | Reverse proxy + automatic HTTPS: `DOMAIN` → app, `SYNC_DOMAIN` → jazz (incl. WebSocket `/apps/<id>/ws`) | `caddy-data` (TLS certificates) |

Auth flow in production: the browser gets a JWT from Better Auth
(`/api/auth/token`), Jazz validates it against
`http://app:3000/api/auth/jwks` inside the compose network. Local-first
(self-signed Jazz) auth is disabled.

## Prerequisites

- Docker Engine 24+ with the compose plugin, ports 80/443 reachable.
- Two DNS records pointing at the host: `DOMAIN` (e.g. `hoard.example.com`)
  and `SYNC_DOMAIN` (default `sync.<DOMAIN>`).
- Node 20+ on whatever machine you deploy the schema from (your workstation
  with this repo checked out is fine).

## First-time setup

```sh
cd deploy
cp .env.example .env
```

Fill in `.env`:

```sh
# choose an app id (any stable identifier; uuid is conventional)
uuidgen | tr 'A-Z' 'a-z'      # -> JAZZ_APP_ID

# generate secrets
openssl rand -hex 32          # -> JAZZ_ADMIN_SECRET
openssl rand -hex 32          # -> BETTER_AUTH_SECRET
```

Set `DOMAIN` (and `SYNC_DOMAIN` if you don't want `sync.<DOMAIN>`). Optional:
`AI_PROVIDER`/`AI_MODEL` + the matching API key to enable capture enrichment.

Then:

```sh
docker compose up -d --build
docker compose ps          # wait for app + jazz to report healthy
```

> `VITE_JAZZ_APP_ID` and `VITE_JAZZ_SERVER_URL` are **baked into the client
> bundle at build time** (compose passes them as build args from
> `JAZZ_APP_ID` / `SYNC_ORIGIN`). If you ever change the app id or the sync
> domain, rerun `docker compose up -d --build`.

## Publish schema + permissions (required before first use)

The sync server starts empty — it rejects clients until your schema and
permission policies are published. From the **repo root** (where `schema.ts`
and `permissions.ts` live), pointing at the public sync origin:

```sh
JAZZ_SERVER_URL=https://sync.<DOMAIN> \
JAZZ_ADMIN_SECRET=<value from deploy/.env> \
npx jazz-tools@alpha deploy <JAZZ_APP_ID>
```

(`--server-url` / `--admin-secret` flags work too. Admin routes are plain
HTTPS `POST /apps/<id>/admin/...`, so going through Caddy is fine.)

Now open `https://<DOMAIN>`, sign up, and start hoarding.

## Schema migrations (future schema changes)

Jazz 2 versions data by schema hash; clients on older schemas keep working via
published migrations ("lenses"). Workflow when you change `schema.ts`:

```sh
# one-time, before your first ever schema change: snapshot the current schema
npx jazz-tools@alpha migrations create

# ...edit schema.ts...

npx jazz-tools@alpha migrations create --name my-change   # writes migrations/<...>.ts stub
# review the generated migration (defaults for new columns, ambiguous renames)

npx jazz-tools@alpha validate                             # optional pre-flight

JAZZ_SERVER_URL=https://sync.<DOMAIN> JAZZ_ADMIN_SECRET=... \
npx jazz-tools@alpha deploy <JAZZ_APP_ID>                 # schema + migration + permissions
```

Permission-only changes (`permissions.ts`) need no migration — just rerun the
same `deploy` command. Then rebuild/redeploy the app image so shipped clients
match: `docker compose up -d --build app`.

## Backups

All state lives in two named volumes (plus TLS certs):

- `hoard_auth-data` — Better Auth sqlite (`/data/auth.db`): users, sessions,
  JWKS signing keys.
- `hoard_jazz-data` — the entire inventory: every row and photo blob synced
  through Jazz.

Example cold-ish backup (sqlite is snapshot-safe enough for a home app when
briefly stopped; jazz data prefers a stopped server for consistency):

```sh
docker compose stop app jazz
docker run --rm -v hoard_auth-data:/a -v hoard_jazz-data:/j -v "$PWD":/out alpine \
  tar czf /out/hoard-backup-$(date +%F).tar.gz -C / a j
docker compose start app jazz
```

Restore by untarring into fresh volumes before `up`. `caddy-data` is
re-provisionable (certificates get reissued) but backing it up avoids
Let's Encrypt rate-limit surprises.

## Updating

```sh
git pull
cd deploy
docker compose build --pull
docker compose up -d
# if schema.ts / permissions.ts changed: run the deploy command above first
```

Pinned versions to keep in sync when bumping dependencies:

- `Dockerfile.jazz` pins `jazz-tools@2.0.0-alpha.53` — match `package.json`.
- `Dockerfile.app` pins `@better-auth/cli@1.4.21` — keep compatible with the
  `better-auth` version in `package.json`.

## Local smoke test (no TLS, no real domain)

`docker-compose.local.yml` publishes Caddy on `localhost:8080` (plain HTTP)
and exposes app/jazz directly on `localhost:3210`/`localhost:4210`:

```sh
cd deploy
cp .env.example .env   # set DOMAIN=http://localhost, SYNC_DOMAIN=http://sync.localhost,
                       # APP_ORIGIN=http://localhost:8080, SYNC_ORIGIN=ws://localhost:4210,
                       # plus JAZZ_APP_ID and both secrets
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build

curl -s localhost:3210/login | head -c 200          # app serves the SPA
curl -s localhost:4210/health                        # jazz health endpoint
curl -s localhost:8080/login -H 'Host: localhost' | head -c 200   # via caddy

# publish schema straight to the exposed jazz port (from repo root)
JAZZ_SERVER_URL=http://localhost:4210 JAZZ_ADMIN_SECRET=... \
npx jazz-tools deploy <JAZZ_APP_ID>

docker compose -f docker-compose.yml -f docker-compose.local.yml down -v
```
