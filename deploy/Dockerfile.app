# Hoard app image: TanStack Start SPA + /api/auth/* (Better Auth) + /api/enrich.
# Build context is the REPO ROOT (see docker-compose.yml: context: ..).
#
# VITE_JAZZ_APP_ID / VITE_JAZZ_SERVER_URL are Vite compile-time values. By
# default the image builds with __JAZZ_APP_ID__ / __JAZZ_SERVER_URL__ sentinel
# strings, and the entrypoint substitutes the real values from the JAZZ_APP_ID
# and JAZZ_SERVER_URL environment variables on every container start — so one
# published image (e.g. from GHCR) works for any deployment. Passing real
# values as build args still works and skips the substitution.

# --- build stage -------------------------------------------------------------
# Full (non-slim) image: toolchain for native modules (better-sqlite3) in case
# no prebuilt binary matches the platform.
FROM node:22-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_JAZZ_APP_ID=__JAZZ_APP_ID__
ARG VITE_JAZZ_SERVER_URL=__JAZZ_SERVER_URL__

# JAZZ_BUILD_STATIC=1 makes vite.config.ts pass `server: false` to jazzPlugin:
# no embedded Jazz dev server is started, and the two VITE_ vars above are
# taken straight from the environment.
ENV JAZZ_BUILD_STATIC=1 \
    VITE_JAZZ_APP_ID=$VITE_JAZZ_APP_ID \
    VITE_JAZZ_SERVER_URL=$VITE_JAZZ_SERVER_URL
# The build prerenders the SPA shell by booting the server once, which
# instantiates Better Auth — give it throwaway values (server-side only,
# nothing ends up in the bundle; the real secret comes from the container env).
RUN BETTER_AUTH_SECRET=build-time-placeholder-secret AUTH_DB_DIR=/tmp/build-auth npm run build

# Drop devDependencies; keeps compiled native modules (better-sqlite3) intact.
RUN npm prune --omit=dev

# --- runtime stage -----------------------------------------------------------
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    AUTH_DB_DIR=/data

# Pinned Better Auth CLI (bin: `better-auth`) — runs sqlite schema migrations
# against $AUTH_DB_DIR on every container start (idempotent). Keep the pin
# compatible with the better-auth version in package.json.
RUN npm install -g @better-auth/cli@1.4.21

# Server bundle imports its deps from node_modules at runtime, and srvx (the
# fetch-handler HTTP server, a transitive prod dependency) hosts it.
COPY --from=builder /app/node_modules ./node_modules
# dist is kept as a pristine template; the entrypoint copies it to ./dist and
# substitutes the runtime config sentinels on every start, so restarting with
# different JAZZ_* env vars always takes effect.
COPY --from=builder /app/dist ./dist-template
COPY --from=builder /app/package.json ./package.json
# Better Auth config, needed by `better-auth migrate` (server-only module).
COPY --from=builder /app/src/lib/auth.ts ./src/lib/auth.ts

COPY deploy/app-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh

VOLUME /data
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
