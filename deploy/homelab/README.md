# Hoard on your homelab

Runs Hoard from the prebuilt GHCR images published by the repo's GitHub Actions
workflow — no build tooling needed on the server, just Docker Compose.

Images (amd64 + arm64):

- `ghcr.io/jyecusch/hoard/app` — the web app (SPA + auth + AI enrich API)
- `ghcr.io/jyecusch/hoard/jazz` — the Jazz 2 sync server (with the schema baked
  in for publishing)

The app image is deployment-agnostic: your app id and sync URL are substituted
into the client bundle from environment variables at container start, so
there's nothing to rebuild when you (re)configure.

## First-time setup

1. Copy this directory (`docker-compose.yml`, `Caddyfile`, `.env.example`) to
   your server.
2. `cp .env.example .env` and fill it in:
   - `DOMAIN` (+ optional `SYNC_DOMAIN`, defaults to `sync.<DOMAIN>`) — two DNS
     records pointing at the host.
   - `JAZZ_APP_ID` — `uuidgen | tr 'A-Z' 'a-z'`
   - `JAZZ_ADMIN_SECRET`, `BETTER_AUTH_SECRET` — `openssl rand -hex 32` each.
3. If the GHCR packages are private, authenticate the pull:
   `docker login ghcr.io -u <github-user>` (a classic PAT with `read:packages`),
   or make the packages public in GitHub → repo → Packages → settings.
4. Start everything, then publish the schema + permissions to your sync server
   (first boot only, and again whenever an image update changes the schema):

   ```bash
   docker compose up -d
   docker compose --profile setup run --rm publish
   ```

5. Open `https://<DOMAIN>`, create your account, start hoarding.

## Updating

```bash
docker compose pull
docker compose up -d
docker compose --profile setup run --rm publish   # harmless if nothing changed
```

Pin `HOARD_TAG` in `.env` (e.g. `HOARD_TAG=v1.0.0` or `HOARD_TAG=sha-1a2b3c4`)
if you'd rather not track `latest`.

## LAN-only (no public DNS)

Caddy can issue certificates from its internal CA instead of Let's Encrypt:
give `DOMAIN`/`SYNC_DOMAIN` names your local DNS resolves (e.g.
`hoard.lan`), and add `tls internal` inside both site blocks in `Caddyfile`.
Your devices must trust Caddy's root CA (in the `caddy-data` volume under
`pki/authorities/local`) — HTTPS is required for the camera scanner on phones,
so plain HTTP is only good for quick desktop tests.

## Backups

Two volumes matter — snapshot them regularly:

- `hoard_jazz-data` — **all inventory data and photos**
- `hoard_auth-data` — accounts/sessions (sqlite)

`caddy-data`/`caddy-config` are just re-issuable TLS state.

## Notes

- The sync WebSocket runs on the `SYNC_DOMAIN` site; Caddy proxies the upgrade
  automatically. If you front this with another proxy instead of Caddy, make
  sure WebSocket upgrade passes through to `jazz:4200`.
- The AI enrichment endpoint is disabled unless you set a provider API key in
  `.env` — the app is fully functional without it.
